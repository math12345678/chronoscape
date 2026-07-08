// ── Chrono Genetics / Mutations ──
// Permanent character mutations with positive AND negative effects.
// Stackable across runs (survive ascension). Mutations are discovered
// through gameplay milestones and can be combined.

export interface MutationDef {
  id: string
  name: string
  icon: string
  color: string
  description: string
  positiveEffect: string
  positiveType: 'damage' | 'harvest' | 'speed' | 'regen' | 'loot' | 'fireRate' | 'range' | 'defense' | 'explosion' | 'all'
  positiveValue: number
  negativeEffect: string
  negativeType: 'damage' | 'harvest' | 'speed' | 'regen' | 'loot' | 'fireRate' | 'range' | 'defense'
  negativeValue: number
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary' | 'mythic'
  unlockCondition: string
  /** Returns true once this mutation can be found */
  checkUnlock: () => boolean
}

import { useStore } from '../store'
import { getPrestigeRank } from '../components/PrestigeSystem'

const MUTATIONS: MutationDef[] = [
  // ── Common ──
  {
    id: 'mut_fast_hands', name: 'Fast Hands', icon: 'fast', color: '#44ff88', rarity: 'common',
    description: 'Your hands move faster than your eyes.',
    positiveEffect: '+15% fire rate', positiveType: 'fireRate', positiveValue: 0.15,
    negativeEffect: '-10% damage', negativeType: 'damage', negativeValue: -0.10,
    unlockCondition: 'Kill 100 enemies',
    checkUnlock: () => false,
  },
  {
    id: 'mut_big_bones', name: 'Big Bones', icon: 'bones', color: '#ff8844', rarity: 'common',
    description: 'Your skeletal structure is reinforced with chrono-minerals.',
    positiveEffect: '+20% defense', positiveType: 'defense', positiveValue: 0.20,
    negativeEffect: '-10% speed', negativeType: 'speed', negativeValue: -0.10,
    unlockCondition: 'Build 50 blocks',
    checkUnlock: () => false,
  },
  // ── Uncommon ──
  {
    id: 'mut_third_eye', name: 'Third Eye', icon: 'eye', color: '#44aaff', rarity: 'uncommon',
    description: 'A temporal eye opens on your forehead, seeing enemy weak points.',
    positiveEffect: '+25% critical damage', positiveType: 'damage', positiveValue: 0.25,
    negativeEffect: '-5% max HP', negativeType: 'defense', negativeValue: -0.05,
    unlockCondition: 'Prestige 3',
    checkUnlock: () => getPrestigeRank() >= 3,
  },
  {
    id: 'mut_chrono_blood', name: 'Chrono Blood', icon: 'blood', color: '#ff66aa', rarity: 'uncommon',
    description: 'Your blood flows with temporal energy, rapidly healing wounds.',
    positiveEffect: '+3 HP/s regen', positiveType: 'regen', positiveValue: 3,
    negativeEffect: '-15% loot find', negativeType: 'loot', negativeValue: -0.15,
    unlockCondition: 'Collect 100 orbs',
    checkUnlock: () => false,
  },
  // ── Rare ──
  {
    id: 'mut_void_touch', name: 'Void Touch', icon: 'void', color: '#aa44ff', rarity: 'rare',
    description: 'Your touch unravels reality, dealing massive damage.',
    positiveEffect: '+40% damage', positiveType: 'damage', positiveValue: 0.40,
    negativeEffect: '-20% harvest yield', negativeType: 'harvest', negativeValue: -0.20,
    unlockCondition: 'Prestige 8',
    checkUnlock: () => getPrestigeRank() >= 8,
  },
  {
    id: 'mut_lightning_legs', name: 'Lightning Legs', icon: 'lightning', color: '#ffd700', rarity: 'rare',
    description: 'Your legs are charged with temporal lightning.',
    positiveEffect: '+35% speed', positiveType: 'speed', positiveValue: 0.35,
    negativeEffect: '-10% defense', negativeType: 'defense', negativeValue: -0.10,
    unlockCondition: 'Win 30 races',
    checkUnlock: () => false,
  },
  // ── Legendary ──
  {
    id: 'mut_omni_harvest', name: 'Omni-Harvest', icon: 'harvest', color: '#ff4444', rarity: 'legendary',
    description: 'Every action generates resources. Even breathing.',
    positiveEffect: '+60% harvest', positiveType: 'harvest', positiveValue: 0.60,
    negativeEffect: '-25% fire rate', negativeType: 'fireRate', negativeValue: -0.25,
    unlockCondition: 'Prestige 12',
    checkUnlock: () => getPrestigeRank() >= 12,
  },
  {
    id: 'mut_reality_warp', name: 'Reality Warper', icon: 'warp', color: '#ff00ff', rarity: 'legendary',
    description: 'You bend reality around you. Enemies struggle to reach you.',
    positiveEffect: '+5 range, +30% all stats', positiveType: 'all', positiveValue: 0.30,
    negativeEffect: '-20% regen', negativeType: 'regen', negativeValue: -0.20,
    unlockCondition: 'Prestige 15',
    checkUnlock: () => getPrestigeRank() >= 15,
  },
  // ── Mythic ──
  {
    id: 'mut_chronos_fragment', name: 'Fragment of CHRONOS', icon: 'star', color: '#ffffff', rarity: 'mythic',
    description: 'A fragment of the ultimate chronomancer lives within you.',
    positiveEffect: '+100% all stats, +10 HP/s regen', positiveType: 'all', positiveValue: 1.0,
    negativeEffect: '-30% speed (too powerful to control)', negativeType: 'speed', negativeValue: -0.30,
    unlockCondition: 'Ascend 5 times',
    checkUnlock: () => false,
  },
]

