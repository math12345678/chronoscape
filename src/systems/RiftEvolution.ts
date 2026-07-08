// ── Rift Evolution — upgrade your time rifts for better harvesting ──

import { useStore } from '../store'

export interface RiftEvolveTier {
  level: number
  name: string
  description: string
  cost: { raw?: number; liquid?: number; crystal?: number; renown?: number }
  harvestMultiplier: number
  rangeBonus: number
  autoHarvest: boolean
  specialResource: string | null
  specialChance: number // 0-1
  color: string
}

export const RIFT_TIERS: RiftEvolveTier[] = [
  {
    level: 0, name: 'Basic Rift', description: 'Standard time rift. Harvests raw temporal energy.',
    cost: {}, harvestMultiplier: 1, rangeBonus: 0,
    autoHarvest: false, specialResource: null, specialChance: 0,
    color: '#44ff88',
  },
  {
    level: 1, name: 'Enriched Rift', description: 'Richer temporal flow. +50% harvest.',
    cost: { raw: 100, liquid: 20 }, harvestMultiplier: 1.5, rangeBonus: 1,
    autoHarvest: false, specialResource: null, specialChance: 0,
    color: '#44ffcc',
  },
  {
    level: 2, name: 'Stable Rift', description: 'Pulsing with stable chrono-energy. +100% harvest, auto-harvest.',
    cost: { raw: 300, liquid: 60, crystal: 10 }, harvestMultiplier: 2, rangeBonus: 2,
    autoHarvest: true, specialResource: 'Time Shard', specialChance: 0.05,
    color: '#44aaff',
  },
  {
    level: 3, name: 'Volatile Rift', description: 'Crackling with raw power. +200% harvest, rare resources.',
    cost: { raw: 800, liquid: 200, crystal: 30, renown: 5 }, harvestMultiplier: 3, rangeBonus: 3,
    autoHarvest: true, specialResource: 'Void Essence', specialChance: 0.1,
    color: '#aa44ff',
  },
  {
    level: 4, name: 'Chrono Rift', description: 'A window into the heart of time. +500% harvest, auto-collect.',
    cost: { raw: 2000, liquid: 500, crystal: 100, renown: 15 }, harvestMultiplier: 5, rangeBonus: 5,
    autoHarvest: true, specialResource: 'Chrono Dust', specialChance: 0.15,
    color: '#ff8844',
  },
  {
    level: 5, name: 'Omega Rift', description: 'The ultimate temporal convergence. +1000% harvest + legendary rewards.',
    cost: { raw: 10000, liquid: 3000, crystal: 500, renown: 50 }, harvestMultiplier: 10, rangeBonus: 10,
    autoHarvest: true, specialResource: 'Omega Alloy', specialChance: 0.25,
    color: '#ff0044',
  },
]

let _riftLevel = 0
let _totalRiftHarvested = 0
let _riftAutoHarvestTimer = 0
let _specialResourcesFound = 0
let _riftColor = '#44ff88'

export function getRiftLevel(): number { return _riftLevel }

export function getRiftTier(): RiftEvolveTier {
  return RIFT_TIERS[_riftLevel] ?? RIFT_TIERS[0]
}

export function getTotalRiftHarvested(): number { return _totalRiftHarvested }

export function getSpecialResourcesFound(): number { return _specialResourcesFound }

export function getRiftColor(): string { return _riftColor }

/** Upgrade the rift to the next tier */
export function upgradeRift(): boolean {
  const nextLevel = _riftLevel + 1
  if (nextLevel >= RIFT_TIERS.length) return false

  const tier = RIFT_TIERS[nextLevel]
  const state = useStore.getState()
  const inv = state.inventory

  if (tier.cost.raw && inv.raw < tier.cost.raw) return false
  if (tier.cost.liquid && inv.liquid < tier.cost.liquid) return false
  if (tier.cost.crystal && inv.crystal < tier.cost.crystal) return false
  if (tier.cost.renown && inv.renown < tier.cost.renown) return false

  useStore.setState((s) => ({
    inventory: {
      ...s.inventory,
      raw: s.inventory.raw - (tier.cost.raw ?? 0),
      liquid: s.inventory.liquid - (tier.cost.liquid ?? 0),
      crystal: s.inventory.crystal - (tier.cost.crystal ?? 0),
      renown: s.inventory.renown - (tier.cost.renown ?? 0),
    },
  }))

  _riftLevel = nextLevel
  _riftColor = tier.color
  return true
}

/** Apply rift multiplier to harvest */
export function getRiftHarvestMultiplier(): number {
  return getRiftTier().harvestMultiplier
}

/** Get rift range bonus */
export function getRiftRangeBonus(): number {
  return getRiftTier().rangeBonus
}

/** Check if rift auto-harvests */
export function doesRiftAutoHarvest(): boolean {
  return getRiftTier().autoHarvest
}

/** Get special resource drop from rift */
export function rollRiftSpecial(): { resource: string | null; amount: number } {
  const tier = getRiftTier()
  if (!tier.specialResource || Math.random() > tier.specialChance) {
    return { resource: null, amount: 0 }
  }
  const amount = 1 + Math.floor(Math.random() * _riftLevel)
  _specialResourcesFound += amount
  return { resource: tier.specialResource, amount }
}

/** Tick rift auto-harvest */
export function tickRift(dt: number): void {
  if (!doesRiftAutoHarvest()) return

  _riftAutoHarvestTimer += dt
  const interval = Math.max(1, 5 - _riftLevel * 0.5) // lower interval at higher levels

  if (_riftAutoHarvestTimer >= interval) {
    _riftAutoHarvestTimer = 0
    const harvestAmount = Math.floor(getRiftHarvestMultiplier() * 2)
    const state = useStore.getState()
    state.addRaw(harvestAmount)
    _totalRiftHarvested += harvestAmount
  }
}

export function serializeRift(): { level: number; totalHarvested: number; specialFound: number } {
  return { level: _riftLevel, totalHarvested: _totalRiftHarvested, specialFound: _specialResourcesFound }
}

export function loadRift(data: { level: number; totalHarvested: number; specialFound: number }): void {
  _riftLevel = data.level ?? 0
  _totalRiftHarvested = data.totalHarvested ?? 0
  _specialResourcesFound = data.specialFound ?? 0
  _riftColor = RIFT_TIERS[_riftLevel]?.color ?? '#44ff88'
}
