// ── Crafting Overhaul — materials, recipes, rarity tiers, weapon/armor crafting ──

import { useStore } from '../store'
import type { WeaponId } from '../config/combat'
import { MODIFIERS } from '../config/modifiers'
import { rollWeaponModifiers, setWeaponModifiers } from './WeaponModifierSystem'

// ── Rarity ─────────────────────────────────────────────────

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

export const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#aaaaaa',
  uncommon: '#44ff66',
  rare: '#44aaff',
  epic: '#aa44ff',
  legendary: '#ff8800',
}

export const RARITY_MULT: Record<Rarity, number> = {
  common: 1,
  uncommon: 1.5,
  rare: 2.5,
  epic: 4,
  legendary: 7,
}

// ── Materials ──────────────────────────────────────────────

export type MaterialId =
  | 'timeShard' | 'voidEssence' | 'crystalFragment' | 'chronoDust'
  | 'temporalSteel' | 'echoThread' | 'starSilk' | 'omegaAlloy'

export interface MaterialDef {
  id: MaterialId
  name: string
  icon: string
  color: string
  description: string
  rarity: Rarity
  craftable: boolean
  recipe?: Partial<Record<MaterialId, number>>
  rawCost?: number
}

export const ALL_MATERIALS: Record<MaterialId, MaterialDef> = {
  timeShard: {
    id: 'timeShard', name: 'Time Shard', icon: '⟐', color: '#44ccff',
    description: 'Basic temporal fragment', rarity: 'common',
    craftable: true, rawCost: 10,
  },
  voidEssence: {
    id: 'voidEssence', name: 'Void Essence', icon: '◈', color: '#aa44ff',
    description: 'Essence from void enemies', rarity: 'uncommon',
    craftable: true, recipe: { timeShard: 3 }, rawCost: 30,
  },
  crystalFragment: {
    id: 'crystalFragment', name: 'Crystal Fragment', icon: '◆', color: '#aa88ff',
    description: 'Refined time crystal shard', rarity: 'uncommon',
    craftable: true, rawCost: 25,
  },
  chronoDust: {
    id: 'chronoDust', name: 'Chrono Dust', icon: '⟡', color: '#ffcc44',
    description: 'Dust from crystallized time', rarity: 'rare',
    craftable: true, recipe: { crystalFragment: 2, voidEssence: 1 }, rawCost: 80,
  },
  temporalSteel: {
    id: 'temporalSteel', name: 'Temporal Steel', icon: '⬡', color: '#4488ff',
    description: 'Time-hardened alloy', rarity: 'rare',
    craftable: true, recipe: { timeShard: 5, crystalFragment: 2 }, rawCost: 100,
  },
  echoThread: {
    id: 'echoThread', name: 'Echo Thread', icon: '≈', color: '#ff66aa',
    description: 'Fabric woven from timeline echoes', rarity: 'epic',
    craftable: true, recipe: { chronoDust: 2, voidEssence: 3 }, rawCost: 200,
  },
  starSilk: {
    id: 'starSilk', name: 'Star Silk', icon: '✧', color: '#ff88ff',
    description: 'Silk from collapsed star timelines', rarity: 'epic',
    craftable: true, recipe: { echoThread: 2, temporalSteel: 1 }, rawCost: 300,
  },
  omegaAlloy: {
    id: 'omegaAlloy', name: 'Omega Alloy', icon: '✦', color: '#ff4400',
    description: 'The ultimate temporal metal', rarity: 'legendary',
    craftable: true, recipe: { starSilk: 2, chronoDust: 3, temporalSteel: 3 }, rawCost: 500,
  },
}

// ── Craftable Items ────────────────────────────────────────

export type CraftableItemId =
  | 'enhancedPistol' | 'voidRifle' | 'crystalBlaster'
  | 'timeArmor' | 'chronoShield' | 'speedBoots'
  | 'regenAmulet' | 'luckCharm' | 'harvestRing'
  | 'rawCapacitor' | 'liquidVessel' | 'crystalRelic'

export interface CraftableItem {
  id: CraftableItemId
  name: string
  description: string
  icon: string
  color: string
  rarity: Rarity
  type: 'weapon' | 'armor' | 'accessory' | 'container'
  recipe: Partial<Record<MaterialId, number>>
  baseCost?: number // extra raw cost
  effects: string[] // display effects
  weaponId?: WeaponId // if weapon type
  damageBonus?: number
  armorBonus?: number
}

