// ── World Boss Events — periodic massive enemies with global announcements ──

import { useStore } from '../store'
import type { EnemyType } from '../config/combat'

export interface WorldBossDef {
  id: string
  name: string
  enemyType: EnemyType
  health: number
  maxHealth: number
  damage: number
  speed: number
  color: string
  rewards: { raw: number; liquid: number; crystal: number; renown: number }
  spawnMessage: string
  killMessage: string
  scale: number
  spawnInterval: number // seconds between spawn attempts
  minKillsToSpawn: number // total bestiary kills needed
}

let _bosses: WorldBossDef[] = [
  {
    id: 'worldBoss1',
    name: 'The Void Colossus',
    enemyType: 'chronoBehemoth',
    health: 2000,
    maxHealth: 2000,
    damage: 40,
    speed: 1.5,
    color: '#ff44aa',
    rewards: { raw: 200, liquid: 50, crystal: 25, renown: 30 },
    spawnMessage: '⚠ THE VOID COLOSSUS HAS AWAKENED ⚠',
    killMessage: '✦ VOID COLOSSUS DEFEATED — Rewards Distributed ✦',
    scale: 5,
    spawnInterval: 300, // 5 minutes
    minKillsToSpawn: 50,
  },
  {
    id: 'worldBoss2',
    name: 'The Temporal Titan',
    enemyType: 'timeTyrant',
    health: 5000,
    maxHealth: 5000,
    damage: 60,
    speed: 2.0,
    color: '#ff8800',
    rewards: { raw: 500, liquid: 100, crystal: 50, renown: 75 },
    spawnMessage: '⚠ THE TEMPORAL TITAN DESCENDS ⚠',
    killMessage: '✦ TEMPORAL TITAN BANISHED — Glorious Rewards ✦',
    scale: 7,
    spawnInterval: 600, // 10 minutes
    minKillsToSpawn: 200,
  },
  {
    id: 'worldBoss3',
    name: 'Omega Chronarch',
    enemyType: 'timeTyrant',
    health: 15000,
    maxHealth: 15000,
    damage: 100,
    speed: 2.5,
    color: '#ff0044',
    rewards: { raw: 2000, liquid: 500, crystal: 200, renown: 250 },
    spawnMessage: '⚠ OMEGA CHRONARCH RISES — ALL HANDS ⚠',
    killMessage: '✦ OMEGA CHRONARCH ANNIHILATED — LEGENDARY REWARDS ✦',
    scale: 10,
    spawnInterval: 1800, // 30 minutes
    minKillsToSpawn: 500,
  },
]

// ── State ──────────────────────────────────────────────────

let _activeBoss: WorldBossDef | null = null
let _bossHealth: number = 0
let _bossSpawnTimer: number = 120 // start checking after 2 minutes
let _bossesKilled: number = 0
let _lastBossKillTime: number = 0
let _bossActiveTime: number = 0
let _bossEventActive: boolean = false
let _bossMessage: string | null = null
let _bossMessageTime: number = 0
let _bossPosition: [number, number, number] = [0, 0, 0]

export function isBossActive(): boolean {
  return _bossEventActive && _activeBoss !== null
}

export function getActiveBoss(): WorldBossDef | null {
  return _activeBoss
}

export function getBossHealth(): number {
  return _bossHealth
}

export function getBossMaxHealth(): number {
  return _activeBoss?.maxHealth ?? 0
}

export function getBossesKilled(): number {
  return _bossesKilled
}

export function getBossMessage(): string | null {
  return _bossMessage
}

export function getBossMessageTime(): number {
  return _bossMessageTime
}

export function clearBossMessage(): void {
  _bossMessage = null
}

export function getBossPosition(): [number, number, number] {
  return _bossPosition
}

export function getBossSpawnTimer(): number {
  return _bossSpawnTimer
}

/** Tick the world boss system */
export function tickWorldBosses(dt: number, totalBestiaryKills: number): void {
  if (_bossEventActive && _activeBoss) {
    _bossActiveTime += dt
    return
  }

  _bossSpawnTimer -= dt
  if (_bossSpawnTimer <= 0) {
    // Check if we can spawn a boss
    for (const boss of _bosses) {
      if (totalBestiaryKills >= boss.minKillsToSpawn) {
        // Don't respawn same boss if we just killed it
        const timeSinceLastKill = (Date.now() - _lastBossKillTime) / 1000
        if (_bossesKilled > 0 && boss.name.includes('Chronarch') && timeSinceLastKill < boss.spawnInterval) continue
        if (_bossesKilled > 0 && boss.name.includes('Titan') && timeSinceLastKill < boss.spawnInterval * 0.5) continue

        spawnBoss(boss)
        return
      }
    }
    // Reset timer if no boss can spawn
    _bossSpawnTimer = 60
  }
}

function spawnBoss(boss: WorldBossDef): void {
  _activeBoss = boss
  _bossHealth = boss.maxHealth
  _bossEventActive = true
  _bossActiveTime = 0
  _bossMessage = boss.spawnMessage
  _bossMessageTime = Date.now()

  // Spawn at a random position ~40-60 units from origin
  const angle = Math.random() * Math.PI * 2
  const dist = 40 + Math.random() * 20
  _bossPosition = [Math.cos(angle) * dist, 0, Math.sin(angle) * dist]
}

/** Deal damage to the active boss */
export function damageBoss(amount: number): boolean {
  if (!_bossEventActive || !_activeBoss) return false

  _bossHealth = Math.max(0, _bossHealth - amount)

  if (_bossHealth <= 0) {
    killBoss()
    return true
  }
  return false
}

function killBoss(): void {
  if (!_activeBoss) return

  const rewards = _activeBoss.rewards
  const state = useStore.getState()
  state.addRaw(rewards.raw)
  state.addRenown(rewards.renown)
  useStore.setState((s) => ({
    inventory: {
      ...s.inventory,
      liquid: s.inventory.liquid + rewards.liquid,
      crystal: s.inventory.crystal + rewards.crystal,
    },
  }))

  _bossesKilled++
  _lastBossKillTime = Date.now()
  _bossMessage = _activeBoss.killMessage
  _bossMessageTime = Date.now()
  _bossEventActive = false
  _bossSpawnTimer = _activeBoss.spawnInterval
  _activeBoss = null
}

/** Get damage multiplier based on distance from boss */
export function getBossDistanceDamageMultiplier(dist: number): number {
  if (dist < 10) return 1.0
  if (dist < 20) return 0.8
  if (dist < 30) return 0.5
  return 0.25
}

/** Serialize boss state for saving */
export function serializeBossState(): object {
  return {
    bossesKilled: _bossesKilled,
    lastBossKillTime: _lastBossKillTime,
  }
}

/** Load boss state from save */
export function loadBossState(data: { bossesKilled: number; lastBossKillTime: number }): void {
  _bossesKilled = data.bossesKilled ?? 0
  _lastBossKillTime = data.lastBossKillTime ?? 0
}
