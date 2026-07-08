// ── Faction Alliances 2.0 — deep relationships, perks, wars, trade ──

import { FACTIONS } from '../config/combat'
import type { FactionId } from '../config/combat'
import { useStore } from '../store'

export type FactionRelation = 'war' | 'hostile' | 'neutral' | 'friendly' | 'allied'
export type FactionPerkId = string

export interface FactionPerk {
  id: FactionPerkId
  name: string
  description: string
  icon: string
  requiredRep: number
  effect: string
  type: 'combat' | 'economy' | 'building' | 'special'
}

export interface FactionState {
  factionId: FactionId
  reputation: number
  relation: FactionRelation
  joined: boolean
  joinedAt: number | null
  perks: FactionPerkId[]
  warsDeclared: FactionId[]
  tradeActive: boolean
  tradeRouteValue: number // raw/s from trade
  lastTradeTime: number
}

const FACTION_PERKS: Record<FactionId, FactionPerk[]> = {
  chronoGuard: [
    { id: 'cg_guardian', name: 'Guardian\'s Blessing', description: '+10% damage vs void enemies', icon: '🛡', requiredRep: 100, effect: '1.1x void damage', type: 'combat' },
    { id: 'cg_protector', name: 'Timeline Protector', description: 'Blocks last 25% longer', icon: '⏳', requiredRep: 250, effect: '+25% block duration', type: 'building' },
    { id: 'cg_sentinel', name: 'Eternal Sentinel', description: 'Guard towers fire 50% faster', icon: '🏛', requiredRep: 500, effect: '+50% tower rate', type: 'combat' },
    { id: 'cg_aegis', name: 'Chrono Aegis', description: '+30 armor', icon: '⬡', requiredRep: 1000, effect: '+30 armor', type: 'combat' },
  ],
  voidCult: [
    { id: 'vc_dark_pact', name: 'Dark Pact', description: '+15% enemy loot drops', icon: '💀', requiredRep: 100, effect: '1.15x loot', type: 'economy' },
    { id: 'vc_void_walker', name: 'Void Walker', description: 'Move 15% faster', icon: '🌀', requiredRep: 250, effect: '+15% speed', type: 'combat' },
    { id: 'vc_void_ammo', name: 'Void Ammo', description: 'Projectiles deal +5 damage', icon: '◈', requiredRep: 500, effect: '+5 projectile dmg', type: 'combat' },
    { id: 'vc_oblivion', name: 'Oblivion Grasp', description: '10% chance to instantly kill normal enemies', icon: '👁', requiredRep: 1000, effect: '10% execute', type: 'combat' },
  ],
  crystalSyndicate: [
    { id: 'cs_merchant', name: 'Merchant Prince', description: 'Trade rates +20%', icon: '💰', requiredRep: 100, effect: '1.2x trade', type: 'economy' },
    { id: 'cs_crystal_eye', name: 'Crystal Eye', description: 'See nearby crystals on minimap', icon: '👁', requiredRep: 250, effect: 'Crystal radar', type: 'special' },
    { id: 'cs_gold_rush', name: 'Gold Rush', description: 'Harvest yields +25%', icon: '⟐', requiredRep: 500, effect: '1.25x harvest', type: 'economy' },
    { id: 'cs_monopoly', name: 'Monopoly', description: 'All resource gains +30%', icon: '👑', requiredRep: 1000, effect: '1.3x all resources', type: 'economy' },
  ],
  timeless: [
    { id: 'tl_meditation', name: 'Timeless Meditation', description: 'Passive regen +2 HP/s', icon: '💚', requiredRep: 100, effect: '+2 regen', type: 'combat' },
    { id: 'tl_patience', name: 'Eternal Patience', description: 'Bonds mature 25% faster', icon: '⏳', requiredRep: 250, effect: '-25% bond time', type: 'economy' },
    { id: 'tl_balance', name: 'Perfect Balance', description: 'All resources decay 20% slower', icon: '⚖', requiredRep: 500, effect: '-20% decay', type: 'building' },
    { id: 'tl_timeless', name: 'Timeless Body', description: 'Immune to negative time effects', icon: '✦', requiredRep: 1000, effect: 'Status immunity', type: 'combat' },
  ],
  echoReapers: [
    { id: 'er_harvest', name: 'Reaper\'s Scythe', description: 'Harvest 50% more from rifts', icon: '🌾', requiredRep: 100, effect: '1.5x rift harvest', type: 'economy' },
    { id: 'er_echo', name: 'Echo Step', description: 'Temporal Dash has 50% shorter cooldown', icon: '👻', requiredRep: 250, effect: '-50% dash CD', type: 'combat' },
    { id: 'er_phantom', name: 'Phantom Touch', description: 'Blocks refund 25% when destroyed', icon: '⟐', requiredRep: 500, effect: '25% block refund', type: 'building' },
    { id: 'er_reap', name: 'The Reaping', description: 'Kills heal 5% of max HP', icon: '💀', requiredRep: 1000, effect: '5% kill heal', type: 'combat' },
  ],
  dawnForged: [
    { id: 'df_builder', name: 'Dawn Builder', description: 'Place blocks 25% faster', icon: '🏗', requiredRep: 100, effect: '-25% build cost', type: 'building' },
    { id: 'df_forge', name: 'Dawn Forge', description: 'Crafting costs 20% less materials', icon: '⚒', requiredRep: 250, effect: '-20% craft cost', type: 'economy' },
    { id: 'df_light', name: 'First Light', description: 'Structures near dawn are immune to storms', icon: '☀️', requiredRep: 500, effect: 'Storm immunity', type: 'building' },
    { id: 'df_creator', name: 'Creator\'s Spark', description: 'Chance to double any crafted item', icon: '✨', requiredRep: 1000, effect: '15% double craft', type: 'special' },
  ],
}

