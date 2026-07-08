// ── Chrono Forge — Legendary Equipment Crafting with LLM ──
// Evolved resources from LLM-generated biomes + shards = unique legendary items.
// Each forge produces a named item with custom stats and flavor.

import { llmGenerateJSON } from '../utils/llmClient'
import { useStore } from '../store'
import { getEvolvedResources } from './EvolutionIntegration'
import { getDiscoveredResources } from './EvolvingContentEngine'

// ── Forgeable Item Types ────────────────────────────────

export type ForgeItemSlot = 'weapon' | 'armor' | 'accessory' | 'tool' | 'artifact'

export interface ForgeRecipe {
  id: string
  name: string
  slot: ForgeItemSlot
  rarity: 'uncommon' | 'rare' | 'legendary' | 'mythic' | 'transcendent'
  description: string
  stats: Record<string, number>
  requiredResources: { resourceId: string; amount: number }[]
  requiredShards: number
  requiredRaw: number
  requiredLiquid: number
  requiredCrystal: number
  tier: number
  color: string
  icon: string
  llmGenerated: boolean
}

export interface ForgedItem {
  id: string
  recipeId: string
  name: string
  slot: ForgeItemSlot
  rarity: string
  description: string
  stats: Record<string, number>
  forgedAt: number
  equipped: boolean
  color: string
  icon: string
}

// ── Procedural Fallback Recipe Generation ──────────────

const FORGE_NAMES = [
  'Chrono Blade', 'Void Mantle', 'Crystal Heart', 'Flux Crown',
  'Eternal Ring', 'Omega Staff', 'Reality Shard', 'Time Anchor',
  'Paradox Shield', 'Echo Gauntlets', 'Singularity Lens', 'Fate Spinner',
]

const FORGE_SLOTS: ForgeItemSlot[] = ['weapon', 'armor', 'accessory', 'tool', 'artifact']

const FORGE_ICONS = ['sword', 'shield', 'ring', 'staff', 'crown', 'gem', 'cloak', 'boots', 'helm', 'amulet', 'gloves', 'spinner']

const STAT_TYPES = ['damage', 'defense', 'speed', 'harvest', 'regen', 'loot', 'fireRate', 'range', 'explosion', 'maxHealth']

function generateProceduralRecipe(tier: number, index: number): ForgeRecipe {
  const name = FORGE_NAMES[(tier * 10 + index) % FORGE_NAMES.length]
  const slot = FORGE_SLOTS[(tier + index) % FORGE_SLOTS.length]
  const rarities: ForgeRecipe['rarity'][] = ['uncommon', 'rare', 'legendary', 'mythic', 'transcendent']
  const rarity = rarities[Math.min(tier, 4)]
  const colors = ['#44ff88', '#44aaff', '#aa44ff', '#ffd700', '#ff00ff']

  // Generate random stats
  const stats: Record<string, number> = {}
  const statCount = 1 + Math.floor(tier / 2)
  const usedTypes = new Set<string>()
  for (let i = 0; i < statCount; i++) {
    let st = STAT_TYPES[Math.floor(Math.random() * STAT_TYPES.length)]
    while (usedTypes.has(st)) st = STAT_TYPES[Math.floor(Math.random() * STAT_TYPES.length)]
    usedTypes.add(st)
    stats[st] = (tier + 1) * (2 + Math.floor(Math.random() * 5))
  }

  return {
    id: `forge_recipe_proc_t${tier}_${index}`,
    name: `${name} +${tier}`,
    slot,
    rarity,
    description: `A tier-${tier} forged item of ${rarity} quality.`,
    stats,
    requiredResources: [],
    requiredShards: 10 * (tier + 1),
    requiredRaw: 500 * (tier + 1),
    requiredLiquid: 100 * (tier + 1),
    requiredCrystal: 50 * (tier + 1),
    tier,
    color: colors[Math.min(tier, 4)],
    icon: FORGE_ICONS[(tier + index) % FORGE_ICONS.length],
    llmGenerated: false,
  }
}

// ── State ─────────────────────────────────────────────────

let _forgedItems: ForgedItem[] = []
let _availableRecipes: ForgeRecipe[] = []
let _forgeLevel = 0 // increases max tier available

// Pre-populate with tier-0 recipes
for (let i = 0; i < 4; i++) {
  _availableRecipes.push(generateProceduralRecipe(0, i))
}

export function getForgedItems(): ForgedItem[] { return _forgedItems.map(f => ({ ...f })) }
export function getAvailableRecipes(): ForgeRecipe[] { return _availableRecipes.map(r => ({ ...r })) }
export function getForgeLevel(): number { return _forgeLevel }
export function getEquippedItems(): ForgedItem[] { return _forgedItems.filter(f => f.equipped).map(f => ({ ...f })) }

// ── Generate New Recipe ──────────────────────────────────

let _recipeGenIndex = 0

