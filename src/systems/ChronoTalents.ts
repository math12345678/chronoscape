// ── Chrono Talent Tree — deep progression with real choices ──────────────

export type TalentId =
  // Combat Tree
  | 'powerShot' | 'doubleTap' | 'sniperFocus' | 'rapidFire'
  | 'lifeSteal' | 'critMastery' | 'explosiveRounds' | 'timeFreezeAura'
  | 'voidAmmo' | 'chainReaction' | 'overcharge' | 'chronoBerserk'
  // Economy Tree
  | 'efficientRefine' | 'bulkHarvest' | 'marketSense' | 'greedIsGood'
  | 'compoundInterest' | 'prestigeBoost' | 'passiveIncome' | 'renownMastery'
  | 'bondMaven' | 'industryTitan' | 'empireBuilder' | 'chronoCapitalist'
  // Building Tree
  | 'strongFoundations' | 'quickBuild' | 'blueprintSavant' | 'resourceful'
  | 'fortified' | 'decayResist' | 'massProduction' | 'architectVision'
  | 'ecoFriendly' | 'timeAccelerator' | 'megaStructures' | 'chronoArchitect'

export type TalentTree = 'combat' | 'economy' | 'building'

export interface TalentDef {
  id: TalentId
  name: string
  description: string
  tree: TalentTree
  tier: number // 1-4
  maxRank: number // 1-5
  icon: string
  color: string
  prerequisites: TalentId[]
  requiresRenownPerRank?: number
}

