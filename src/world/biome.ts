import { getInfiniteTerrainHeight } from './chunkTerrain'
import { ISLAND_SIZE } from '../config/constants'
import { createNoise2D } from 'simplex-noise'

// ════════════════════════════════════════════════════════════
// Climate-Driven Biome System
// Ported from arnis-main (climate.rs + biome.rs + ground.rs)
// Concepts: Koppen climate zones, latitude-driven vegetation,
// ocean depth tiers, surface material palettes per climate
// ════════════════════════════════════════════════════════════

// ── Climate Types (Koppen-inspired) ────────────────────────

export type ClimateZone = 
  | 'temperate'      // Cfb, Dfa — baseline: forests, plains
  | 'tropical_savanna'  // Aw — dry/wet seasons, sparse trees
  | 'hot_desert'     // BWh — sand, extreme heat, little veg
  | 'hot_steppe'     // BSh — semi-arid grasslands
  | 'cold_desert'    // BWk — cold arid, gravel plains
  | 'cold_steppe'    // BSk — semi-arid cold grasslands
  | 'boreal'         // Dfc — taiga, conifers, snow
  | 'tundra'         // ET — moss, low shrubs, permafrost
  | 'ice_cap'        // EF — permanent ice/snow

// ── Expanded Biome Types ───────────────────────────────────

export type BiomeType = 
  | 'plains'
  | 'forest'
  | 'dense_forest'
  | 'taiga'
  | 'jungle'
  | 'savanna'
  | 'desert'
  | 'rocky_desert'
  | 'rocky_highlands'
  | 'beach'
  | 'wetlands'
  | 'tundra'
  | 'snowy_plains'

// ── Biome Colors ──────────────────────────────────────────

export interface BiomeColors {
  ground: string       // Primary ground color
  groundDark: string   // Shadow/depression color  
  grass: string        // Grass tuft color
  foliage: string      // Tree foliage
  accent: string       // Accent (flowers, etc)
  fog: string          // Fog tint
}

export interface BiomeProperties {
  name: string
  climate: ClimateZone
  treeDensity: number    // 0-1, probability multiplier
  treeVariants: number[] // Allowed tree variant indices
  decorationDensity: number
  rockColor: string
  crystalColor: string
  grassColor: string
  flowerColors: string[]
  colors: BiomeColors
  surfaceMaterial: 'grass' | 'sand' | 'stone' | 'gravel' | 'snow' | 'mud' | 'dirt'
  underwaterMaterial: 'sand' | 'gravel' | 'clay' | 'stone'
  snowCap: boolean
}

// ── Climate Zone Determination ────────────────────────────
// Uses noise-based pseudo-Koppen classification

let climateNoise = createNoise2D(() => 98765)

/**
 * Determine the climate zone at a position.
 * Uses virtual latitude + noise to simulate Koppen climate patterns.
 * The island center = temperate (equator-like), edges = colder (pole-like)
 */
function getClimateAt(x: number, z: number): ClimateZone {
  // Virtual latitude: distance from center determines temperature
  const dist = Math.sqrt(x * x + z * z)
  const normalizedDist = dist / (ISLAND_SIZE * 0.4)
  
  // Temperature drops with distance from center
  // Center = warm/hot (like equator), edges = cold (like poles)
  const virtualLatitude = normalizedDist * 60 // 0-60 degrees equivalent
  
  // Aridity noise: determines wet vs dry
  const aridityNoise = climateNoise(x * 0.015, z * 0.015) * 0.3 
    + climateNoise(x * 0.03, z * 0.03) * 0.15
  
  const aridity = aridityNoise // -0.45 to 0.45, higher = drier
  
  // Temperature bands mapped to latitude
  if (virtualLatitude < 15) {
    // Tropical/subtropical zone
    if (aridity > 0.25) return 'hot_desert'
    if (aridity > 0.1) return 'hot_steppe'
    return 'temperate'
  }
  
  if (virtualLatitude < 30) {
    // Subtropical/mid-latitude
    if (aridity > 0.25) return 'hot_desert'
    if (aridity > 0.1) return 'hot_steppe'
    if (aridity < -0.2) return 'temperate' // tropical savanna analog
    return 'temperate'
  }
  
  if (virtualLatitude < 45) {
    // Mid-latitude
    if (aridity > 0.2) return 'cold_steppe'
    if (aridity > 0.05) return 'cold_steppe'
    if (aridity < -0.15) return 'boreal'
    return 'temperate'
  }
  
  if (virtualLatitude < 55) {
    // Boreal
    if (aridity > 0.2) return 'cold_steppe'
    return 'boreal'
  }
  
  // Polar
  if (virtualLatitude < 65) {
    return 'tundra'
  }
  
  return 'ice_cap'
}

