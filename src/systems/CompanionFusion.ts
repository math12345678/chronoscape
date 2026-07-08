// ── Companion Fusion 2.0 — Breed/fuse companions into hybrids ──
// Fuse two companions to create a hybrid that inherits traits from both.
// Each hybrid has combined abilities and bonus stats.

import { useStore } from '../store'

export interface CompanionSpecies {
  id: string
  name: string
  icon: string
  color: string
  description: string
  baseDamage: number
  baseHealth: number
  baseSpeed: number
  ability: string
  passive: string
  passiveType: 'harvest' | 'damage' | 'speed' | 'loot' | 'regen'
  passiveValue: number
  fusionAffinity: string[] // species IDs this can fuse with
}

const SPECIES: CompanionSpecies[] = [
  { id: 'species_chrono_cat', name: 'Chrono Cat', icon: 'cat', color: '#ff8844', description: 'A cat that exists in all timelines simultaneously.',
    baseDamage: 5, baseHealth: 50, baseSpeed: 4, ability: 'Nine Lives (revive once)',
    passive: 'Loot Finder', passiveType: 'loot', passiveValue: 0.1,
    fusionAffinity: ['species_void_hound', 'species_temporal_fox', 'species_crystal_drake'] },
  { id: 'species_void_hound', name: 'Void Hound', icon: 'dog', color: '#aa44ff', description: 'A hound that hunts prey across dimensional boundaries.',
    baseDamage: 12, baseHealth: 80, baseSpeed: 3.5, ability: 'Void Howl (fear enemies)',
    passive: 'Damage Aura', passiveType: 'damage', passiveValue: 0.15,
    fusionAffinity: ['species_chrono_cat', 'species_temporal_fox', 'species_omega_owl'] },
  { id: 'species_temporal_fox', name: 'Temporal Fox', icon: 'fox', color: '#ff6644', description: 'A cunning fox that can slip through moments.',
    baseDamage: 7, baseHealth: 40, baseSpeed: 5, ability: 'Time Slip (dodge attacks)',
    passive: 'Speed Boost', passiveType: 'speed', passiveValue: 0.12,
    fusionAffinity: ['species_chrono_cat', 'species_void_hound', 'species_crystal_drake'] },
  { id: 'species_crystal_drake', name: 'Crystal Drake', icon: 'dragon', color: '#44aaff', description: 'A drake with scales of crystallized time.',
    baseDamage: 20, baseHealth: 120, baseSpeed: 2.5, ability: 'Crystal Breath (AoE freeze)',
    passive: 'Harvest Boost', passiveType: 'harvest', passiveValue: 0.2,
    fusionAffinity: ['species_chrono_cat', 'species_temporal_fox', 'species_omega_owl'] },
  { id: 'species_omega_owl', name: 'Omega Owl', icon: 'owl', color: '#ffd700', description: 'An owl that sees all possible futures.',
    baseDamage: 15, baseHealth: 60, baseSpeed: 3, ability: 'Future Sight (predict attacks)',
    passive: 'Regeneration Aura', passiveType: 'regen', passiveValue: 2,
    fusionAffinity: ['species_void_hound', 'species_crystal_drake', 'species_temporal_fox'] },
]

function getSpecies(id: string): CompanionSpecies | undefined {
  return SPECIES.find((s) => s.id === id)
}

// ── Hybrid definitions ──

export interface HybridDef {
  id: string
  name: string
  icon: string
  color: string
  description: string
  parent1: string
  parent2: string
  damage: number
  health: number
  speed: number
  ability: string
  passives: { type: CompanionSpecies['passiveType']; value: number }[]
}

