// ── Time Library / Grimoire — permanent knowledge upgrades ──
// Discoverable tomes that grant permanent bonuses.
// Tomes are found via milestones (kills, prestige, resources, etc.)

import { useStore } from '../store'

export interface TomeDef {
  id: string
  title: string
  subtitle: string
  description: string
  icon: string
  color: string
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary' | 'mythic'
  effect: string
  effectType: 'damage' | 'harvest' | 'speed' | 'range' | 'regen' | 'loot' | 'fireRate' | 'defense' | 'explosion' | 'all'
  effectValue: number
  discoveryCondition: string
  /** Function that returns true when this tome can be discovered */
  checkCondition: () => boolean
}

const _TOME_DEFS: TomeDef[] = [
  // ── Common Tomes ──
  {
    id: 'tome_basics', title: 'Principles of Chrono-Energy', subtitle: 'Chapter 1', icon: '📖', color: '#44ff88', rarity: 'common',
    description: 'Basic understanding of how time energy flows.',
    effect: '+5% harvest yield', effectType: 'harvest', effectValue: 0.05,
    discoveryCondition: 'Harvest 100 total resources',
    checkCondition: () => { const i = useStore.getState().inventory; return i.raw + i.vapour + i.liquid + i.crystal >= 100 },
  },
  {
    id: 'tome_combat', title: 'On Temporal Combat', subtitle: 'Field Manual', icon: '📖', color: '#ff8844', rarity: 'common',
    description: 'Techniques for fighting time-altered enemies.',
    effect: '+5% damage', effectType: 'damage', effectValue: 0.05,
    discoveryCondition: 'Kill 50 enemies',
    checkCondition: () => false, // checked externally
  },
  {
    id: 'tome_movement', title: 'Walking Between Moments', subtitle: 'Speed Theory', icon: '📖', color: '#44aaff', rarity: 'common',
    description: 'Move in the gaps between seconds.',
    effect: '+5% movement speed', effectType: 'speed', effectValue: 0.05,
    discoveryCondition: 'Win 10 races',
    checkCondition: () => false,
  },
  // ── Uncommon Tomes ──
  {
    id: 'tome_refining', title: 'The Art of Temporal Refinement', subtitle: 'Vol. III', icon: '📗', color: '#88ff44', rarity: 'uncommon',
    description: 'Advanced refining techniques for pure energy.',
    effect: '+10% harvest yield', effectType: 'harvest', effectValue: 0.10,
    discoveryCondition: 'Refine 500 units',
    checkCondition: () => false,
  },
  {
    id: 'tome_warfare', title: 'Timeline Warfare', subtitle: 'Strategies', icon: '📗', color: '#ff6644', rarity: 'uncommon',
    description: 'How wars are fought across parallel timelines.',
    effect: '+10% damage', effectType: 'damage', effectValue: 0.10,
    discoveryCondition: 'Kill 500 enemies',
    checkCondition: () => false,
  },
  {
    id: 'tome_regeneration', title: 'Cellular Time Reversal', subtitle: 'Healing Theory', icon: '📗', color: '#ff66aa', rarity: 'uncommon',
    description: 'Reverse cellular damage by reversing local time.',
    effect: '+1 HP/s regen', effectType: 'regen', effectValue: 1,
    discoveryCondition: 'Survive 50 expedition waves',
    checkCondition: () => false,
  },
  {
    id: 'tome_wealth', title: 'The Economy of Eternity', subtitle: 'Trade Secrets', icon: '📗', color: '#ffd700', rarity: 'uncommon',
    description: 'How to profit from temporal arbitrage.',
    effect: '+10% loot find', effectType: 'loot', effectValue: 0.10,
    discoveryCondition: 'Amass 100,000 raw',
    checkCondition: () => useStore.getState().inventory.raw >= 100000,
  },
  // ── Rare Tomes ──
  {
    id: 'tome_fire', title: 'The Rapid Chronos', subtitle: 'Rate of Fire', icon: '📘', color: '#ff44ff', rarity: 'rare',
    description: 'Fire faster by looping your own timeline.',
    effect: '+10% fire rate', effectType: 'fireRate', effectValue: 0.10,
    discoveryCondition: 'Prestige 5 times',
    checkCondition: () => false,
  },
  {
    id: 'tome_reach', title: 'Reaching Across Eternity', subtitle: 'Range Extender', icon: '📘', color: '#44ccff', rarity: 'rare',
    description: 'Extend your influence across timelines.',
    effect: '+2 range', effectType: 'range', effectValue: 2,
    discoveryCondition: 'Build 200 blocks',
    checkCondition: () => false,
  },
  {
    id: 'tome_armor', title: 'The Unbreakable Timeline', subtitle: 'Defense Matrix', icon: '📘', color: '#44ffff', rarity: 'rare',
    description: 'Fortify your timeline against external attack.',
    effect: '+10% defense', effectType: 'defense', effectValue: 0.10,
    discoveryCondition: 'Prestige 8 times',
    checkCondition: () => false,
  },
  {
    id: 'tome_explosions', title: 'Temporal Detonations', subtitle: 'Bigger Booms', icon: '📘', color: '#ff8800', rarity: 'rare',
    description: 'Make your explosions echo across time.',
    effect: '+15% explosion power', effectType: 'explosion', effectValue: 0.15,
    discoveryCondition: 'Detonate 100 explosions',
    checkCondition: () => false,
  },
  // ── Legendary Tomes ──
  {
    id: 'tome_legend_damage', title: 'The Chrono Blade Manuscript', subtitle: 'Lost Art', icon: '📕', color: '#ff2222', rarity: 'legendary',
    description: 'The legendary technique of time-slicing.',
    effect: '+25% damage', effectType: 'damage', effectValue: 0.25,
    discoveryCondition: 'Reach Prestige Rank 15',
    checkCondition: () => false,
  },
  {
    id: 'tome_legend_harvest', title: 'The Infinite Harvest', subtitle: 'Paradox Farming', icon: '📕', color: '#22ff88', rarity: 'legendary',
    description: 'Harvest the same crop across infinite timelines.',
    effect: '+25% harvest yield', effectType: 'harvest', effectValue: 0.25,
    discoveryCondition: 'Reach Prestige Rank 12',
    checkCondition: () => false,
  },
  {
    id: 'tome_legend_speed', title: 'Velocity of Thought', subtitle: 'Instant Movement', icon: '📕', color: '#ff8844', rarity: 'legendary',
    description: 'Move as fast as you can think.',
    effect: '+20% speed', effectType: 'speed', effectValue: 0.20,
    discoveryCondition: 'Win 500 races',
    checkCondition: () => false,
  },
  {
    id: 'tome_legend_all', title: 'The Omega Codex', subtitle: 'Complete Knowledge', icon: '📕', color: '#ffd700', rarity: 'legendary',
    description: 'The sum of all temporal knowledge.',
    effect: '+10% to all stats', effectType: 'all', effectValue: 0.10,
    discoveryCondition: 'Ascend 5 times',
    checkCondition: () => false,
  },
  // ── Mythic Tomes ──
  {
    id: 'tome_mythic', title: 'The First Chronomancer\'s Journal', subtitle: 'Origin', icon: '📕', color: '#ffffff', rarity: 'mythic',
    description: 'The journal of the very first chronomancer.',
    effect: '+50% damage, +50% harvest, +5 regen', effectType: 'all', effectValue: 0.50,
    discoveryCondition: 'Ascend 10 times',
    checkCondition: () => false,
  },
]

