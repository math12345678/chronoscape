// ── Parallel Selves / Timeline Clones ──
// Deploy autonomous timeline clones that work for you.
// Each clone has a duration, resource cost, and unique function.

import { useStore } from '../store'

export interface CloneDef {
  id: string
  name: string
  icon: string
  color: string
  description: string
  function: 'harvest' | 'combat' | 'explore' | 'craft' | 'build' | 'research'
  duration: number // seconds
  cost: { raw?: number; liquid?: number; crystal?: number; renown?: number }
  power: number // effectiveness scalar
  unlockCondition: string
}

export const CLONE_DEFS: CloneDef[] = [
  {
    id: 'clone_harvester', name: 'Harvest Clone', icon: 'sprout', color: '#44ff88',
    description: 'Auto-harvests rifts in your vicinity.',
    function: 'harvest', duration: 60, power: 1,
    cost: { raw: 500, liquid: 100 },
    unlockCondition: 'Prestige 3',
  },
  {
    id: 'clone_warrior', name: 'Combat Clone', icon: 'sword', color: '#ff4444',
    description: 'Auto-attacks nearby enemies.',
    function: 'combat', duration: 45, power: 1,
    cost: { raw: 800, liquid: 200, crystal: 20 },
    unlockCondition: 'Prestige 5',
  },
  {
    id: 'clone_explorer', name: 'Explorer Clone', icon: 'compass', color: '#44aaff',
    description: 'Discovers lore fragments and explores.',
    function: 'explore', duration: 90, power: 1,
    cost: { raw: 1200, liquid: 300, renown: 5 },
    unlockCondition: 'Prestige 8',
  },
  {
    id: 'clone_crafter', name: 'Crafting Clone', icon: 'hammer', color: '#ff8844',
    description: 'Auto-crafts basic items from resources.',
    function: 'craft', duration: 60, power: 1,
    cost: { raw: 2000, liquid: 500, crystal: 50, renown: 10 },
    unlockCondition: 'Prestige 10',
  },
  {
    id: 'clone_builder', name: 'Building Clone', icon: 'wrench', color: '#ffd700',
    description: 'Auto-builds base buildings.',
    function: 'build', duration: 120, power: 1,
    cost: { raw: 5000, liquid: 1000, crystal: 100, renown: 20 },
    unlockCondition: 'Prestige 12',
  },
  {
    id: 'clone_researcher', name: 'Research Clone', icon: 'microscope', color: '#aa44ff',
    description: 'Accelerates research lab progress.',
    function: 'research', duration: 180, power: 1,
    cost: { raw: 10000, liquid: 3000, crystal: 200, renown: 50 },
    unlockCondition: 'Prestige 15',
  },
]

export interface ActiveClone {
  defId: string
  deployedAt: number
  remaining: number
  actionsPerformed: number
}

let _activeClones: ActiveClone[] = []
let _totalActions = 0
let _maxClones = 2

export function getActiveClones(): ActiveClone[] { return [..._activeClones] }
export function getTotalCloneActions(): number { return _totalActions }
export function getMaxClones(): number { return _maxClones }

export function canDeployClone(defId: string): boolean {
  if (_activeClones.length >= _maxClones) return false

  const def = CLONE_DEFS.find((c) => c.id === defId)
  if (!def) return false

  const inv = useStore.getState().inventory
  if (def.cost.raw && inv.raw < def.cost.raw) return false
  if (def.cost.liquid && inv.liquid < def.cost.liquid) return false
  if (def.cost.crystal && inv.crystal < def.cost.crystal) return false
  if (def.cost.renown && inv.renown < def.cost.renown) return false

  return true
}

export function deployClone(defId: string): boolean {
  if (!canDeployClone(defId)) return false

  const def = CLONE_DEFS.find((c) => c.id === defId)
  if (!def) return false

  // Pay cost
  useStore.setState((s) => ({
    inventory: {
      ...s.inventory,
      raw: s.inventory.raw - (def.cost.raw ?? 0),
      liquid: s.inventory.liquid - (def.cost.liquid ?? 0),
      crystal: s.inventory.crystal - (def.cost.crystal ?? 0),
      renown: s.inventory.renown - (def.cost.renown ?? 0),
    },
  }))

  _activeClones.push({
    defId, deployedAt: Date.now(),
    remaining: def.duration,
    actionsPerformed: 0,
  })

  return true
}

/** Tick clones — returns total resources generated this tick */
export function tickClones(dt: number): { raw: number; actions: number } {
  let totalRaw = 0
  let totalActions = 0

  const stillActive: ActiveClone[] = []

  for (const clone of _activeClones) {
    clone.remaining -= dt
    if (clone.remaining <= 0) continue

    const def = CLONE_DEFS.find((c) => c.id === clone.defId)
    if (!def) continue

    // Each clone does work proportional to dt * power
    const output = def.power * dt
    clone.actionsPerformed++
    totalActions++

    if (def.function === 'harvest') {
      totalRaw += output * 2
    }
    if (def.function === 'combat') {
      totalRaw += output * 1.5 // loot from kills
    }
    if (def.function === 'explore') {
      totalRaw += output * 1
    }
    if (def.function === 'craft') {
      totalRaw += output * 3
    }
    if (def.function === 'build') {
      totalRaw += output * 4
    }
    if (def.function === 'research') {
      totalRaw += output * 5
    }

    stillActive.push(clone)
  }

  _activeClones = stillActive
  _totalActions += totalActions

  return { raw: totalRaw, actions: totalActions }
}

export function getCloneResourceRate(): number {
  let rate = 0
  for (const clone of _activeClones) {
    const def = CLONE_DEFS.find((c) => c.id === clone.defId)
    if (!def) continue
    if (def.function === 'harvest') rate += def.power * 2
    else if (def.function === 'craft') rate += def.power * 3
    else if (def.function === 'build') rate += def.power * 4
    else if (def.function === 'research') rate += def.power * 5
    else rate += def.power * 1.5
  }
  return rate
}

export function increaseMaxClones(): void {
  _maxClones++
}

export function serializeClones(): { clones: ActiveClone[]; total: number; max: number } {
  return { clones: _activeClones.map((c) => ({ ...c })), total: _totalActions, max: _maxClones }
}

export function loadClones(data: { clones: ActiveClone[]; total: number; max: number }): void {
  _activeClones = (data.clones ?? []).map((c) => ({ ...c }))
  _totalActions = data.total ?? 0
  _maxClones = data.max ?? 2
}
