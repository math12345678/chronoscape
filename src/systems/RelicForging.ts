// ── Relic Forging — craft persistent relics from boss drops ──
// Relics survive ascension. Each has random enchants + a unique passive.
// Crafted using boss drops + resources at a Forge.

import { useStore } from '../store'

export interface RelicPassive {
  id: string
  name: string
  icon: string
  color: string
  description: string
  effect: string
  type: 'onKill' | 'onHarvest' | 'onPrestige' | 'onAscend' | 'passive'
  value: number
}

export const RELIC_PASSIVES: RelicPassive[] = [
  { id: 'rp_vamp', name: 'Soul Drain', icon: '🩸', color: '#ff4444', description: 'Heal 5% of kill damage', effect: '+5% lifesteal', type: 'onKill', value: 0.05 },
  { id: 'rp_explode', name: 'Volatile Remains', icon: '💥', color: '#ff8844', description: 'Enemies explode on death', effect: 'AoE on kill', type: 'onKill', value: 0.3 },
  { id: 'rp_double', name: 'Echo Harvest', icon: '🍃', color: '#44ff88', description: 'Chance to double harvest', effect: '20% double harvest', type: 'onHarvest', value: 0.2 },
  { id: 'rp_shower', name: 'Resource Shower', icon: '✨', color: '#ffd700', description: 'Resources rain on kill', effect: '+10 resources on kill', type: 'onKill', value: 10 },
  { id: 'rp_might', name: 'Ascendant Might', icon: '⚔️', color: '#ff00ff', description: 'Gain damage per ascension', effect: '+5% dmg per ascend', type: 'onAscend', value: 0.05 },
  { id: 'rp_wealth', name: 'Prestige Wealth', icon: '💰', color: '#ffcc44', description: 'Gain bonus on prestige', effect: '+20% prestige rewards', type: 'onPrestige', value: 0.2 },
  { id: 'rp_haste', name: 'Timeless Haste', icon: '⏩', color: '#44aaff', description: 'Permanent speed aura', effect: '+10% speed', type: 'passive', value: 0.1 },
  { id: 'rp_attract', name: 'Magnet', icon: '🧲', color: '#aa44ff', description: 'Attract nearby resources', effect: '+3 range', type: 'passive', value: 3 },
  { id: 'rp_thorns', name: 'Time Thorns', icon: '🌵', color: '#44ff44', description: 'Reflect damage to attackers', effect: '20% reflect', type: 'passive', value: 0.2 },
  { id: 'rp_omnifury', name: 'Omni-Fury', icon: '🔥', color: '#ff4400', description: 'All damage + fire rate', effect: '+15% all combat stats', type: 'passive', value: 0.15 },
  { id: 'rp_fortress', name: 'Chrono Fortress', icon: '🏰', color: '#4488ff', description: 'Permanent defense boost', effect: '+20% defense', type: 'passive', value: 0.2 },
  { id: 'rp_greed', name: 'Infinite Greed', icon: '👁️', color: '#ffd700', description: 'Bonus loot from all sources', effect: '+25% loot', type: 'passive', value: 0.25 },
]

export interface RelicDef {
  id: string
  name: string
  icon: string
  color: string
  borderColor: string
  passiveId: string
  bonusStats: { type: string; value: number }[]
  rarity: 'uncommon' | 'rare' | 'legendary' | 'mythic'
  forgeCost: { void_core?: number; titan_heart?: number; omega_fragment?: number; crystal?: number; liquid?: number }
  description: string
}

const RELIC_NAMES = [
  'Chrono Heart', 'Timeless Crown', 'Void Orb', 'Epoch Scepter',
  'Omega Amulet', 'Paradox Ring', 'Infinity Gem', 'Reality Prism',
  'Soul of CHRONOS', 'Tear of the Universe', 'Eye of Eternity', 'Fang of Oblivion',
  'Scale of Balance', 'Ember of Creation', 'Frozen Moment', 'Singularity Core',
]

const RELIC_ICONS = ['💠', '👑', '🔮', '🪄', '📿', '💍', '💎', '🔷', '✨', '💧', '👁️', '🦷', '⚖️', '🔥', '❄️', '⚛️']

function randomRelicName(): string {
  return RELIC_NAMES[Math.floor(Math.random() * RELIC_NAMES.length)]
}

function randomRelicIcon(): string {
  return RELIC_ICONS[Math.floor(Math.random() * RELIC_ICONS.length)]
}

const RARITY_TIERS = ['uncommon', 'rare', 'legendary', 'mythic'] as const
const RARITY_COLORS = ['#44ff88', '#4488ff', '#ff8844', '#ff00ff']
const RARITY_BORDERS = ['#44ff8866', '#4488ff66', '#ff884466', '#ff00ff66']

interface StatRoll { type: string; value: number }

function rollStats(rarity: number): StatRoll[] {
  const count = rarity + 1 // 1-4 stats
  const statTypes = ['damage', 'harvest', 'speed', 'regen', 'range', 'loot', 'fireRate', 'defense', 'explosion']
  const stats: StatRoll[] = []

  const pool = [...statTypes].sort(() => Math.random() - 0.5).slice(0, count)
  for (const type of pool) {
    const base = rarity === 0 ? 0.03 : rarity === 1 ? 0.05 : rarity === 2 ? 0.08 : 0.15
    const range = rarity === 0 ? 0.05 : rarity === 1 ? 0.10 : rarity === 2 ? 0.20 : 0.50
    const value = Math.round((base + Math.random() * range) * 100) / 100
    stats.push({ type, value })
  }
  return stats
}

