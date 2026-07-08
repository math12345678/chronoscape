// ── Infinite Progression — Never-Ending Growth ──
// Horizontal and vertical progression with no cap.
// Includes: infinite knowledge, mastery ranks, dimensional perks,
// and procedural milestones.

export interface KnowledgePath {
  id: string
  name: string
  icon: string
  color: string
  description: string
  level: number
  maxLevel: number // effectively infinite (capped at 10^6 for save sanity)
  baseCost: number
  costMultiplier: number
  perLevelEffect: string
  effectValue: (level: number) => number
}

export interface MasteryRank {
  id: string
  name: string
  icon: string
  color: string
  description: string
  rank: number
  xp: number
  xpToNext: number
  bonusPerRank: string
  bonusValue: number
  category: 'weapon' | 'building' | 'exploration' | 'economy' | 'combat'
}

export interface DimensionalPerk {
  id: string
  name: string
  icon: string
  color: string
  description: string
  tier: number
  dimension: number
  effect: string
  magnitude: number
  active: boolean
  costShards: number
}

export interface ProceduralMilestone {
  id: string
  title: string
  description: string
  icon: string
  color: string
  difficulty: number
  reward: string
  rewardValue: number
  completed: boolean
  completedAt: number
}

// ── Knowledge Paths ─────────────────────────────────────

const DEFAULT_KNOWLEDGE_PATHS: KnowledgePath[] = [
  { id: 'kp_time', name: 'Time Mastery', icon: 'clock', color: '#44ff88', description: 'Understanding the flow of time itself.', level: 0, maxLevel: 1000000, baseCost: 100, costMultiplier: 1.15, perLevelEffect: 'Time Credit generation +X%', effectValue: (l) => l * 2 },
  { id: 'kp_combat', name: 'Combat Prowess', icon: 'sword', color: '#ff4444', description: 'Mastery over all forms of combat.', level: 0, maxLevel: 1000000, baseCost: 150, costMultiplier: 1.18, perLevelEffect: 'Damage +X%', effectValue: (l) => l * 1.5 },
  { id: 'kp_building', name: 'Structural Intuition', icon: 'wrench', color: '#ff8844', description: 'The art of creating lasting structures.', level: 0, maxLevel: 1000000, baseCost: 120, costMultiplier: 1.12, perLevelEffect: 'Block health +X%', effectValue: (l) => l * 3 },
  { id: 'kp_resource', name: 'Resource Synthesis', icon: 'gem', color: '#ffd700', description: 'Turning time into matter.', level: 0, maxLevel: 1000000, baseCost: 130, costMultiplier: 1.14, perLevelEffect: 'Harvest yield +X%', effectValue: (l) => l * 2.5 },
  { id: 'kp_exploration', name: 'Void Navigation', icon: 'compass', color: '#aa44ff', description: 'Finding paths through impossible spaces.', level: 0, maxLevel: 1000000, baseCost: 200, costMultiplier: 1.2, perLevelEffect: 'Move speed +X%', effectValue: (l) => l * 0.5 },
  { id: 'kp_anomaly', name: 'Anomaly Attunement', icon: 'eye', color: '#ff00ff', description: 'Sensing and exploiting temporal disturbances.', level: 0, maxLevel: 1000000, baseCost: 250, costMultiplier: 1.25, perLevelEffect: 'Anomaly duration +X%', effectValue: (l) => l * 1 },
  { id: 'kp_defense', name: 'Temporal Armor', icon: 'shield', color: '#44aaff', description: 'Hardening your existence against harm.', level: 0, maxLevel: 1000000, baseCost: 180, costMultiplier: 1.16, perLevelEffect: 'Defense +X%', effectValue: (l) => l * 2 },
]

let _knowledgePaths: KnowledgePath[] = DEFAULT_KNOWLEDGE_PATHS.map(k => ({ ...k }))