export const ALL_CRAFTABLES: Record<CraftableItemId, CraftableItem> = {
  enhancedPistol: {
    id: 'enhancedPistol', name: 'Enhanced Pistol', icon: '⚡', color: '#44ffcc',
    rarity: 'uncommon', description: 'Upgraded Energy Pistol +5 damage',
    type: 'weapon', weaponId: 'energyPistol', damageBonus: 5,
    recipe: { timeShard: 3, voidEssence: 1 }, baseCost: 20,
    effects: ['+5 damage', 'Golden tracer'],
  },
  voidRifle: {
    id: 'voidRifle', name: 'Void Rifle', icon: '⚡⚡', color: '#aa44ff',
    rarity: 'rare', description: 'Void-infused Energy Rifle +10 damage',
    type: 'weapon', weaponId: 'energyRifle', damageBonus: 10,
    recipe: { voidEssence: 3, temporalSteel: 2, chronoDust: 1 }, baseCost: 50,
    effects: ['+10 damage', 'Void ammo', 'Purple tracer'],
  },
  crystalBlaster: {
    id: 'crystalBlaster', name: 'Crystal Blaster', icon: '◉', color: '#aa88ff',
    rarity: 'epic', description: 'Crystal-empowered Time Blaster +15 damage',
    type: 'weapon', weaponId: 'timeBlaster', damageBonus: 15,
    recipe: { crystalFragment: 4, echoThread: 2, chronoDust: 2 }, baseCost: 100,
    effects: ['+15 damage', 'Splash 2 units', 'Crystal shards'],
  },
  timeArmor: {
    id: 'timeArmor', name: 'Time Armor', icon: '🛡', color: '#4488ff',
    rarity: 'uncommon', description: 'Basic temporal protection',
    type: 'armor', armorBonus: 10,
    recipe: { timeShard: 5, temporalSteel: 1 }, baseCost: 30,
    effects: ['+10 armor'],
  },
  chronoShield: {
    id: 'chronoShield', name: 'Chrono Shield', icon: '⬡', color: '#44aaff',
    rarity: 'rare', description: 'Chronological barrier',
    type: 'armor', armorBonus: 25,
    recipe: { temporalSteel: 3, chronoDust: 2, crystalFragment: 2 }, baseCost: 60,
    effects: ['+25 armor', 'Slow projectiles'],
  },
  speedBoots: {
    id: 'speedBoots', name: 'Speed Boots', icon: '👟', color: '#44ffaa',
    rarity: 'uncommon', description: 'Haste-infused footwear',
    type: 'accessory',
    recipe: { echoThread: 2, timeShard: 3 }, baseCost: 25,
    effects: ['+15% move speed'],
  },
  regenAmulet: {
    id: 'regenAmulet', name: 'Regen Amulet', icon: '💚', color: '#44ff88',
    rarity: 'rare', description: 'Passive health regeneration',
    type: 'accessory',
    recipe: { chronoDust: 2, crystalFragment: 3, voidEssence: 1 }, baseCost: 50,
    effects: ['+1 HP/s regeneration'],
  },
  luckCharm: {
    id: 'luckCharm', name: 'Luck Charm', icon: '🍀', color: '#44ff44',
    rarity: 'rare', description: 'Enemy loot +50%',
    type: 'accessory',
    recipe: { echoThread: 2, chronoDust: 1, voidEssence: 2 }, baseCost: 45,
    effects: ['+50% enemy loot'],
  },
  harvestRing: {
    id: 'harvestRing', name: 'Harvest Ring', icon: '⟐', color: '#ffcc44',
    rarity: 'epic', description: 'Dramatically increases harvest yield',
    type: 'accessory',
    recipe: { starSilk: 1, chronoDust: 3, crystalFragment: 4 }, baseCost: 80,
    effects: ['+100% harvest amount'],
  },
  rawCapacitor: {
    id: 'rawCapacitor', name: 'Raw Capacitor', icon: '⟐', color: '#44ff88',
    rarity: 'uncommon', description: 'Increases raw capacity +100',
    type: 'container',
    recipe: { timeShard: 5, temporalSteel: 1 }, baseCost: 30,
    effects: ['+100 raw capacity'],
  },
  liquidVessel: {
    id: 'liquidVessel', name: 'Liquid Vessel', icon: '⟐', color: '#44ccff',
    rarity: 'rare', description: 'Increases liquid capacity +50',
    type: 'container',
    recipe: { temporalSteel: 2, crystalFragment: 2 }, baseCost: 50,
    effects: ['+50 liquid capacity'],
  },
  crystalRelic: {
    id: 'crystalRelic', name: 'Crystal Relic', icon: '◆', color: '#aa88ff',
    rarity: 'epic', description: 'Increases crystal capacity +25',
    type: 'container',
    recipe: { omegaAlloy: 1, echoThread: 2, chronoDust: 3 }, baseCost: 120,
    effects: ['+25 crystal capacity', '+10% crystal production'],
  },
}