function rollRarity(): number {
  const r = Math.random()
  if (r < 0.01) return 3 // mythic 1%
  if (r < 0.06) return 2 // legendary 5%
  if (r < 0.25) return 1 // rare 19%
  return 0 // uncommon 75%
}

function getCostForRarity(rarity: number): RelicDef['forgeCost'] {
  if (rarity === 0) return { void_core: 1, crystal: 50, liquid: 100 }
  if (rarity === 1) return { void_core: 2, titan_heart: 1, crystal: 200, liquid: 500 }
  if (rarity === 2) return { titan_heart: 2, omega_fragment: 1, crystal: 500, liquid: 2000 }
  return { omega_fragment: 2, titan_heart: 3, crystal: 2000, liquid: 10000 }
}

// ── State ─────────────────────────────────────────────────

export interface ForgedRelic {
  id: string
  name: string
  icon: string
  color: string
  borderColor: string
  passiveId: string
  bonusStats: { type: string; value: number }[]
  rarity: RelicDef['rarity']
  equipped: boolean
  forgedAt: number
}

let _relics: ForgedRelic[] = []
const MAX_RELICS = 12

export function getRelics(): ForgedRelic[] { return [..._relics] }

export function getEquippedRelics(): ForgedRelic[] {
  return _relics.filter((r) => r.equipped)
}

export function canEquipMore(): boolean {
  return getEquippedRelics().length < 4
}

/** Toggle equip/unequip */
export function toggleEquipRelic(id: string): boolean {
  const relic = _relics.find((r) => r.id === id)
  if (!relic) return false
  if (!relic.equipped && getEquippedRelics().length >= 4) return false
  relic.equipped = !relic.equipped
  return true
}

/** Check if player can afford a forge */
export function canForge(): boolean {
  return _relics.length < MAX_RELICS
}

/** Forge a random relic */
export function forgeRelic(): ForgedRelic | null {
  if (!canForge()) return null

  const rarityIdx = rollRarity()
  const cost = getCostForRarity(rarityIdx)
  const inv = useStore.getState().inventory

  // Check costs
  const qty = (id: string) => {
    const item = useStore.getState().inventory as any
    return item[id] ?? 0
  }

  if (cost.void_core && (qty('void_core') < cost.void_core)) return null
  if (cost.titan_heart && (qty('titan_heart') < cost.titan_heart)) return null
  if (cost.omega_fragment && (qty('omega_fragment') < cost.omega_fragment)) return null
  if (cost.crystal && inv.crystal < cost.crystal) return null
  if (cost.liquid && inv.liquid < cost.liquid) return null

  // Pay costs
  useStore.setState((s) => ({
    inventory: {
      ...s.inventory,
      crystal: s.inventory.crystal - (cost.crystal ?? 0),
      liquid: s.inventory.liquid - (cost.liquid ?? 0),
    },
  }))

  // Select random passive
  const passive = RELIC_PASSIVES[Math.floor(Math.random() * RELIC_PASSIVES.length)]

  const relic: ForgedRelic = {
    id: `relic_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: randomRelicName(),
    icon: randomRelicIcon(),
    color: RARITY_COLORS[rarityIdx],
    borderColor: RARITY_BORDERS[rarityIdx],
    passiveId: passive.id,
    bonusStats: rollStats(rarityIdx),
    rarity: RARITY_TIERS[rarityIdx],
    equipped: false,
    forgedAt: Date.now(),
  }

  _relics.push(relic)

  return relic
}

/** Get combined relic modifiers */
export function getRelicModifiers(): Record<string, number> {
  const mods: Record<string, number> = {
    damage: 0, harvest: 0, speed: 0, regen: 0, range: 0,
    loot: 0, fireRate: 0, defense: 0, explosion: 0,
  }

  for (const relic of getEquippedRelics()) {
    for (const stat of relic.bonusStats) {
      const key = stat.type as keyof typeof mods
      if (mods[key] !== undefined) mods[key] += stat.value
    }
    // Passive effects are applied separately
  }

  return mods
}

/** Get combined passive values from equipped relics */
export function getRelicPassiveBonus(type: RelicPassive['type']): number {
  let total = 0
  for (const relic of getEquippedRelics()) {
    const passive = RELIC_PASSIVES.find((p) => p.id === relic.passiveId)
    if (passive && passive.type === type) total += passive.value
  }
  return total
}

/** Get total passive value by passive id (summed from all equipped relics) */
export function getRelicPassiveValue(passiveId: string): number {
  let total = 0
  for (const relic of getEquippedRelics()) {
    if (relic.passiveId === passiveId) {
      const passive = RELIC_PASSIVES.find((p) => p.id === passiveId)
      if (passive) total += passive.value
    }
  }
  return total
}

export function serializeRelics(): ForgedRelic[] {
  return _relics.map((r) => ({ ...r }))
}

export function loadRelics(data: ForgedRelic[]): void {
  _relics = (data ?? []).map((r) => ({ ...r }))
}
