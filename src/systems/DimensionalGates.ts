// ── Dimensional Gates — enter alternate dimensions ──
// Each dimension has unique rules, resources, and bosses.
// Time spent in a dimension counts toward in-game time.

import { useStore } from '../store'

export interface DimensionDef {
  id: string
  name: string
  icon: string
  color: string
  description: string
  rule: string // unique gameplay rule
  harvestMult: number
  damageMult: number
  speedMult: number
  enemyDensity: number
  resourceType: string // special resource found here
  resourceChance: number // per kill/action
  bossChance: number // per minute
  unlockCost: { raw?: number; liquid?: number; crystal?: number; renown?: number }
  threatRequired: number
}

export const DIMENSIONS: DimensionDef[] = [
  {
    id: 'dim_fire', name: 'Inferno Realm', icon: 'fire', color: '#ff4400',
    description: 'Everything burns. Fire empowers you.',
    rule: 'Enemies explode on death. Fire damage x2.',
    harvestMult: 1.5, damageMult: 2, speedMult: 1,
    enemyDensity: 1.5, resourceType: 'Ember Shard',
    resourceChance: 0.15, bossChance: 0.02,
    unlockCost: { raw: 5000, liquid: 1000, crystal: 100 },
    threatRequired: 2,
  },
  {
    id: 'dim_ice', name: 'Frozen Expanse', icon: 'snowflake', color: '#44ccff',
    description: 'Absolute zero. Slow but safe.',
    rule: 'Enemies move 50% slower. You move 25% slower.',
    harvestMult: 2, damageMult: 1.5, speedMult: 0.75,
    enemyDensity: 0.8, resourceType: 'Permafrost Crystal',
    resourceChance: 0.2, bossChance: 0.015,
    unlockCost: { raw: 8000, liquid: 2000, crystal: 200, renown: 10 },
    threatRequired: 3,
  },
  {
    id: 'dim_void', name: 'Void Abyss', icon: 'circle', color: '#8800ff',
    description: 'No light. No sound. Only danger.',
    rule: 'Reduced visibility. Enemies are invisible until close.',
    harvestMult: 3, damageMult: 3, speedMult: 1.25,
    enemyDensity: 2, resourceType: 'Void Pearl',
    resourceChance: 0.1, bossChance: 0.03,
    unlockCost: { raw: 15000, liquid: 5000, crystal: 500, renown: 25 },
    threatRequired: 4,
  },
  {
    id: 'dim_chaos', name: 'Chaos Realm', icon: 'zap', color: '#ff00ff',
    description: 'Rules change every 10 seconds.',
    rule: 'Random buff/debuff cycles every 10s.',
    harvestMult: 4, damageMult: 4, speedMult: 1.5,
    enemyDensity: 2.5, resourceType: 'Chaos Fragment',
    resourceChance: 0.25, bossChance: 0.04,
    unlockCost: { raw: 30000, liquid: 10000, crystal: 1000, renown: 50 },
    threatRequired: 5,
  },
  {
    id: 'dim_omega', name: 'Omega Nexus', icon: 'star', color: '#ffffff',
    description: 'The center of all dimensions. Ultimate power.',
    rule: 'All stats x5. Enemies are relentless.',
    harvestMult: 10, damageMult: 5, speedMult: 2,
    enemyDensity: 5, resourceType: 'Omega Core',
    resourceChance: 0.5, bossChance: 0.1,
    unlockCost: { raw: 100000, liquid: 50000, crystal: 5000, renown: 200 },
    threatRequired: 7,
  },
]

// ── State ─────────────────────────────────────────────────

export interface DimensionState {
  active: boolean
  currentDimension: string | null
  timeInDimension: number
  totalTimePerDimension: Record<string, number>
  resourcesCollected: Record<string, number>
  bossesDefeated: Record<string, number>
}

let _state: DimensionState = {
  active: false, currentDimension: null,
  timeInDimension: 0,
  totalTimePerDimension: {},
  resourcesCollected: {},
  bossesDefeated: {},
}

export function getDimensionState(): DimensionState {
  return {
    ..._state,
    totalTimePerDimension: { ..._state.totalTimePerDimension },
    resourcesCollected: { ..._state.resourcesCollected },
    bossesDefeated: { ..._state.bossesDefeated },
  }
}