function generateHybrid(s1: CompanionSpecies, s2: CompanionSpecies): HybridDef {
  const names = [
    `${s1.name.split(/\s+/).pop()}-${s2.name.split(/\s+/).pop()} Hybrid`,
    `Chrono-${s1.icon}-${s2.icon}`,
    `${s2.name.split(/\s+/).pop()}${s1.name.split(/\s+/).pop()}`,
  ]
  const name = names[Math.floor(Math.random() * names.length)]
  const icons = ['star', 'sparkles', 'diamond', 'gem', 'crown', 'moon']
  const icon = icons[Math.floor(Math.random() * icons.length)]
  const colors = ['#ff00ff', '#44ffff', '#ffd700', '#ff4488', '#88ff44', '#4488ff']

  return {
    id: `hybrid_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    icon,
    color: colors[Math.floor(Math.random() * colors.length)],
    description: `A fusion of ${s1.name} and ${s2.name}. It has traits of both parents.`,
    parent1: s1.id,
    parent2: s2.id,
    damage: Math.floor((s1.baseDamage + s2.baseDamage) * 1.5),
    health: Math.floor((s1.baseHealth + s2.baseHealth) * 1.3),
    speed: (s1.baseSpeed + s2.baseSpeed) / 2 * 1.2,
    ability: `${s1.ability} + ${s2.ability}`,
    passives: [
      { type: s1.passiveType, value: s1.passiveValue * 1.5 },
      { type: s2.passiveType, value: s2.passiveValue * 1.5 },
    ],
  }
}

// ── State ─────────────────────────────────────────────────

export interface CompanionFusionState {
  ownedSpecies: string[] // species ids discovered/owned
  hybrids: HybridDef[]
  activeHybrid: string | null
}

let _state: CompanionFusionState = {
  ownedSpecies: [],
  hybrids: [],
  activeHybrid: null,
}

export function getFusionState(): CompanionFusionState {
  return { ..._state, hybrids: _state.hybrids.map((h) => ({ ...h })) }
}

export function getActiveHybrid(): HybridDef | null {
  if (!_state.activeHybrid) return null
  return _state.hybrids.find((h) => h.id === _state.activeHybrid) ?? null
}

export function discoverSpecies(id: string): boolean {
  if (_state.ownedSpecies.includes(id)) return false
  _state.ownedSpecies.push(id)
  return true
}

export function fuseCompanions(speciesId1: string, speciesId2: string): HybridDef | null {
  if (!_state.ownedSpecies.includes(speciesId1) || !_state.ownedSpecies.includes(speciesId2)) return null

  const s1 = getSpecies(speciesId1)
  const s2 = getSpecies(speciesId2)
  if (!s1 || !s2) return null
  if (!s1.fusionAffinity.includes(speciesId2) && !s2.fusionAffinity.includes(speciesId1)) return null

  // Cost
  const inv = useStore.getState().inventory
  if (inv.crystal < 100 || inv.liquid < 500) return null

  useStore.setState((s) => ({
    inventory: {
      ...s.inventory,
      crystal: s.inventory.crystal - 100,
      liquid: s.inventory.liquid - 500,
    },
  }))

  const hybrid = generateHybrid(s1, s2)
  _state.hybrids.push(hybrid)
  return hybrid
}

export function setActiveHybrid(id: string): boolean {
  const exists = _state.hybrids.find((h) => h.id === id)
  if (!exists) return false
  _state.activeHybrid = id
  return true
}

/** Get combined passive bonuses from active hybrid */
export function getActiveHybridBonuses(): Record<string, number> {
  const hybrid = getActiveHybrid()
  if (!hybrid) return {}
  const bonuses: Record<string, number> = {}
  for (const p of hybrid.passives) {
    bonuses[p.type] = (bonuses[p.type] ?? 0) + p.value
  }
  return bonuses
}

export function serializeFusion(): CompanionFusionState {
  return {
    ownedSpecies: [..._state.ownedSpecies],
    hybrids: _state.hybrids.map((h) => ({ ...h })),
    activeHybrid: _state.activeHybrid,
  }
}

export function loadFusion(data: CompanionFusionState): void {
  _state = {
    ownedSpecies: [...(data.ownedSpecies ?? [])],
    hybrids: (data.hybrids ?? []).map((h) => ({ ...h })),
    activeHybrid: data.activeHybrid ?? null,
  }
}