export const ALL_TALENTS: Record<TalentId, TalentDef> = {
  // ── COMBAT TREE (Tier 1) ──────────────────────────────────
  powerShot: {
    id: 'powerShot',
    name: 'Power Shot',
    description: '+10% damage per rank',
    tree: 'combat',
    tier: 1,
    maxRank: 5,
    icon: '⚡',
    color: '#ff6644',
    prerequisites: [],
    requiresRenownPerRank: 2,
  },
  doubleTap: {
    id: 'doubleTap',
    name: 'Double Tap',
    description: '5% chance per rank to fire a second shot',
    tree: 'combat',
    tier: 1,
    maxRank: 3,
    icon: '➤➤',
    color: '#ff8844',
    prerequisites: [],
    requiresRenownPerRank: 3,
  },
  sniperFocus: {
    id: 'sniperFocus',
    name: 'Sniper Focus',
    description: '+10% range per rank',
    tree: 'combat',
    tier: 1,
    maxRank: 3,
    icon: '◎',
    color: '#44aaff',
    prerequisites: [],
    requiresRenownPerRank: 3,
  },
  // COMBAT TREE (Tier 2)
  rapidFire: {
    id: 'rapidFire',
    name: 'Rapid Fire',
    description: '+8% fire rate per rank',
    tree: 'combat',
    tier: 2,
    maxRank: 3,
    icon: '⚡⚡',
    color: '#ffaa22',
    prerequisites: ['powerShot'],
    requiresRenownPerRank: 5,
  },
  lifeSteal: {
    id: 'lifeSteal',
    name: 'Life Steal',
    description: 'Heal 3% of damage dealt per rank',
    tree: 'combat',
    tier: 2,
    maxRank: 3,
    icon: '💚',
    color: '#44ff88',
    prerequisites: ['doubleTap'],
    requiresRenownPerRank: 5,
  },
  critMastery: {
    id: 'critMastery',
    name: 'Crit Mastery',
    description: '+5% crit chance, +15% crit damage per rank',
    tree: 'combat',
    tier: 2,
    maxRank: 3,
    icon: '✦',
    color: '#ffdd44',
    prerequisites: ['sniperFocus'],
    requiresRenownPerRank: 5,
  },
  // COMBAT TREE (Tier 3)
  explosiveRounds: {
    id: 'explosiveRounds',
    name: 'Explosive Rounds',
    description: 'Projectiles deal 1 unit splash per rank',
    tree: 'combat',
    tier: 3,
    maxRank: 2,
    icon: '💥',
    color: '#ff4400',
    prerequisites: ['rapidFire'],
    requiresRenownPerRank: 8,
  },
  timeFreezeAura: {
    id: 'timeFreezeAura',
    name: 'Time Freeze Aura',
    description: '10% chance per rank to slow nearby enemies on hit',
    tree: 'combat',
    tier: 3,
    maxRank: 2,
    icon: '❄',
    color: '#44ddff',
    prerequisites: ['lifeSteal'],
    requiresRenownPerRank: 8,
  },
  voidAmmo: {
    id: 'voidAmmo',
    name: 'Void Ammo',
    description: 'Armor reduction per rank on hit target',
    tree: 'combat',
    tier: 3,
    maxRank: 2,
    icon: '◈',
    color: '#aa44ff',
    prerequisites: ['critMastery'],
    requiresRenownPerRank: 8,
  },
  // COMBAT TREE (Tier 4)
  chainReaction: {
    id: 'chainReaction',
    name: 'Chain Reaction',
    description: 'Kills have 15% chance per rank to chain to nearby enemy',
    tree: 'combat',
    tier: 4,
    maxRank: 2,
    icon: '⟳',
    color: '#ff2200',
    prerequisites: ['explosiveRounds'],
    requiresRenownPerRank: 15,
  },
  overcharge: {
    id: 'overcharge',
    name: 'Overcharge',
    description: 'Every 10th shot deals 100% bonus damage per rank',
    tree: 'combat',
    tier: 4,
    maxRank: 2,
    icon: '◉',
    color: '#ffaa00',
    prerequisites: ['timeFreezeAura'],
    requiresRenownPerRank: 15,
  },
  chronoBerserk: {
    id: 'chronoBerserk',
    name: 'Chrono Berserk',
    description: 'Below 30% HP: +25% damage, +25% speed per rank',
    tree: 'combat',
    tier: 4,
    maxRank: 2,
    icon: '🔥',
    color: '#ff0044',
    prerequisites: ['voidAmmo'],
    requiresRenownPerRank: 15,
  },

  // ── ECONOMY TREE (Tier 1) ────────────────────────────────
  efficientRefine: {
    id: 'efficientRefine',
    name: 'Efficient Refinement',
    description: 'Refine 15% more per rank (same raw cost)',
    tree: 'economy',
    tier: 1,
    maxRank: 5,
    icon: '⟐',
    color: '#ffcc44',
    prerequisites: [],
    requiresRenownPerRank: 2,
  },
  bulkHarvest: {
    id: 'bulkHarvest',
    name: 'Bulk Harvest',
    description: '+25% harvest amount per rank',
    tree: 'economy',
    tier: 1,
    maxRank: 3,
    icon: '⟐',
    color: '#ffaa44',
    prerequisites: [],
    requiresRenownPerRank: 3,
  },
  marketSense: {
    id: 'marketSense',
    name: 'Market Sense',
    description: 'Trade rates improve 8% per rank',
    tree: 'economy',
    tier: 1,
    maxRank: 3,
    icon: '⟡',
    color: '#44ffaa',
    prerequisites: [],
    requiresRenownPerRank: 3,
  },
  // ECONOMY TREE (Tier 2)
  greedIsGood: {
    id: 'greedIsGood',
    name: 'Greed is Good',
    description: 'Enemies drop 15% more resources per rank',
    tree: 'economy',
    tier: 2,
    maxRank: 3,
    icon: '💰',
    color: '#ffd700',
    prerequisites: ['efficientRefine'],
    requiresRenownPerRank: 5,
  },
  compoundInterest: {
    id: 'compoundInterest',
    name: 'Compound Interest',
    description: 'Bonds mature 10% faster per rank',
    tree: 'economy',
    tier: 2,
    maxRank: 3,
    icon: '⟐⟐',
    color: '#44dd88',
    prerequisites: ['bulkHarvest'],
    requiresRenownPerRank: 5,
  },
  prestigeBoost: {
    id: 'prestigeBoost',
    name: 'Prestige Boost',
    description: 'Prestige bonuses increased 20% per rank',
    tree: 'economy',
    tier: 2,
    maxRank: 3,
    icon: '⬡',
    color: '#ff88ff',
    prerequisites: ['marketSense'],
    requiresRenownPerRank: 5,
  },
  // ECONOMY TREE (Tier 3)
  passiveIncome: {
    id: 'passiveIncome',
    name: 'Passive Income',
    description: 'Auto-generate +1 raw/s per rank',
    tree: 'economy',
    tier: 3,
    maxRank: 3,
    icon: '⟳',
    color: '#44ffcc',
    prerequisites: ['greedIsGood'],
    requiresRenownPerRank: 8,
  },
  renownMastery: {
    id: 'renownMastery',
    name: 'Renown Mastery',
    description: 'Renown gains +20% per rank',
    tree: 'economy',
    tier: 3,
    maxRank: 2,
    icon: '✦',
    color: '#ffdd88',
    prerequisites: ['compoundInterest'],
    requiresRenownPerRank: 8,
  },
  bondMaven: {
    id: 'bondMaven',
    name: 'Bond Maven',
    description: 'Bond interest +25% per rank',
    tree: 'economy',
    tier: 3,
    maxRank: 2,
    icon: '⏳',
    color: '#44aaff',
    prerequisites: ['prestigeBoost'],
    requiresRenownPerRank: 8,
  },
  // ECONOMY TREE (Tier 4)
  industryTitan: {
    id: 'industryTitan',
    name: 'Industry Titan',
    description: 'Industry production +50% per rank',
    tree: 'economy',
    tier: 4,
    maxRank: 2,
    icon: '🏭',
    color: '#ff8844',
    prerequisites: ['passiveIncome'],
    requiresRenownPerRank: 15,
  },
  empireBuilder: {
    id: 'empireBuilder',
    name: 'Empire Builder',
    description: 'CEO dividends +100% per rank',
    tree: 'economy',
    tier: 4,
    maxRank: 2,
    icon: '👑',
    color: '#ffd700',
    prerequisites: ['renownMastery'],
    requiresRenownPerRank: 15,
  },
  chronoCapitalist: {
    id: 'chronoCapitalist',
    name: 'Chrono Capitalist',
    description: 'All income sources +30% per rank',
    tree: 'economy',
    tier: 4,
    maxRank: 2,
    icon: '⟐',
    color: '#ffaa44',
    prerequisites: ['bondMaven'],
    requiresRenownPerRank: 15,
  },

  // ── BUILDING TREE (Tier 1) ───────────────────────────────
  strongFoundations: {
    id: 'strongFoundations',
    name: 'Strong Foundations',
    description: 'Placed blocks last 20% longer per rank',
    tree: 'building',
    tier: 1,
    maxRank: 5,
    icon: '⬡',
    color: '#44aaff',
    prerequisites: [],
    requiresRenownPerRank: 2,
  },
  quickBuild: {
    id: 'quickBuild',
    name: 'Quick Build',
    description: 'Place blocks 15% faster per rank',
    tree: 'building',
    tier: 1,
    maxRank: 3,
    icon: '⬡⬡',
    color: '#44ccaa',
    prerequisites: [],
    requiresRenownPerRank: 3,
  },
  blueprintSavant: {
    id: 'blueprintSavant',
    name: 'Blueprint Savant',
    description: '+3 blueprint slots per rank',
    tree: 'building',
    tier: 1,
    maxRank: 3,
    icon: '📐',
    color: '#88aaff',
    prerequisites: [],
    requiresRenownPerRank: 3,
  },
  // BUILDING TREE (Tier 2)
  resourceful: {
    id: 'resourceful',
    name: 'Resourceful',
    description: '10% block refund per rank on demolish',
    tree: 'building',
    tier: 2,
    maxRank: 3,
    icon: '⟐',
    color: '#44ff88',
    prerequisites: ['strongFoundations'],
    requiresRenownPerRank: 5,
  },
  fortified: {
    id: 'fortified',
    name: 'Fortified',
    description: 'Blocks take 1 extra explosion to destroy per rank',
    tree: 'building',
    tier: 2,
    maxRank: 3,
    icon: '🛡',
    color: '#4488ff',
    prerequisites: ['quickBuild'],
    requiresRenownPerRank: 5,
  },
  decayResist: {
    id: 'decayResist',
    name: 'Decay Resistance',
    description: 'Vapour decay rate -15% per rank',
    tree: 'building',
    tier: 2,
    maxRank: 3,
    icon: '⟐',
    color: '#88ffaa',
    prerequisites: ['blueprintSavant'],
    requiresRenownPerRank: 5,
  },
  // BUILDING TREE (Tier 3)
  massProduction: {
    id: 'massProduction',
    name: 'Mass Production',
    description: 'Paste blueprints for 20% less cost per rank',
    tree: 'building',
    tier: 3,
    maxRank: 2,
    icon: '🏗',
    color: '#ffaa44',
    prerequisites: ['resourceful'],
    requiresRenownPerRank: 8,
  },
  architectVision: {
    id: 'architectVision',
    name: 'Architect Vision',
    description: 'Selection box expands 2x per rank',
    tree: 'building',
    tier: 3,
    maxRank: 2,
    icon: '🔲',
    color: '#aa88ff',
    prerequisites: ['fortified'],
    requiresRenownPerRank: 8,
  },
  ecoFriendly: {
    id: 'ecoFriendly',
    name: 'Eco-Friendly',
    description: 'Block cost -10% per rank',
    tree: 'building',
    tier: 3,
    maxRank: 2,
    icon: '♻',
    color: '#44ff66',
    prerequisites: ['decayResist'],
    requiresRenownPerRank: 8,
  },
  // BUILDING TREE (Tier 4)
  timeAccelerator: {
    id: 'timeAccelerator',
    name: 'Time Accelerator',
    description: 'Adjacent buildings operate 30% faster per rank',
    tree: 'building',
    tier: 4,
    maxRank: 2,
    icon: '⏩',
    color: '#44ddff',
    prerequisites: ['massProduction'],
    requiresRenownPerRank: 15,
  },
  megaStructures: {
    id: 'megaStructures',
    name: 'Mega Structures',
    description: 'No block height limit. Place 50% larger structures',
    tree: 'building',
    tier: 4,
    maxRank: 2,
    icon: '🏛',
    color: '#ffcc44',
    prerequisites: ['architectVision'],
    requiresRenownPerRank: 15,
  },
  chronoArchitect: {
    id: 'chronoArchitect',
    name: 'Chrono Architect',
    description: 'Structures last forever. Zero decay on all blocks',
    tree: 'building',
    tier: 4,
    maxRank: 1,
    icon: '✦',
    color: '#ff44ff',
    prerequisites: ['ecoFriendly'],
    requiresRenownPerRank: 20,
  },

  // ── TOTAL: 36 talent IDs ──────────────────────────────────
}

