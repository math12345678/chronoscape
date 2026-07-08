// ── Mega Structures / Wonders of Time ──
// Seven colossal structures. Each costs massive resources but gives
// a game-changing permanent bonus. Persist across prestige (not ascension).

import { useStore } from '../store'

export interface MegaStructureDef {
  id: string
  name: string
  icon: string
  color: string
  description: string
  effect: string
  effectDescription: string
  tiers: number // upgrade tiers (1-5)
  baseCost: { raw: number; liquid: number; crystal: number; renown: number }
  costMult: number
  bonusPerTier: number
  bonusType: 'damage' | 'harvest' | 'speed' | 'range' | 'regen' | 'loot' | 'fireRate' | 'capacity' | 'all' | 'shardMult'
}

export const MEGA_STRUCTURES: MegaStructureDef[] = [
  {
    id: 'wonder_pyramid', name: 'Pyramid of Eternity', icon: 'pyramid', color: '#ffd700',
    description: 'A massive pyramid that focuses chrono energy.',
    effect: 'Increases all damage by 30% per tier',
    effectDescription: '+30% damage per tier',
    tiers: 5, baseCost: { raw: 100000, liquid: 50000, crystal: 10000, renown: 100 },
    costMult: 2.5, bonusPerTier: 0.3, bonusType: 'damage',
  },
  {
    id: 'wonder_tower', name: 'Chrono Spire', icon: 'tower', color: '#44ff88',
    description: 'A spire reaching into the fabric of time itself.',
    effect: 'Harvest yield increased by 30% per tier',
    effectDescription: '+30% harvest per tier',
    tiers: 5, baseCost: { raw: 150000, liquid: 75000, crystal: 15000, renown: 150 },
    costMult: 2.5, bonusPerTier: 0.3, bonusType: 'harvest',
  },
  {
    id: 'wonder_bridge', name: 'Timeline Bridge', icon: 'bridge', color: '#44aaff',
    description: 'A bridge connecting parallel timelines for instant travel.',
    effect: 'Movement speed increased by 25% per tier',
    effectDescription: '+25% speed per tier',
    tiers: 5, baseCost: { raw: 200000, liquid: 100000, crystal: 20000, renown: 200 },
    costMult: 2.5, bonusPerTier: 0.25, bonusType: 'speed',
  },
  {
    id: 'wonder_garden', name: 'Temporal Gardens', icon: 'garden', color: '#ff66aa',
    description: 'Gardens that grow outside of normal time flow.',
    effect: 'HP regeneration increased by 5 per tier',
    effectDescription: '+5 HP/s regen per tier',
    tiers: 5, baseCost: { raw: 250000, liquid: 125000, crystal: 25000, renown: 250 },
    costMult: 2.5, bonusPerTier: 5, bonusType: 'regen',
  },
  {
    id: 'wonder_observatory', name: 'Omega Observatory', icon: 'observatory', color: '#ff8844',
    description: 'An observatory that sees across all timelines.',
    effect: 'Loot and drop rates increased by 25% per tier',
    effectDescription: '+25% loot per tier',
    tiers: 5, baseCost: { raw: 350000, liquid: 175000, crystal: 30000, renown: 300 },
    costMult: 2.5, bonusPerTier: 0.25, bonusType: 'loot',
  },
  {
    id: 'wonder_forge', name: 'The Infinite Forge', icon: 'forge', color: '#ff4444',
    description: 'A forge that runs on raw chrono energy.',
    effect: 'Fire rate increased by 20% per tier',
    effectDescription: '+20% fire rate per tier',
    tiers: 5, baseCost: { raw: 500000, liquid: 250000, crystal: 50000, renown: 500 },
    costMult: 2.5, bonusPerTier: 0.2, bonusType: 'fireRate',
  },
  {
    id: 'wonder_nexus', name: 'Chrono Nexus', icon: 'nexus', color: '#ff00ff',
    description: 'The convergence point of all time. The ultimate wonder.',
    effect: 'ALL stats increased by 15% per tier. Also +25% Ascension Shards.',
    effectDescription: '+15% all stats, +25% shards per tier',
    tiers: 5, baseCost: { raw: 1000000, liquid: 500000, crystal: 100000, renown: 1000 },
    costMult: 3, bonusPerTier: 0.15, bonusType: 'all',
  },
]

// ── State ─────────────────────────────────────────────────

