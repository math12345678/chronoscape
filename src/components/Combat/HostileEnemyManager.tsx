import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { getInfiniteTerrainHeight } from '../../world/chunkTerrain'
import { ENEMIES, WEAPONS } from '../../config/combat'
import type { EnemyType, WeaponId } from '../../config/combat'
import { damagePlayer, recordKill } from './HealthTracker'
import { triggerShake } from '../../hooks/useScreenShake'
import { queueBurst, queueExplosion } from '../HarvestVFX'
import { spawnDamageNumber } from '../UI/FloatingDamage'
import { getFactionAt, modifyReputation, getDamageTakenMultiplier } from '../Gangs/GangSystem'
import { handleSkirmishKill } from '../Gangs/GangWarSystem'
import { queueKillFeed } from '../UI/KillFeed'
import { playKillSound } from '../../utils/audio'
import { registerKill } from '../TimeSpeedCombat'
import { registerHeistKill } from '../TimeHeist'
import { isTimeFrozen } from '../../skills/ChronoSKills'
import { useStore } from '../../store'
import { isInSafeZone, isSpawnProtected } from '../../systems/SpawnProtection'
import { setMinimapEnemyData } from '../Minimap'
import { setCompassEnemyData } from '../UI/Compass'
import {
  getRelicThornsReflectFraction,
  getRelicLifestealFraction,
  getRelicExplodeOnKillFraction,
  getRelicResourceShowerAmount,
  getRelicLootBonus,
} from '../../systems/RelicForging'
import { healPlayerAmount } from './HealthTracker'
import { getTalentDropMultiplier } from '../../systems/ChronoTalents'
import { getAscensionDropBonus } from '../../systems/ChronoAscension'
import { getCompanionLootBonus } from '../../systems/TimeCompanions'
import { getTotalLootBonus } from '../../systems/InfiniteProgression'

// ── Types ──────────────────────────────────────────────
interface CombatEnemy {
  id: string
  type: EnemyType
  config: typeof ENEMIES[EnemyType]
  health: number
  maxHealth: number
  mesh: THREE.Mesh
  glow: THREE.Mesh
  healthBar: THREE.Mesh
  position: THREE.Vector3
  targetPos: THREE.Vector3
  phase: number
  lastAttackTime: number
  aggroRange: number
  state: 'idle' | 'wander' | 'chase' | 'attack' | 'retreat'
  patrolCenter: THREE.Vector3
  bossPhase: 'normal' | 'shield' | 'rage'
  shieldTimer: number
  enrageTimer: number       // seconds in combat before enrage
  telegraphTimer: number    // seconds until telegraph attack fires
  isTelegraphing: boolean   // currently showing telegraph
  telegraphMesh: THREE.Mesh | null
}

// ── Spawn telegraph system ────────────────────────────
interface SpawnTelegraph {
  x: number
  z: number
  type: EnemyType
  spawnTime: number
  ring: THREE.Mesh
}
const spawnTelegraphs: SpawnTelegraph[] = []
const TELEGRAPH_DURATION = 2.0 // seconds before enemy spawns

function createTelegraphRing(x: number, z: number, color: string): THREE.Mesh {
  const geo = new THREE.RingGeometry(0.5, 1.5, 24)
  const mat = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const mesh = new THREE.Mesh(geo, mat)
  const y = getInfiniteTerrainHeight(x, z)
  mesh.position.set(x, y + 0.05, z)
  mesh.rotation.x = -Math.PI / 2
  return mesh
}

function scheduleSpawnWithTelegraph(type: EnemyType, sx: number, sz: number): void {
  const cfg = ENEMIES[type]
  if (!cfg) return
  const ring = createTelegraphRing(sx, sz, cfg.emissive)
  spawnTelegraphs.push({
    x: sx,
    z: sz,
    type,
    spawnTime: performance.now() + TELEGRAPH_DURATION * 1000,
    ring,
  })
}

function updateTelegraphs(group: THREE.Group): void {
  const now = performance.now()
  for (let i = spawnTelegraphs.length - 1; i >= 0; i--) {
    const t = spawnTelegraphs[i]
    const elapsed = (now - (t.spawnTime - TELEGRAPH_DURATION * 1000)) / (TELEGRAPH_DURATION * 1000)

    if (now >= t.spawnTime) {
      // Spawn the enemy
      spawnEnemy(t.type, t.x, t.z)
      // Remove ring
      if (t.ring.parent) t.ring.parent.remove(t.ring)
      t.ring.geometry.dispose()
      ;(t.ring.material as THREE.Material).dispose()
      spawnTelegraphs.splice(i, 1)
      continue
    }

    // Pulse the ring
    const progress = elapsed // 0 to 1
    const mat = t.ring.material as THREE.MeshBasicMaterial
    mat.opacity = 0.6 * (1 - progress) + Math.sin(progress * Math.PI * 4) * 0.2 * (1 - progress)
    const scale = 1 + progress * 1.5
    t.ring.scale.set(scale, scale, scale)

    // Add to scene if not already
    if (!t.ring.parent) group.add(t.ring)
  }
}