let _discoveredTomes: Set<string> = new Set()

export function getAllTomes(): TomeDef[] {
  return [..._TOME_DEFS]
}

export function getDiscoveredTomes(): TomeDef[] {
  return _TOME_DEFS.filter((t) => _discoveredTomes.has(t.id))
}

export function getUndiscoveredTomes(): TomeDef[] {
  return _TOME_DEFS.filter((t) => !_discoveredTomes.has(t.id))
}

export function getTomeCount(): { total: number; discovered: number } {
  return { total: _TOME_DEFS.length, discovered: _discoveredTomes.size }
}

export function isTomeDiscovered(id: string): boolean {
  return _discoveredTomes.has(id)
}

/** Attempt to discover a tome — returns the tome if newly discovered */
export function discoverTome(id: string): TomeDef | null {
  const tome = _TOME_DEFS.find((t) => t.id === id)
  if (!tome) return null
  if (_discoveredTomes.has(id)) return null
  _discoveredTomes.add(id)

  // Apply effects immediately
  if (tome.effectValue > 0) {
    // Effects are read via getTomeModifier() — the add here just marks as discovered
  }

  return tome
}

/** Check all tomes for discoverability */
export function checkTomeConditions(params: {
  kills?: number
  prestigeCount?: number
  racesWon?: number
  buildingsBuilt?: number
  explosions?: number
  expeditionWaves?: number
  totalResources?: number
  ascensions?: number
}): TomeDef[] {
  const newlyDiscovered: TomeDef[] = []

  // Kills-based
  if (params.kills && params.kills >= 50 && discoverTome('tome_combat')) {
    newlyDiscovered.push(_TOME_DEFS.find((t) => t.id === 'tome_combat')!)
  }
  if (params.kills && params.kills >= 500 && discoverTome('tome_warfare')) {
    newlyDiscovered.push(_TOME_DEFS.find((t) => t.id === 'tome_warfare')!)
  }

  // Races
  if (params.racesWon && params.racesWon >= 10 && discoverTome('tome_movement')) {
    newlyDiscovered.push(_TOME_DEFS.find((t) => t.id === 'tome_movement')!)
  }
  if (params.racesWon && params.racesWon >= 500 && discoverTome('tome_legend_speed')) {
    newlyDiscovered.push(_TOME_DEFS.find((t) => t.id === 'tome_legend_speed')!)
  }

  // Buildings
  if (params.buildingsBuilt && params.buildingsBuilt >= 200 && discoverTome('tome_reach')) {
    newlyDiscovered.push(_TOME_DEFS.find((t) => t.id === 'tome_reach')!)
  }

  // Explosions
  if (params.explosions && params.explosions >= 100 && discoverTome('tome_explosions')) {
    newlyDiscovered.push(_TOME_DEFS.find((t) => t.id === 'tome_explosions')!)
  }

  // Expedition waves
  if (params.expeditionWaves && params.expeditionWaves >= 50 && discoverTome('tome_regeneration')) {
    newlyDiscovered.push(_TOME_DEFS.find((t) => t.id === 'tome_regeneration')!)
  }

  // Resources
  if (params.totalResources && params.totalResources >= 500 && discoverTome('tome_refining')) {
    newlyDiscovered.push(_TOME_DEFS.find((t) => t.id === 'tome_refining')!)
  }

  // Prestige
  if (params.prestigeCount) {
    if (params.prestigeCount >= 5 && discoverTome('tome_fire')) {
      newlyDiscovered.push(_TOME_DEFS.find((t) => t.id === 'tome_fire')!)
    }
    if (params.prestigeCount >= 8 && discoverTome('tome_armor')) {
      newlyDiscovered.push(_TOME_DEFS.find((t) => t.id === 'tome_armor')!)
    }
    if (params.prestigeCount >= 12 && discoverTome('tome_legend_harvest')) {
      newlyDiscovered.push(_TOME_DEFS.find((t) => t.id === 'tome_legend_harvest')!)
    }
    if (params.prestigeCount >= 15 && discoverTome('tome_legend_damage')) {
      newlyDiscovered.push(_TOME_DEFS.find((t) => t.id === 'tome_legend_damage')!)
    }
  }

  // Ascension
  if (params.ascensions) {
    if (params.ascensions >= 5 && discoverTome('tome_legend_all')) {
      newlyDiscovered.push(_TOME_DEFS.find((t) => t.id === 'tome_legend_all')!)
    }
    if (params.ascensions >= 10 && discoverTome('tome_mythic')) {
      newlyDiscovered.push(_TOME_DEFS.find((t) => t.id === 'tome_mythic')!)
    }
  }

  return newlyDiscovered
}

/** Get total modifier from discovered tomes for a given effect type */
export function getTomeModifier(type: TomeDef['effectType']): number {
  let total = 0
  for (const tome of getDiscoveredTomes()) {
    if (tome.effectType === type || tome.effectType === 'all') {
      total += tome.effectValue
    }
  }
  return total
}

// ── Serialization ────────────────────────────────────────

export function serializeTomes(): string[] {
  return Array.from(_discoveredTomes)
}

export function loadTomes(ids: string[]): void {
  _discoveredTomes = new Set(ids)
}