const RELATION_THRESHOLDS = [
  { min: -Infinity, max: -50, relation: 'war' as FactionRelation },
  { min: -50, max: -10, relation: 'hostile' as FactionRelation },
  { min: -10, max: 10, relation: 'neutral' as FactionRelation },
  { min: 10, max: 50, relation: 'friendly' as FactionRelation },
  { min: 50, max: Infinity, relation: 'allied' as FactionRelation },
]

// ── State ──────────────────────────────────────────────────

let _factions: Record<FactionId, FactionState> = {} as Record<FactionId, FactionState>

function getDefaultState(id: FactionId): FactionState {
  return {
    factionId: id,
    reputation: 0,
    relation: 'neutral',
    joined: false,
    joinedAt: null,
    perks: [],
    warsDeclared: [],
    tradeActive: false,
    tradeRouteValue: 0,
    lastTradeTime: 0,
  }
}

export function initFactions(): void {
  const ids = Object.keys(FACTIONS) as FactionId[]
  for (const id of ids) {
    if (!_factions[id]) {
      _factions[id] = getDefaultState(id)
    }
  }
}

export function getFactionState(id: FactionId): FactionState {
  if (!_factions[id]) {
    _factions[id] = getDefaultState(id)
  }
  return { ..._factions[id] }
}

export function getAllFactionStates(): Record<FactionId, FactionState> {
  const result: Record<FactionId, FactionState> = {} as Record<FactionId, FactionState>
  const ids = Object.keys(FACTIONS) as FactionId[]
  for (const id of ids) {
    result[id] = getFactionState(id)
  }
  return result
}

function setRelation(faction: FactionId): void {
  const rep = _factions[faction].reputation
  for (const threshold of RELATION_THRESHOLDS) {
    if (rep >= threshold.min && rep < threshold.max) {
      _factions[faction].relation = threshold.relation
      return
    }
  }
  _factions[faction].relation = 'allied'
}

// ── Actions ─────────────────────────────────────────────────

export function joinFaction(id: FactionId): boolean {
  if (_factions[id]?.joined) return false
  if (!_factions[id]) _factions[id] = getDefaultState(id)

  const state = useStore.getState()
  if (state.inventory.renown < 5) return false

  useStore.setState((s) => ({
    inventory: { ...s.inventory, renown: s.inventory.renown - 5 },
  }))

  _factions[id].joined = true
  _factions[id].joinedAt = Date.now()
  _factions[id].reputation = 5
  setRelation(id)
  // Auto-award first perk
  const perks = FACTION_PERKS[id]
  if (perks.length > 0 && !_factions[id].perks.includes(perks[0].id)) {
    _factions[id].perks.push(perks[0].id)
  }

  return true
}

export function leaveFaction(id: FactionId): void {
  if (!_factions[id]?.joined) return
  _factions[id].joined = false
  _factions[id].reputation = 0
  _factions[id].perks = []
  _factions[id].tradeActive = false
  _factions[id].warsDeclared = []
  setRelation(id)
}