export async function generateNewRecipe(): Promise<ForgeRecipe> {
  const tier = Math.min(_forgeLevel + 1, _availableRecipes.length)
  const index = _recipeGenIndex++

  // Try LLM generation
  const llmRecipe = await llmGenerateJSON<{
    name: string; slot: string; rarity: string; description: string;
    stats: Record<string, number>; icon: string; color: string;
  }>(
    `Generate a unique legendary craftable item for "Chronoscape" at tier ${tier}.
Slot types: weapon, armor, accessory, tool, artifact.
Rarities: uncommon, rare, legendary, mythic, transcendent.
Stats can include: damage, defense, speed, harvest, regen, loot, fireRate, range, explosion, maxHealth.
The item should feel powerful and fitting for a time-travel game.
Respond ONLY with valid JSON.`,
    `You are a legendary item designer. Create items that feel unique and powerful. Each item should have 2-4 stat bonuses. Use hex colors. Names should be creative and thematic.`,
    () => ({
      name: FORGE_NAMES[(tier * 10 + index) % FORGE_NAMES.length],
      slot: FORGE_SLOTS[(tier + index) % FORGE_SLOTS.length],
      rarity: ['uncommon', 'rare', 'legendary', 'mythic', 'transcendent'][Math.min(tier, 4)],
      description: `A tier-${tier} forged item of exceptional quality.`,
      stats: (() => {
        const s: Record<string, number> = {}
        const count = 1 + Math.floor(tier / 2)
        for (let i = 0; i < count; i++) {
          s[STAT_TYPES[(tier + index + i) % STAT_TYPES.length]] = (tier + 1) * (2 + (index % 5))
        }
        return s
      })(),
      icon: FORGE_ICONS[(tier + index) % FORGE_ICONS.length],
      color: ['#44ff88', '#44aaff', '#aa44ff', '#ffd700', '#ff00ff'][Math.min(tier, 4)],
    }),
  )

  const colors = ['#44ff88', '#44aaff', '#aa44ff', '#ffd700', '#ff00ff']
  const recipe: ForgeRecipe = {
    id: `forge_recipe_${Date.now()}_${index}`,
    name: llmRecipe.name,
    slot: llmRecipe.slot as ForgeItemSlot,
    rarity: llmRecipe.rarity as ForgeRecipe['rarity'],
    description: llmRecipe.description,
    stats: llmRecipe.stats,
    requiredResources: [],
    requiredShards: 10 * (tier + 1),
    requiredRaw: 500 * (tier + 1),
    requiredLiquid: 100 * (tier + 1),
    requiredCrystal: 50 * (tier + 1),
    tier,
    color: llmRecipe.color || colors[Math.min(tier, 4)],
    icon: llmRecipe.icon,
    llmGenerated: true,
  }

  _availableRecipes.push(recipe)
  return recipe
}

/** Increase forge level (unlocks higher-tier recipes) */
export function increaseForgeLevel(): void {
  _forgeLevel++
}

// ── Forge Item ───────────────────────────────────────────

export function forgeItem(recipeId: string): ForgedItem | null {
  const recipe = _availableRecipes.find(r => r.id === recipeId)
  if (!recipe) return null

  const inv = useStore.getState().inventory
  // Check costs
  if (inv.raw < recipe.requiredRaw) return null
  if (inv.liquid < recipe.requiredLiquid) return null
  if (inv.crystal < recipe.requiredCrystal) return null
  if ((inv.shards ?? 0) < recipe.requiredShards) return null

  // Deduct costs
  useStore.setState(s => ({
    inventory: {
      ...s.inventory,
      raw: s.inventory.raw - recipe.requiredRaw,
      liquid: s.inventory.liquid - recipe.requiredLiquid,
      crystal: s.inventory.crystal - recipe.requiredCrystal,
      shards: (s.inventory.shards ?? 0) - recipe.requiredShards,
    },
  }))

  const item: ForgedItem = {
    id: `forged_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    recipeId: recipe.id,
    name: recipe.name,
    slot: recipe.slot,
    rarity: recipe.rarity,
    description: recipe.description,
    stats: { ...recipe.stats },
    forgedAt: Date.now(),
    equipped: false,
    color: recipe.color,
    icon: recipe.icon,
  }

  _forgedItems.push(item)
  return item
}

/** Equip/unequip a forged item */
export function toggleEquipItem(itemId: string): boolean {
  const item = _forgedItems.find(f => f.id === itemId)
  if (!item) return false
  item.equipped = !item.equipped
  return true
}

/** Get total stats from all equipped items */
export function getEquippedStats(): Record<string, number> {
  const total: Record<string, number> = {}
  for (const item of _forgedItems) {
    if (!item.equipped) continue
    for (const [key, val] of Object.entries(item.stats)) {
      total[key] = (total[key] ?? 0) + val
    }
  }
  return total
}

/** Get forge cost breakdown */
export function getForgeCost(recipe: ForgeRecipe): { raw: number; liquid: number; crystal: number; shards: number } {
  return {
    raw: recipe.requiredRaw,
    liquid: recipe.requiredLiquid,
    crystal: recipe.requiredCrystal,
    shards: recipe.requiredShards,
  }
}

export function serializeForge(): { items: ForgedItem[]; recipes: ForgeRecipe[]; level: number } {
  return {
    items: _forgedItems.map(f => ({ ...f })),
    recipes: _availableRecipes.map(r => ({ ...r })),
    level: _forgeLevel,
  }
}

export function loadForge(data: { items: ForgedItem[]; recipes: ForgeRecipe[]; level: number }): void {
  if (data.items) _forgedItems = data.items.map(f => ({ ...f }))
  if (data.recipes) _availableRecipes = data.recipes.map(r => ({ ...r }))
  if (data.level) _forgeLevel = data.level
}
