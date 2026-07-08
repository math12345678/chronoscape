// ── World Territories — claim and manage regions ──
// Each territory provides unique passive resources and bonuses.
// Territories can be contested by enemies that must be defeated.

import { useStore } from '../store'

export interface TerritoryDef {
  id: string
  name: string
  description: string
  icon: string
  color: string
  biome: 'plains' | 'desert' | 'tundra' | 'void' | 'crystal' | 'chrono'
  incomePerSec: { raw?: number; liquid?: number; crystal?: number; renown?: number }
  bonuses: string[]
  bonusValues: number[]
  unlockCost: { raw?: number; liquid?: number; crystal?: number; renown?: number }
  defenseRequired: number // total damage needed to clear contested state
  adjacentTo: string[] // territory IDs this connects to
  threatRequired: number // minimum threat level to access
}

const TERRITORIES: TerritoryDef[] = [
  {
    id: 'terr_start', name: 'The Beginning', description: 'Where all timelines start.',
    icon: '🌅', color: '#44ff88', biome: 'plains',
    incomePerSec: { raw: 1 }, bonuses: [], bonusValues: [],
    unlockCost: {}, defenseRequired: 0, adjacentTo: ['terr_crystal_plains', 'terr_desert_hours'],
    threatRequired: 0,
  },
  {
    id: 'terr_crystal_plains', name: 'Crystal Plains', description: 'Fields of crystallized time.',
    icon: '💎', color: '#aa88ff', biome: 'crystal',
    incomePerSec: { raw: 2, crystal: 0.1 }, bonuses: ['+5% harvest'], bonusValues: [0.05],
    unlockCost: { raw: 1000, liquid: 200 }, defenseRequired: 100,
    adjacentTo: ['terr_start', 'terr_void_border'],
    threatRequired: 1,
  },
  {
    id: 'terr_desert_hours', name: 'Desert of Hours', description: 'Endless sands of wasted time.',
    icon: '🏜️', color: '#ff8844', biome: 'desert',
    incomePerSec: { raw: 3, liquid: 0.2 }, bonuses: ['+10% speed'], bonusValues: [0.10],
    unlockCost: { raw: 2000, liquid: 300, crystal: 20 }, defenseRequired: 200,
    adjacentTo: ['terr_start', 'terr_tundra_eternity'],
    threatRequired: 1,
  },
  {
    id: 'terr_tundra_eternity', name: 'Tundra of Eternity', description: 'Frozen moments from forgotten timelines.',
    icon: '❄️', color: '#44aaff', biome: 'tundra',
    incomePerSec: { raw: 4, crystal: 0.2 }, bonuses: ['+2 HP/s regen'], bonusValues: [2],
    unlockCost: { raw: 5000, liquid: 800, crystal: 50, renown: 5 }, defenseRequired: 400,
    adjacentTo: ['terr_desert_hours', 'terr_chrono_core'],
    threatRequired: 2,
  },
  {
    id: 'terr_void_border', name: 'Void Border', description: 'The edge of existence.',
    icon: '🌀', color: '#6644aa', biome: 'void',
    incomePerSec: { raw: 5, liquid: 0.5, renown: 0.1 }, bonuses: ['+10% damage'], bonusValues: [0.10],
    unlockCost: { raw: 10000, liquid: 2000, crystal: 100, renown: 15 }, defenseRequired: 800,
    adjacentTo: ['terr_crystal_plains', 'terr_chrono_core'],
    threatRequired: 3,
  },
  {
    id: 'terr_chrono_core', name: 'Chrono Core', description: 'The heart of the timeline.',
    icon: '⚡', color: '#ff0044', biome: 'chrono',
    incomePerSec: { raw: 10, liquid: 2, crystal: 1, renown: 0.5 }, bonuses: ['+20% all stats'], bonusValues: [0.20],
    unlockCost: { raw: 50000, liquid: 10000, crystal: 500, renown: 50 }, defenseRequired: 2000,
    adjacentTo: ['terr_tundra_eternity', 'terr_void_border'],
    threatRequired: 5,
  },
]

export interface TerritoryState {
  id: string
  owned: boolean
  contested: boolean
  defenseProgress: number // damage dealt to clear contest
  totalIncomeGenerated: number
  claimedAt: number
}

let _territories: Record<string, TerritoryState> = {}
let _currentThreat = 0

export function getAllTerritories(): TerritoryDef[] {
  return [...TERRITORIES]
}

export function getTerritoryState(id: string): TerritoryState | null {
  return _territories[id] ?? null
}

export function getOwnedTerritories(): TerritoryDef[] {
  return TERRITORIES.filter((t) => _territories[t.id]?.owned)
}

