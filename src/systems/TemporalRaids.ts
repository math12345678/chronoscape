// ── Temporal Raids — high-difficulty boss challenges ──
// Tiered raids with scaling rewards. Each raid is a powerful boss
// with unique mechanics. Beating a raid unlocks the next tier.

import { useStore } from '../store'

export interface RaidBossDef {
  id: string
  tier: number
  name: string
  icon: string
  color: string
  description: string
  health: number
  damage: number
  attackSpeed: number
  reward: { raw: number; liquid: number; crystal: number; renown: number }
  specialReward: string // item or effect description
  timeLimit: number // seconds
  abilities: string[] // boss ability names
  threatRequired: number // minimum threat level
  prestigeRequired: number // minimum prestige rank
}

const RAID_BOSSES: RaidBossDef[] = [
  {
    id: 'raid_t1', tier: 1,
    name: 'Temporal Warden', icon: '🗡️', color: '#44aaff',
    description: 'A guardian of the timeline. Your first real challenge.',
    health: 500, damage: 15, attackSpeed: 1.5,
    reward: { raw: 500, liquid: 100, crystal: 20, renown: 10 },
    specialReward: 'Warden\'s Blessing (+5% damage)',
    timeLimit: 120, abilities: ['Time Slash', 'Temporal Shield'],
    threatRequired: 0, prestigeRequired: 0,
  },
  {
    id: 'raid_t2', tier: 2,
    name: 'Chrono Hydra', icon: '🐍', color: '#ff8844',
    description: 'A hydra that exists across multiple timelines. Kill all heads at once.',
    health: 2000, damage: 30, attackSpeed: 1.2,
    reward: { raw: 2000, liquid: 500, crystal: 100, renown: 25 },
    specialReward: 'Hydra Heart (+10% fire rate)',
    timeLimit: 150, abilities: ['Multi-Headed Strike', 'Timeline Regeneration'],
    threatRequired: 2, prestigeRequired: 3,
  },
  {
    id: 'raid_t3', tier: 3,
    name: 'Paradox Serpent', icon: '🐉', color: '#aa44ff',
    description: 'A serpent that eats its own tail — and your timeline.',
    health: 8000, damage: 60, attackSpeed: 1.0,
    reward: { raw: 8000, liquid: 2000, crystal: 500, renown: 75 },
    specialReward: 'Ouroboros Ring (+15% all stats)',
    timeLimit: 180, abilities: ['Paradox Bite', 'Timeline Loop', 'Void Breath'],
    threatRequired: 4, prestigeRequired: 6,
  },
  {
    id: 'raid_t4', tier: 4,
    name: 'Epoch Devourer', icon: '👹', color: '#ff4444',
    description: 'It consumes entire epochs for breakfast. You are a snack.',
    health: 30000, damage: 120, attackSpeed: 0.8,
    reward: { raw: 30000, liquid: 10000, crystal: 2000, renown: 200 },
    specialReward: 'Epoch Shard (+25% damage)',
    timeLimit: 240, abilities: ['Epoch Crush', 'Time Drain', 'Reality Bend', 'Devour'],
    threatRequired: 6, prestigeRequired: 10,
  },
  {
    id: 'raid_t5', tier: 5,
    name: 'Omega Chronarch', icon: '✦', color: '#ff00ff',
    description: 'The final form of CHRONOS. Defeat yourself to become more.',
    health: 100000, damage: 300, attackSpeed: 0.5,
    reward: { raw: 100000, liquid: 50000, crystal: 10000, renown: 1000 },
    specialReward: 'Omega Ascension Shard (+50 Ascension Shards)',
    timeLimit: 300, abilities: ['Omega Strike', 'Timeline Collapse', 'Void Nova', 'CHRONOS Form'],
    threatRequired: 8, prestigeRequired: 20,
  },
]

export interface RaidState {
  active: boolean
  currentBoss: string | null
  bossHealth: number
  bossMaxHealth: number
  startTime: number
  damageDealt: number
  completed: boolean
  won: boolean
  timeElapsed: number
}

export interface RaidProgress {
  completedRaids: string[] // raid IDs completed
  bestTimes: Record<string, number> // best completion time per raid
  totalRaidsWon: number
  totalRaidsAttempted: number
}

