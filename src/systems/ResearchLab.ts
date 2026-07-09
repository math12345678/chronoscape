// ── Research Lab — permanent technology tree (separate from talents) ──

import { useStore } from '../store'

export type ResearchId =
  | 'autoRefine' | 'efficientBlasting' | 'deepHarvest'
  | 'extendedRange' | 'reinforcedBlocks' | 'timeDilationField'
  | 'crystalEmpowerment' | 'voidResistance' | 'chronoRegeneration'
  | 'massRefinement' | 'temporalArmor' | 'omegaResearch'

export interface ResearchDef {
  id: ResearchId
  name: string
  description: string
  icon: string
  color: string
  tier: number // 1-4
  cost: { raw?: number; liquid?: number; crystal?: number; renown?: number }
  researchTime: number // seconds to complete
  effect: string // what it does
  prerequisites: ResearchId[]
  maxLevel: number
}

export const ALL_RESEARCH: Record<ResearchId, ResearchDef> = {
  autoRefine: {
    id: 'autoRefine', name: 'Auto-Refine', icon: '⟐', color: '#44ff88',
    description: 'Automatically refine raw into vapour over time',
    tier: 1, cost: { raw: 100, liquid: 20 }, researchTime: 30,
    effect: 'Auto-refines 5 raw → 1 vapour every 10s',
    prerequisites: [], maxLevel: 1,
  },
  efficientBlasting: {
    id: 'efficientBlasting', name: 'Efficient Blasting', icon: '💥', color: '#ff6644',
    description: 'Explosions destroy blocks more efficiently',
    tier: 1, cost: { raw: 80, liquid: 15 }, researchTime: 25,
    effect: '+25% explosion radius',
    prerequisites: [], maxLevel: 1,
  },
  deepHarvest: {
    id: 'deepHarvest', name: 'Deep Harvest', icon: '⟐', color: '#ffaa44',
    description: 'Harvest rifts yield more resources',
    tier: 1, cost: { raw: 60, liquid: 10 }, researchTime: 20,
    effect: '+50% harvest amount',
    prerequisites: [], maxLevel: 1,
  },
  extendedRange: {
    id: 'extendedRange', name: 'Extended Range', icon: '◎', color: '#44aaff',
    description: 'Increase interaction range for harvesting and building',
    tier: 2, cost: { raw: 150, liquid: 30, crystal: 10 }, researchTime: 45,
    effect: '+5 block interaction range',
    prerequisites: ['deepHarvest'], maxLevel: 1,
  },
  reinforcedBlocks: {
    id: 'reinforcedBlocks', name: 'Reinforced Blocks', icon: '🛡', color: '#4488ff',
    description: 'Blocks are more resistant to decay',
    tier: 2, cost: { raw: 120, liquid: 40, crystal: 5 }, researchTime: 40,
    effect: '+50% block decay time',
    prerequisites: ['efficientBlasting'], maxLevel: 1,
  },
  timeDilationField: {
    id: 'timeDilationField', name: 'Time Dilation Field', icon: '⏳', color: '#44ddff',
    description: 'Slows enemies within 15 units of spawn',
    tier: 2, cost: { raw: 200, liquid: 50, renown: 5 }, researchTime: 50,
    effect: 'Enemies in 15u of spawn move 30% slower',
    prerequisites: ['autoRefine'], maxLevel: 1,
  },
  crystalEmpowerment: {
    id: 'crystalEmpowerment', name: 'Crystal Empowerment', icon: '◆', color: '#aa88ff',
    description: 'Crystal blocks emit a protective aura',
    tier: 3, cost: { raw: 300, liquid: 80, crystal: 25, renown: 10 }, researchTime: 75,
    effect: 'Nearby crystal blocks heal 1 HP/s',
    prerequisites: ['reinforcedBlocks', 'timeDilationField'], maxLevel: 1,
  },
  voidResistance: {
    id: 'voidResistance', name: 'Void Resistance', icon: '◈', color: '#aa44ff',
    description: 'Reduce damage taken from void enemies',
    tier: 3, cost: { raw: 250, liquid: 60, crystal: 20, renown: 8 }, researchTime: 60,
    effect: '-25% damage from void enemies',
    prerequisites: ['extendedRange'], maxLevel: 1,
  },
  chronoRegeneration: {
    id: 'chronoRegeneration', name: 'Chrono Regeneration', icon: '💚', color: '#44ff88',
    description: 'Passive health regeneration increased',
    tier: 3, cost: { raw: 200, liquid: 100, crystal: 15, renown: 8 }, researchTime: 55,
    effect: '+2 HP/s passive regen',
    prerequisites: ['autoRefine'], maxLevel: 1,
  },
  massRefinement: {
    id: 'massRefinement', name: 'Mass Refinement', icon: '⟐⟐', color: '#ffcc44',
    description: 'Auto-refine all resource types',
    tier: 4, cost: { raw: 500, liquid: 200, crystal: 50, renown: 20 }, researchTime: 120,
    effect: 'Auto-refines vapour→liquid, liquid→crystal',
    prerequisites: ['crystalEmpowerment', 'chronoRegeneration'], maxLevel: 1,
  },
  temporalArmor: {
    id: 'temporalArmor', name: 'Temporal Armor', icon: '⬡', color: '#44aaff',
    description: 'Permanent damage reduction',
    tier: 4, cost: { raw: 400, liquid: 150, crystal: 40, renown: 15 }, researchTime: 100,
    effect: '+20 permanent armor',
    prerequisites: ['voidResistance'], maxLevel: 1,
  },
  omegaResearch: {
    id: 'omegaResearch', name: 'Ω Omega Research', icon: '✦', color: '#ff0044',
    description: 'The ultimate research — all bonuses doubled',
    tier: 4, cost: { raw: 1000, liquid: 500, crystal: 100, renown: 50 }, researchTime: 300,
    effect: 'Doubles all other research effects',
    prerequisites: ['massRefinement', 'temporalArmor'], maxLevel: 1,
  },
}

