// ── Infinite World Generator — Evolving Procedural Biomes + LLM Variants ──
// Extends the existing chunk-based world with evolving biome tiers,
// LLM-generated biome variants, and distance-scaled difficulty.

import { llmGenerateJSON } from '../utils/llmClient'

// ── Biome Evolution Tiers ────────────────────────────────

export interface BiomeTier {
  id: string
  name: string
  description: string
  minDistance: number // from origin
  maxDistance: number
  color: string
  enemyMultiplier: number
  resourceMultiplier: number
  hazardType: string
  ambientColor: string
  fogColor: string
}

const BASE_TIERS: BiomeTier[] = [
  { id: 'tier_safe', name: 'Safe Haven', description: 'The gentle cradle of time.', minDistance: 0, maxDistance: 200, color: '#44ff88', enemyMultiplier: 0.5, resourceMultiplier: 1.0, hazardType: 'none', ambientColor: '#44ff88', fogColor: '#0a1520' },
  { id: 'tier_growth', name: 'Growing Lands', description: 'Where time begins to flow faster.', minDistance: 200, maxDistance: 500, color: '#44aaff', enemyMultiplier: 1.0, resourceMultiplier: 1.5, hazardType: 'time_ripple', ambientColor: '#44aaff', fogColor: '#0a1a2a' },
  { id: 'tier_chaos', name: 'Chaos Stretch', description: 'Reality grows thin here.', minDistance: 500, maxDistance: 1200, color: '#aa44ff', enemyMultiplier: 2.0, resourceMultiplier: 2.5, hazardType: 'tear', ambientColor: '#aa44ff', fogColor: '#1a0a2a' },
  { id: 'tier_void', name: 'Void Frontier', description: 'The edge of known existence.', minDistance: 1200, maxDistance: 3000, color: '#ff4444', enemyMultiplier: 4.0, resourceMultiplier: 4.0, hazardType: 'void_leak', ambientColor: '#ff4444', fogColor: '#2a0a0a' },
  { id: 'tier_omega', name: 'Omega Expanse', description: 'Beyond time itself.', minDistance: 3000, maxDistance: 10000, color: '#ff00ff', enemyMultiplier: 8.0, resourceMultiplier: 6.0, hazardType: 'reversal', ambientColor: '#ff00ff', fogColor: '#2a002a' },
  { id: 'tier_infinite', name: 'Infinite Void', description: 'There is only more. Always more.', minDistance: 10000, maxDistance: Infinity, color: '#ffffff', enemyMultiplier: 16.0, resourceMultiplier: 10.0, hazardType: 'erasure', ambientColor: '#ffffff', fogColor: '#0a0a0a' },
]

let _evolvedTiers: BiomeTier[] = [...BASE_TIERS]
let _llmBiomeVariants: LLMBiomeVariant[] = []

export interface LLMBiomeVariant {
  id: string
  name: string
  description: string
  color: string
  terrainColor: string
  treeDensity: number
  decorationDensity: number
  enemyTypes: string[]
  specialResource: string
  ambientSound: string
  visualEffect: string
  difficultyModifier: number
}

// ── Procedural Biome Variants (fallback when LLM unavailable) ──

function generateProceduralVariant(index: number): LLMBiomeVariant {
  const names = ['Crystal Fields', 'Ash Wastes', 'Frozen Tundra', 'Magma Core', 'Storm Peaks', 'Shadow Vale', 'Emerald Wilds', 'Bone Desert', 'Chrono Marsh', 'Starfall Basin', 'Void Bloom', 'Mirror Planes', 'Singularity Core', 'Timeless Garden', 'Echo Dunes']
  const name = names[index % names.length]
  const colors = ['#44ff88', '#ff8844', '#44aaff', '#ff4488', '#ffd700', '#aa44ff', '#44ffaa', '#ff6644', '#44ddff', '#ff44aa']
  const effects = ['aurora', 'ash_fall', 'snow_storm', 'lava_bubble', 'lightning', 'shadow_wisp', 'spore_drift', 'sand_whirl', 'bubble_rise', 'star_trail']
  const resources = ['void_crystal', 'ember_shard', 'frost_essence', 'magma_core', 'storm_amber', 'shadow_silk', 'verdant_spark', 'bone_ash', 'chrono_resin', 'star_dust']

  return {
    id: `biome_proc_${index}`,
    name: name,
    description: `A procedurally-generated biome variant. Unusual time properties observed.`,
    color: colors[index % colors.length],
    terrainColor: colors[index % colors.length],
    treeDensity: 0.3 + Math.random() * 0.7,
    decorationDensity: 0.2 + Math.random() * 0.6,
    enemyTypes: ['wraith', 'voidWraith'],
    specialResource: resources[index % resources.length],
    ambientSound: effects[index % effects.length],
    visualEffect: effects[index % effects.length],
    difficultyModifier: 1.0 + index * 0.1,
  }
}