let _masteryRanks: MasteryRank[] = [
  { id: 'mst_sword', name: 'Blade Master', icon: 'sword', color: '#ff4444', description: 'Mastery of melee weapons.', rank: 0, xp: 0, xpToNext: 100, bonusPerRank: '+2% melee damage', bonusValue: 2, category: 'combat' },
  { id: 'mst_ranged', name: 'Sharpshooter', icon: 'bow', color: '#44ff88', description: 'Mastery of ranged weapons.', rank: 0, xp: 0, xpToNext: 100, bonusPerRank: '+2% ranged damage', bonusValue: 2, category: 'combat' },
  { id: 'mst_building', name: 'Architect', icon: 'wrench', color: '#ff8844', description: 'Mastery of construction.', rank: 0, xp: 0, xpToNext: 100, bonusPerRank: '+3% block durability', bonusValue: 3, category: 'building' },
  { id: 'mst_harvest', name: 'Gatherer', icon: 'sickle', color: '#ffd700', description: 'Mastery of resource collection.', rank: 0, xp: 0, xpToNext: 100, bonusPerRank: '+3% harvest speed', bonusValue: 3, category: 'economy' },
  { id: 'mst_explore', name: 'Pathfinder', icon: 'compass', color: '#aa44ff', description: 'Mastery of exploration.', rank: 0, xp: 0, xpToNext: 100, bonusPerRank: '+2% move speed', bonusValue: 2, category: 'exploration' },
  { id: 'mst_survival', name: 'Survivor', icon: 'heart', color: '#44ffaa', description: 'Mastery of staying alive.', rank: 0, xp: 0, xpToNext: 100, bonusPerRank: '+5 max HP', bonusValue: 5, category: 'combat' },
]

let _dimensionalPerks: DimensionalPerk[] = []

let _proceduralMilestones: ProceduralMilestone[] = []

// ── Total progression level ──────────────────────────────

let _totalProgressionLevel = 0
let _totalXPEarned = 0

export function getKnowledgePaths(): KnowledgePath[] { return _knowledgePaths.map(k => ({ ...k })) }
export function getMasteryRanks(): MasteryRank[] { return _masteryRanks.map(m => ({ ...m })) }
export function getDimensionalPerks(): DimensionalPerk[] { return _dimensionalPerks.map(p => ({ ...p })) }
export function getProceduralMilestones(): ProceduralMilestone[] { return [..._proceduralMilestones] }
export function getTotalProgressionLevel(): number { return _totalProgressionLevel }
export function getTotalXPEarned(): number { return _totalXPEarned }

// ── Level Up Knowledge Path ─────────────────────────────

function getPathCost(path: KnowledgePath): number {
  return Math.floor(path.baseCost * Math.pow(path.costMultiplier, path.level))
}

export function canLevelKnowledge(pathId: string): boolean {
  const path = _knowledgePaths.find(k => k.id === pathId)
  if (!path || path.level >= path.maxLevel) return false
  return true // actual resource check done in caller
}

export function getKnowledgeCost(pathId: string): number {
  const path = _knowledgePaths.find(k => k.id === pathId)
  if (!path) return Infinity
  return getPathCost(path)
}

export function levelKnowledge(pathId: string, paid: boolean): boolean {
  const path = _knowledgePaths.find(k => k.id === pathId)
  if (!path || path.level >= path.maxLevel) return false
  if (!paid) return false
  path.level++
  _totalProgressionLevel++
  _totalXPEarned += getPathCost(path)
  recalcXpToNext()
  return true
}

// ── Mastery Ranks ───────────────────────────────────────

export function addMasteryXP(category: MasteryRank['category'], amount: number): boolean {
  const valid = _masteryRanks.filter(m => m.category === category)
  if (valid.length === 0) return false
  const rank = valid[Math.floor(Math.random() * valid.length)]
  rank.xp += amount
  let leveledUp = false
  while (rank.xp >= rank.xpToNext) {
    rank.xp -= rank.xpToNext
    rank.rank++
    rank.xpToNext = Math.floor(100 * Math.pow(1.2, rank.rank))
    _totalProgressionLevel++
    leveledUp = true
  }
  return leveledUp
}

function recalcXpToNext(): void {
  for (const rank of _masteryRanks) {
    rank.xpToNext = Math.floor(100 * Math.pow(1.2, rank.rank))
  }
}

// ── Dimensional Perks ───────────────────────────────────

export function unlockDimensionalPerk(perkId: string, shards: number): boolean {
  const perk = _dimensionalPerks.find(p => p.id === perkId)
  if (!perk || perk.active) return false
  if (shards < perk.costShards) return false
  perk.active = true
  _totalProgressionLevel++
  return true
}