export interface MegaStructureState {
  wonderId: string
  tier: number
}

let _structures: MegaStructureState[] = []

export function getStructureState(id: string): MegaStructureState | undefined {
  return _structures.find((s) => s.wonderId === id)
}

export function getStructureTier(id: string): number {
  return _structures.find((s) => s.wonderId === id)?.tier ?? 0
}

/** Get upgrade cost for a structure's next tier */
export function getUpgradeCost(def: MegaStructureDef): { raw: number; liquid: number; crystal: number; renown: number } | null {
  const current = getStructureTier(def.id)
  if (current >= def.tiers) return null
  const mult = Math.pow(def.costMult, current)
  return {
    raw: Math.floor(def.baseCost.raw * mult),
    liquid: Math.floor(def.baseCost.liquid * mult),
    crystal: Math.floor(def.baseCost.crystal * mult),
    renown: Math.floor(def.baseCost.renown * mult),
  }
}

/** Upgrade a wonder */
export function upgradeWonder(def: MegaStructureDef): boolean {
  const cost = getUpgradeCost(def)
  if (!cost) return false

  const inv = useStore.getState().inventory
  if (inv.raw < cost.raw || inv.liquid < cost.liquid ||
      inv.crystal < cost.crystal || inv.renown < cost.renown) return false

  useStore.setState((s) => ({
    inventory: {
      ...s.inventory,
      raw: s.inventory.raw - cost.raw,
      liquid: s.inventory.liquid - cost.liquid,
      crystal: s.inventory.crystal - cost.crystal,
      renown: s.inventory.renown - cost.renown,
    },
  }))

  const existing = _structures.find((s) => s.wonderId === def.id)
  if (existing) {
    existing.tier++
  } else {
    _structures.push({ wonderId: def.id, tier: 1 })
  }

  return true
}

/** Get total bonus from all wonders for a given type */
export function getWonderBonus(type: MegaStructureDef['bonusType']): number {
  let total = 0
  for (const def of MEGA_STRUCTURES) {
    if (def.bonusType === type || def.bonusType === 'all') {
      const tier = getStructureTier(def.id)
      if (type === 'shardMult' && def.bonusType === 'all') {
        total += tier * 0.25 // shard mult from nexus
      }
      if (type === def.bonusType) {
        total += tier * def.bonusPerTier
      }
      if (def.bonusType === 'all' && type !== 'shardMult' && type !== 'all') {
        total += tier * def.bonusPerTier
      }
    }
  }
  return total
}

export function getAllStructures(): MegaStructureState[] {
  return _structures.map((s) => ({ ...s }))
}

export function serializeMegaStructures(): MegaStructureState[] {
  return _structures.map((s) => ({ ...s }))
}

export function loadMegaStructures(data: MegaStructureState[]): void {
  _structures = (data ?? []).map((s) => ({ ...s }))
}

// ── Compat exports for MegaStructuresUI ───────────────

export const WONDERS = MEGA_STRUCTURES
export type MegaStructure = MegaStructureDef

export interface WonderWithUI extends MegaStructureDef {
  maxTier: number
  cost: (tier: number) => { raw: number; liquid: number; crystal: number; renown: number; shards: number } | null
}

export function getAllWonders(): WonderWithUI[] {
  return MEGA_STRUCTURES.map(d => ({
    ...d,
    maxTier: d.tiers,
    cost: (tier: number) => {
      if (tier > d.tiers) return null
      const mult = Math.pow(d.costMult, tier - 1)
      return {
        raw: Math.floor(d.baseCost.raw * mult),
        liquid: Math.floor(d.baseCost.liquid * mult),
        crystal: Math.floor(d.baseCost.crystal * mult),
        renown: Math.floor(d.baseCost.renown * mult),
        shards: Math.floor(tier * 5),
      }
    },
  }))
}

export function getWonderState(id: string): MegaStructureState | undefined { return getStructureState(id) }
export function getActiveWondersBonuses(): Record<string, number> {
  const types: MegaStructureDef['bonusType'][] = ['damage', 'harvest', 'speed', 'range', 'regen', 'loot', 'fireRate', 'capacity', 'all', 'shardMult']
  const result: Record<string, number> = {}
  for (const t of types) {
    const val = getWonderBonus(t)
    if (val > 0) result[t] = val
  }
  return result
}