// ── State ──────────────────────────────────────────────────

export interface ResearchProgress {
  researchId: ResearchId
  completed: boolean
  startTime: number | null
  progress: number // 0-1
  level: number
}

let _research: Record<ResearchId, ResearchProgress> = {} as Record<ResearchId, ResearchProgress>
let _activeResearch: ResearchId | null = null

// Initialize
for (const id of Object.keys(ALL_RESEARCH) as ResearchId[]) {
  _research[id] = { researchId: id, completed: false, startTime: null, progress: 0, level: 0 }
}

export function getResearchState(): Record<ResearchId, ResearchProgress> {
  return { ..._research }
}

export function isResearchCompleted(id: ResearchId): boolean {
  return _research[id]?.completed ?? false
}

export function getActiveResearch(): ResearchId | null {
  return _activeResearch
}

export function getResearchProgress(id: ResearchId): number {
  return _research[id]?.progress ?? 0
}

/** Start a research project */
export function startResearch(id: ResearchId): boolean {
  if (_activeResearch) return false
  if (_research[id]?.completed) return false

  const def = ALL_RESEARCH[id]
  if (!def) return false

  // Check prerequisites
  for (const prereq of def.prerequisites) {
    if (!_research[prereq]?.completed) return false
  }

  // Check cost
  const state = useStore.getState()
  const inv = state.inventory
  if (def.cost.raw && inv.raw < def.cost.raw) return false
  if (def.cost.liquid && inv.liquid < def.cost.liquid) return false
  if (def.cost.crystal && inv.crystal < def.cost.crystal) return false
  if (def.cost.renown && inv.renown < def.cost.renown) return false

  // Pay cost
  useStore.setState((s) => ({
    inventory: {
      ...s.inventory,
      raw: s.inventory.raw - (def.cost.raw ?? 0),
      liquid: s.inventory.liquid - (def.cost.liquid ?? 0),
      crystal: s.inventory.crystal - (def.cost.crystal ?? 0),
      renown: s.inventory.renown - (def.cost.renown ?? 0),
    },
  }))

  _research[id].startTime = Date.now()
  _research[id].progress = 0
  _activeResearch = id

  return true
}

