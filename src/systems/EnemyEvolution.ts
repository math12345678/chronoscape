// ── Enemy Evolution + Threat System ──
// Dynamic difficulty scaling: world gets harder, drops get better.

import { getBestiaryTotalKills } from './ChronoBestiary'

export interface ThreatEvolutionStage {
  level: number
  name: string
  description: string
  color: string
  icon: string
  hpMult: number
  damageMult: number
  speedMult: number
  rewardMult: number
  dropRarityMult: number
}

export const THREAT_STAGES: ThreatEvolutionStage[] = [
  { level: 0, name: 'Calm', description: 'The timeline is stable.', color: '#44ff88', icon: '🌱', hpMult: 1, damageMult: 1, speedMult: 1, rewardMult: 1, dropRarityMult: 1 },
  { level: 1, name: 'Rippling', description: 'Small disturbances in time.', color: '#88ff44', icon: '🌊', hpMult: 1.15, damageMult: 1.1, speedMult: 1.05, rewardMult: 1.2, dropRarityMult: 1.1 },
  { level: 2, name: 'Warping', description: 'Reality is bending.', color: '#ffff44', icon: '🌀', hpMult: 1.35, damageMult: 1.25, speedMult: 1.1, rewardMult: 1.5, dropRarityMult: 1.25 },
  { level: 3, name: 'Fractured', description: 'Timelines are splitting.', color: '#ff8844', icon: '💥', hpMult: 1.6, damageMult: 1.5, speedMult: 1.2, rewardMult: 2, dropRarityMult: 1.5 },
  { level: 4, name: 'Chaotic', description: 'Order has broken down.', color: '#ff4444', icon: '🔥', hpMult: 2, damageMult: 1.8, speedMult: 1.3, rewardMult: 3, dropRarityMult: 2 },
  { level: 5, name: 'Apocalyptic', description: 'The end is near.', color: '#ff0044', icon: '☠️', hpMult: 2.5, damageMult: 2.2, speedMult: 1.5, rewardMult: 5, dropRarityMult: 3 },
  { level: 6, name: 'Void Touched', description: 'The void consumes all.', color: '#aa00ff', icon: '🕳️', hpMult: 3.5, damageMult: 3, speedMult: 1.8, rewardMult: 8, dropRarityMult: 5 },
  { level: 7, name: 'Timeless', description: 'Time has stopped caring.', color: '#ff00ff', icon: '⏳', hpMult: 5, damageMult: 4, speedMult: 2, rewardMult: 12, dropRarityMult: 8 },
  { level: 8, name: 'Omega', description: 'The final state of all things.', color: '#ffffff', icon: '✦', hpMult: 8, damageMult: 6, speedMult: 2.5, rewardMult: 20, dropRarityMult: 15 },
]

export interface EvolutionMutation {
  id: string
  name: string
  icon: string
  color: string
  description: string
  minThreatLevel: number
  effect: 'regenerating' | 'explosive' | 'teleporting' | 'shielded' | 'rage' | 'poison' | 'vampiric'
}

export const MUTATIONS: EvolutionMutation[] = [
  { id: 'mut_regeneration', name: 'Regenerating', icon: '💚', color: '#44ff88', description: 'Enemy heals 5% HP every 3 seconds.', minThreatLevel: 2, effect: 'regenerating' },
  { id: 'mut_explosive', name: 'Explosive', icon: '💥', color: '#ff8844', description: 'Enemy explodes on death, dealing AOE damage.', minThreatLevel: 3, effect: 'explosive' },
  { id: 'mut_teleporting', name: 'Teleporting', icon: '✨', color: '#aa44ff', description: 'Enemy can teleport to close range.', minThreatLevel: 3, effect: 'teleporting' },
  { id: 'mut_shielded', name: 'Shielded', icon: '🛡️', color: '#44aaff', description: 'Enemy has a shield that absorbs 3 hits.', minThreatLevel: 4, effect: 'shielded' },
  { id: 'mut_rage', name: 'Enraged', icon: '🔥', color: '#ff4444', description: 'Below 25% HP, enemy deals 2x damage.', minThreatLevel: 5, effect: 'rage' },
  { id: 'mut_poison', name: 'Poisonous', icon: '☣️', color: '#88ff44', description: 'Attacks poison the player for 3s.', minThreatLevel: 5, effect: 'poison' },
  { id: 'mut_vampiric', name: 'Vampiric', icon: '🩸', color: '#ff0044', description: 'Enemy heals 10% of damage dealt.', minThreatLevel: 6, effect: 'vampiric' },
]