let _raidState: RaidState = {
  active: false, currentBoss: null, bossHealth: 0, bossMaxHealth: 0,
  startTime: 0, damageDealt: 0, completed: false, won: false, timeElapsed: 0,
}

let _raidProgress: RaidProgress = {
  completedRaids: [], bestTimes: {}, totalRaidsWon: 0, totalRaidsAttempted: 0,
}

export function getAllRaidBosses(): RaidBossDef[] {
  return [...RAID_BOSSES]
}

export function getRaidBoss(id: string): RaidBossDef | undefined {
  return RAID_BOSSES.find((r) => r.id === id)
}

export function getRaidState(): RaidState { return { ..._raidState } }

export function getRaidProgress(): RaidProgress { return { ..._raidProgress } }

export function isRaidCompleted(id: string): boolean {
  return _raidProgress.completedRaids.includes(id)
}

/** Check if a raid is unlocked */
export function isRaidUnlocked(raid: RaidBossDef): boolean {
  // Check if previous tier is completed (except T1)
  if (raid.tier > 1) {
    const prev = RAID_BOSSES.find((r) => r.tier === raid.tier - 1)
    if (prev && !_raidProgress.completedRaids.includes(prev.id)) return false
  }
  return true
}

/** Start a raid */
export function startRaid(id: string): boolean {
  const boss = RAID_BOSSES.find((r) => r.id === id)
  if (!boss) return false
  if (_raidState.active) return false
  if (_raidProgress.completedRaids.includes(id)) {
    // Allow replaying
  }

  _raidState = {
    active: true,
    currentBoss: id,
    bossHealth: boss.health,
    bossMaxHealth: boss.health,
    startTime: Date.now(),
    damageDealt: 0,
    completed: false,
    won: false,
    timeElapsed: 0,
  }
  _raidProgress.totalRaidsAttempted++

  return true
}

/** Deal damage to the current raid boss */
export function damageRaidBoss(damage: number): boolean {
  if (!_raidState.active || !_raidState.currentBoss) return false

  _raidState.bossHealth -= damage
  _raidState.damageDealt += damage
  _raidState.timeElapsed = (Date.now() - _raidState.startTime) / 1000

  const boss = getRaidBoss(_raidState.currentBoss)

  // Check win
  if (_raidState.bossHealth <= 0) {
    _raidState.bossHealth = 0
    _raidState.completed = true
    _raidState.won = true
    _raidProgress.totalRaidsWon++

    if (boss) {
      _raidProgress.completedRaids.push(boss.id)
      _raidProgress.bestTimes[boss.id] = _raidState.timeElapsed

      // Award rewards
      useStore.setState((s) => ({
        inventory: {
          ...s.inventory,
          raw: s.inventory.raw + boss.reward.raw,
          liquid: s.inventory.liquid + boss.reward.liquid,
          crystal: s.inventory.crystal + boss.reward.crystal,
          renown: s.inventory.renown + boss.reward.renown,
        },
      }))
    }

    return true
  }

  // Check time limit
  if (boss && _raidState.timeElapsed >= boss.timeLimit) {
    _raidState.completed = true
    _raidState.won = false
    return true
  }

  return true
}

/** Get raid boss damage (for boss attacking player) */
export function getRaidBossDamage(): number {
  if (!_raidState.active || !_raidState.currentBoss) return 0
  const boss = getRaidBoss(_raidState.currentBoss)
  return boss?.damage ?? 0
}

/** Abort active raid */
export function abortRaid(): void {
  _raidState = {
    active: false, currentBoss: null, bossHealth: 0, bossMaxHealth: 0,
    startTime: 0, damageDealt: 0, completed: false, won: false, timeElapsed: 0,
  }
}

// ── Serialization ────────────────────────────────────────

export function serializeRaids(): { state: RaidState; progress: RaidProgress } {
  return { state: { ..._raidState }, progress: { ..._raidProgress } }
}

export function loadRaids(data: { state: RaidState; progress: RaidProgress }): void {
  _raidState = { ...data.state }
  _raidProgress = { ...data.progress }
}
