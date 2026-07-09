// ── Chrono Enchanting — enhance items with random properties ──
// Enchant gear/items using Chrono Crystals and Essences.
// Each enchant adds a random prefix/suffix with stat bonuses.
// Higher rarity items can have more enchant slots.

import { useStore } from '../store'

export type EnchantRarity = 'common' | 'uncommon' | 'rare' | 'legendary' | 'mythic'

export interface EnchantProperty {
  id: string
  name: string
  icon: string
  color: string
  description: string
  type: 'damage' | 'harvest' | 'speed' | 'range' | 'regen' | 'loot' | 'fireRate' | 'defense' | 'explosion'
  minValue: number // at common
  maxValue: number // at mythic
  rarity: EnchantRarity
}

const ALL_PROPERTIES: EnchantProperty[] = [
  { id: 'ench_damage_1', name: 'Sharp', icon: '⚔️', color: '#ff4444', description: 'Increased damage', type: 'damage', minValue: 0.05, maxValue: 0.50, rarity: 'common' },
  { id: 'ench_damage_2', name: 'Fierce', icon: '⚔️', color: '#ff6666', description: 'Greatly increased damage', type: 'damage', minValue: 0.10, maxValue: 0.80, rarity: 'uncommon' },
  { id: 'ench_damage_3', name: 'Annihilating', icon: '⚔️', color: '#ff0000', description: 'Massively increased damage', type: 'damage', minValue: 0.20, maxValue: 1.50, rarity: 'rare' },
  { id: 'ench_harvest_1', name: 'Fruitful', icon: '🌾', color: '#44ff88', description: 'Increased harvest yield', type: 'harvest', minValue: 0.05, maxValue: 0.50, rarity: 'common' },
  { id: 'ench_harvest_2', name: 'Bountiful', icon: '🌾', color: '#66ffaa', description: 'Greatly increased harvest', type: 'harvest', minValue: 0.10, maxValue: 0.80, rarity: 'uncommon' },
  { id: 'ench_harvest_3', name: 'Infinite', icon: '🌾', color: '#00ff66', description: 'Massively increased harvest', type: 'harvest', minValue: 0.20, maxValue: 1.50, rarity: 'rare' },
  { id: 'ench_speed_1', name: 'Swift', icon: '💨', color: '#44aaff', description: 'Increased speed', type: 'speed', minValue: 0.05, maxValue: 0.40, rarity: 'common' },
  { id: 'ench_speed_2', name: 'Rapid', icon: '💨', color: '#66ccff', description: 'Greatly increased speed', type: 'speed', minValue: 0.10, maxValue: 0.60, rarity: 'uncommon' },
  { id: 'ench_speed_3', name: 'Lightning', icon: '⚡', color: '#0088ff', description: 'Massively increased speed', type: 'speed', minValue: 0.20, maxValue: 1.00, rarity: 'rare' },
  { id: 'ench_regen_1', name: 'Vital', icon: '❤️', color: '#ff66aa', description: 'Increased HP regen', type: 'regen', minValue: 0.5, maxValue: 5, rarity: 'common' },
  { id: 'ench_regen_2', name: 'Hearty', icon: '❤️', color: '#ff88bb', description: 'Greatly increased HP regen', type: 'regen', minValue: 1, maxValue: 10, rarity: 'uncommon' },
  { id: 'ench_regen_3', name: 'Immortal', icon: '💖', color: '#ff0066', description: 'Massively increased HP regen', type: 'regen', minValue: 3, maxValue: 25, rarity: 'rare' },
  { id: 'ench_loot_1', name: 'Lucky', icon: '🍀', color: '#ffd700', description: 'Increased loot find', type: 'loot', minValue: 0.05, maxValue: 0.40, rarity: 'common' },
  { id: 'ench_loot_2', name: 'Fortunate', icon: '🍀', color: '#ffdd44', description: 'Greatly increased loot', type: 'loot', minValue: 0.10, maxValue: 0.60, rarity: 'uncommon' },
  { id: 'ench_loot_3', name: 'Blessed', icon: '✨', color: '#ffcc00', description: 'Massively increased loot', type: 'loot', minValue: 0.20, maxValue: 1.20, rarity: 'rare' },
  { id: 'ench_fire', name: 'Flaming', icon: '🔥', color: '#ff8800', description: 'Increased fire rate', type: 'fireRate', minValue: 0.05, maxValue: 0.40, rarity: 'common' },
  { id: 'ench_range', name: 'Distant', icon: '🎯', color: '#44ddff', description: 'Increased range', type: 'range', minValue: 0.5, maxValue: 5, rarity: 'common' },
  { id: 'ench_defense', name: 'Sturdy', icon: '🛡️', color: '#44ffcc', description: 'Increased defense', type: 'defense', minValue: 0.05, maxValue: 0.50, rarity: 'common' },
  { id: 'ench_explosion', name: 'Blasting', icon: '💥', color: '#ff8844', description: 'Increased explosion power', type: 'explosion', minValue: 0.05, maxValue: 0.50, rarity: 'uncommon' },
  // Legendary/Mythic — higher values
  { id: 'ench_legendary', name: 'Transcendent', icon: '✦', color: '#ff00ff', description: 'All stats increased', type: 'damage', minValue: 0.30, maxValue: 2.00, rarity: 'legendary' },
  { id: 'ench_mythic', name: 'CHRONOS-Touched', icon: '☀️', color: '#ffffff', description: 'All stats massively increased', type: 'damage', minValue: 1.00, maxValue: 5.00, rarity: 'mythic' },
]