export interface ThreatState {
  level: number
  threatScore: number // 0-100 per level, when it hits 100, level up
  totalThreatScore: number
  activeMutations: string[]
}

let _threatState: ThreatState = {
  level: 0,
  threatScore: 0,
  totalThreatScore: 0,
  activeMutations: [],
}

export function getThreatLevel(): number { return _threatState.level }

export function getThreatStage(): ThreatEvolutionStage {
  return THREAT_STAGES[Math.min(_threatState.level, THREAT_STAGES.length - 1)]
}

export function getThreatScore(): number { return _threatState.threatScore }

export function getActiveMutations(): EvolutionMutation[] {
  return MUTATIONS.filter((m) => _threatState.activeMutations.includes(m.id))
}

export function getThreatInfo(): ThreatState { return { ..._threatState } }

// ── Threat Score Calculation ─────────────────────────────

export function recalculateThreatLevel(): void {
  const kills = getBestiaryTotalKills()
  // Every 50 kills = 1 threat score
  const fromKills = Math.floor(kills / 50)

  // Time-based: 1 point per 2 minutes played (approximated)
  // We track this via totalThreatScore which grows over time

  const total = _threatState.totalThreatScore + fromKills

  // Determine level from total
  const newLevel = Math.min(
    THREAT_STAGES.length - 1,
    Math.floor(Math.log2(total / 10 + 1))
  )

  _threatState.level = newLevel
  _threatState.threatScore = total % 100

  // Update active mutations based on level
  const mutations: string[] = []
  for (const mut of MUTATIONS) {
    if (_threatState.level >= mut.minThreatLevel) {
      // Random chance per level above threshold to be active
      const chance = Math.min(1, (_threatState.level - mut.minThreatLevel + 1) * 0.15)
      if (Math.random() < chance) {
        mutations.push(mut.id)
      }
    }
  }
  _threatState.activeMutations = mutations
}

/** Add threat score from combat actions */
export function addThreatScore(amount: number): void {
  _threatState.threatScore += amount
  _threatState.totalThreatScore += amount

  // Check for level up
  if (_threatState.threatScore >= 100) {
    _threatState.threatScore -= 100
    _threatState.level = Math.min(THREAT_STAGES.length - 1, _threatState.level + 1)
    recalculateThreatLevel()
  }
}

/** Add threat from time passing */
export function tickThreat(dt: number): void {
  _threatState.totalThreatScore += dt * 0.01 // 1 point per 100 seconds
  _threatState.threatScore += dt * 0.01
  if (_threatState.threatScore >= 100) {
    _threatState.threatScore -= 100
    _threatState.level = Math.min(THREAT_STAGES.length - 1, _threatState.level + 1)
  }
}

// ── Enemy stat getters ───────────────────────────────────

export function getEnemyHpMultiplier(): number {
  return getThreatStage().hpMult
}

export function getEnemyDamageMultiplier(): number {
  return getThreatStage().damageMult
}

export function getEnemySpeedMultiplier(): number {
  return getThreatStage().speedMult
}

export function getEnemyRewardMultiplier(): number {
  return getThreatStage().rewardMult
}

export function getDropRarityMultiplier(): number {
  return getThreatStage().dropRarityMult
}

/** Get applied mutations for a specific enemy (some mutations may not apply to all types) */
export function getEnemyMutations(): string[] {
  const activeCount = _threatState.activeMutations.length
  if (activeCount === 0) return []

  // Each enemy gets a subset of active mutations
  const count = Math.min(activeCount, Math.floor(_threatState.level / 2) + 1)
  const shuffled = [..._threatState.activeMutations].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

// ── Serialization ────────────────────────────────────────

export function serializeThreat(): ThreatState {
  return { ..._threatState }
}

export function loadThreat(data: ThreatState): void {
  _threatState = { ...data }
}
