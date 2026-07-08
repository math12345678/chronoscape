// ── Dynamic World Events System ──
// Events that actually occur in the world with gameplay effects.
// Triggered by evolution epochs, distance milestones, and random chance.

import { useStore } from '../store'

export interface WorldEvent {
  id: string
  name: string
  description: string
  type: 'combat' | 'resource' | 'environment' | 'temporal' | 'boss'
  duration: number // seconds
  elapsed: number
  magnitude: number
  color: string
  icon: string
  active: boolean
  effects: {
    damageMult?: number
    lootMult?: number
    spawnRateMult?: number
    harvestMult?: number
    speedMult?: number
    regenBonus?: number
    spawnBoss?: boolean
    spawnEnemyType?: string
    slowTime?: boolean
    healPlayer?: boolean
  }
  triggeredBy: 'epoch' | 'distance' | 'random' | 'kill_count'
  triggerValue: number
}

// ── Event Pool (procedurally generated + LLM-assisted) ──

const EVENT_TEMPLATES: Omit<WorldEvent, 'id' | 'elapsed' | 'active' | 'triggeredBy' | 'triggerValue'>[] = [
  {
    name: 'Time Storm', description: 'A storm of temporal energy rages, boosting damage.', type: 'temporal',
    duration: 45, magnitude: 1.5, color: '#44ffcc', icon: 'storm',
    effects: { damageMult: 1.5, lootMult: 1.3 },
  },
  {
    name: 'Crystal Rain', description: 'Crystals fall from the sky. Harvest rates surge.', type: 'resource',
    duration: 30, magnitude: 2.0, color: '#aa88ff', icon: 'crystal',
    effects: { harvestMult: 2.0, regenBonus: 5 },
  },
  {
    name: 'Void Incursion', description: 'Reality tears open. Enemies pour through.', type: 'combat',
    duration: 60, magnitude: 2.0, color: '#ff4444', icon: 'void',
    effects: { spawnRateMult: 3.0, damageMult: 1.2 },
  },
  {
    name: 'Chrono Quake', description: 'The ground shakes. Time itself slows.', type: 'environment',
    duration: 20, magnitude: 0.5, color: '#ff8844', icon: 'quake',
    effects: { slowTime: true, speedMult: 0.5 },
  },
  {
    name: 'Reality Fracture', description: 'Reality splinters. Rare resources emerge.', type: 'temporal',
    duration: 40, magnitude: 3.0, color: '#ff00ff', icon: 'fracture',
    effects: { lootMult: 3.0, harvestMult: 1.5 },
  },
  {
    name: 'Boss Rush', description: 'A powerful boss arrives.', type: 'boss',
    duration: 120, magnitude: 1.0, color: '#ffd700', icon: 'boss',
    effects: { spawnBoss: true, damageMult: 1.3 },
  },
  {
    name: 'Healing Mists', description: 'Time energy mists heal all wounds.', type: 'environment',
    duration: 25, magnitude: 1.0, color: '#44ff88', icon: 'heal',
    effects: { healPlayer: true, regenBonus: 20 },
  },
  {
    name: 'Omega Surge', description: 'Pure chrono energy floods the area.', type: 'temporal',
    duration: 15, magnitude: 5.0, color: '#ffffff', icon: 'omega',
    effects: { damageMult: 3.0, lootMult: 4.0, harvestMult: 3.0 },
  },
]

// ── State ─────────────────────────────────────────────────

let _activeEvents: WorldEvent[] = []
let _eventHistory: WorldEvent[] = []
let _totalEventsTriggered = 0
let _lastRandomEventTime = 0
const MIN_RANDOM_INTERVAL = 60_000 // 60 seconds between random events

// ── Public API ───────────────────────────────────────────

export function getActiveWorldEvents(): WorldEvent[] { return _activeEvents.filter(e => e.active).map(e => ({ ...e })) }
export function getEventHistory(): WorldEvent[] { return _eventHistory.map(e => ({ ...e })) }
export function getTotalEventsTriggered(): number { return _totalEventsTriggered }

/** Call when an evolution epoch triggers */
export function triggerEpochEvent(epoch: number): WorldEvent {
  const template = EVENT_TEMPLATES[epoch % EVENT_TEMPLATES.length]
  return triggerEvent({
    ...template,
    triggeredBy: 'epoch',
    triggerValue: epoch,
  })
}