// ── Biome Definitions ────────────────────────────────────

export const BIOMES: Record<BiomeType, BiomeProperties> = {
  plains: {
    name: 'Plains',
    climate: 'temperate',
    treeDensity: 0.35,
    treeVariants: [3, 4],
    decorationDensity: 0.7,
    rockColor: '#7a7a8a',
    crystalColor: '#aa88ff',
    grassColor: '#5a9a5a',
    flowerColors: ['#ff6688', '#ffaa44', '#ff88aa', '#ffdd55'],
    colors: {
      ground: '#5a8a5a',
      groundDark: '#3a6a3a',
      grass: '#5a9a5a',
      foliage: '#3a7a4a',
      accent: '#6a9a5a',
      fog: '#8899aa',
    },
    surfaceMaterial: 'grass',
    underwaterMaterial: 'sand',
    snowCap: false,
  },
  
  forest: {
    name: 'Forest',
    climate: 'temperate',
    treeDensity: 1.0,
    treeVariants: [0, 1, 3],
    decorationDensity: 0.9,
    rockColor: '#5a5a6a',
    crystalColor: '#8866cc',
    grassColor: '#3a7a3a',
    flowerColors: ['#cc88ff', '#ff88cc', '#88ccff'],
    colors: {
      ground: '#3a5a3a',
      groundDark: '#2a4a2a',
      grass: '#3a7a3a',
      foliage: '#2a6a3a',
      accent: '#4a7a4a',
      fog: '#557766',
    },
    surfaceMaterial: 'grass',
    underwaterMaterial: 'sand',
    snowCap: false,
  },
  
  dense_forest: {
    name: 'Dense Forest',
    climate: 'temperate',
    treeDensity: 1.5,
    treeVariants: [0, 1],
    decorationDensity: 1.0,
    rockColor: '#4a4a5a',
    crystalColor: '#7744bb',
    grassColor: '#2a6a2a',
    flowerColors: ['#8844cc', '#aa66dd', '#cc88ff'],
    colors: {
      ground: '#2a4a2a',
      groundDark: '#1a3a1a',
      grass: '#2a6a2a',
      foliage: '#1a5a2a',
      accent: '#3a6a3a',
      fog: '#445544',
    },
    surfaceMaterial: 'grass',
    underwaterMaterial: 'clay',
    snowCap: false,
  },
  
  taiga: {
    name: 'Taiga',
    climate: 'boreal',
    treeDensity: 0.8,
    treeVariants: [1, 7], // cone trees + snowy pine
    decorationDensity: 0.4,
    rockColor: '#5a5a6a',
    crystalColor: '#88aacc',
    grassColor: '#5a7a5a',
    flowerColors: ['#4488aa', '#66aacc', '#88ccdd'],
    colors: {
      ground: '#4a6a5a',
      groundDark: '#3a5a4a',
      grass: '#5a7a5a',
      foliage: '#3a6a4a',
      accent: '#6a8a6a',
      fog: '#667788',
    },
    surfaceMaterial: 'grass',
    underwaterMaterial: 'gravel',
    snowCap: true,
  },
  
  jungle: {
    name: 'Jungle',
    climate: 'temperate',
    treeDensity: 1.3,
    treeVariants: [0, 1, 4], // round, cone, flowering
    decorationDensity: 1.0,
    rockColor: '#6a5a4a',
    crystalColor: '#44ff88',
    grassColor: '#3a8a3a',
    flowerColors: ['#ff4488', '#ff8844', '#ffaa44', '#ff66aa', '#44ff88'],
    colors: {
      ground: '#4a7a3a',
      groundDark: '#3a6a2a',
      grass: '#3a8a3a',
      foliage: '#2a7a3a',
      accent: '#5a9a4a',
      fog: '#557755',
    },
    surfaceMaterial: 'grass',
    underwaterMaterial: 'clay',
    snowCap: false,
  },
  
  savanna: {
    name: 'Savanna',
    climate: 'hot_steppe',
    treeDensity: 0.15,
    treeVariants: [4, 5], // sparse flowering + palm
    decorationDensity: 0.3,
    rockColor: '#8a7a5a',
    crystalColor: '#ffcc44',
    grassColor: '#7a8a4a',
    flowerColors: ['#ff8844', '#ffaa55', '#ffcc66'],
    colors: {
      ground: '#8a8a5a',
      groundDark: '#7a7a4a',
      grass: '#7a8a4a',
      foliage: '#6a7a3a',
      accent: '#9a9a5a',
      fog: '#998877',
    },
    surfaceMaterial: 'dirt',
    underwaterMaterial: 'sand',
    snowCap: false,
  },
  
  desert: {
    name: 'Desert',
    climate: 'hot_desert',
    treeDensity: 0.02,
    treeVariants: [6], // dead trees only (very sparse)
    decorationDensity: 0.1,
    rockColor: '#8a7a6a',
    crystalColor: '#ffcc66',
    grassColor: '#7a7a5a',
    flowerColors: ['#cc8844', '#dd9955', '#eeaa66'],
    colors: {
      ground: '#c2a870',
      groundDark: '#a89060',
      grass: '#7a7a5a',
      foliage: '#6a6a4a',
      accent: '#8a8a5a',
      fog: '#bbaa88',
    },
    surfaceMaterial: 'sand',
    underwaterMaterial: 'sand',
    snowCap: false,
  },
  
  rocky_desert: {
    name: 'Rocky Desert',
    climate: 'cold_desert',
    treeDensity: 0.01,
    treeVariants: [6], // dead trees only (very sparse)
    decorationDensity: 0.05,
    rockColor: '#7a7a7a',
    crystalColor: '#aa8866',
    grassColor: '#6a6a5a',
    flowerColors: ['#997755', '#aa8866', '#bb9977'],
    colors: {
      ground: '#6a6a6a',
      groundDark: '#5a5a5a',
      grass: '#6a6a5a',
      foliage: '#5a5a4a',
      accent: '#7a7a6a',
      fog: '#888888',
    },
    surfaceMaterial: 'gravel',
    underwaterMaterial: 'gravel',
    snowCap: false,
  },
  
  rocky_highlands: {
    name: 'Rocky Highlands',
    climate: 'temperate',
    treeDensity: 0.12,
    treeVariants: [2], // wind-swept
    decorationDensity: 0.4,
    rockColor: '#6a6a7a',
    crystalColor: '#aa66dd',
    grassColor: '#5a5a4a',
    flowerColors: ['#6644aa', '#8855cc', '#7744bb'],
    colors: {
      ground: '#5a5a6a',
      groundDark: '#4a4a5a',
      grass: '#5a5a4a',
      foliage: '#4a5a3a',
      accent: '#6a6a7a',
      fog: '#778899',
    },
    surfaceMaterial: 'stone',
    underwaterMaterial: 'stone',
    snowCap: false,
  },
  
  beach: {
    name: 'Beach',
    climate: 'temperate',
    treeDensity: 0.05,
    treeVariants: [4, 5], // flowering + palm
    decorationDensity: 0.2,
    rockColor: '#8a8a7a',
    crystalColor: '#88ccff',
    grassColor: '#6a7a4a',
    flowerColors: ['#ff8844', '#ffaa66', '#ffcc88'],
    colors: {
      ground: '#d4c490',
      groundDark: '#b8a878',
      grass: '#6a7a4a',
      foliage: '#5a7a3a',
      accent: '#8a9a5a',
      fog: '#aabbcc',
    },
    surfaceMaterial: 'sand',
    underwaterMaterial: 'sand',
    snowCap: false,
  },
  
  wetlands: {
    name: 'Wetlands',
    climate: 'temperate',
    treeDensity: 0.2,
    treeVariants: [1, 3],
    decorationDensity: 0.5,
    rockColor: '#6a7a7a',
    crystalColor: '#44ccaa',
    grassColor: '#4a7a5a',
    flowerColors: ['#44ffaa', '#44ffcc', '#88ffaa'],
    colors: {
      ground: '#4a7a5a',
      groundDark: '#3a6a4a',
      grass: '#4a7a5a',
      foliage: '#3a7a4a',
      accent: '#5a9a6a',
      fog: '#779988',
    },
    surfaceMaterial: 'mud',
    underwaterMaterial: 'clay',
    snowCap: false,
  },
  
  tundra: {
    name: 'Tundra',
    climate: 'tundra',
    treeDensity: 0.03,
    treeVariants: [3, 7], // low bushes + snowy pine (sparse)
    decorationDensity: 0.15,
    rockColor: '#7a7a7a',
    crystalColor: '#88bbdd',
    grassColor: '#6a7a6a',
    flowerColors: ['#88aacc', '#aaccee', '#7799bb'],
    colors: {
      ground: '#7a8a7a',
      groundDark: '#6a7a6a',
      grass: '#6a7a6a',
      foliage: '#5a6a5a',
      accent: '#8a9a8a',
      fog: '#889999',
    },
    surfaceMaterial: 'dirt',
    underwaterMaterial: 'gravel',
    snowCap: true,
  },
  
  snowy_plains: {
    name: 'Snowy Plains',
    climate: 'ice_cap',
    treeDensity: 0,
    treeVariants: [],
    decorationDensity: 0.05,
    rockColor: '#8a8a8a',
    crystalColor: '#88ccff',
    grassColor: '#8a8a8a',
    flowerColors: ['#aaaacc', '#ccccff', '#bbbbed'],
    colors: {
      ground: '#d0d0d8',
      groundDark: '#b8b8c0',
      grass: '#8a8a8a',
      foliage: '#7a7a7a',
      accent: '#9a9a9a',
      fog: '#bbbbcc',
    },
    surfaceMaterial: 'snow',
    underwaterMaterial: 'gravel',
    snowCap: false, // Already snow
  },
}

