import { useRef, useCallback, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { WEAPONS } from '../../config/combat'
import type { WeaponId } from '../../config/combat'
import { useStore } from '../../store'
import { damageEnemy, getEnemyMeshes, setEquippedWeapon, getAndClearFiredFlag, findNearestEnemy } from './HostileEnemyManager'
import { getInfiniteTerrainHeight } from '../../world/chunkTerrain'
import { queueBurst } from '../HarvestVFX'
import { isTimeSurgeActive } from '../../skills/ChronoSKills'
import { isPlayerDriving, getVehiclePosition, getVehicleRotation } from '../Vehicles/HoverVehicle'
import { triggerShake } from '../../hooks/useScreenShake'
import { playShootSound, playHitSound, playEmptyClickSound } from '../../utils/audio'
import { getPlayerDamageBonus } from '../Gangs/GangSystem'
import { spendTimeCredit } from '../../config/timeCredit'
import {
  getEffectiveWeaponStats,
  isSingleUse,
  initWeaponModifiers,
  setWeaponModifiers,
  rollWeaponModifiers,
} from '../../systems/WeaponModifierSystem'

// ── Critical hit system ──────────────────────────────
let _critChance = 0.15
export function setCritChance(chance: number) { _critChance = chance }
export function isCriticalHit(): boolean { return Math.random() < _critChance }
export function getCritDamageMultiplier(): number { return 2 }

interface Projectile {
  id: number
  start: THREE.Vector3
  pos: THREE.Vector3
  dir: THREE.Vector3
  speed: number
  damage: number
  color: string
  range: number
  traveled: number
  mesh: THREE.Mesh
  isCrit: boolean
}

let nextPId = 0
export const activeProjectiles: Projectile[] = []
const projGeo = new THREE.SphereGeometry(0.08, 6, 6)

export function createProjectile(pos: THREE.Vector3, dir: THREE.Vector3, weaponId: WeaponId): Projectile | null {
  const effective = getEffectiveWeaponStats(weaponId)
  const baseColor = WEAPONS[weaponId].projectileColor
  const mat = new THREE.MeshBasicMaterial({
    color: baseColor,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const mesh = new THREE.Mesh(projGeo, mat)
  mesh.position.copy(pos)

  const bonus = getPlayerDamageBonus()
  const isCrit = isCriticalHit()
  const critMult = isCrit ? getCritDamageMultiplier() : 1
  return {
    id: nextPId++,
    start: pos.clone(),
    pos: pos.clone(),
    dir: dir.clone(),
    speed: effective.projectileSpeed,
    damage: Math.round(effective.damage * bonus * critMult),
    color: isCrit ? '#ffdd44' : baseColor,
    range: effective.range,
    traveled: 0,
    mesh,
    isCrit,
  }
}

/** Fire a projectile from camera position in camera direction */
export function fireProjectile(): boolean {
  const state = useStore.getState()
  const weapon = _equippedWeapon
  if (!weapon) return false
  const effective = getEffectiveWeaponStats(weapon)
  if (state.inventory.liquid < effective.ammoCost) { playEmptyClickSound(); return false }

  useStore.setState((s) => ({
    inventory: { ...s.inventory, liquid: s.inventory.liquid - effective.ammoCost },
  }))

  const camera = _lastCamera
  if (!camera) return false

  let pos: THREE.Vector3
  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)

  if (isPlayerDriving()) {
    const vPos = getVehiclePosition()
    const vRot = getVehicleRotation()
    const forward = new THREE.Vector3(Math.sin(vRot), 0, Math.cos(vRot))
    pos = vPos.clone().add(forward.clone().multiplyScalar(0.85))
    pos.y += 0.12
  } else {
    pos = camera.position.clone()
    pos.y -= 0.2
  }

  const p = createProjectile(pos, dir, weapon)
  if (p) {
    playShootSound()
    // Screen shake on fire — makes every shot feel punchy
    triggerShake(0.04, 6, 0.06)
    // Muzzle flash — brief bright overlay that fades instantly
    const muzzleFlash = document.createElement('div')
    muzzleFlash.style.cssText = `
      position:fixed;inset:0;
      background:radial-gradient(ellipse at 50% 50%, 
        ${p.color}55 0%, 
        ${p.color}22 25%, 
        transparent 55%
      );
      pointer-events:none;
      z-index:9999;
      opacity:1;
      transition:opacity 0.06s ease-out;
    `
    document.body.appendChild(muzzleFlash)
    requestAnimationFrame(() => { muzzleFlash.style.opacity = '0' })
    setTimeout(() => {
      if (muzzleFlash.parentNode) muzzleFlash.parentNode.removeChild(muzzleFlash)
    }, 80)
    activeProjectiles.push(p)

    // Single-use: consume weapon after firing, fall back to energyPistol
    if (isSingleUse(weapon)) {
      cycleWeaponAbsolute('energyPistol')
      setWeaponModifiers(weapon, [])
      window.dispatchEvent(new CustomEvent('weapon-consumed'))
    }

    // Time Surge: fire a second projectile with offset
    if (isTimeSurgeActive()) {
      const offsetDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
      const offsetPos = isPlayerDriving()
        ? pos.clone().add(new THREE.Vector3(0.15, -0.12, 0))
        : camera.position.clone()
      if (!isPlayerDriving()) {
        offsetPos.x += 0.15
        offsetPos.y -= 0.15
      }
      const p2 = createProjectile(offsetPos, offsetDir, weapon)
      if (p2) {
        p2.damage = Math.round(p2.damage * 0.5)
        setTimeout(() => { activeProjectiles.push(p2) }, 80)
      }
    }

    return true
  }
  return false
}

let _equippedWeapon: WeaponId | null = null
let _lastCamera: THREE.Camera | null = null

// ── Weapon ownership & purchase ──────────────────────────
let _ownedWeapons: Set<WeaponId> = new Set(['energyPistol'])

export function getOwnedWeapons(): WeaponId[] {
  return Array.from(_ownedWeapons)
}

export function purchaseWeapon(id: WeaponId): boolean {
  const cfg = WEAPONS[id]
  if (!cfg) return false
  if (_ownedWeapons.has(id)) return false
  if (cfg.unlockFormula) {
    const state = useStore.getState()
    if (!state.formulaDiscovered(cfg.unlockFormula)) return false
  }
  if (!spendTimeCredit(cfg.tcCost)) return false
  _ownedWeapons.add(id)
  _equippedWeapon = id
  setEquippedWeapon(id)
  return true
}

/** Grant a weapon for free (quest rewards, etc.) */
export function grantWeapon(id: WeaponId): boolean {
  const cfg = WEAPONS[id]
  if (!cfg) return false
  if (_ownedWeapons.has(id)) return false
  _ownedWeapons.add(id)
  _equippedWeapon = id
  setEquippedWeapon(id)
  return true
}

/** Auto-equip the default weapon on first call */
export function initWeapon() {
  if (!_equippedWeapon) {
    _equippedWeapon = 'energyPistol'
    setEquippedWeapon('energyPistol')
  }
}

/** Get currently equipped weapon */
export function getWeapon(): WeaponId | null {
  return _equippedWeapon
}

/** Get remaining ammo (liquid / ammoCost) using effective stats */
export function getWeaponAmmo(): number {
  if (!_equippedWeapon) return 0
  const effective = getEffectiveWeaponStats(_equippedWeapon)
  const liquid = useStore.getState().inventory.liquid
  return Math.floor(liquid / effective.ammoCost)
}

/** Equip a weapon via keybinding */
export function cycleWeapon(dir: 1 | -1): WeaponId | null {
  const weaponIds: WeaponId[] = ['energyPistol', 'energyRifle', 'timeBlaster']
  const idx = weaponIds.indexOf(_equippedWeapon as WeaponId)
  const next = (idx + dir + weaponIds.length) % weaponIds.length
  const wep = WEAPONS[weaponIds[next]]
  if (wep.unlockFormula) {
    const state = useStore.getState()
    if (!state.formulaDiscovered(wep.unlockFormula)) {
      return _equippedWeapon
    }
  }
  _equippedWeapon = weaponIds[next]
  setEquippedWeapon(_equippedWeapon)
  return _equippedWeapon
}

/** Equip a specific weapon (checks formula + ownership). */
export function cycleWeaponAbsolute(id: WeaponId): WeaponId | null {
  const wep = WEAPONS[id]
  if (wep.unlockFormula) {
    const state = useStore.getState()
    if (!state.formulaDiscovered(wep.unlockFormula)) return _equippedWeapon
  }
  if (!_ownedWeapons.has(id)) return _equippedWeapon
  if (_equippedWeapon === id) return id
  _equippedWeapon = id
  setEquippedWeapon(id)
  return id
}

export const ProjectileManager = () => {
  const groupRef = useRef<THREE.Group>(null)
  const { camera } = useThree()
  const raycaster = useRef(new THREE.Raycaster())

  // Store camera ref for firing
  useEffect(() => { _lastCamera = camera }, [camera])

  // Auto-equip pistol on mount + init weapon modifiers
  useEffect(() => {
    initWeapon()
    initWeaponModifiers()
  }, [])

  // Keyboard: Q to fire, scroll to cycle weapons
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'q' || e.key === 'Q') {
        if (!isPlayerDriving()) fireProjectile()
      }
    }
    const handleWheel = (e: WheelEvent) => {
      if (!document.pointerLockElement) return
      if (e.deltaY < 0) cycleWeapon(1)
      else if (e.deltaY > 0) cycleWeapon(-1)
    }
    window.addEventListener('keydown', handleKey)
    window.addEventListener('wheel', handleWheel)
    return () => {
      window.removeEventListener('keydown', handleKey)
      window.removeEventListener('wheel', handleWheel)
    }
  }, [])

  useFrame((_, delta) => {
    // Update projectiles
    for (let i = activeProjectiles.length - 1; i >= 0; i--) {
      const p = activeProjectiles[i]
      const step = p.speed * delta
      p.pos.addScaledVector(p.dir, step)
      p.traveled += step
      p.mesh.position.copy(p.pos)

      // Trail effect
      const mat = p.mesh.material as THREE.MeshBasicMaterial
      mat.opacity = Math.max(0.3, 1 - p.traveled / p.range)

      // Hit detection against enemies
      if (p.traveled > 2) { // Ignore first few units (too close)
        const enemies = getEnemyMeshes()
        raycaster.current.set(p.pos, p.dir)
        const intersects = raycaster.current.intersectObjects(enemies, false)
        if (intersects.length > 0) {
          const hit = intersects[0]
          const enemyData = hit.object.userData as { enemyId?: string }
          if (enemyData.enemyId && hit.distance < step * 1.5) {
            damageEnemy(enemyData.enemyId, p.damage)
            // Crit VFX
            if (p.isCrit) {
              queueBurst(p.pos.clone(), 30, '#ffdd44', 8)
              queueBurst(p.pos.clone(), 15, '#ffffff', 4)
              triggerShake(0.15, 12, 0.2)
              window.dispatchEvent(new CustomEvent('crosshair-crit'))
            } else {
              queueBurst(p.pos.clone(), 20, p.color, 6)
              queueBurst(p.pos.clone(), 8, '#ffffff', 2)
              triggerShake(0.1, 10, 0.15)
            }
            playHitSound()
            window.dispatchEvent(new CustomEvent('crosshair-hit'))
            removeProj(i)
            continue
          }
        }

        // Hit terrain? Check if below terrain surface
        const terrainY = getInfiniteTerrainHeight(p.pos.x, p.pos.z)
        if (p.pos.y < terrainY) {
          queueBurst(p.pos.clone(), 8, p.color, 2)
          removeProj(i)
          continue
        }
      }

      if (p.traveled > p.range) {
        removeProj(i)
      }
    }
  })

  return (
    <group ref={groupRef}>
      {activeProjectiles.map((p) => (
        <primitive key={p.id} object={p.mesh} />
      ))}
    </group>
  )
}

function removeProj(index: number) {
  const p = activeProjectiles[index]
  if (p.mesh.parent) p.mesh.parent.remove(p.mesh)
  if (p.mesh.material) (p.mesh.material as THREE.Material).dispose()
  activeProjectiles.splice(index, 1)
}