export function getTerritoryIncomePerSec(): { raw: number; liquid: number; crystal: number; renown: number } {
  const total = { raw: 0, liquid: 0, crystal: 0, renown: 0 }
  for (const t of getOwnedTerritories()) {
    if (t.incomePerSec.raw) total.raw += t.incomePerSec.raw
    if (t.incomePerSec.liquid) total.liquid += t.incomePerSec.liquid
    if (t.incomePerSec.crystal) total.crystal += t.incomePerSec.crystal
    if (t.incomePerSec.renown) total.renown += t.incomePerSec.renown
  }
  return total
}

export function getTerritoryBonuses(): Record<string, number> {
  const bonuses: Record<string, number> = {}
  for (const t of getOwnedTerritories()) {
    for (let i = 0; i < t.bonuses.length; i++) {
      const key = t.bonuses[i]
      bonuses[key] = (bonuses[key] ?? 0) + t.bonusValues[i]
    }
  }
  return bonuses
}

/** Can the player claim this territory? */
export function canClaimTerritory(id: string): boolean {
  const def = TERRITORIES.find((t) => t.id === id)
  if (!def) return false
  if (_territories[id]?.owned) return false

  // Check adjacency
  if (id !== 'terr_start') {
    const hasAdjacent = def.adjacentTo.some((adjId) => _territories[adjId]?.owned)
    if (!hasAdjacent && getOwnedTerritories().length > 0) return false
  }

  // Check threat requirement
  if (def.threatRequired > _currentThreat) return false

  // Check cost
  const inv = useStore.getState().inventory
  if (def.unlockCost.raw && inv.raw < def.unlockCost.raw) return false
  if (def.unlockCost.liquid && inv.liquid < def.unlockCost.liquid) return false
  if (def.unlockCost.crystal && inv.crystal < def.unlockCost.crystal) return false
  if (def.unlockCost.renown && inv.renown < def.unlockCost.renown) return false

  return true
}

/** Claim a territory */
export function claimTerritory(id: string): boolean {
  if (!canClaimTerritory(id)) return false
  const def = TERRITORIES.find((t) => t.id === id)
  if (!def) return false

  // Pay cost
  if (def.unlockCost.raw || def.unlockCost.liquid || def.unlockCost.crystal || def.unlockCost.renown) {
    useStore.setState((s) => ({
      inventory: {
        ...s.inventory,
        raw: s.inventory.raw - (def.unlockCost.raw ?? 0),
        liquid: s.inventory.liquid - (def.unlockCost.liquid ?? 0),
        crystal: s.inventory.crystal - (def.unlockCost.crystal ?? 0),
        renown: s.inventory.renown - (def.unlockCost.renown ?? 0),
      },
    }))
  }

  _territories[id] = {
    id,
    owned: true,
    contested: def.defenseRequired > 0,
    defenseProgress: 0,
    totalIncomeGenerated: 0,
    claimedAt: Date.now(),
  }

  return true
}

/** Deal damage to clear contest on a territory */
export function defendTerritory(id: string, damage: number): boolean {
  const state = _territories[id]
  if (!state || !state.owned || !state.contested) return false

  state.defenseProgress += damage
  const def = TERRITORIES.find((t) => t.id === id)
  if (def && state.defenseProgress >= def.defenseRequired) {
    state.contested = false
  }
  return true
}

/** Tick territory income */
export function tickTerritories(dt: number): void {
  const income = getTerritoryIncomePerSec()
  if (income.raw > 0 || income.liquid > 0 || income.crystal > 0 || income.renown > 0) {
    useStore.setState((s) => ({
      inventory: {
        ...s.inventory,
        raw: s.inventory.raw + income.raw * dt,
        liquid: s.inventory.liquid + income.liquid * dt,
        crystal: s.inventory.crystal + income.crystal * dt,
        renown: s.inventory.renown + income.renown * dt,
      },
    }))
  }

  // Track total income generated per territory
  for (const t of Object.values(_territories)) {
    if (t.owned) {
      const def = TERRITORIES.find((d) => d.id === t.id)
      if (def) {
        let totalInc = 0
        if (def.incomePerSec.raw) totalInc += def.incomePerSec.raw * dt
        if (def.incomePerSec.liquid) totalInc += def.incomePerSec.liquid * dt
        if (def.incomePerSec.crystal) totalInc += def.incomePerSec.crystal * dt
        if (def.incomePerSec.renown) totalInc += def.incomePerSec.renown * dt
        t.totalIncomeGenerated += totalInc
      }
    }
  }
}

export function updateThreatForTerritories(threat: number): void {
  _currentThreat = threat
}

// ── Serialization ────────────────────────────────────────

export function serializeTerritories(): Record<string, TerritoryState> {
  return { ..._territories }
}

export function loadTerritories(data: Record<string, TerritoryState>): void {
  _territories = { ...data }
}