// ── State ──────────────────────────────────────────────────

export interface TalentState {
  ranks: Record<TalentId, number> // 0 = not purchased
  talentPoints: number
  totalSpent: number
}

let _talentState: TalentState = {
  ranks: {} as Record<TalentId, number>,
  talentPoints: 0,
  totalSpent: 0,
}

// Initialize all talents to rank 0
for (const id of Object.keys(ALL_TALENTS) as TalentId[]) {
  _talentState.ranks[id] = 0
}

export function getTalentState(): TalentState {
  return { ..._talentState, ranks: { ..._talentState.ranks } }
}

export function getTalentRank(id: TalentId): number {
  return _talentState.ranks[id] ?? 0
}

export function getTalentPoints(): number {
  return _talentState.talentPoints
}

/** Grant talent points (called on level-up, prestige, milestones) */
export function addTalentPoints(amount: number): void {
  _talentState.talentPoints += amount
}

/** Check if a talent can be purchased */
export function canPurchaseTalent(id: TalentId, renownHeld: number): boolean {
  const def = ALL_TALENTS[id]
  if (!def) return false
  const currentRank = _talentState.ranks[id] ?? 0
  if (currentRank >= def.maxRank) return false
  if (_talentState.talentPoints <= 0) return false
  // Check prerequisites
  for (const prereq of def.prerequisites) {
    const prereqRank = _talentState.ranks[prereq] ?? 0
    if (prereqRank < 1) return false
  }
  const cost = def.requiresRenownPerRank ?? 0
  if (renownHeld < cost) return false
  return true
}