// ── Module state ──────────────────────────────────────
const enemies = new Map<string, CombatEnemy>()
let nextId = 0
let _equippedWeapon: WeaponId | null = null
let _hasFiredThisFrame = false
let _camera: THREE.Camera | null = null

const _projVec = new THREE.Vector3()
function worldToScreen(pos: THREE.Vector3): { x: number; y: number } | null {
  if (!_camera) return null
  _projVec.copy(pos)
  _projVec.project(_camera)
  return {
    x: (_projVec.x * 0.5 + 0.5) * 100,
    y: (-_projVec.y * 0.5 + 0.5) * 100,
  }
}

export function setEquippedWeapon(w: WeaponId | null) { _equippedWeapon = w }
export function getEquippedWeapon(): WeaponId | null { return _equippedWeapon }
export function markFiredThisFrame() { _hasFiredThisFrame = true }
export function getAndClearFiredFlag(): boolean {
  const v = _hasFiredThisFrame
  _hasFiredThisFrame = false
  return v
}

/** Get all enemy meshes for raycasting */
export function getEnemyMeshes(): THREE.Mesh[] {
  return Array.from(enemies.values()).map(e => e.mesh)
}

/** Hard ceiling on simultaneous enemies — prevents unbounded growth from boss minion
 *  bursts and event spawners stacking on top of the ambient spawn cap. */
const MAX_ENEMIES = 40