// ── Noise-based biome map ──────────────────────────────

let biomeNoise = createNoise2D(() => 12345)

/**
 * Returns the biome type at (x, z) using climate-driven assignment
 * with distance-from-origin zones and noise-based transitions.
 */
export function getBiomeAt(x: number, z: number): BiomeType {
  const dist = Math.sqrt(x * x + z * z)
  const normalizedDist = dist / (ISLAND_SIZE * 0.5)
  
  // Get climate zone
  const climate = getClimateAt(x, z)
  
  // Noise for biome-level variation within climate
  const n1 = biomeNoise(x * 0.02, z * 0.02)
  const n2 = biomeNoise(x * 0.05, z * 0.05) * 0.5
  const noise = n1 + n2
  
  // Get terrain height to check if underwater
  const height = getInfiniteTerrainHeight(x, z)
  
  // Distance-based perimeter zones
  if (normalizedDist > 0.92) {
    // Extreme edge — beach or wetlands
    if (height < -0.1) return 'wetlands'
    if (climate === 'boreal' || climate === 'tundra') return 'tundra'
    if (climate === 'ice_cap') return 'snowy_plains'
    return 'beach'
  }
  
  // Climate-driven biome selection
  switch (climate) {
    case 'hot_desert':
      if (noise > 0.2 && normalizedDist < 0.5) return 'savanna'
      return 'desert'
      
    case 'hot_steppe':
      if (noise > 0.3) return 'savanna'
      if (noise < -0.2 && normalizedDist < 0.6) return 'forest'
      if (normalizedDist > 0.6) return 'rocky_desert'
      return 'plains'
      
    case 'cold_desert':
      if (noise > 0.1) return 'rocky_desert'
      return 'rocky_highlands'
      
    case 'cold_steppe':
      if (noise > 0.25) return 'forest'
      if (noise < -0.2) return 'wetlands'
      return 'plains'
      
    case 'boreal':
      if (noise > 0.15) return 'taiga'
      if (noise < -0.2) return 'wetlands'
      return 'tundra'
      
    case 'tundra':
      if (noise > 0.3) return 'taiga'
      return 'tundra'
      
    case 'ice_cap':
      return 'snowy_plains'
      
    case 'temperate':
    default:
      // Temperate zone: richest biome variety
      return getTemperateBiome(x, z, noise, normalizedDist)
  }
}