// ── Inventory State ────────────────────────────────────────

interface CraftingInventory {
  materials: Partial<Record<MaterialId, number>>
  craftedItems: CraftableItemId[]
  equippedArmor: CraftableItemId | null
  equippedAccessories: CraftableItemId[]
  weaponUpgradeLevel: Record<WeaponId, number>
}

let _craftInv: CraftingInventory = {
  materials: {},
  craftedItems: [],
  equippedArmor: null,
  equippedAccessories: [],
  weaponUpgradeLevel: { energyPistol: 0, energyRifle: 0, timeBlaster: 0 },
}

export function getCraftingInventory(): CraftingInventory {
  return { ..._craftInv, materials: { ..._craftInv.materials }, equippedAccessories: [..._craftInv.equippedAccessories], craftedItems: [..._craftInv.craftedItems], weaponUpgradeLevel: { ..._craftInv.weaponUpgradeLevel } }
}

export function getMaterialCount(id: MaterialId): number {
  return _craftInv.materials[id] ?? 0
}

export function hasCraftedItem(id: CraftableItemId): boolean {
  return _craftInv.craftedItems.includes(id)
}

// ── Crafting Actions ───────────────────────────────────────

/** Craft a material from raw resources */
export function craftMaterial(id: MaterialId): boolean {
  const def = ALL_MATERIALS[id]
  if (!def) return false
  if (!def.craftable) return false

  const state = useStore.getState()

  // Check recipe cost
  if (def.recipe) {
    for (const [matId, amount] of Object.entries(def.recipe)) {
      if ((_craftInv.materials[matId as MaterialId] ?? 0) < (amount ?? 0)) return false
    }
  }
  if (def.rawCost && state.inventory.raw < def.rawCost) return false

  // Pay costs
  if (def.recipe) {
    for (const [matId, amount] of Object.entries(def.recipe)) {
      const mid = matId as MaterialId
      _craftInv.materials[mid] = (_craftInv.materials[mid] ?? 0) - (amount ?? 0)
    }
  }
  if (def.rawCost) {
    state.addRaw(-def.rawCost)
  }

  // Award material
  _craftInv.materials[id] = (_craftInv.materials[id] ?? 0) + 1
  return true
}

/** Craft an item from materials */
export function craftItem(id: CraftableItemId): boolean {
  const def = ALL_CRAFTABLES[id]
  if (!def) return false
  if (hasCraftedItem(id)) return false

  // Check materials
  for (const [matId, amount] of Object.entries(def.recipe)) {
    if ((_craftInv.materials[matId as MaterialId] ?? 0) < (amount ?? 0)) return false
  }

  const state = useStore.getState()
  if (def.baseCost && state.inventory.raw < def.baseCost) return false

  // Pay materials
  for (const [matId, amount] of Object.entries(def.recipe)) {
    const mid = matId as MaterialId
    _craftInv.materials[mid] = (_craftInv.materials[mid] ?? 0) - (amount ?? 0)
  }
  if (def.baseCost) {
    state.addRaw(-def.baseCost)
  }

  _craftInv.craftedItems.push(id)
  return true
}

/** Equip armor */
export function equipArmor(id: CraftableItemId): boolean {
  const def = ALL_CRAFTABLES[id]
  if (!def || def.type !== 'armor') return false
  if (!hasCraftedItem(id)) return false
  _craftInv.equippedArmor = id
  return true
}

/** Equip/unequip accessory */
export function toggleAccessory(id: CraftableItemId): boolean {
  const def = ALL_CRAFTABLES[id]
  if (!def || def.type !== 'accessory') return false
  if (!hasCraftedItem(id)) return false
  const idx = _craftInv.equippedAccessories.indexOf(id)
  if (idx >= 0) {
    _craftInv.equippedAccessories.splice(idx, 1)
  } else if (_craftInv.equippedAccessories.length < 3) {
    _craftInv.equippedAccessories.push(id)
  } else {
    return false // max 3 accessories
  }
  return true
}

/** Get total armor bonus from equipped items */
export function getTotalArmorBonus(): number {
  let total = 0
  if (_craftInv.equippedArmor) {
    const def = ALL_CRAFTABLES[_craftInv.equippedArmor]
    if (def) total += def.armorBonus ?? 0
  }
  return total
}

/** Get total speed bonus from accessories */
export function getTotalSpeedBonus(): number {
  let total = 0
  for (const accId of _craftInv.equippedAccessories) {
    if (accId === 'speedBoots') total += 0.15
  }
  return total
}