export function generateDimensionalPerk(dimension: number, tier: number): DimensionalPerk {
  const effects = [
    { name: 'Void Strength', icon: 'sword', effect: 'damage', desc: '+X% damage in all dimensions' },
    { name: 'Timeless Harvest', icon: 'gem', effect: 'harvest', desc: '+X% resource yield' },
    { name: 'Phase Walker', icon: 'run', effect: 'speed', desc: '+X% movement speed' },
    { name: 'Crystal Fortitude', icon: 'shield', effect: 'defense', desc: 'Reduce damage taken by X%' },
    { name: 'Eternal Regen', icon: 'heart', effect: 'regen', desc: '+X HP/s health regeneration' },
    { name: 'Void Sight', icon: 'eye', effect: 'loot', desc: '+X% rare loot chance' },
  ]
  const eff = effects[(dimension * 7 + tier) % effects.length]
  const perk: DimensionalPerk = {
    id: `dim_perk_d${dimension}_t${tier}`,
    name: `${eff.name} ${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][tier % 10]}`,
    icon: eff.icon,
    color: ['#44ff88', '#44aaff', '#aa44ff', '#ffd700', '#ff00ff', '#ff4488', '#44ffaa', '#ff8844'][dimension % 8],
    description: eff.desc.replace('X', `${(tier * 5 + 5)}`),
    tier,
    dimension,
    effect: eff.effect,
    magnitude: (tier + 1) * 5,
    active: false,
    costShards: 50 * (tier + 1) * (dimension + 1),
  }
  return perk
}

export function initializeDimensionalPerks(dimensions: number): void {
  for (let d = 0; d < dimensions; d++) {
    for (let t = 0; t < 5; t++) {
      const existing = _dimensionalPerks.find(p => p.dimension === d && p.tier === t)
      if (!existing) {
        _dimensionalPerks.push(generateDimensionalPerk(d, t))
      }
    }
  }
}

// ── Procedural Milestones ───────────────────────────────

export function generateMilestone(difficulty: number): ProceduralMilestone {
  const titles = ['Reality Bender', 'Time Walker', 'Void Stalker', 'Crystal Seer', 'Flux Weaver', 'Eternal Pilgrim', 'Omega Seeker', 'Infinity Shaper']
  const descs = [
    `Survive ${difficulty * 10} seconds without taking damage`,
    `Kill ${difficulty * 5} enemies in 30 seconds`,
    `Travel ${difficulty * 50} units without stopping`,
    `Harvest ${difficulty * 100} resources in 60 seconds`,
    `Place ${difficulty * 10} blocks in 20 seconds`,
    `Defeat ${difficulty} enemies without using weapons`,
    `Reach distance ${difficulty * 100} from origin`,
    `Accumulate ${difficulty * 1000} total resources`,
  ]
  const rewards = ['raw', 'liquid', 'crystal', 'renown', 'shards', 'xp']

  const index = Math.floor(Math.random() * titles.length)
  return {
    id: `milestone_proc_${difficulty}_${Date.now()}`,
    title: titles[index],
    description: descs[index % descs.length],
    icon: ['star', 'crown', 'gem', 'sword', 'shield', 'compass', 'clock', 'infinity'][index],
    color: ['#ffd700', '#ff4488', '#44ff88', '#aa44ff', '#44aaff', '#ff8844', '#ff00ff', '#ffffff'][index],
    difficulty,
    reward: rewards[Math.floor(Math.random() * rewards.length)],
    rewardValue: difficulty * 100,
    completed: false,
    completedAt: 0,
  }
}

export function checkMilestoneCompletion(): ProceduralMilestone | null {
  const active = _proceduralMilestones.find(m => !m.completed)
  if (!active) {
    const newM = generateMilestone(_proceduralMilestones.length + 1)
    _proceduralMilestones.push(newM)
    return null
  }

  // Check completion based on description keywords
  // This would be checked externally - for now, external system marks completion
  return null
}

export function completeMilestone(id: string): boolean {
  const ms = _proceduralMilestones.find(m => m.id === id)
  if (!ms || ms.completed) return false
  ms.completed = true
  ms.completedAt = Date.now()
  _totalProgressionLevel++
  _totalXPEarned += ms.rewardValue

  // Auto-generate next milestone
  _proceduralMilestones.push(generateMilestone(ms.difficulty + 1))
  return true
}