// ── Cache for biome variant generation ──

let _variantCache: Map<number, LLMBiomeVariant> = new Map()

/** Get the biome tier for a given distance from origin */
export function getBiomeTierAtDistance(dist: number): BiomeTier {
  for (const tier of _evolvedTiers) {
    if (dist >= tier.minDistance && dist < tier.maxDistance) return tier
  }
  return _evolvedTiers[_evolvedTiers.length - 1]
}

/** Get or generate a biome variant for a chunk */
export function getOrCreateBiomeVariant(chunkSeed: number): LLMBiomeVariant {
  const existing = _variantCache.get(chunkSeed)
  if (existing) return existing

  const variant = generateProceduralVariant(chunkSeed)
  _variantCache.set(chunkSeed, variant)
  // Prevent cache from growing unbounded
  if (_variantCache.size > 500) {
    const firstKey = _variantCache.keys().next().value
    if (firstKey !== undefined) _variantCache.delete(firstKey)
  }
  return variant
}

/** Attempt to generate an LLM-driven biome variant */
export async function generateLLMBiomeVariant(distance: number, epoch: number): Promise<LLMBiomeVariant> {
  const tier = getBiomeTierAtDistance(distance)
  const index = Math.floor(distance / 100) + epoch * 100

  const result = await llmGenerateJSON<LLMBiomeVariant>(
    `Generate a unique biome variant for a procedurally-generated game world at distance ${distance.toFixed(0)} from origin.
Current biome tier: "${tier.name}". Epoch: ${epoch}.
Make it creative, with a name, description, colors, and special properties.
Respond ONLY with JSON: { "id": string, "name": string, "description": string, "color": string, "terrainColor": string, "treeDensity": number, "decorationDensity": number, "enemyTypes": string[], "specialResource": string, "ambientSound": string, "visualEffect": string, "difficultyModifier": number }`,
    `You are a procedural world designer for a game called "Chronoscape". Generate creative biome variants that fit the game's time-travel theme. Use hex colors. Keep descriptions to 1-2 sentences. treeDensity and decorationDensity should be 0-1. difficultyModifier should be 0.5-5.0.`,
    () => generateProceduralVariant(index),
  )

  result.id = `biome_llm_${index}_${Date.now()}`
  _variantCache.set(index, result)
  return result
}

/** Evolve the biome tiers (add new ones beyond originals) */
export function evolveBiomeTiers(epoch: number): BiomeTier[] {
  if (epoch <= 0) return _evolvedTiers

  const lastTier = _evolvedTiers[_evolvedTiers.length - 1]
  const newMin = lastTier.maxDistance
  const newMax = lastTier.maxDistance * 3

  const newTier: BiomeTier = {
    id: `tier_evolved_${epoch}`,
    name: `Epoch ${epoch} - ${['The Unraveling', 'The Maelstrom', 'The Event Horizon', 'The Singularity', 'The Omega Point', 'The Final Dawn'][epoch % 6]}`,
    description: `Reality has evolved. Epoch ${epoch} brings new horrors and wonders.`,
    minDistance: newMin,
    maxDistance: newMax,
    color: ['#ff0088', '#8800ff', '#00ff88', '#ff8800', '#0088ff', '#88ff00'][epoch % 6],
    enemyMultiplier: lastTier.enemyMultiplier * 2,
    resourceMultiplier: lastTier.resourceMultiplier * 1.5,
    hazardType: ['unravel', 'maelstrom', 'horizon', 'singularity', 'omega', 'dawn'][epoch % 6],
    ambientColor: ['#ff0088', '#8800ff', '#00ff88', '#ff8800', '#0088ff', '#88ff00'][epoch % 6],
    fogColor: '#000000',
  }

  _evolvedTiers.push(newTier)
  return [..._evolvedTiers]
}

export function getAllTiers(): BiomeTier[] { return [..._evolvedTiers] }
export function getLLMVariants(): LLMBiomeVariant[] { return [..._llmBiomeVariants] }

export function serializeWorldGen(): { tiers: BiomeTier[]; variants: LLMBiomeVariant[] } {
  return { tiers: _evolvedTiers.map(t => ({ ...t })), variants: _llmBiomeVariants.map(v => ({ ...v })) }
}

export function loadWorldGen(data: { tiers: BiomeTier[]; variants: LLMBiomeVariant[] }): void {
  if (data.tiers) _evolvedTiers = data.tiers.map(t => ({ ...t }))
  if (data.variants) _llmBiomeVariants = data.variants.map(v => ({ ...v }))
}