/** Call when player reaches distance milestones */
export function checkDistanceEvent(distance: number): WorldEvent | null {
  const milestones = [500, 1000, 2500, 5000, 10000, 25000, 50000, 100000]
  const shouldTrigger = milestones.includes(Math.floor(distance))
  if (!shouldTrigger) return null

  const template = EVENT_TEMPLATES[(milestones.indexOf(Math.floor(distance)) + 2) % EVENT_TEMPLATES.length]
  return triggerEvent({
    ...template,
    triggeredBy: 'distance',
    triggerValue: distance,
  })
}

/** Try to trigger a random event */
export function tryRandomEvent(): WorldEvent | null {
  const now = Date.now()
  if (now - _lastRandomEventTime < MIN_RANDOM_INTERVAL) return null
  if (Math.random() > 0.05) return null // 5% chance per check

  const template = EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)]
  _lastRandomEventTime = now
  return triggerEvent({
    ...template,
    triggeredBy: 'random',
    triggerValue: 0,
  })
}

/** Trigger a kill-count event */
export function checkKillCountEvent(kills: number): WorldEvent | null {
  const milestones = [25, 50, 100, 250, 500, 1000, 2500, 5000]
  const shouldTrigger = milestones.includes(kills)
  if (!shouldTrigger) return null

  const template = EVENT_TEMPLATES[(milestones.indexOf(kills) + 4) % EVENT_TEMPLATES.length]
  return triggerEvent({
    ...template,
    triggeredBy: 'kill_count',
    triggerValue: kills,
  })
}

// ── Core Trigger Logic ──────────────────────────────────

function triggerEvent(partial: Omit<WorldEvent, 'id' | 'elapsed' | 'active'>): WorldEvent {
  const event: WorldEvent = {
    ...partial,
    id: `world_event_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    elapsed: 0,
    active: true,
  }

  _activeEvents.push(event)
  _eventHistory.push(event)
  _totalEventsTriggered++

  // Apply immediate effects
  if (event.effects.healPlayer) {
    try {
      window.dispatchEvent(new CustomEvent('player-heal', { detail: { amount: 50 } }))
    } catch {}
  }

  if (event.effects.spawnBoss) {
    try {
      window.dispatchEvent(new CustomEvent('spawn-boss-wave'))
    } catch {}
  }

  // Dispatch for UI
  try {
    window.dispatchEvent(new CustomEvent('world-event-triggered', { detail: { name: event.name, icon: event.icon, color: event.color, duration: event.duration } }))
  } catch {}

  return event
}

/** Tick active events — call from TimeManager */
export function tickWorldEvents(dt: number): void {
  for (let i = _activeEvents.length - 1; i >= 0; i--) {
    const e = _activeEvents[i]
    e.elapsed += dt
    if (e.elapsed >= e.duration) {
      e.active = false
      _activeEvents.splice(i, 1)
    }
  }
}

/** Get the aggregate multiplier for a given effect type across all active events */
export function getEventEffectMultiplier(effect: keyof WorldEvent['effects']): number {
  let total = 1.0
  for (const e of _activeEvents) {
    if (!e.active) continue
    const val = e.effects[effect]
    if (typeof val === 'number') {
      total += (val - 1) // multiplicative stacking: each event adds its multiplier
    }
    if (typeof val === 'boolean' && val) {
      total += 0.5 // boolean effects add 50%
    }
  }
  return total
}

/** Check if a specific boolean effect is active */
export function hasEventEffect(effect: keyof WorldEvent['effects']): boolean {
  return _activeEvents.some(e => e.active && e.effects[effect] === true)
}

export function serializeWorldEvents(): { active: WorldEvent[]; history: WorldEvent[]; total: number } {
  return {
    active: _activeEvents.map(e => ({ ...e })),
    history: _eventHistory.slice(-100).map(e => ({ ...e })), // keep last 100
    total: _totalEventsTriggered,
  }
}

export function loadWorldEvents(data: { active: WorldEvent[]; history: WorldEvent[]; total: number }): void {
  if (data.active) _activeEvents = data.active.map(e => ({ ...e }))
  if (data.history) _eventHistory = data.history.map(e => ({ ...e }))
  if (data.total) _totalEventsTriggered = data.total
}