/** Purchase a talent rank */
export function purchaseTalent(id: TalentId, renownHeld: number): boolean {
  if (!canPurchaseTalent(id, renownHeld)) return false
  _talentState.ranks[id] = (_talentState.ranks[id] ?? 0) + 1
  _talentState.talentPoints -= 1
  _talentState.totalSpent += 1
  return true
}

/** Calculate effective damage multiplier from talents */
export function getTalentDamageMultiplier(): number {
  let mult = 1.0
  const powerRank = _talentState.ranks['powerShot'] ?? 0
  mult += powerRank * 0.10
  const berserk = _talentState.ranks['chronoBerserk'] ?? 0
  if (berserk > 0) {
    // Berserk bonus applied conditionally in combat system
  }
  return mult
}

/** Calculate effective fire rate multiplier from talents */
export function getTalentFireRateMultiplier(): number {
  const rapidRank = _talentState.ranks['rapidFire'] ?? 0
  return 1.0 + rapidRank * 0.08
}

/** Calculate effective range multiplier from talents */
export function getTalentRangeMultiplier(): number {
  const sniperRank = _talentState.ranks['sniperFocus'] ?? 0
  return 1.0 + sniperRank * 0.10
}

/** Calculate effective harvest amount multiplier from talents */
export function getTalentHarvestMultiplier(): number {
  const bulkRank = _talentState.ranks['bulkHarvest'] ?? 0
  return 1.0 + bulkRank * 0.25
}