export interface Enchantment {
  propertyId: string
  value: number
  rollQuality: number // 0-1, higher = better roll within range
}

export interface EnchantedItem {
  baseItemId: string
  baseName: string
  icon: string
  enchantments: Enchantment[]
  slotCount: number // max enchantments
}

export interface EnchantingState {
  items: EnchantedItem[]
  lastRollResult: Enchantment | null
  lastRollSuccess: boolean
}

// ── Module State ─────────────────────────────────────────

let _state: EnchantingState = {
  items: [],
  lastRollResult: null,
  lastRollSuccess: false,
}

export function getEnchantingState(): EnchantingState {
  return { ..._state, items: _state.items.map((i) => ({ ...i, enchantments: [...i.enchantments] })) }
}

/** Get all available enchant properties */
export function getAllProperties(): EnchantProperty[] {
  return [...ALL_PROPERTIES]
}

/** Get properties filtered by rarity */
export function getPropertiesByRarity(rarity: EnchantRarity): EnchantProperty[] {
  return ALL_PROPERTIES.filter((p) => p.rarity === rarity)
}

/** Calculate cost to enchant — scales with number of existing enchants */
export function getEnchantCost(item: EnchantedItem): { crystal: number; liquid: number } {
  const baseCrystal = 10
  const baseLiquid = 50
  const enchantCount = item.enchantments.length
  return {
    crystal: Math.floor(baseCrystal * Math.pow(2, enchantCount)),
    liquid: Math.floor(baseLiquid * Math.pow(1.5, enchantCount)),
  }
}

/** Roll a random enchant property */
export function rollEnchant(): Enchantment {
  const rarityRoll = Math.random()
  let rarity: EnchantRarity
  if (rarityRoll < 0.01) rarity = 'mythic'       // 1%
  else if (rarityRoll < 0.06) rarity = 'legendary' // 5%
  else if (rarityRoll < 0.20) rarity = 'rare'      // 14%
  else if (rarityRoll < 0.50) rarity = 'uncommon'  // 30%
  else rarity = 'common'                           // 50%

  const pool = getPropertiesByRarity(rarity)
  if (pool.length === 0) return rollEnchant()

  const prop = pool[Math.floor(Math.random() * pool.length)]
  const quality = Math.random() // 0-1 determines where in the range we land
  const value = prop.minValue + quality * (prop.maxValue - prop.minValue)

  return { propertyId: prop.id, value: Math.round(value * 100) / 100, rollQuality: quality }
}

/** Enchant an item */
export function enchantItem(item: EnchantedItem): boolean {
  const cost = getEnchantCost(item)
  const inv = useStore.getState().inventory

  if (inv.crystal < cost.crystal) return false
  if (inv.liquid < cost.liquid) return false

  // Check slots
  if (item.enchantments.length >= item.slotCount) return false

  // Pay cost
  useStore.setState((s) => ({
    inventory: {
      ...s.inventory,
      crystal: s.inventory.crystal - cost.crystal,
      liquid: s.inventory.liquid - cost.liquid,
    },
  }))

  // Roll
  const result = rollEnchant()
  _state.lastRollResult = result
  _state.lastRollSuccess = true

  item.enchantments.push(result)

  // Update in state
  const idx = _state.items.findIndex((i) => i.baseItemId === item.baseItemId)
  if (idx >= 0) _state.items[idx] = item

  return true
}

/** Add an item to the enchanting table */
export function addEnchantableItem(item: EnchantedItem): void {
  const existing = _state.items.findIndex((i) => i.baseItemId === item.baseItemId)
  if (existing >= 0) {
    _state.items[existing] = item
  } else {
    _state.items.push(item)
  }
}

/** Remove an item from the enchanting table */
export function removeEnchantableItem(id: string): void {
  _state.items = _state.items.filter((i) => i.baseItemId !== id)
}

/** Get total enchant modifier for a given stat type */
export function getEnchantModifier(type: EnchantProperty['type']): number {
  let total = 0
  for (const item of _state.items) {
    for (const ench of item.enchantments) {
      const prop = ALL_PROPERTIES.find((p) => p.id === ench.propertyId)
      if (prop && prop.type === type) {
        total += ench.value
      }
      // Legendary/mythic all-type enchants
      if (prop && prop.id === 'ench_legendary' && (type === 'damage' || type === 'harvest')) {
        total += ench.value * 0.3 // 30% of the all-type bonus applies per stat
      }
      if (prop && prop.id === 'ench_mythic') {
        total += ench.value * 0.5 // 50% per stat
      }
    }
  }
  return total
}

// ── Serialization ────────────────────────────────────────

export function serializeEnchanting(): EnchantingState {
  return {
    items: _state.items.map((i) => ({ ...i, enchantments: [...i.enchantments] })),
    lastRollResult: _state.lastRollResult ? { ..._state.lastRollResult } : null,
    lastRollSuccess: _state.lastRollSuccess,
  }
}

export function loadEnchanting(data: EnchantingState): void {
  _state = {
    items: data.items?.map((i) => ({ ...i, enchantments: [...(i.enchantments ?? [])] })) ?? [],
    lastRollResult: data.lastRollResult ?? null,
    lastRollSuccess: data.lastRollSuccess ?? false,
  }
}