// ── Passive Recalculation ────────────────────────────────

export function getTotalDamageBonus(): number {
  let bonus = 0
  for (const kp of _knowledgePaths) {
    if (kp.id === 'kp_combat') bonus += kp.effectValue(kp.level)
  }
  for (const mr of _masteryRanks) {
    if (mr.category === 'combat') bonus += mr.bonusValue * mr.rank
  }
  for (const dp of _dimensionalPerks) {
    if (dp.active && dp.effect === 'damage') bonus += dp.magnitude
  }
  return bonus / 100
}

export function getTotalHarvestBonus(): number {
  let bonus = 0
  for (const kp of _knowledgePaths) {
    if (kp.id === 'kp_resource') bonus += kp.effectValue(kp.level)
  }
  for (const mr of _masteryRanks) {
    if (mr.category === 'economy') bonus += mr.bonusValue * mr.rank
  }
  for (const dp of _dimensionalPerks) {
    if (dp.active && dp.effect === 'harvest') bonus += dp.magnitude
  }
  return bonus / 100
}

export function getTotalSpeedBonus(): number {
  let bonus = 0
  for (const kp of _knowledgePaths) {
    if (kp.id === 'kp_exploration') bonus += kp.effectValue(kp.level)
  }
  for (const mr of _masteryRanks) {
    if (mr.category === 'exploration') bonus += mr.bonusValue * mr.rank
  }
  for (const dp of _dimensionalPerks) {
    if (dp.active && dp.effect === 'speed') bonus += dp.magnitude
  }
  return bonus / 100
}

export function getTotalDefenseBonus(): number {
  let bonus = 0
  for (const kp of _knowledgePaths) {
    if (kp.id === 'kp_defense') bonus += kp.effectValue(kp.level)
  }
  for (const dp of _dimensionalPerks) {
    if (dp.active && dp.effect === 'defense') bonus += dp.magnitude
  }
  return bonus / 100
}

export function getTotalRegenBonus(): number {
  let bonus = 0
  for (const dp of _dimensionalPerks) {
    if (dp.active && dp.effect === 'regen') bonus += dp.magnitude
  }
  return bonus
}

export function getTotalLootBonus(): number {
  let bonus = 0
  for (const dp of _dimensionalPerks) {
    if (dp.active && dp.effect === 'loot') bonus += dp.magnitude
  }
  return bonus / 100
}

export function serializeProgression(): {
  knowledgePaths: KnowledgePath[]
  masteryRanks: MasteryRank[]
  dimensionalPerks: DimensionalPerk[]
  milestones: ProceduralMilestone[]
  totalLevel: number
  totalXP: number
} {
  return {
    knowledgePaths: _knowledgePaths.map(k => ({ ...k })),
    masteryRanks: _masteryRanks.map(m => ({ ...m })),
    dimensionalPerks: _dimensionalPerks.map(p => ({ ...p })),
    milestones: _proceduralMilestones.map(m => ({ ...m })),
    totalLevel: _totalProgressionLevel,
    totalXP: _totalXPEarned,
  }
}

export function loadProgression(data: {
  knowledgePaths: KnowledgePath[]
  masteryRanks: MasteryRank[]
  dimensionalPerks: DimensionalPerk[]
  milestones: ProceduralMilestone[]
  totalLevel: number
  totalXP: number
}): void {
  if (data.knowledgePaths) {
    _knowledgePaths = data.knowledgePaths.map(k => {
      const def = DEFAULT_KNOWLEDGE_PATHS.find(d => d.id === k.id)
      return { ...k, effectValue: def?.effectValue ?? ((l: number) => l) }
    })
  }
  if (data.masteryRanks) _masteryRanks = data.masteryRanks.map(m => ({ ...m }))
  if (data.dimensionalPerks) _dimensionalPerks = data.dimensionalPerks.map(p => ({ ...p }))
  if (data.milestones) _proceduralMilestones = data.milestones.map(m => ({ ...m }))
  if (data.totalLevel) _totalProgressionLevel = data.totalLevel
  if (data.totalXP) _totalXPEarned = data.totalXP
}