/**
 * Temperate climate biome selection — the baseline with most variety.
 */
function getTemperateBiome(x: number, z: number, noise: number, dist: number): BiomeType {
  // Outside ring (0.55-0.9): forest, rocky, or taiga-like
  if (dist > 0.55) {
    if (dist > 0.85) {
      // Coastal edge
      const height = getInfiniteTerrainHeight(x, z)
      if (height < -0.1) return 'wetlands'
    }
    if (noise > 0.25) return 'dense_forest'
    if (noise > 0.1) return 'forest'
    if (noise < -0.2) return 'rocky_highlands'
    return 'forest'
  }
  
  // Mid ring (0.2-0.55): forest or plains
  if (dist > 0.2) {
    if (noise > 0.3) return 'dense_forest'
    if (noise > 0.1) return 'forest'
    if (noise < -0.25) return 'wetlands'
    if (noise < -0.1) return 'plains'
    return 'forest'
  }
  
  // Center ring (< 0.2): plains with some forest patches
  if (noise > 0.3) return 'forest'
  if (noise < -0.1) return 'plains'
  return 'plains'
}

// ── Color Utilities ─────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  ]
}

/**
 * Get terrain vertex color for a position, blended by biome.
 */
export function getBiomeTerrainColor(x: number, z: number, height: number, slope: number): [number, number, number] {
  const biome = getBiomeAt(x, z)
  const props = BIOMES[biome]

  let r: number, g: number, b: number

  if (height < 0.1) {
    [r, g, b] = hexToRgb(props.colors.groundDark)
  } else if (height < 0.6) {
    const t = (height - 0.1) / 0.5
    const [r1, g1, b1] = hexToRgb(props.colors.groundDark)
    const [r2, g2, b2] = hexToRgb(props.colors.ground)
    r = r1 * (1 - t) + r2 * t
    g = g1 * (1 - t) + g2 * t
    b = b1 * (1 - t) + b2 * t
  } else {
    [r, g, b] = hexToRgb(props.colors.ground)
    if (slope > 0.15) {
      const rockBlend = Math.min(1, (slope - 0.15) * 3)
      const [rr, rg, rb] = hexToRgb(props.rockColor)
      r = r * (1 - rockBlend) + rr * rockBlend
      g = g * (1 - rockBlend) + rg * rockBlend
      b = b * (1 - rockBlend) + rb * rockBlend
    }
  }

  // Snow cap at high elevations
  if (props.snowCap && height > 1.8) {
    const snowBlend = Math.min(1, (height - 1.8) * 1.5)
    r = r * (1 - snowBlend) + 0.82 * snowBlend
    g = g * (1 - snowBlend) + 0.82 * snowBlend
    b = b * (1 - snowBlend) + 0.85 * snowBlend
  }

  return [r, g, b]
}

// ── Cached Properties Lookup ───────────────────────────

const biomeCache = new Map<string, BiomeProperties>()

export function getBiomeProperties(x: number, z: number): BiomeProperties {
  const key = `${Math.round(x / 5)},${Math.round(z / 5)}`
  let cached = biomeCache.get(key)
  if (!cached) {
    const biome = getBiomeAt(x, z)
    cached = BIOMES[biome]
    biomeCache.set(key, cached)
  }
  return cached
}

export function clearBiomeCache() {
  biomeCache.clear()
}

/**
 * Get the climate zone at a position (useful for atmosphere systems).
 */
export function getClimateAtPosition(x: number, z: number): ClimateZone {
  return getClimateAt(x, z)
}