// ── State ─────────────────────────────────────────────────

export interface MutationInstance {
  mutationId: string
  active: boolean
  discoveredAt: number
}

let _mutations: MutationInstance[] = []
let _mutationSlots = 3 // max active mutations

export function getAllMutations(): MutationDef[] { return [...MUTATIONS] }

export function getMutationState(id: string): MutationInstance | undefined {
  return _mutations.find((m) => m.mutationId === id)
}

export function getActiveMutations(): MutationInstance[] {
  return _mutations.filter((m) => m.active)
}

export function getDiscoveredMutations(): MutationInstance[] {
  return [..._mutations]
}

export function getMutationSlots(): number { return _mutationSlots }

export function canAddMutation(): boolean {
  return getActiveMutations().length < _mutationSlots
}

/** Discover a new mutation (random from undiscovered pool) */
export function discoverMutation(): MutationDef | null {
  const available = MUTATIONS.filter((m) => !_mutations.some((e) => e.mutationId === m.id))
  if (available.length === 0) return null

  const mut = available[Math.floor(Math.random() * available.length)]
  _mutations.push({ mutationId: mut.id, active: true, discoveredAt: Date.now() })
  return mut
}

/** Toggle mutation active/inactive */
export function toggleMutation(id: string): boolean {
  const mut = _mutations.find((m) => m.mutationId === id)
  if (!mut) return false

  if (!mut.active && getActiveMutations().length >= _mutationSlots) return false
  mut.active = !mut.active
  return true
}

/** Increase mutation slots */
export function addMutationSlot(): void {
  _mutationSlots++
}

/** Check and unlock new mutations based on game state */
export function checkMutations(params: { kills?: number; buildings?: number; orbs?: number; races?: number }): MutationDef[] {
  const newly: MutationDef[] = []

  if (params.kills && params.kills >= 100) {
    const m = MUTATIONS.find((m) => m.id === 'mut_fast_hands')
    if (m && !_mutations.some((e) => e.mutationId === m.id)) {
      _mutations.push({ mutationId: m.id, active: true, discoveredAt: Date.now() })
      newly.push(m)
    }
  }
  if (params.buildings && params.buildings >= 50) {
    const m = MUTATIONS.find((m) => m.id === 'mut_big_bones')
    if (m && !_mutations.some((e) => e.mutationId === m.id)) {
      _mutations.push({ mutationId: m.id, active: true, discoveredAt: Date.now() })
      newly.push(m)
    }
  }
  if (params.orbs && params.orbs >= 100) {
    const m = MUTATIONS.find((m) => m.id === 'mut_chrono_blood')
    if (m && !_mutations.some((e) => e.mutationId === m.id)) {
      _mutations.push({ mutationId: m.id, active: true, discoveredAt: Date.now() })
      newly.push(m)
    }
  }
  if (params.races && params.races >= 30) {
    const m = MUTATIONS.find((m) => m.id === 'mut_lightning_legs')
    if (m && !_mutations.some((e) => e.mutationId === m.id)) {
      _mutations.push({ mutationId: m.id, active: true, discoveredAt: Date.now() })
      newly.push(m)
    }
  }

  // Prestige-based
  const prestige = getPrestigeRank()
  if (prestige >= 3) {
    const m = MUTATIONS.find((m) => m.id === 'mut_third_eye')
    if (m && !_mutations.some((e) => e.mutationId === m.id)) {
      _mutations.push({ mutationId: m.id, active: true, discoveredAt: Date.now() })
      newly.push(m)
    }
  }
  if (prestige >= 8) {
    const m = MUTATIONS.find((m) => m.id === 'mut_void_touch')
    if (m && !_mutations.some((e) => e.mutationId === m.id)) {
      _mutations.push({ mutationId: m.id, active: true, discoveredAt: Date.now() })
      newly.push(m)
    }
  }
  if (prestige >= 12) {
    const m = MUTATIONS.find((m) => m.id === 'mut_omni_harvest')
    if (m && !_mutations.some((e) => e.mutationId === m.id)) {
      _mutations.push({ mutationId: m.id, active: true, discoveredAt: Date.now() })
      newly.push(m)
    }
  }
  if (prestige >= 15) {
    const m = MUTATIONS.find((m) => m.id === 'mut_reality_warp')
    if (m && !_mutations.some((e) => e.mutationId === m.id)) {
      _mutations.push({ mutationId: m.id, active: true, discoveredAt: Date.now() })
      newly.push(m)
    }
  }

  return newly
}

/** Get total modifier from active mutations */
export function getMutationModifier(type: MutationDef['positiveType']): number {
  let total = 0
  for (const inst of getActiveMutations()) {
    const def = MUTATIONS.find((m) => m.id === inst.mutationId)
    if (!def) continue
    if (def.positiveType === type || def.positiveType === 'all') {
      total += def.positiveValue
    }
    // Negative effects
    if (def.negativeType === type) {
      total += def.negativeValue // already negative
    }
  }
  return total
}

export function serializeMutations(): MutationInstance[] {
  return _mutations.map((m) => ({ ...m }))
}

export function loadMutations(data: MutationInstance[]): void {
  _mutations = (data ?? []).map((m) => ({ ...m }))
  _mutationSlots = 3
}