/** Calculate effective refine efficiency */
export function getTalentRefineMultiplier(): number {
  const refineRank = _talentState.ranks['efficientRefine'] ?? 0
  return 1.0 + refineRank * 0.15
}

/** Calculate effective block decay reduction */
export function getTalentDecayReduction(): number {
  const decayRank = _talentState.ranks['decayResist'] ?? 0
  return decayRank * 0.15
}

/** Calculate effective block cost reduction */
export function getTalentBlockCostReduction(): number {
  const ecoRank = _talentState.ranks['ecoFriendly'] ?? 0
  return ecoRank * 0.10
}

/** Calculate effective block refund rate */
export function getTalentBlockRefundBonus(): number {
  const resourceRank = _talentState.ranks['resourceful'] ?? 0
  return resourceRank * 0.10
}

/** Calculate effective trade rate multiplier */
export function getTalentTradeMultiplier(): number {
  const marketRank = _talentState.ranks['marketSense'] ?? 0
  return 1.0 + marketRank * 0.08
}

/** Calculate effective enemy drop multiplier */
export function getTalentDropMultiplier(): number {
  const greedRank = _talentState.ranks['greedIsGood'] ?? 0
  return 1.0 + greedRank * 0.15
}

/** Check if double tap procs */
export function checkDoubleTap(): boolean {
  const rank = _talentState.ranks['doubleTap'] ?? 0
  return Math.random() < rank * 0.05
}

/** Check if life steal applies, returns heal amount */
export function getLifeStealHeal(damage: number): number {
  const rank = _talentState.ranks['lifeSteal'] ?? 0
  if (rank <= 0) return 0
  return Math.floor(damage * (rank * 0.03))
}

/** Get crit damage multiplier */
export function getCritDamageMultiplier(): number {
  const rank = _talentState.ranks['critMastery'] ?? 0
  return 1.0 + rank * 0.15
}

/** Get bonus renown percentage */
export function getTalentRenownBonusPercent(): number {
  const rank = _talentState.ranks['renownMastery'] ?? 0
  return rank * 20
}

/** Get passive income raw/sec */
export function getTalentPassiveIncome(): number {
  const rank = _talentState.ranks['passiveIncome'] ?? 0
  return rank * 1
}

/** Get all talents for a tree with computed availability */
export function getTalentsByTree(tree: TalentTree): (TalentDef & { rank: number; canAfford: boolean; available: boolean })[] {
  const result: (TalentDef & { rank: number; canAfford: boolean; available: boolean })[] = []
  for (const def of Object.values(ALL_TALENTS)) {
    if (def.tree !== tree) continue
    const rank = _talentState.ranks[def.id] ?? 0
    result.push({
      ...def,
      rank,
      canAfford: true,
      available: true,
    })
  }
  return result
}

/** Load talent state from save */
export function loadTalentState(state: TalentState): void {
  _talentState = {
    ranks: { ...state.ranks },
    talentPoints: state.talentPoints,
    totalSpent: state.totalSpent,
  }
  // Ensure all talents exist
  for (const id of Object.keys(ALL_TALENTS) as TalentId[]) {
    if (_talentState.ranks[id] === undefined) _talentState.ranks[id] = 0
  }
}

/** Serialize talent state for saving */
export function serializeTalentState(): TalentState {
  return {
    ranks: { ..._talentState.ranks },
    talentPoints: _talentState.talentPoints,
    totalSpent: _talentState.totalSpent,
  }
}

/** Calculate total points to award based on renown milestones */
export function calculateTalentPointsFromRenown(renown: number): number {
  // 1 point per 10 renown, capped at 50
  return Math.min(50, Math.floor(renown / 10))
}