/** Get total regeneration bonus */
export function getTotalRegenBonus(): number {
  let total = 0
  for (const accId of _craftInv.equippedAccessories) {
    if (accId === 'regenAmulet') total += 1
  }
  return total
}

/** Get total loot bonus */
export function getTotalLootBonus(): number {
  let total = 1
  for (const accId of _craftInv.equippedAccessories) {
    if (accId === 'luckCharm') total += 0.5
  }
  return total
}

/** Get harvest multiplier from accessories */
export function getHarvestCraftMultiplier(): number {
  for (const accId of _craftInv.equippedAccessories) {
    if (accId === 'harvestRing') return 2.0
  }
  return 1
}

/** Apply weapon damage bonus */
export function getWeaponDamageBonus(weaponId: WeaponId): number {
  // Check crafted weapons
  for (const itemId of _craftInv.craftedItems) {
    const def = ALL_CRAFTABLES[itemId]
    if (def?.weaponId === weaponId && def.damageBonus) {
      return def.damageBonus
    }
  }
  return 0
}

/** Load/save crafting state */
export function loadCraftingState(state: CraftingInventory): void {
  _craftInv = {
    materials: { ...state.materials },
    craftedItems: [...state.craftedItems],
    equippedArmor: state.equippedArmor,
    equippedAccessories: [...(state.equippedAccessories ?? [])],
    weaponUpgradeLevel: { ...(state.weaponUpgradeLevel ?? { energyPistol: 0, energyRifle: 0, timeBlaster: 0 }) },
  }
}

export function serializeCraftingState(): CraftingInventory {
  return { ..._craftInv, materials: { ..._craftInv.materials }, equippedAccessories: [..._craftInv.equippedAccessories], craftedItems: [..._craftInv.craftedItems], weaponUpgradeLevel: { ..._craftInv.weaponUpgradeLevel } }
}

// ── Weapon Modifier Recipes (for CraftingBench) ─────────

export interface CraftingRecipe {
  id: string
  name: string
  description: string
  cost: number[]
  canApply: (weaponId: WeaponId) => boolean
  apply: (weaponId: WeaponId) => string
}

const MODIFIER_RECIPES: CraftingRecipe[] = [
  { id: 'mod_add_1', name: 'Attach Modifier', description: 'Adds a random modifier to your weapon.', cost: [100, 30, 10, 0], canApply: () => true, apply: (w) => { const mods = rollWeaponModifiers(w); setWeaponModifiers(w, mods); return `Attached: ${mods.map(m => m.id).join(', ')}`; } },
  { id: 'mod_add_2', name: 'Attach Epic Modifier', description: 'Adds an epic-rarity modifier.', cost: [300, 100, 40, 5], canApply: () => true, apply: (w) => { const mods = rollWeaponModifiers(w); setWeaponModifiers(w, mods); return 'Attached epic modifier!'; } },
  { id: 'mod_reroll', name: 'Reroll Modifiers', description: 'Rerolls all modifiers on the weapon.', cost: [50, 20, 5, 0], canApply: () => true, apply: (w) => { const mods = rollWeaponModifiers(w); setWeaponModifiers(w, mods); return 'Modifiers rerolled!'; } },
  { id: 'mod_remove', name: 'Remove All Modifiers', description: 'Strips all modifiers from the weapon.', cost: [200, 50, 20, 0], canApply: () => true, apply: (w) => { setWeaponModifiers(w, []); return 'All modifiers removed.'; } },
]

export function getCraftingRecipes(): CraftingRecipe[] {
  return MODIFIER_RECIPES.map(r => ({ ...r, cost: [...r.cost] }))
}

export function canAffordRecipe(recipe: CraftingRecipe): boolean {
  const inv = useStore.getState().inventory
  return inv.raw >= (recipe.cost[0] ?? 0) &&
    inv.liquid >= (recipe.cost[1] ?? 0) &&
    inv.vapour >= (recipe.cost[2] ?? 0) &&
    inv.crystal >= (recipe.cost[3] ?? 0)
}

export function deductRecipeCost(recipe: CraftingRecipe): void {
  useStore.setState(s => ({
    inventory: {
      ...s.inventory,
      raw: s.inventory.raw - (recipe.cost[0] ?? 0),
      liquid: s.inventory.liquid - (recipe.cost[1] ?? 0),
      vapour: s.inventory.vapour - (recipe.cost[2] ?? 0),
      crystal: s.inventory.crystal - (recipe.cost[3] ?? 0),
    },
  }))
}