export function getCurrentDimension(): DimensionDef | null {
  if (!_state.active || !_state.currentDimension) return null
  return DIMENSIONS.find((d) => d.id === _state.currentDimension) ?? null
}

export function enterDimension(id: string): boolean {
  if (_state.active) return false
  const dim = DIMENSIONS.find((d) => d.id === id)
  if (!dim) return false

  // Check cost
  const inv = useStore.getState().inventory
  if (dim.unlockCost.raw && inv.raw < dim.unlockCost.raw) return false
  if (dim.unlockCost.liquid && inv.liquid < dim.unlockCost.liquid) return false
  if (dim.unlockCost.crystal && inv.crystal < dim.unlockCost.crystal) return false
  if (dim.unlockCost.renown && inv.renown < dim.unlockCost.renown) return false

  // Pay cost (one-time unlock, then free to enter)
  if (!_state.totalTimePerDimension[id]) {
    useStore.setState((s) => ({
      inventory: {
        ...s.inventory,
        raw: s.inventory.raw - (dim.unlockCost.raw ?? 0),
        liquid: s.inventory.liquid - (dim.unlockCost.liquid ?? 0),
        crystal: s.inventory.crystal - (dim.unlockCost.crystal ?? 0),
        renown: s.inventory.renown - (dim.unlockCost.renown ?? 0),
      },
    }))
  }

  _state.active = true
  _state.currentDimension = id
  _state.timeInDimension = 0

  if (!_state.totalTimePerDimension[id]) _state.totalTimePerDimension[id] = 0
  if (!_state.resourcesCollected[id]) _state.resourcesCollected[id] = 0
  if (!_state.bossesDefeated[id]) _state.bossesDefeated[id] = 0

  return true
}

export function exitDimension(): void {
  if (!_state.active || !_state.currentDimension) return
  _state.totalTimePerDimension[_state.currentDimension] += _state.timeInDimension
  _state.active = false
  _state.currentDimension = null
  _state.timeInDimension = 0
}

/** Tick dimension — returns resources collected this tick from dimensional rules */
export function tickDimension(dt: number): { raw: number; specialResource: string | null } {
  if (!_state.active || !_state.currentDimension) return { raw: 0, specialResource: null }

  const dim = DIMENSIONS.find((d) => d.id === _state.currentDimension)
  if (!dim) return { raw: 0, specialResource: null }

  _state.timeInDimension += dt

  // Base resource generation
  const rawGain = dim.harvestMult * dt * 2

  // Special resource chance
  let special: string | null = null
  if (Math.random() < dim.resourceChance * dt) {
    special = dim.resourceType
    _state.resourcesCollected[_state.currentDimension] =
      (_state.resourcesCollected[_state.currentDimension] ?? 0) + 1
  }

  // Boss chance
  if (Math.random() < dim.bossChance * dt) {
    _state.bossesDefeated[_state.currentDimension] =
      (_state.bossesDefeated[_state.currentDimension] ?? 0) + 1
  }

  return { raw: rawGain, specialResource: special }
}

export function dimensionHasBeenUnlocked(id: string): boolean {
  return _state.totalTimePerDimension[id] !== undefined
}

export function getDimensionEffects(): {
  harvestMult: number; damageMult: number; speedMult: number
} {
  const dim = getCurrentDimension()
  if (!dim) return { harvestMult: 1, damageMult: 1, speedMult: 1 }
  return {
    harvestMult: dim.harvestMult,
    damageMult: dim.damageMult,
    speedMult: dim.speedMult,
  }
}

export function serializeDimensions(): DimensionState {
  return {
    ..._state,
    totalTimePerDimension: { ..._state.totalTimePerDimension },
    resourcesCollected: { ..._state.resourcesCollected },
    bossesDefeated: { ..._state.bossesDefeated },
  }
}

export function loadDimensions(data: DimensionState): void {
  _state = {
    active: data.active ?? false,
    currentDimension: data.currentDimension ?? null,
    timeInDimension: data.timeInDimension ?? 0,
    totalTimePerDimension: { ...(data.totalTimePerDimension ?? {}) },
    resourcesCollected: { ...(data.resourcesCollected ?? {}) },
    bossesDefeated: { ...(data.bossesDefeated ?? {}) },
  }
}
