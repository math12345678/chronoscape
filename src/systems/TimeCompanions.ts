// ── Time Companions — pets that follow, fight, and evolve ──────────────

import { useStore } from '../store'

export type CompanionId =
  | 'chronoFamiliar' | 'voidPup' | 'crystalSprite'
  | 'echoHound' | 'temporalDrake' | 'omegaSentinel'

export interface CompanionDef {
  id: CompanionId
  name: string
  description: string
  icon: string
  color: string
  baseDamage: number
  baseHealth: number
  speed: number
  range: number
  ability: string
  abilityCooldown: number // seconds
  unlockCost: { raw?: number; liquid?: number; crystal?: number; renown?: number }
  evolveAt: number // kills needed to evolve
  evolveName: string
  evolveDamageBonus: number
  evolveHealthBonus: number
  special: string
}

export const ALL_COMPANIONS: Record<CompanionId, CompanionDef> = {
  chronoFamiliar: {
    id: 'chronoFamiliar', name: 'Chrono Familiar', icon: '✨', color: '#44ffcc',
    description: 'A tiny ball of temporal energy that follows you.',
    baseDamage: 5, baseHealth: 30, speed: 5, range: 10,
    ability: 'Time Spark — 10 damage burst', abilityCooldown: 8,
    unlockCost: { raw: 50, liquid: 10 },
    evolveAt: 20, evolveName: 'Chrono Warden', evolveDamageBonus: 5, evolveHealthBonus: 20,
    special: '+5% harvest when active',
  },
  voidPup: {
    id: 'voidPup', name: 'Void Pup', icon: '🐾', color: '#aa44ff',
    description: 'A playful void creature that bites enemies.',
    baseDamage: 8, baseHealth: 50, speed: 6, range: 8,
    ability: 'Void Bite — 25 damage + slow', abilityCooldown: 10,
    unlockCost: { raw: 80, liquid: 20, crystal: 5 },
    evolveAt: 30, evolveName: 'Void Wolf', evolveDamageBonus: 8, evolveHealthBonus: 30,
    special: '+10% enemy loot',
  },
  crystalSprite: {
    id: 'crystalSprite', name: 'Crystal Sprite', icon: '◆', color: '#aa88ff',
    description: 'A floating crystal entity that shoots shards.',
    baseDamage: 12, baseHealth: 40, speed: 4, range: 15,
    ability: 'Crystal Rain — AoE 15 damage', abilityCooldown: 12,
    unlockCost: { raw: 120, liquid: 30, crystal: 10, renown: 3 },
    evolveAt: 40, evolveName: 'Crystal Sentinel', evolveDamageBonus: 10, evolveHealthBonus: 25,
    special: 'Auto-collects nearby rifts',
  },
  echoHound: {
    id: 'echoHound', name: 'Echo Hound', icon: '🐕', color: '#ff66aa',
    description: 'A loyal hound from a fractured timeline.',
    baseDamage: 15, baseHealth: 70, speed: 7, range: 6,
    ability: 'Timeless Howl — buffs player damage 20% for 5s', abilityCooldown: 15,
    unlockCost: { raw: 150, liquid: 40, crystal: 15, renown: 5 },
    evolveAt: 50, evolveName: 'Echo Alpha', evolveDamageBonus: 12, evolveHealthBonus: 40,
    special: '+15% move speed',
  },
  temporalDrake: {
    id: 'temporalDrake', name: 'Temporal Drake', icon: '🐉', color: '#ff8844',
    description: 'A miniature dragon born from condensed time.',
    baseDamage: 20, baseHealth: 100, speed: 5, range: 12,
    ability: 'Chrono Breath — 40 damage cone', abilityCooldown: 8,
    unlockCost: { raw: 250, liquid: 80, crystal: 25, renown: 10 },
    evolveAt: 60, evolveName: 'Chrono Wyrm', evolveDamageBonus: 15, evolveHealthBonus: 50,
    special: '+20% fire rate',
  },
  omegaSentinel: {
    id: 'omegaSentinel', name: 'Omega Sentinel', icon: '⬡', color: '#ff0044',
    description: 'The ultimate temporal guardian. Unmatched power.',
    baseDamage: 30, baseHealth: 150, speed: 4, range: 18,
    ability: 'Omega Pulse — 80 damage AoE + stun', abilityCooldown: 20,
    unlockCost: { raw: 500, liquid: 200, crystal: 50, renown: 25 },
    evolveAt: 100, evolveName: 'Omega Prime', evolveDamageBonus: 25, evolveHealthBonus: 80,
    special: '+30% all damage',
  },
}

// ── State ──────────────────────────────────────────────────

export interface CompanionInstance {
  companionId: CompanionId
  kills: number
  evolved: boolean
  active: boolean
  summonedAt: number
  health: number
  maxHealth: number
  lastAbilityTime: number
}

let _companions: Partial<Record<CompanionId, CompanionInstance>> = {}
let _activeCompanion: CompanionId | null = null
let _companionPosition: [number, number, number] = [0, 0, 10]

export function getCompanions(): Partial<Record<CompanionId, CompanionInstance>> {
  return { ..._companions }
}

