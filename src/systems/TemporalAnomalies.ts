// ── Temporal Anomaly Events — dynamic world events ──
// Random events trigger based on threat level. Each event temporarily
// transforms gameplay with unique rules and rewards.

import { getThreatLevel } from './EnemyEvolution'

export interface AnomalyEvent {
  id: string
  name: string
  icon: string
  color: string
  description: string
  effect: string
  duration: number // seconds
  minThreat: number
  cooldown: number // seconds
  apply: () => AnomalyEffect
}

export interface AnomalyEffect {
  harvestMult: number
  damageMult: number
  speedMult: number
  enemySpawnMult: number
  lootMult: number
  rawPerSecond: number
  description: string
}

const NEUTRAL: AnomalyEffect = {
  harvestMult: 1, damageMult: 1, speedMult: 1,
  enemySpawnMult: 1, lootMult: 1, rawPerSecond: 0,
  description: 'No active anomaly',
}

const EVENTS: AnomalyEvent[] = [
  {
    id: 'chrono_shower', name: 'Chrono Shower', icon: 'sparkles', color: '#44ff88',
    description: 'Temporal energy rains from the sky.',
    effect: '2x harvest, +5 raw/s',
    duration: 30, minThreat: 0, cooldown: 120,
    apply: () => ({
      harvestMult: 2, damageMult: 1, speedMult: 1,
      enemySpawnMult: 1, lootMult: 1.5, rawPerSecond: 5,
      description: 'Chrono Shower - 2x harvest, +5 raw/s',
    }),
  },
  {
    id: 'time_warp', name: 'Time Warp', icon: 'cyclone', color: '#44aaff',
    description: 'Time flows differently. Everything accelerates.',
    effect: '2x speed, 2x fire rate, 2x enemy spawn',
    duration: 20, minThreat: 1, cooldown: 180,
    apply: () => ({
      harvestMult: 1, damageMult: 1.5, speedMult: 2,
      enemySpawnMult: 2, lootMult: 2, rawPerSecond: 0,
      description: 'Time Warp - 2x speed, 2x fire rate, 2x enemies',
    }),
  },
  {
    id: 'void_incursion', name: 'Void Incursion', icon: 'hole', color: '#aa44ff',
    description: 'Void creatures pour through a dimensional tear.',
    effect: '5x enemies, 3x loot, endless combat',
    duration: 40, minThreat: 2, cooldown: 300,
    apply: () => ({
      harvestMult: 1, damageMult: 1, speedMult: 1,
      enemySpawnMult: 5, lootMult: 3, rawPerSecond: 0,
      description: 'Void Incursion - 5x enemies, 3x loot',
    }),
  },
  {
    id: 'time_freeze', name: 'Temporal Freeze', icon: 'snowflake', color: '#44ffff',
    description: 'Everything freezes - except you.',
    effect: 'Enemies frozen, 3x damage',
    duration: 15, minThreat: 3, cooldown: 240,
    apply: () => ({
      harvestMult: 1.5, damageMult: 3, speedMult: 1.5,
      enemySpawnMult: 0, lootMult: 2, rawPerSecond: 0,
      description: 'Temporal Freeze - enemies frozen, 3x damage',
    }),
  },
  {
    id: 'reality_fracture', name: 'Reality Fracture', icon: 'diamond', color: '#ff44ff',
    description: 'Reality cracks open, spilling raw chrono energy.',
    effect: '5x harvest, 2x loot, chaotic enemies',
    duration: 25, minThreat: 4, cooldown: 360,
    apply: () => ({
      harvestMult: 5, damageMult: 0.5, speedMult: 0.8,
      enemySpawnMult: 3, lootMult: 2, rawPerSecond: 20,
      description: 'Reality Fracture - 5x harvest, 2x loot, +20 raw/s',
    }),
  },
  {
    id: 'omega_storm', name: 'Omega Storm', icon: 'zap', color: '#ff0044',
    description: 'The ultimate temporal storm. Survive for glory.',
    effect: '10x all rewards, constant boss waves',
    duration: 60, minThreat: 6, cooldown: 600,
    apply: () => ({
      harvestMult: 10, damageMult: 2, speedMult: 1.5,
      enemySpawnMult: 10, lootMult: 5, rawPerSecond: 50,
      description: 'OMEGA STORM - 10x rewards, boss waves!',
    }),
  },
]

// ── State ─────────────────────────────────────────────────

export interface AnomalyState {
  active: boolean
  currentEvent: string | null
  timeRemaining: number
  effect: AnomalyEffect
  lastEventTime: number // timestamp when last event ended
  eventsTriggered: number
  lastEventId: string | null
}

let _state: AnomalyState = {
  active: false, currentEvent: null,
  timeRemaining: 0, effect: { ...NEUTRAL },
  lastEventTime: 0, eventsTriggered: 0,
  lastEventId: null,
}

let _cooldowns: Record<string, number> = {} // event id -> ready timestamp

export function getAnomalyState(): AnomalyState { return { ..._state, effect: { ..._state.effect } } }

export function getActiveEvent(): AnomalyEvent | undefined {
  if (!_state.active || !_state.currentEvent) return undefined
  return EVENTS.find((e) => e.id === _state.currentEvent)
}

export function getCurrentEffect(): AnomalyEffect {
  return _state.active ? { ..._state.effect } : { ...NEUTRAL }
}

/** Try to trigger a random event */
export function tryTriggerAnomaly(): AnomalyEvent | null {
  if (_state.active) return null

  const threat = getThreatLevel()
  const now = Date.now()

  // Filter available events
  const available = EVENTS.filter((e) => {
    if (e.minThreat > threat) return false
    const readyAt = _cooldowns[e.id] ?? 0
    if (now < readyAt) return false
    return true
  })

  if (available.length === 0) return null

  const event = available[Math.floor(Math.random() * available.length)]

  _state.active = true
  _state.currentEvent = event.id
  _state.timeRemaining = event.duration
  _state.effect = event.apply()
  _state.lastEventId = event.id
  _state.eventsTriggered++

  return event
}

/** Tick anomaly — call from TimeManager */
export function tickAnomaly(dt: number): void {
  if (!_state.active) {
    // Random chance to trigger based on threat
    const threat = getThreatLevel()
    const chance = (threat + 1) * 0.0001 // increases with threat
    if (Math.random() < chance) {
      tryTriggerAnomaly()
    }
    return
  }

  _state.timeRemaining -= dt
  if (_state.timeRemaining <= 0) {
    _state.active = false
    _state.currentEvent = null
    _state.effect = { ...NEUTRAL }
    _state.lastEventTime = Date.now()
  }
}

export function serializeAnomaly(): AnomalyState & { cooldowns: Record<string, number> } {
  return { ..._state, effect: { ..._state.effect }, cooldowns: { ..._cooldowns } }
}

export function loadAnomaly(data: AnomalyState & { cooldowns: Record<string, number> }): void {
  _state = {
    active: data.active ?? false,
    currentEvent: data.currentEvent ?? null,
    timeRemaining: data.timeRemaining ?? 0,
    effect: data.effect ?? { ...NEUTRAL },
    lastEventTime: data.lastEventTime ?? 0,
    eventsTriggered: data.eventsTriggered ?? 0,
    lastEventId: data.lastEventId ?? null,
  }
  _cooldowns = data.cooldowns ?? {}
}