export function addFactionReputation(id: FactionId, amount: number): void {
  if (!_factions[id]) _factions[id] = getDefaultState(id)
  _factions[id].reputation += amount
  setRelation(id)

  // Check for new perk unlocks
  const perks = FACTION_PERKS[id]
  for (const perk of perks) {
    if (_factions[id].reputation >= perk.requiredRep && !_factions[id].perks.includes(perk.id)) {
      _factions[id].perks.push(perk.id)
    }
  }
}

export function declareWar(on: FactionId, against: FactionId): boolean {
  if (!_factions[on]?.joined || !_factions[against]?.joined) return false
  if (_factions[on].warsDeclared.includes(against)) return false

  _factions[on].warsDeclared.push(against)
  addFactionReputation(against, -20)
  return true
}

export function establishTradeRoute(id: FactionId): boolean {
  if (!_factions[id]?.joined) return false
  if (_factions[id].tradeActive) return false
  if (_factions[id].reputation < 25) return false

  const state = useStore.getState()
  if (state.inventory.raw < 100) return false

  useStore.setState((s) => ({
    inventory: { ...s.inventory, raw: s.inventory.raw - 100 },
  }))

  _factions[id].tradeActive = true
  _factions[id].tradeRouteValue = 1 + Math.floor(_factions[id].reputation / 50)
  _factions[id].lastTradeTime = Date.now()
  return true
}

export function tickFactionTrade(): void {
  const ids = Object.keys(FACTIONS) as FactionId[]
  for (const id of ids) {
    const f = _factions[id]
    if (f?.tradeActive && f.tradeRouteValue > 0) {
      const state = useStore.getState()
      state.addRaw(f.tradeRouteValue)
    }
  }
}

/** Get all unlocked faction perks for a faction */
export function getUnlockedPerks(id: FactionId): FactionPerk[] {
  if (!_factions[id]) return []
  return FACTION_PERKS[id]?.filter((p) => _factions[id].perks.includes(p.id)) ?? []
}

/** Get total faction reputation bonus for resource gains */
export function getFactionHarvestBonus(): number {
  let mult = 1
  if (_factions['crystalSyndicate']?.perks.includes('cs_gold_rush')) mult += 0.25
  if (_factions['crystalSyndicate']?.perks.includes('cs_monopoly')) mult += 0.3
  return mult
}

export function getFactionDamageBonus(): number {
  let mult = 1
  if (_factions['chronoGuard']?.perks.includes('cg_guardian')) mult += 0.1
  return mult
}

export function getFactionSpeedBonus(): number {
  let mult = 1
  if (_factions['voidCult']?.perks.includes('vc_void_walker')) mult += 0.15
  return mult
}

export function getFactionRegenBonus(): number {
  let regen = 0
  if (_factions['timeless']?.perks.includes('tl_meditation')) regen += 2
  return regen
}

export function getFactionArmorBonus(): number {
  let armor = 0
  if (_factions['chronoGuard']?.perks.includes('cg_aegis')) armor += 30
  return armor
}

export function getFactionLootBonus(): number {
  let mult = 1
  if (_factions['voidCult']?.perks.includes('vc_dark_pact')) mult += 0.15
  return mult
}

export function getFactionTradeBonus(): number {
  let mult = 1
  if (_factions['crystalSyndicate']?.perks.includes('cs_merchant')) mult += 0.2
  return mult
}

export function getFactionDecayReduction(): number {
  let reduction = 0
  if (_factions['timeless']?.perks.includes('tl_balance')) reduction += 0.2
  return reduction
}

export function getFactionBlockRefundBonus(): number {
  let bonus = 0
  if (_factions['echoReapers']?.perks.includes('er_phantom')) bonus += 0.25
  return bonus
}

export function getFactionMaxReputation(): number {
  let max = 0
  const ids = Object.keys(FACTIONS) as FactionId[]
  for (const id of ids) {
    if (_factions[id]) max = Math.max(max, _factions[id].reputation)
  }
  return max
}

export function getFactionAllResourcesMult(): number {
  let mult = 1
  if (_factions['crystalSyndicate']?.perks.includes('cs_monopoly')) mult += 0.3
  return mult
}

export function serializeFactions(): Record<FactionId, FactionState> {
  return { ..._factions }
}

export function loadFactions(data: Record<FactionId, FactionState>): void {
  _factions = { ...data }
}