/** Spawn an enemy near position */
export function spawnEnemy(type: EnemyType, x: number, z: number): string {
  const cfg = ENEMIES[type]
  if (!cfg) return ''
  if (enemies.size >= MAX_ENEMIES) return ''
  const id = `enemy_${nextId++}`
  const y = getInfiniteTerrainHeight(x, z)
  const pos = new THREE.Vector3(x, y, z)

  // Enemy mesh
  const geo = type === 'timeCrystalGolem'
    ? new THREE.OctahedronGeometry(0.4 * cfg.scale, 1)
    : type === 'phaseShifter'
    ? new THREE.TetrahedronGeometry(0.35 * cfg.scale)
    : type === 'temporalSentinel'
    ? new THREE.DodecahedronGeometry(0.3 * cfg.scale)
    : type === 'chronoBehemoth'
    ? new THREE.IcosahedronGeometry(0.6 * cfg.scale, 1)
    : type === 'timeTyrant'
    ? new THREE.IcosahedronGeometry(0.7 * cfg.scale, 2)
    : new THREE.ConeGeometry(0.25 * cfg.scale, 0.5 * cfg.scale, 6)
  const mat = new THREE.MeshStandardMaterial({
    color: cfg.color,
    emissive: cfg.emissive,
    emissiveIntensity: 0.4,
    transparent: true,
    opacity: 0.9,
    roughness: 0.3,
    metalness: 0.2,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.copy(pos)
  mesh.userData.interactable = true
  mesh.userData.type = 'enemy'
  mesh.userData.enemyId = id

  // Glow
  const glowGeo = new THREE.SphereGeometry(0.35 * cfg.scale, 8, 8)
  const glowMat = new THREE.MeshBasicMaterial({
    color: cfg.emissive,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const glow = new THREE.Mesh(glowGeo, glowMat)
  glow.position.copy(pos)
  glow.position.y = y + 0.1

  // Health bar background
  const hbGeo = new THREE.PlaneGeometry(0.6, 0.06)
  const hbMat = new THREE.MeshBasicMaterial({
    color: '#ff4444',
    transparent: true,
    opacity: 0,
    depthWrite: false,
  })
  const hb = new THREE.Mesh(hbGeo, hbMat)
  hb.position.copy(pos)
  hb.position.y = y + cfg.scale * 0.6

  const enemy: CombatEnemy = {
    id, type, config: cfg as typeof ENEMIES[EnemyType],
    health: cfg.health, maxHealth: cfg.health, mesh, glow, healthBar: hb,
    position: pos, targetPos: pos.clone(),
    phase: Math.random() * Math.PI * 2,
    lastAttackTime: 0,
    aggroRange: type === 'timeTyrant' ? 40 : 20 + Math.random() * 10,
    state: 'idle',
    patrolCenter: pos.clone(),
    bossPhase: 'normal',
    shieldTimer: 0,
    enrageTimer: 0,
    telegraphTimer: 0,
    isTelegraphing: false,
    telegraphMesh: null,
  }
  enemies.set(id, enemy)
  return id
}

/** Apply damage to an enemy. Returns true if killed. */
export function damageEnemy(id: string, damage: number): boolean {
  const e = enemies.get(id)
  if (!e) return false

  // Time Tyrant shield phase: immune
  if (e.type === 'timeTyrant' && e.bossPhase === 'shield') {
    // Flash shield visual feedback
    const mat = e.mesh.material as THREE.MeshStandardMaterial
    mat.emissiveIntensity = 1.0
    setTimeout(() => { if (enemies.has(id)) mat.emissiveIntensity = 0.4 }, 80)
    const hbMat = e.healthBar.material as THREE.MeshBasicMaterial
    hbMat.opacity = 0.6
    setTimeout(() => { if (enemies.has(id)) hbMat.opacity = 0 }, 500)
    return false
  }

  e.health -= damage

  // Flash white on hit
  const mat = e.mesh.material as THREE.MeshStandardMaterial
  mat.emissiveIntensity = 1.0
  setTimeout(() => { if (enemies.has(id)) mat.emissiveIntensity = 0.4 }, 100)

  // Show health bar
  const hbMat = e.healthBar.material as THREE.MeshBasicMaterial
  hbMat.opacity = 0.6
  setTimeout(() => { if (enemies.has(id)) hbMat.opacity = 0 }, 1500)

  // Floating damage number
  const screen = worldToScreen(e.position)
  if (screen) spawnDamageNumber(screen.x, screen.y - 4, damage, '#ff6644')

  if (e.health <= 0) {
    // Soul Drain relic: heal a fraction of the killing blow's damage
    const lifesteal = getRelicLifestealFraction()
    if (lifesteal > 0) healPlayerAmount(damage * lifesteal)
    killEnemy(id)
    return true
  }
  // Aggro on hit
  e.state = 'chase'
  return false
}

/** Apply nuke damage to all enemies within radius (used by Chrono Nuke ultimate) */
export function applyNukeDamageToAll(radius: number, center: THREE.Vector3): number {
  let kills = 0
  for (const [id, e] of enemies) {
    const dist = e.position.distanceTo(center)
    if (dist <= radius) {
      const dmg = 9999
      e.health -= dmg
      const screen = worldToScreen(e.position)
      if (screen) spawnDamageNumber(screen.x, screen.y - 4, dmg, '#ff44ff')
      killEnemy(id)
      kills++
    }
  }
  return kills
}

/** Get all enemy positions for NPC targeting */
export function getAllEnemyPositions(): THREE.Vector3[] {
  return Array.from(enemies.values()).map(e => e.position.clone())
}

/** Get nearest enemy distance from a position. Returns Infinity if no enemies. */
export function getNearestEnemyDistance(px: number, pz: number): number {
  let nearest = Infinity
  for (const e of enemies.values()) {
    const dx = e.position.x - px
    const dz = e.position.z - pz
    const dist = dx * dx + dz * dz
    if (dist < nearest) nearest = dist
  }
  return Math.sqrt(nearest)
}

/** Get enemy data (position + type) for minimap rendering */
export function getAllEnemyMinimapData(): { x: number; z: number; type: EnemyType }[] {
  return Array.from(enemies.values()).map(e => ({
    x: e.position.x,
    z: e.position.z,
    type: e.type,
  }))
}

/** Apply damage to the player from a specific enemy attack, reflecting a
 *  fraction back at the attacker if Time Thorns relics are equipped. */
function applyPlayerDamage(attacker: CombatEnemy, amount: number): number {
  const dealt = damagePlayer(amount, attacker.type)
  const thorns = getRelicThornsReflectFraction()
  if (thorns > 0 && dealt > 0) {
    damageEnemy(attacker.id, Math.round(dealt * thorns))
  }
  return dealt
}

/** Kill and remove enemy with effects */
function killEnemy(id: string) {
  const e = enemies.get(id)
  if (!e) return

  registerKill()
  registerHeistKill()
  recordKill({ xpReward: e.config.xpReward, renownReward: e.config.renownReward })
  queueKillFeed(e.type)
  playKillSound()
  window.dispatchEvent(new CustomEvent('kill-event', { detail: { enemyType: e.type } }))

  const screen = worldToScreen(e.position)
  if (screen) spawnDamageNumber(screen.x, screen.y - 6, e.config.xpReward, '#ffdd44', true)

  const faction = getFactionAt(e.position.x, e.position.z)
  if (faction) modifyReputation(faction, 2)
  handleSkirmishKill(e.position.x, e.position.z)

  // Loot drops — resources based on enemy type
  const lootTable: Record<string, { raw?: number; liquid?: number; vapour?: number; crystal?: number }> = {
    wraith: { raw: 5, liquid: 2 },
    voidWraith: { raw: 10, liquid: 5, vapour: 2 },
    timeCrystalGolem: { raw: 20, liquid: 8, vapour: 5, crystal: 2 },
    phaseShifter: { raw: 15, liquid: 6, vapour: 3 },
    temporalSentinel: { raw: 25, liquid: 10, vapour: 5 },
    chronoBehemoth: { raw: 100, liquid: 50, vapour: 25, crystal: 10 },
    timeTyrant: { raw: 500, liquid: 200, vapour: 100, crystal: 50 },
  }
  const loot = lootTable[e.type] || lootTable.wraith
  // Relic Forging loot bonus (rolled 'loot' stats + Infinite Greed passive) +
  // Greed Is Good talent + Ascension loot bonus — none of these were
  // previously consumed anywhere.
  const lootMult = (1 + getRelicLootBonus() + getCompanionLootBonus() + getTotalLootBonus()) * getTalentDropMultiplier() * getAscensionDropBonus()
  const shower = getRelicResourceShowerAmount()
  useStore.setState(s => ({
    inventory: {
      ...s.inventory,
      raw: Math.min(99999, s.inventory.raw + Math.round((loot.raw ?? 0) * lootMult) + shower),
      liquid: Math.min(99999, s.inventory.liquid + Math.round((loot.liquid ?? 0) * lootMult)),
      vapour: Math.min(99999, s.inventory.vapour + Math.round((loot.vapour ?? 0) * lootMult)),
      crystal: Math.min(99999, s.inventory.crystal + Math.round((loot.crystal ?? 0) * lootMult)),
    }
  }))

  // Volatile Remains relic: splash damage to nearby enemies on kill
  const explodeFraction = getRelicExplodeOnKillFraction()
  if (explodeFraction > 0) {
    const splashDamage = Math.round(e.maxHealth * explodeFraction)
    if (splashDamage > 0) {
      for (const [otherId, other] of enemies) {
        if (otherId === id) continue
        if (other.position.distanceTo(e.position) <= 4) {
          damageEnemy(otherId, splashDamage)
        }
      }
      queueBurst(e.position.clone(), 16, '#ff8844', 5)
    }
  }

  // Death burst — spectacular explosions
  if (e.mesh.parent) {
    if (e.type === 'timeTyrant') {
      queueExplosion(e.mesh.position.clone(), '#ff8800', 'big')
      queueExplosion(e.mesh.position.clone(), '#ff4400', 'big')
      setTimeout(() => queueExplosion(e.mesh.position.clone(), '#ffcc00', 'big'), 150)
      setTimeout(() => queueExplosion(e.mesh.position.clone(), '#ff2222', 'big'), 300)
      setTimeout(() => queueExplosion(e.mesh.position.clone(), '#ff8800', 'big'), 450)
    } else if (e.type === 'chronoBehemoth') {
      queueExplosion(e.mesh.position.clone(), e.config.emissive, 'big')
      setTimeout(() => queueExplosion(e.mesh.position.clone(), '#ff2222', 'big'), 200)
      setTimeout(() => queueExplosion(e.mesh.position.clone(), '#ff8844', 'big'), 400)
    } else if (e.type === 'timeCrystalGolem') {
      queueExplosion(e.mesh.position.clone(), e.config.emissive, 'big')
    } else {
      queueExplosion(e.mesh.position.clone(), e.config.emissive, 'small')
    }
  }
  triggerShake(e.type === 'timeTyrant' ? 1.0 : e.type === 'chronoBehemoth' ? 0.6 : e.type === 'timeCrystalGolem' ? 0.3 : 0.15, 10)

  // Clean up
  if (e.mesh.parent) e.mesh.parent.remove(e.mesh)
  if (e.glow.parent) e.glow.parent.remove(e.glow)
  if (e.healthBar.parent) e.healthBar.parent.remove(e.healthBar)
  if (e.mesh.geometry) e.mesh.geometry.dispose()
  if (e.mesh.material) (e.mesh.material as THREE.Material).dispose()
  if (e.glow.geometry) e.glow.geometry.dispose()
  if (e.glow.material) (e.glow.material as THREE.Material).dispose()
  if (e.healthBar.geometry) e.healthBar.geometry.dispose()
  if (e.healthBar.material) (e.healthBar.material as THREE.Material).dispose()
  enemies.delete(id)
}

/** Get boss health info for UI */
export function getBossInfo(): { hp: number; maxHp: number; name: string } | null {
  for (const e of enemies.values()) {
    if (e.type === 'timeTyrant') return { hp: e.health, maxHp: ENEMIES[e.type].health, name: 'Time Tyrant' }
    if (e.type === 'chronoBehemoth') return { hp: e.health, maxHp: ENEMIES[e.type].health, name: 'Chrono-Behemoth' }
  }
  return null
}

/** Remove all enemies */
export function clearEnemies() {
  for (const id of enemies.keys()) killEnemy(id)
}

/** Reset all enemies: drops aggro and restores health */
export function resetAllEnemies() {
  for (const [id, e] of enemies) {
    e.state = 'idle'
    e.health = e.maxHealth
    e.bossPhase = 'normal'
    e.shieldTimer = 0
  }
}

/** Find nearest enemy within range */
export function findNearestEnemy(pos: THREE.Vector3, maxDist: number): CombatEnemy | null {
  let nearest: CombatEnemy | null = null
  let nearDist = maxDist * maxDist
  for (const e of enemies.values()) {
    const d = pos.distanceToSquared(e.position)
    if (d < nearDist) { nearDist = d; nearest = e }
  }
  return nearest
}

/** Spawn minion enemies around a position */
function spawnMinionsAround(pos: THREE.Vector3, count: number): void {
  const types: EnemyType[] = ['wraith', 'voidWraith', 'wraith', 'phaseShifter']
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const dist = 3 + Math.random() * 5
    spawnEnemy(types[Math.floor(Math.random() * types.length)], pos.x + Math.cos(angle) * dist, pos.z + Math.sin(angle) * dist)
  }
}

// ── Enemy proximity event dispatcher ────────────────────
let _proximityLastFired = 0
function fireProximityEvent(playerPos: THREE.Vector3) {
  const now = performance.now()
  if (now - _proximityLastFired < 200) return // throttle to 5fps
  _proximityLastFired = now

  let nearestDist = Infinity
  let nearestAngle = 0
  for (const e of enemies.values()) {
    const dx = e.position.x - playerPos.x
    const dz = e.position.z - playerPos.z
    const dist = Math.sqrt(dx * dx + dz * dz)
    if (dist < nearestDist) {
      nearestDist = dist
      nearestAngle = Math.atan2(dx, dz)
    }
  }

  if (nearestDist < 50) {
    const intensity = Math.max(0, 1 - nearestDist / 50)
    window.dispatchEvent(new CustomEvent('enemy-proximity', {
      detail: { distance: nearestDist, angle: nearestAngle, intensity },
    }))
  }
}

// ── Main Component ────────────────────────────────────
export const HostileEnemyManager = () => {
  const groupRef = useRef<THREE.Group>(null)
  const time = useRef(0)
  const { camera } = useThree()
  const spawnTimer = useRef(0)
  const spawnedEnemies = useRef(false)

  // Store camera for damage number projection
  useEffect(() => { _camera = camera }, [camera])

  // Listen for void rift enemy spawn
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      spawnEnemy('voidWraith', detail.x, detail.z)
    }
    window.addEventListener('spawn-void-enemy', handler)
    return () => window.removeEventListener('spawn-void-enemy', handler)
  }, [])

  // Spawn initial enemies
  useEffect(() => {
    if (spawnedEnemies.current) return
    spawnedEnemies.current = true

    // Spawn enemies around the island
    const positions: [number, number][] = [
      [30, 20], [-25, -30], [40, -15], [-35, 25],
      [15, -40], [-10, 35], [45, 10], [-40, -20],
      [25, -25], [-30, 15], [50, -5], [-45, -35],
    ]
    // Mix of enemies
    const types: EnemyType[] = ['wraith', 'wraith', 'voidWraith', 'timeCrystalGolem', 'phaseShifter', 'temporalSentinel']
    positions.forEach((p, i) => {
      spawnEnemy(types[i % types.length], p[0], p[1])
    })
    // Spawn boss far away
    spawnEnemy('chronoBehemoth', 55, 55)
  }, [])

  // ── Boss spawn timer ──────────────────────────────────
  const bossTimer = useRef(0)

  // Spawn periodic waves
  useFrame((_, delta) => {
    time.current += delta
    const playerPos = camera.position

    // Re-spawn Chrono-Behemoth if missing
    const hasBehemoth = Array.from(enemies.values()).some(e => e.type === 'chronoBehemoth')
    if (!hasBehemoth && enemies.size < 25) {
      const angleBoss = Math.random() * Math.PI * 2
      spawnEnemy('chronoBehemoth', playerPos.x + Math.cos(angleBoss) * 50, playerPos.z + Math.sin(angleBoss) * 50)
    }

    // Spawn Time Tyrant every ~3 minutes
    bossTimer.current += delta
    const hasTyrant = Array.from(enemies.values()).some(e => e.type === 'timeTyrant')
    if (!hasTyrant && bossTimer.current > 180 && enemies.size < 22) {
      bossTimer.current = 0
      const angleBoss = Math.random() * Math.PI * 2
      spawnEnemy('timeTyrant', playerPos.x + Math.cos(angleBoss) * 40, playerPos.z + Math.sin(angleBoss) * 40)
    }

    // Periodic spawn from edge (skip if player in safe zone) — now with telegraph!
    spawnTimer.current += delta
    if (spawnTimer.current > 12 && enemies.size < 25 && !isInSafeZone(playerPos.x, playerPos.z)) {
      spawnTimer.current = 0
      const angle = Math.random() * Math.PI * 2
      const dist = 40 + Math.random() * 20
      const sx = playerPos.x + Math.cos(angle) * dist
      const sz = playerPos.z + Math.sin(angle) * dist
      const tier = Math.random()
      const type: EnemyType = tier < 0.5 ? 'wraith' : tier < 0.7 ? 'voidWraith' : tier < 0.85 ? 'timeCrystalGolem' : tier < 0.95 ? 'phaseShifter' : 'temporalSentinel'
      scheduleSpawnWithTelegraph(type, sx, sz)
    }

    // Update telegraph rings
    if (groupRef.current) {
      updateTelegraphs(groupRef.current)
    }

    // Spawn protection: clear enemies near spawn
    if (isSpawnProtected()) {
      for (const [id, e] of enemies) {
        if (isInSafeZone(e.position.x, e.position.z)) {
          killEnemy(id)
        }
      }
    }

    // Update each enemy
    for (const e of enemies.values()) {
      // Ensure in scene
      if (!e.mesh.parent && groupRef.current) {
        groupRef.current.add(e.mesh)
        groupRef.current.add(e.glow)
        groupRef.current.add(e.healthBar)
      }

      const distToPlayer = e.position.distanceTo(playerPos)

      // Safe zone: enemies flee or ignore player
      const playerInSafeZone = isInSafeZone(playerPos.x, playerPos.z)
      if (playerInSafeZone) {
        if (e.state !== 'idle') {
          e.state = 'idle'
          e.targetPos.copy(e.patrolCenter)
        }
        if (distToPlayer < 15) {
          // Flee from player
          const fleeDir = new THREE.Vector3().copy(e.position).sub(playerPos).normalize()
          const enemyCfg = ENEMIES[e.type]
          e.position.x += fleeDir.x * enemyCfg.speed * delta * 2
          e.position.z += fleeDir.z * enemyCfg.speed * delta * 2
          e.position.y = getInfiniteTerrainHeight(e.position.x, e.position.z)
          e.mesh.position.y = e.position.y + 0.3 * ENEMIES[e.type].scale
          e.glow.position.set(e.position.x, e.position.y + 0.1, e.position.z)
          continue
        }
      }

      // Enrage timer: builds while in combat
      const isBoss = e.type === 'chronoBehemoth' || e.type === 'timeTyrant'
      const isEngaged = distToPlayer < e.aggroRange
      if (isEngaged) e.enrageTimer += delta
      else e.enrageTimer = Math.max(0, e.enrageTimer - delta * 0.5)
      const isEnraged = isBoss && e.enrageTimer > 60
      const enrageSpeedMult = isEnraged ? 1.4 : 1
      const enrageDmgMult = isEnraged ? 1.3 : 1

      // AI state machine
      switch (e.state) {
        case 'idle': {
          // Stand still, look around
          e.position.y = getInfiniteTerrainHeight(e.position.x, e.position.z)
          if (distToPlayer < e.aggroRange) { e.state = 'chase' }
          break
        }
        case 'wander': {
          const toTarget = new THREE.Vector3().copy(e.targetPos).sub(e.position)
          if (toTarget.length() < 0.5) { e.state = 'idle'; break }
          moveToward(e, toTarget, delta)
          if (distToPlayer < e.aggroRange) { e.state = 'chase' }
          break
        }
        case 'chase': {
          const toPlayer = new THREE.Vector3().copy(playerPos).sub(e.position)
          const cfg = ENEMIES[e.type]

          // Enrage visual
          if (isEnraged && !e.isTelegraphing) {
            ;(e.glow.material as THREE.MeshBasicMaterial).color.setHex(0xff0044)
            ;(e.glow.material as THREE.MeshBasicMaterial).opacity = 0.25 + Math.sin(time.current * 4) * 0.15
          }

          // Telegraph: show ring before boss attack
          if ((e.type === 'chronoBehemoth' || e.type === 'timeTyrant') && !e.isTelegraphing) {
            e.telegraphTimer += delta
            if (e.telegraphTimer > 2.5 && distToPlayer < cfg.attackRange + 5) {
              e.isTelegraphing = true
              e.telegraphTimer = 0
              // Create telegraph ring
              const ringGeo = new THREE.RingGeometry(1.5, 2, 32)
              const ringMat = new THREE.MeshBasicMaterial({
                color: e.type === 'timeTyrant' ? 0xff8800 : 0xff4466,
                transparent: true,
                opacity: 0.4,
                side: THREE.DoubleSide,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
              })
              const ring = new THREE.Mesh(ringGeo, ringMat)
              ring.position.copy(playerPos)
              ring.position.y = getInfiniteTerrainHeight(playerPos.x, playerPos.z) + 0.05
              ring.rotation.x = -Math.PI / 2
              ring.scale.set(1, 1, 1)
              e.telegraphMesh = ring
              if (groupRef.current) groupRef.current.add(ring)
            }
          }

          // Telegraph visual pulse
          if (e.isTelegraphing && e.telegraphMesh) {
            const scale = 1 + (2.5 - e.telegraphTimer) * 0.3
            e.telegraphMesh.scale.set(scale, scale, scale)
            const mat = e.telegraphMesh.material as THREE.MeshBasicMaterial
            mat.opacity = 0.4 * (1 - e.telegraphTimer / 2.5)
            e.telegraphMesh.position.lerp(playerPos, 0.05)
            e.telegraphMesh.position.y = getInfiniteTerrainHeight(playerPos.x, playerPos.z) + 0.05
            if (e.telegraphTimer > 2.5) {
              // Telegraph done — fire attack
              e.telegraphTimer = 0
              e.isTelegraphing = false
              if (e.telegraphMesh.parent) e.telegraphMesh.parent.remove(e.telegraphMesh)
              e.telegraphMesh.geometry.dispose()
              ;(e.telegraphMesh.material as THREE.Material).dispose()
              e.telegraphMesh = null
              e.state = 'attack'
              break
            }
            e.telegraphTimer += delta
            // Don't process rest of chase while telegraphing
            e.position.y = getInfiniteTerrainHeight(e.position.x, e.position.z)
            break
          }

          // Time Tyrant boss phase switching
          if (e.type === 'timeTyrant') {
            const hpPct = e.health / e.maxHealth
            if (hpPct < 0.25 && e.bossPhase !== 'rage') {
              e.bossPhase = 'rage'
              queueExplosion(e.position.clone(), '#ff0000', 'big')
              // Spawn minions on rage phase
              spawnMinionsAround(e.position, 3)
            } else if (hpPct < 0.5 && e.bossPhase === 'normal') {
              e.bossPhase = 'shield'
              e.shieldTimer = 3
              // Spawn minions on shield phase
              spawnMinionsAround(e.position, 2)
            }
            // Shield: invulnerable, pulsing gold
            if (e.bossPhase === 'shield') {
              e.shieldTimer -= delta
              ;(e.glow.material as THREE.MeshBasicMaterial).color.setHex(0xffcc00)
              ;(e.glow.material as THREE.MeshBasicMaterial).opacity = 0.3 + Math.sin(time.current * 6) * 0.2
              if (e.shieldTimer <= 0) {
                e.bossPhase = 'normal'
              }
              e.position.y = getInfiniteTerrainHeight(e.position.x, e.position.z)
              break
            }
            // Rage: speed and damage bonus
            if (e.bossPhase === 'rage') {
              ;(e.mesh.material as THREE.MeshStandardMaterial).emissive.setHex(0xff0000)
              ;(e.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.8
            }
          }

          if (distToPlayer < cfg.attackRange) {
            e.state = 'attack'
            break
          }
          // Phase Shifter: teleport toward player periodically
          if (e.type === 'phaseShifter' && Math.random() < 0.02) {
            const angle = Math.random() * Math.PI * 2
            const teleDist = 3 + Math.random() * 4
            e.position.x = playerPos.x + Math.cos(angle) * teleDist
            e.position.z = playerPos.z + Math.sin(angle) * teleDist
            e.position.y = getInfiniteTerrainHeight(e.position.x, e.position.z)
            queueBurst(e.position.clone(), 8, '#66ddff', 3)
            e.mesh.rotation.y = Math.atan2(playerPos.x - e.position.x, playerPos.z - e.position.z)
            break
          }
          // Temporal Sentinel: slow but fires from range
          if (e.type === 'temporalSentinel') {
            // Stand still, fire projectile-like attack
            e.mesh.rotation.y = Math.atan2(toPlayer.x, toPlayer.z)
            if (distToPlayer < cfg.attackRange + 5 && Math.random() < 0.03) {
              e.state = 'attack'
            }
            break
          }
          // Move toward player
          const freezeMult = isTimeFrozen() ? 0.1 : 1
          const speedMult = (e.type === 'timeTyrant' && e.bossPhase === 'rage' ? 1.8 : 1) * enrageSpeedMult
          const moveVec = toPlayer.clone().normalize()
          e.position.x += moveVec.x * cfg.speed * delta * freezeMult * speedMult
          e.position.z += moveVec.z * cfg.speed * delta * freezeMult * speedMult
          e.position.y = getInfiniteTerrainHeight(e.position.x, e.position.z)

          // Face player
          e.mesh.rotation.y = Math.atan2(toPlayer.x, toPlayer.z)
          break
        }
        case 'attack': {
          const cfg = ENEMIES[e.type]
          const now = performance.now()
          const canAttack = now - e.lastAttackTime > cfg.attackCooldown * 1000

          // Temporal Sentinel: ranged attack — fires from distance
          if (e.type === 'temporalSentinel' && canAttack) {
            e.lastAttackTime = now
            const dmgMult = getDamageTakenMultiplier()
            applyPlayerDamage(e, Math.round(cfg.damage * dmgMult))
            // Visual: flash + shake from player direction
            ;(e.glow.material as THREE.MeshBasicMaterial).color.setHex(0xffff00)
            setTimeout(() => {
              if (enemies.has(e.id)) {
                ;(e.glow.material as THREE.MeshBasicMaterial).color.set(cfg.emissive)
              }
            }, 200)
            queueBurst(new THREE.Vector3(
              (playerPos.x + e.position.x) / 2,
              playerPos.y + 0.5,
              (playerPos.z + e.position.z) / 2,
            ), 6, '#ffdd44', 4)
            if (distToPlayer > cfg.attackRange + 8) { e.state = 'chase' }
            break
          }

          // Phase Shifter: teleport behind player on attack
          if (e.type === 'phaseShifter' && canAttack) {
            e.lastAttackTime = now
            // Teleport behind player
            const behind = new THREE.Vector3().copy(playerPos).sub(e.position).normalize()
            e.position.x = playerPos.x - behind.x * 2
            e.position.z = playerPos.z - behind.z * 2
            e.position.y = getInfiniteTerrainHeight(e.position.x, e.position.z)
            queueBurst(e.position.clone(), 10, '#66ddff', 4)
            const dmgMult = getDamageTakenMultiplier()
            applyPlayerDamage(e, Math.round(cfg.damage * dmgMult))
            e.state = 'chase'
            break
          }

          // Chrono-Behemoth: stomp AoE
          if (e.type === 'chronoBehemoth' && canAttack) {
            e.lastAttackTime = now
            const dmgMult = getDamageTakenMultiplier() * (isEnraged ? 1.3 : 1)
            applyPlayerDamage(e, Math.round(cfg.damage * dmgMult))
            triggerShake(0.4, 8)
            queueBurst(e.position.clone(), 30, '#ff44aa', 6)
            ;(e.glow.material as THREE.MeshBasicMaterial).color.setHex(0xff0000)
            setTimeout(() => {
              if (enemies.has(e.id)) {
                ;(e.glow.material as THREE.MeshBasicMaterial).color.set(cfg.emissive)
              }
            }, 300)
            if (distToPlayer > cfg.attackRange + 3) { e.state = 'chase' }
            break
          }

          // Time Tyrant: phase-based attack
          if (e.type === 'timeTyrant' && canAttack) {
            e.lastAttackTime = now
            const rageMult = e.bossPhase === 'rage' ? 1.5 : 1
            const enrageMult = isEnraged ? 1.3 : 1
            const dmgMult = getDamageTakenMultiplier()
            applyPlayerDamage(e, Math.round(cfg.damage * dmgMult * rageMult * enrageMult))
            triggerShake(0.6, 10)
            // Triple explosion burst
            queueBurst(e.position.clone(), 30, '#ff8800', 8)
            setTimeout(() => queueBurst(e.position.clone(), 20, '#ffcc00', 6), 150)
            setTimeout(() => queueBurst(e.position.clone(), 25, '#ff4400', 7), 300)
            ;(e.glow.material as THREE.MeshBasicMaterial).color.setHex(0xff8800)
            setTimeout(() => {
              if (enemies.has(e.id)) {
                ;(e.glow.material as THREE.MeshBasicMaterial).color.set(cfg.emissive)
              }
            }, 300)
            if (distToPlayer > cfg.attackRange + 4) { e.state = 'chase' }
            break
          }

          // Standard melee attack
          if (canAttack && distToPlayer < cfg.attackRange + 1) {
            e.lastAttackTime = now
            const dmgMult = getDamageTakenMultiplier()
            applyPlayerDamage(e, Math.round(cfg.damage * dmgMult))
            // Lunge forward for visual feedback
            const lunge = new THREE.Vector3().copy(playerPos).sub(e.position).normalize().multiplyScalar(0.3)
            e.position.x += lunge.x
            e.position.z += lunge.z
            // Red flash
            ;(e.glow.material as THREE.MeshBasicMaterial).color.setHex(0xff0000)
            setTimeout(() => {
              if (enemies.has(e.id)) {
                ;(e.glow.material as THREE.MeshBasicMaterial).color.set(cfg.emissive)
              }
            }, 200)
          }
          if (distToPlayer > cfg.attackRange + 2) { e.state = 'chase' }
          break
        }
      }

      // Visual: bob + glow pulse
      const bob = Math.sin(time.current * 2 + e.phase) * 0.04
      e.mesh.position.y = e.position.y + 0.3 * ENEMIES[e.type].scale + bob
      e.glow.position.set(e.position.x, e.position.y + 0.1, e.position.z)
      e.healthBar.position.set(e.position.x, e.position.y + ENEMIES[e.type].scale * 0.6 + bob + 0.1, e.position.z)

      // Health bar width
      const healthPct = e.health / ENEMIES[e.type].health
      e.healthBar.scale.x = healthPct

      // Glow pulse
      const gp = 0.08 + Math.sin(time.current * 1.5 + e.phase) * 0.06
      ;(e.glow.material as THREE.MeshBasicMaterial).opacity = gp

      // Cull far enemies
      if (distToPlayer > 80) { e.mesh.visible = false; e.glow.visible = false; e.healthBar.visible = false }
      else { e.mesh.visible = true; e.glow.visible = true; e.healthBar.visible = true }
    }

    // Feed minimap and compass data
    const enemyPositions = Array.from(enemies.values()).map(e => ({
      x: e.position.x, z: e.position.z, type: e.type,
    }))
    setMinimapEnemyData(enemyPositions)
    setCompassEnemyData(enemyPositions)

    // Fire proximity event for screen edge indicators
    if (enemies.size > 0) {
      fireProximityEvent(playerPos)
    }
  })

  return <group ref={groupRef} />
}

function moveToward(e: CombatEnemy, dir: THREE.Vector3, delta: number) {
  const dist = dir.length()
  if (dist < 0.3) return
  const freezeMult = isTimeFrozen() ? 0.1 : 1
  const step = ENEMIES[e.type].speed * delta * freezeMult
  const r = Math.min(step / dist, 1)
  e.position.x += dir.x * r
  e.position.z += dir.z * r
  e.position.y = getInfiniteTerrainHeight(e.position.x, e.position.z)
  e.mesh.rotation.y = Math.atan2(dir.x, dir.z)
}