/** Tick active research */
export function tickResearch(dt: number): void {
  if (!_activeResearch) return
  const def = ALL_RESEARCH[_activeResearch]
  if (!def) return

  const progress = _research[_activeResearch]
  if (!progress) return

  progress.progress += dt / def.researchTime

  if (progress.progress >= 1) {
    progress.completed = true
    progress.level = 1
    progress.progress = 1
    _activeResearch = null

    // Apply permanent effects
    applyResearchEffect()
  }
}

/** Apply permanent research effects */
function applyResearchEffect(): void {
  // Effects are checked via the getter functions below
}

/** Cancel active research (refund 50%) */
export function cancelResearch(): void {
  if (!_activeResearch) return
  const def = ALL_RESEARCH[_activeResearch]
  if (!def) return

  // Refund 50% of cost
  const refundRaw = Math.floor((def.cost.raw ?? 0) * 0.5)
  const refundLiquid = Math.floor((def.cost.liquid ?? 0) * 0.5)
  const refundCrystal = Math.floor((def.cost.crystal ?? 0) * 0.5)
  const refundRenown = Math.floor((def.cost.renown ?? 0) * 0.5)

  useStore.setState((s) => ({
    inventory: {
      ...s.inventory,
      raw: s.inventory.raw + refundRaw,
      liquid: s.inventory.liquid + refundLiquid,
      crystal: s.inventory.crystal + refundCrystal,
      renown: s.inventory.renown + refundRenown,
    },
  }))

  _research[_activeResearch].progress = 0
  _research[_activeResearch].startTime = null
  _activeResearch = null
}

// ── Effect Getters ─────────────────────────────────────────

export function getResearchHarvestBonus(): number {
  const mult = isResearchCompleted('omegaResearch') ? 2 : 1
  return isResearchCompleted('deepHarvest') ? 0.5 * mult : 0
}

export function getResearchExplosionBonus(): number {
  const mult = isResearchCompleted('omegaResearch') ? 2 : 1
  return isResearchCompleted('efficientBlasting') ? 0.25 * mult : 0
}

export function getResearchDecayBonus(): number {
  const mult = isResearchCompleted('omegaResearch') ? 2 : 1
  return isResearchCompleted('reinforcedBlocks') ? 0.5 * mult : 0
}

export function getResearchRangeBonus(): number {
  return isResearchCompleted('extendedRange') ? 5 : 0
}

export function getResearchRegenBonus(): number {
  const mult = isResearchCompleted('omegaResearch') ? 2 : 1
  return isResearchCompleted('chronoRegeneration') ? 2 * mult : 0
}

export function getResearchVoidResistance(): number {
  const mult = isResearchCompleted('omegaResearch') ? 2 : 1
  return isResearchCompleted('voidResistance') ? 0.25 * mult : 0
}

export function getResearchArmorBonus(): number {
  const mult = isResearchCompleted('omegaResearch') ? 2 : 1
  return isResearchCompleted('temporalArmor') ? 20 * mult : 0
}

/** Serialize research for saving */
export function serializeResearch(): Record<ResearchId, ResearchProgress> {
  return { ..._research }
}

export function loadResearch(data: Record<ResearchId, ResearchProgress>): void {
  _research = { ...data }
  // Ensure all keys exist
  for (const id of Object.keys(ALL_RESEARCH) as ResearchId[]) {
    if (!_research[id]) {
      _research[id] = { researchId: id, completed: false, startTime: null, progress: 0, level: 0 }
    }
  }
}
