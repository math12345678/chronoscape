// ── Chrono Ascension — meta-prestige system ──
// At max prestige (rank 20), ascend to reset everything.
// Gain Ascension Shards spent on permanent upgrades.

import { useStore } from '../store'
import { getPrestigeRank, setPrestigeRank, setPrestigeBonus } from '../components/PrestigeSystem'
import { loadMounts } from './MountsSystem'
import { loadRift } from './RiftEvolution'
import { loadItems } from './InventoryManager'
import { loadLore } from './EnvironmentLore'
import { loadAchievementPerks } from './AchievementPerks'

// ── Ascension State ──────────────────────────────────────

export interface AscensionUpgrade {
  id: string
  name: string
  description: string
  icon: string
  color: string
  maxLevel: number
  baseCost: number // shards
  costMult: number
  effects: string[]
  effectValues: number[] // per level
}

export const ASCENSION_UPGRADES: AscensionUpgrade[] = [
  {
    id: 'asc_damage', name: 'Ascended Strike', icon: '⚔️', color: '#ff4444',
    description: 'Permanent damage multiplier per Ascension level.',
    maxLevel: 50, baseCost: 5, costMult: 1.5,
    effects: ['+20% damage per level'],
    effectValues: [0.2],
  },
  {
    id: 'asc_harvest', name: 'Timeless Harvest', icon: '🌾', color: '#44ff88',
    description: 'Permanent harvest yield multiplier.',
    maxLevel: 50, baseCost: 5, costMult: 1.5,
    effects: ['+20% harvest per level'],
    effectValues: [0.2],
  },
  {
    id: 'asc_range', name: 'Eternal Reach', icon: '🎯', color: '#44aaff',
    description: 'Permanent range bonus.',
    maxLevel: 30, baseCost: 8, costMult: 1.6,
    effects: ['+1 range per level'],
    effectValues: [1],
  },
  {
    id: 'asc_speed', name: 'Omega Velocity', icon: '💨', color: '#ff8844',
    description: 'Permanent speed multiplier.',
    maxLevel: 30, baseCost: 8, costMult: 1.6,
    effects: ['+15% speed per level'],
    effectValues: [0.15],
  },
  {
    id: 'asc_regen', name: 'Vitality of Ages', icon: '❤️', color: '#ff66aa',
    description: 'Permanent HP regeneration.',
    maxLevel: 40, baseCost: 6, costMult: 1.5,
    effects: ['+2 HP/s per level'],
    effectValues: [2],
  },
  {
    id: 'asc_loot', name: 'Fortune Beyond Time', icon: '🍀', color: '#ffd700',
    description: 'Permanent loot/drop rate bonus.',
    maxLevel: 25, baseCost: 10, costMult: 1.7,
    effects: ['+10% drop rate per level'],
    effectValues: [0.1],
  },
  {
    id: 'asc_firerate', name: 'Rapid Chronology', icon: '🏹', color: '#ff44ff',
    description: 'Permanent fire rate multiplier.',
    maxLevel: 25, baseCost: 10, costMult: 1.7,
    effects: ['+10% fire rate per level'],
    effectValues: [0.1],
  },
  {
    id: 'asc_shard', name: 'Shard Amplifier', icon: '💎', color: '#00ffff',
    description: 'Multiply all future shard gains.',
    maxLevel: 30, baseCost: 15, costMult: 1.8,
    effects: ['+25% shard gain per level'],
    effectValues: [0.25],
  },
  {
    id: 'asc_autoharvest', name: 'Auto-Harvest Mastery', icon: '⚡', color: '#44ffcc',
    description: 'Permanent auto-harvest rate bonus (stacks with rift).',
    maxLevel: 20, baseCost: 12, costMult: 1.6,
    effects: ['+5 auto-harvest every 5s per level'],
    effectValues: [5],
  },
  {
    id: 'asc_interest', name: 'Time Banking', icon: '🏦', color: '#ffcc44',
    description: 'Permanent interest rate bonus.',
    maxLevel: 20, baseCost: 15, costMult: 1.8,
    effects: ['+2% interest per level'],
    effectValues: [0.02],
  },
  {
    id: 'asc_starter', name: 'Head Start', icon: '🚀', color: '#88ff44',
    description: 'Start each run with bonus resources.',
    maxLevel: 15, baseCost: 20, costMult: 2.0,
    effects: ['+200 raw, +50 liquid, +10 crystal per level'],
    effectValues: [1],
  },
  {
    id: 'asc_explosion', name: 'Chrono Detonation', icon: '💥', color: '#ff8800',
    description: 'Permanent explosion size/damage bonus.',
    maxLevel: 20, baseCost: 18, costMult: 1.9,
    effects: ['+10% explosion power per level'],
    effectValues: [0.1],
  },
  {
    id: 'asc_talents', name: 'Talent Amplifier', icon: '⭐', color: '#aa88ff',
    description: 'Start with extra talent points each run.',
    maxLevel: 15, baseCost: 25, costMult: 2.0,
    effects: ['+2 talent points per level'],
    effectValues: [2],
  },
  {
    id: 'asc_nuke', name: 'Omega Nuke', icon: '☢️', color: '#ff00ff',
    description: 'Bonus nuke charges and recharge rate.',
    maxLevel: 10, baseCost: 40, costMult: 2.5,
    effects: ['+1 nuke charge, -10% cooldown per level'],
    effectValues: [1],
  },
]

