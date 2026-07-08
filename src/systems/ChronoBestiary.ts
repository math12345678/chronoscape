// ── Chrono Bestiary — kill tracking, lore, rewards ──────────────

import { ENEMIES } from '../config/combat'
import type { EnemyType } from '../config/combat'

export interface BestiaryEntry {
  enemyType: EnemyType
  kills: number
  loreDiscovered: boolean
  loreText: string
  firstKilledAt: number | null
  lastKilledAt: number | null
}

const ENEMY_LORE: Record<EnemyType, string> = {
  wraith: 'These faint echoes of discarded timelines drift through the Chronoscape. Harmless alone, dangerous in numbers. They are drawn to temporal energy like moths to flame.',
  voidWraith: 'Wraiths that have been touched by the Void Between Time. Their crimson glow signals a corruption that spreads to anything they consume. Kill them before they multiply.',
  timeCrystalGolem: 'Ancient guardians formed from crystallized time itself. Their bodies are living refineries, slowly converting ambient temporal energy into pure crystal. Immensely durable.',
  phaseShifter: 'Creatures that have learned to slip between moments. They appear and disappear at will, striking from angles that don\'t exist. A true test of reflexes.',
  temporalSentinel: 'Automated defense constructs left behind by a forgotten civilization of time-masters. They patrol fixed routes and punish any temporal disturbance with overwhelming force.',
  chronoBehemoth: 'A walking catastrophe. When timelines collapse, the debris sometimes coalesces into these titans. Each step shakes the foundations of reality. Few have survived an encounter.',
  timeTyrant: 'The apex predator of the chronosphere. Time Tyrants are what happens when a Chrono-Behemoth feeds for millennia. They command lesser enemies and warp the flow of time itself.',
}

const REWARD_THRESHOLDS = [10, 50, 100, 500, 1000]

// ── State ──────────────────────────────────────────────────

let _bestiary: Record<EnemyType, BestiaryEntry> = {} as Record<EnemyType, BestiaryEntry>
let _totalKills = 0
let _lastKillTime = 0
let _lastKillType: EnemyType | null = null

export function initBestiary(): void {
  const types = Object.keys(ENEMIES) as EnemyType[]
  for (const t of types) {
    if (!_bestiary[t]) {
      _bestiary[t] = {
        enemyType: t,
        kills: 0,
        loreDiscovered: false,
        loreText: ENEMY_LORE[t] ?? 'Unknown creature.',
        firstKilledAt: null,
        lastKilledAt: null,
      }
    }
  }
}

export function getBestiary(): Record<EnemyType, BestiaryEntry> {
  return { ..._bestiary }
}

export function getBestiaryForType(type: EnemyType): BestiaryEntry {
  if (!_bestiary[type]) {
    _bestiary[type] = {
      enemyType: type,
      kills: 0,
      loreDiscovered: false,
      loreText: ENEMY_LORE[type] ?? 'Unknown creature.',
      firstKilledAt: null,
      lastKilledAt: null,
    }
  }
  return { ..._bestiary[type] }
}

export function getTotalKills(): number {
  return _totalKills
}

export function getLastKillInfo(): { type: EnemyType | null; time: number } {
  return { type: _lastKillType, time: _lastKillTime }
}

/** Record a kill for bestiary tracking */
export function recordBestiaryKill(type: EnemyType): void {
  if (!_bestiary[type]) {
    initBestiary()
  }

  const entry = _bestiary[type]
  entry.kills++
  if (!entry.firstKilledAt) entry.firstKilledAt = Date.now()
  entry.lastKilledAt = Date.now()
  _totalKills++
  _lastKillTime = Date.now()
  _lastKillType = type

  // Unlock lore on first kill
  if (!entry.loreDiscovered) {
    entry.loreDiscovered = true
  }
}

/** Check if a reward threshold has been crossed for a given type */
export function checkBestiaryMilestone(type: EnemyType): { threshold: number; reached: boolean }[] {
  const entry = _bestiary[type]
  if (!entry) return []
  return REWARD_THRESHOLDS.map((t) => ({
    threshold: t,
    reached: entry.kills >= t,
  }))
}

/** Get total completion percentage */
export function getBestiaryCompletion(): number {
  const types = Object.keys(ENEMIES) as EnemyType[]
  let discovered = 0
  for (const t of types) {
    if (_bestiary[t]?.loreDiscovered) discovered++
  }
  return types.length > 0 ? Math.round((discovered / types.length) * 100) : 0
}

/** Get total kills across all types */
export function getBestiaryTotalKills(): number {
  let total = 0
  for (const entry of Object.values(_bestiary)) {
    total += entry.kills
  }
  return total
}

/** Serialize bestiary for saving */
export function serializeBestiary(): Record<EnemyType, BestiaryEntry> {
  return { ..._bestiary }
}

/** Load bestiary from save */
export function loadBestiary(data: Record<EnemyType, BestiaryEntry>): void {
  _bestiary = { ...data }
  _totalKills = Object.values(data).reduce((sum, e) => sum + e.kills, 0)
}