export function getActiveCompanion(): CompanionId | null {
  return _activeCompanion
}

export function getActiveCompanionInstance(): CompanionInstance | null {
  if (!_activeCompanion) return null
  const def = ALL_COMPANIONS[_activeCompanion]
  if (!def) return null
  const inst = _companions[_activeCompanion]
  return inst ?? null
}

export function setCompanionPosition(pos: [number, number, number]): void {
  _companionPosition = pos
}

export function getCompanionPosition(): [number, number, number] {
  return _companionPosition
}

/** Unlock a companion (pay cost) */
export function unlockCompanion(id: CompanionId): boolean {
  const def = ALL_COMPANIONS[id]
  if (!def) return false
  if (_companions[id]) return false // already owned

  const state = useStore.getState()
  const inv = state.inventory
  if (def.unlockCost.raw && inv.raw < def.unlockCost.raw) return false
  if (def.unlockCost.liquid && inv.liquid < def.unlockCost.liquid) return false
  if (def.unlockCost.crystal && inv.crystal < def.unlockCost.crystal) return false
  if (def.unlockCost.renown && inv.renown < def.unlockCost.renown) return false

  useStore.setState((s) => ({
    inventory: {
      ...s.inventory,
      raw: s.inventory.raw - (def.unlockCost.raw ?? 0),
      liquid: s.inventory.liquid - (def.unlockCost.liquid ?? 0),
      crystal: s.inventory.crystal - (def.unlockCost.crystal ?? 0),
      renown: s.inventory.renown - (def.unlockCost.renown ?? 0),
    },
  }))

  _companions[id] = {
    companionId: id,
    kills: 0,
    evolved: false,
    active: false,
    summonedAt: Date.now(),
    health: def.baseHealth,
    maxHealth: def.baseHealth + (def.evolveHealthBonus ?? 0),
    lastAbilityTime: 0,
  }

  return true
}

/** Summon a companion */
export function summonCompanion(id: CompanionId): boolean {
  if (!_companions[id]) return false
  _activeCompanion = id
  _companions[id]!.active = true
  _companions[id]!.summonedAt = Date.now()
  _companions[id]!.health = _companions[id]!.maxHealth
  return true
}

/** Dismiss current companion */
export function dismissCompanion(): void {
  if (_activeCompanion && _companions[_activeCompanion]) {
    _companions[_activeCompanion]!.active = false
  }
  _activeCompanion = null
}

/** Record a kill by the companion */
export function recordCompanionKill(): void {
  if (!_activeCompanion || !_companions[_activeCompanion]) return
  const inst = _companions[_activeCompanion]!
  inst.kills++
  const def = ALL_COMPANIONS[_activeCompanion]
  if (def && inst.kills >= def.evolveAt && !inst.evolved) {
    inst.evolved = true
    inst.maxHealth = def.baseHealth + def.evolveHealthBonus
    inst.health = inst.maxHealth
  }
}

/** Get companion damage */
export function getCompanionDamage(id: CompanionId): number {
  const def = ALL_COMPANIONS[id]
  const inst = _companions[id]
  if (!def || !inst) return 0
  return def.baseDamage + (inst.evolved ? def.evolveDamageBonus : 0)
}

/** Get companion health */
export function getCompanionHealth(id: CompanionId): number {
  const inst = _companions[id]
  if (!inst) return 0
  return inst.maxHealth
}

/** Get companion bonuses for the player */
export function getCompanionHarvestBonus(): number {
  if (_activeCompanion === 'chronoFamiliar') return 0.05
  return 0
}

export function getCompanionLootBonus(): number {
  if (_activeCompanion === 'voidPup') return 0.10
  return 0
}

export function getCompanionSpeedBonus(): number {
  if (_activeCompanion === 'echoHound') return 0.15
  return 0
}

export function getCompanionFireRateBonus(): number {
  if (_activeCompanion === 'temporalDrake') return 0.20
  return 0
}

export function getCompanionDamageBonus(): number {
  if (_activeCompanion === 'omegaSentinel') return 0.30
  return 0
}

/** Check if companion ability is ready */
export function isCompanionAbilityReady(id: CompanionId): boolean {
  const def = ALL_COMPANIONS[id]
  const inst = _companions[id]
  if (!def || !inst) return false
  const elapsed = (Date.now() - inst.lastAbilityTime) / 1000
  return elapsed >= def.abilityCooldown
}

/** Use companion ability */
export function useCompanionAbility(id: CompanionId): boolean {
  if (!isCompanionAbilityReady(id)) return false
  if (_companions[id]) {
    _companions[id]!.lastAbilityTime = Date.now()
    return true
  }
  return false
}

/** Serialize companions for saving */
export function serializeCompanions(): Partial<Record<CompanionId, CompanionInstance>> {
  return { ..._companions }
}

/** Load companions from save */
export function loadCompanions(data: Partial<Record<CompanionId, CompanionInstance>>): void {
  _companions = { ...data }
  // Find active companion
  for (const [id, inst] of Object.entries(_companions)) {
    if (inst?.active) {
      _activeCompanion = id as CompanionId
      break
    }
  }
}