// ── Module-level state ───────────────────────────────────

let _ascensionLevel = 0
let _ascensionShards = 0
let _totalLifetimeShards = 0
let _totalAscensions = 0
let _upgradeLevels: Record<string, number> = {}
let _pendingShardsFromPrestige = 0

export function getAscensionLevel(): number { return _ascensionLevel }

export function getAscensionShards(): number { return _ascensionShards }

export function getTotalLifetimeShards(): number { return _totalLifetimeShards }

export function getTotalAscensions(): number { return _totalAscensions }

export function getUpgradeLevel(id: string): number { return _upgradeLevels[id] ?? 0 }

export function getPendingShards(): number { return _pendingShardsFromPrestige }

// ── Ascension Upgrade Getters ────────────────────────────

export function getAscensionDamageBonus(): number {
  return (getUpgradeLevel('asc_damage') * 0.2) + 1
}

export function getAscensionHarvestBonus(): number {
  return (getUpgradeLevel('asc_harvest') * 0.2) + 1
}

export function getAscensionRangeBonus(): number {
  return getUpgradeLevel('asc_range')
}

export function getAscensionSpeedBonus(): number {
  return (getUpgradeLevel('asc_speed') * 0.15) + 1
}

export function getAscensionRegenBonus(): number {
  return getUpgradeLevel('asc_regen') * 2
}

export function getAscensionDropBonus(): number {
  return (getUpgradeLevel('asc_loot') * 0.1) + 1
}

export function getAscensionFireRateBonus(): number {
  return (getUpgradeLevel('asc_firerate') * 0.1) + 1
}

export function getAscensionShardMult(): number {
  return 1 + (getUpgradeLevel('asc_shard') * 0.25)
}

export function getAscensionAutoHarvestRate(): number {
  return getUpgradeLevel('asc_autoharvest') * 5
}

export function getAscensionInterestBonus(): number {
  return getUpgradeLevel('asc_interest') * 0.02
}

export function getAscensionStarterRaw(): number {
  return getUpgradeLevel('asc_starter') * 200
}

export function getAscensionStarterLiquid(): number {
  return getUpgradeLevel('asc_starter') * 50
}

export function getAscensionStarterCrystal(): number {
  return getUpgradeLevel('asc_starter') * 10
}

export function getAscensionExplosionBonus(): number {
  return 1 + (getUpgradeLevel('asc_explosion') * 0.1)
}

export function getAscensionTalentPoints(): number {
  return getUpgradeLevel('asc_talents') * 2
}

export function getAscensionNukeBonus(): number {
  return getUpgradeLevel('asc_nuke')
}

// ── Upgrade Cost ─────────────────────────────────────────

export function getUpgradeCost(upgrade: AscensionUpgrade): number {
  const level = getUpgradeLevel(upgrade.id)
  if (level >= upgrade.maxLevel) return Infinity
  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMult, level))
}

export function buyUpgrade(upgrade: AscensionUpgrade): boolean {
  const cost = getUpgradeCost(upgrade)
  if (_ascensionShards < cost) return false
  if (getUpgradeLevel(upgrade.id) >= upgrade.maxLevel) return false

  _ascensionShards -= cost
  _upgradeLevels[upgrade.id] = (_upgradeLevels[upgrade.id] ?? 0) + 1
  return true
}

// ── Shard Calculation ────────────────────────────────────

/** Calculate shards from a prestige run */
export function calculateShardsFromPrestige(rank: number): number {
  // Base shards = rank * 2 * shardMult
  const base = rank * 2
  const mult = getAscensionShardMult()
  return Math.floor(base * mult)
}

/** Accumulate pending shards — call when player prestiges */
export function accumulatePrestigeShards(rank: number): void {
  const shards = calculateShardsFromPrestige(rank)
  _pendingShardsFromPrestige += shards
}

// ── Ascend! ──────────────────────────────────────────────

export function canAscend(): boolean {
  return getPrestigeRank() >= 20
}

export function ascend(): boolean {
  if (!canAscend()) return false

  // Calculate shards: base from max prestige + pending + ascension bonus
  const baseShards = 50 * getAscensionShardMult()
  const fromPrestige = _pendingShardsFromPrestige
  const totalShards = Math.floor(baseShards + fromPrestige)

  // Save shard-related data before reset
  const savedShards = _ascensionShards + totalShards
  const savedUpgrades = { ..._upgradeLevels }
  const savedTotalAscensions = _totalAscensions + 1
  const savedLifetimeShards = _totalLifetimeShards + totalShards

  // ── FULL RESET ──
  // 1. Reset inventory
  useStore.setState({
    inventory: {
      raw: 100 + getAscensionStarterRaw(),
      vapour: 40,
      liquid: 50 + getAscensionStarterLiquid(),
      crystal: 10 + getAscensionStarterCrystal(),
      renown: 5,
    },
    blocks: {},
    formulas: [
      { id: 'crystallization', discovered: false, hitsRequired: 3, hitsLanded: 0 },
      { id: 'detonation', discovered: false, hitsRequired: 5, hitsLanded: 0 },
      { id: 'timelineEcho', discovered: false, hitsRequired: 5, hitsLanded: 0 },
    ],
    upgrades: { capacityBoost: 0, haste: 0, magnitude: 0, endurance: 0 },
    shopPurchases: {
      capacitySurge: false,
      blockColorGold: false,
      blockColorRuby: false,
      blockColorSapphire: false,
      blockColorEmerald: false,
      blockColorAmethyst: false,
      blockColorTopaz: false,
      blockColorCoral: false,
      blockColorSky: false,
      blockColorMint: false,
      blockColorRose: false,
      blockColorObsidian: false,
      blockColorIvory: false,
    },
    marketState: { liquid: 1.0, crystal: 1.0, drift: 0 },
    timeBonds: [],
    blueprints: [],
    scorchMarks: [],
    selectedBlockColor: null,
    proudestBuildSize: 0,
    proudestBuildBlockIds: [],
    hiddenChamberRevealed: false,
    chronoCrystalClaimed: false,
    devNpcFound: false,
    shootingStarSeen: false,
    totalBlocksPlaced: 0,
    totalExplosions: 0,
  })

  // 2. Reset prestige rank
  setPrestigeRank(0)
  setPrestigeBonus({ damage: 0, harvestYield: 0, capacity: 0, interestRate: 0, dropRate: 0, speed: 0, fireRate: 0, regen: 0, timeCreditMult: 1, nukeCharges: 3 })

  // 3. Reset all other systems
  loadMounts({})
  loadRift({ level: 0, totalHarvested: 0, specialFound: 0 })
  loadItems({})
  loadLore([])
  loadAchievementPerks([])

  // 4. Restore Ascension state
  _ascensionLevel = savedTotalAscensions // ascension level = total ascensions count
  _ascensionShards = savedShards
  _totalLifetimeShards = savedLifetimeShards
  _totalAscensions = savedTotalAscensions
  _upgradeLevels = savedUpgrades
  _pendingShardsFromPrestige = 0

  return true
}

// ── Serialization ────────────────────────────────────────

export function serializeAscension(): {
  level: number
  shards: number
  lifetimeShards: number
  totalAscensions: number
  upgrades: Record<string, number>
  pendingShards: number
} {
  return {
    level: _ascensionLevel,
    shards: _ascensionShards,
    lifetimeShards: _totalLifetimeShards,
    totalAscensions: _totalAscensions,
    upgrades: { ..._upgradeLevels },
    pendingShards: _pendingShardsFromPrestige,
  }
}

export function loadAscension(data: {
  level: number
  shards: number
  lifetimeShards: number
  totalAscensions: number
  upgrades: Record<string, number>
  pendingShards: number
}): void {
  _ascensionLevel = data.level ?? 0
  _ascensionShards = data.shards ?? 0
  _totalLifetimeShards = data.lifetimeShards ?? 0
  _totalAscensions = data.totalAscensions ?? 0
  _upgradeLevels = { ...(data.upgrades ?? {}) }
  _pendingShardsFromPrestige = data.pendingShards ?? 0
}
