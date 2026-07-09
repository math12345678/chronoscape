// ── Tech Web — Non-Linear Technology Tree ──
// A graph of interconnected technologies. Unlocking a node
// provides bonuses and unlocks adjacent nodes. Synergy bonuses
// for completing branches.

import { useStore } from '../store'

export interface TechNode {
  id: string
  name: string
  description: string
  icon: string
  color: string
  branch: 'combat' | 'economy' | 'exploration' | 'building' | 'temporal'
  cost: { raw: number; liquid: number; crystal: number; renown: number; shards?: number }
  effect: string
  effectValue: number
  unlocked: boolean
  prerequisites: string[] // node IDs
  children: string[]
  tier: number
  synergyGroup: string | null // nodes in the same synergy group give bonus when all unlocked
}

// ── Tech Web Definition ──────────────────────────────────

const TECH_TREE: Omit<TechNode, 'unlocked'>[] = [
  // ── Combat Branch ──
  { id: 'combat_01', name: 'Combat Basics', description: 'Foundational combat techniques.', icon: '⚔️', color: '#ff4444', branch: 'combat', cost: { raw: 200, liquid: 50, crystal: 20, renown: 5 }, effect: '+10% damage', effectValue: 0.10, prerequisites: [], children: ['combat_02', 'combat_03'], tier: 1, synergyGroup: 'combat_mastery' },
  { id: 'combat_02', name: 'Weapon Focus', description: 'Enhanced weapon handling.', icon: '🎯', color: '#ff6644', branch: 'combat', cost: { raw: 500, liquid: 100, crystal: 50, renown: 10 }, effect: '+15% fire rate', effectValue: 0.15, prerequisites: ['combat_01'], children: ['combat_04'], tier: 2, synergyGroup: 'combat_mastery' },
  { id: 'combat_03', name: 'Armor Training', description: 'Reduce damage taken.', icon: '🛡️', color: '#ff8844', branch: 'combat', cost: { raw: 400, liquid: 80, crystal: 40, renown: 8 }, effect: '+15% defense', effectValue: 0.15, prerequisites: ['combat_01'], children: ['combat_04'], tier: 2, synergyGroup: 'combat_mastery' },
  { id: 'combat_04', name: 'Critical Strikes', description: 'Chance to deal double damage.', icon: '💥', color: '#ffaa44', branch: 'combat', cost: { raw: 1000, liquid: 200, crystal: 100, renown: 20 }, effect: '+10% crit chance', effectValue: 0.10, prerequisites: ['combat_02', 'combat_03'], children: ['combat_05'], tier: 3, synergyGroup: 'combat_mastery' },
  { id: 'combat_05', name: 'Berserker', description: 'Damage increases at low health.', icon: '😡', color: '#ff4444', branch: 'combat', cost: { raw: 2000, liquid: 400, crystal: 200, renown: 40 }, effect: '+50% damage when below 30% HP', effectValue: 0.50, prerequisites: ['combat_04'], children: ['combat_06'], tier: 4, synergyGroup: null },
  { id: 'combat_06', name: 'Veteran', description: 'All combat bonuses doubled.', icon: '🏆', color: '#ffd700', branch: 'combat', cost: { raw: 5000, liquid: 1000, crystal: 500, renown: 100, shards: 10 }, effect: 'Combat branch effects x2', effectValue: 2.0, prerequisites: ['combat_05'], children: [], tier: 5, synergyGroup: null },

  // ── Economy Branch ──
  { id: 'econ_01', name: 'Efficient Harvesting', description: 'Optimize resource collection.', icon: '🔧', color: '#ffd700', branch: 'economy', cost: { raw: 150, liquid: 30, crystal: 10, renown: 3 }, effect: '+15% harvest yield', effectValue: 0.15, prerequisites: [], children: ['econ_02', 'econ_03'], tier: 1, synergyGroup: 'economic_dominance' },
  { id: 'econ_02', name: 'Market Connections', description: 'Better trade rates.', icon: '💰', color: '#ffcc44', branch: 'economy', cost: { raw: 300, liquid: 60, crystal: 25, renown: 6 }, effect: 'Liquid/crystal rates +20%', effectValue: 0.20, prerequisites: ['econ_01'], children: ['econ_04'], tier: 2, synergyGroup: 'economic_dominance' },
  { id: 'econ_03', name: 'Capacity Upgrade', description: 'Carry more resources.', icon: '📦', color: '#ffaa44', branch: 'economy', cost: { raw: 250, liquid: 50, crystal: 20, renown: 5 }, effect: '+50% resource capacity', effectValue: 0.50, prerequisites: ['econ_01'], children: ['econ_04'], tier: 2, synergyGroup: 'economic_dominance' },
  { id: 'econ_04', name: 'Auto-Collection', description: 'Resources collected automatically.', icon: '🤖', color: '#ff8844', branch: 'economy', cost: { raw: 800, liquid: 150, crystal: 80, renown: 15 }, effect: '5% of harvest auto-collected per second', effectValue: 0.05, prerequisites: ['econ_02', 'econ_03'], children: ['econ_05'], tier: 3, synergyGroup: 'economic_dominance' },
  { id: 'econ_05', name: 'Renown Empire', description: 'Renown generates bonuses.', icon: '👑', color: '#ffd700', branch: 'economy', cost: { raw: 2000, liquid: 400, crystal: 200, renown: 40 }, effect: 'Each 100 renown = +1% all income', effectValue: 0.01, prerequisites: ['econ_04'], children: ['econ_06'], tier: 4, synergyGroup: null },
  { id: 'econ_06', name: 'Chrono Tycoon', description: 'Ultimate economic mastery.', icon: '🏦', color: '#ffd700', branch: 'economy', cost: { raw: 5000, liquid: 1000, crystal: 500, renown: 100, shards: 10 }, effect: 'All income tripled', effectValue: 3.0, prerequisites: ['econ_05'], children: [], tier: 5, synergyGroup: null },

  // ── Exploration Branch ──
  { id: 'explore_01', name: 'Pathfinder', description: 'Move faster through the world.', icon: '🥾', color: '#44ff88', branch: 'exploration', cost: { raw: 150, liquid: 40, crystal: 15, renown: 4 }, effect: '+10% move speed', effectValue: 0.10, prerequisites: [], children: ['explore_02', 'explore_03'], tier: 1, synergyGroup: 'explorer_instinct' },
  { id: 'explore_02', name: 'Map Reader', description: 'See farther on the map.', icon: '🗺️', color: '#66ffaa', branch: 'exploration', cost: { raw: 300, liquid: 80, crystal: 30, renown: 8 }, effect: '+50% chunk load radius', effectValue: 0.50, prerequisites: ['explore_01'], children: ['explore_04'], tier: 2, synergyGroup: 'explorer_instinct' },
  { id: 'explore_03', name: 'Treasure Sense', description: 'Find more POIs.', icon: '🧭', color: '#88ffcc', branch: 'exploration', cost: { raw: 250, liquid: 60, crystal: 25, renown: 6 }, effect: '+100% POI discovery radius', effectValue: 1.0, prerequisites: ['explore_01'], children: ['explore_04'], tier: 2, synergyGroup: 'explorer_instinct' },
  { id: 'explore_04', name: 'Rift Walker', description: 'Rifts yield more resources.', icon: '🌀', color: '#44ffcc', branch: 'exploration', cost: { raw: 800, liquid: 200, crystal: 80, renown: 20 }, effect: '+30% rift yield', effectValue: 0.30, prerequisites: ['explore_02', 'explore_03'], children: ['explore_05'], tier: 3, synergyGroup: 'explorer_instinct' },
  { id: 'explore_05', name: 'Void Navigator', description: 'Thrive in dangerous biomes.', icon: '🚀', color: '#44ffaa', branch: 'exploration', cost: { raw: 2000, liquid: 500, crystal: 200, renown: 50 }, effect: '-50% hazard damage in evolved zones', effectValue: -0.50, prerequisites: ['explore_04'], children: ['explore_06'], tier: 4, synergyGroup: null },
  { id: 'explore_06', name: 'Infinite Horizon', description: 'The world opens before you.', icon: '🌌', color: '#44ff88', branch: 'exploration', cost: { raw: 5000, liquid: 1000, crystal: 500, renown: 100, shards: 10 }, effect: 'Double all exploration bonuses', effectValue: 2.0, prerequisites: ['explore_05'], children: [], tier: 5, synergyGroup: null },

  // ── Building Branch ──
  { id: 'build_01', name: 'Sturdy Foundations', description: 'Stronger blocks.', icon: '🧱', color: '#ff8844', branch: 'building', cost: { raw: 200, liquid: 50, crystal: 20, renown: 5 }, effect: '+25% block health', effectValue: 0.25, prerequisites: [], children: ['build_02', 'build_03'], tier: 1, synergyGroup: 'master_builder' },
  { id: 'build_02', name: 'Efficient Construction', description: 'Cheaper blocks.', icon: '⚒️', color: '#ffaa44', branch: 'building', cost: { raw: 300, liquid: 60, crystal: 25, renown: 6 }, effect: '-20% block cost', effectValue: -0.20, prerequisites: ['build_01'], children: ['build_04'], tier: 2, synergyGroup: 'master_builder' },
  { id: 'build_03', name: 'Slow Decay', description: 'Vapour blocks last longer.', icon: '⏳', color: '#ffcc44', branch: 'building', cost: { raw: 250, liquid: 50, crystal: 20, renown: 5 }, effect: '+50% vapour block duration', effectValue: 0.50, prerequisites: ['build_01'], children: ['build_04'], tier: 2, synergyGroup: 'master_builder' },
  { id: 'build_04', name: 'Blueprint Mastery', description: 'Advanced blueprint features.', icon: '📐', color: '#ff8844', branch: 'building', cost: { raw: 800, liquid: 150, crystal: 80, renown: 15 }, effect: 'Blueprints cost 50% less', effectValue: -0.50, prerequisites: ['build_02', 'build_03'], children: ['build_05'], tier: 3, synergyGroup: 'master_builder' },
  { id: 'build_05', name: 'Explosive Expertise', description: 'Bigger, better explosions.', icon: '💣', color: '#ff6644', branch: 'building', cost: { raw: 2000, liquid: 400, crystal: 200, renown: 40 }, effect: '+50% explosion radius', effectValue: 0.50, prerequisites: ['build_04'], children: ['build_06'], tier: 4, synergyGroup: null },
  { id: 'build_06', name: 'Grand Architect', description: 'Master of all construction.', icon: '🏰', color: '#ffd700', branch: 'building', cost: { raw: 5000, liquid: 1000, crystal: 500, renown: 100, shards: 10 }, effect: 'Buildings cost 50% less and are 2x as durable', effectValue: 2.0, prerequisites: ['build_05'], children: [], tier: 5, synergyGroup: null },

  // ── Temporal Branch ──
  { id: 'time_01', name: 'Chrono Sensitivity', description: 'Feel the flow of time.', icon: '⏱️', color: '#44ffcc', branch: 'temporal', cost: { raw: 300, liquid: 80, crystal: 30, renown: 8 }, effect: '+20% anomaly duration', effectValue: 0.20, prerequisites: [], children: ['time_02', 'time_03'], tier: 1, synergyGroup: 'time_master' },
  { id: 'time_02', name: 'Time Dilation', description: 'Move faster in bullet time.', icon: '⏩', color: '#66ffee', branch: 'temporal', cost: { raw: 500, liquid: 100, crystal: 50, renown: 10 }, effect: '+30% speed when time is slowed', effectValue: 0.30, prerequisites: ['time_01'], children: ['time_04'], tier: 2, synergyGroup: 'time_master' },
  { id: 'time_03', name: 'Paradox Shield', description: 'Chance to avoid damage.', icon: '🛡️', color: '#88ffcc', branch: 'temporal', cost: { raw: 400, liquid: 100, crystal: 40, renown: 8 }, effect: '10% chance to negate damage', effectValue: 0.10, prerequisites: ['time_01'], children: ['time_04'], tier: 2, synergyGroup: 'time_master' },
  { id: 'time_04', name: 'Temporal Loop', description: 'Skills cooldown faster.', icon: '🔄', color: '#44ffaa', branch: 'temporal', cost: { raw: 1200, liquid: 300, crystal: 150, renown: 25 }, effect: '-20% skill cooldowns', effectValue: -0.20, prerequisites: ['time_02', 'time_03'], children: ['time_05'], tier: 3, synergyGroup: 'time_master' },
  { id: 'time_05', name: 'Reality Bender', description: 'Resist status effects.', icon: '🌀', color: '#44ff88', branch: 'temporal', cost: { raw: 3000, liquid: 600, crystal: 300, renown: 60 }, effect: '-50% negative status duration', effectValue: -0.50, prerequisites: ['time_04'], children: ['time_06'], tier: 4, synergyGroup: null },
  { id: 'time_06', name: 'Chronomancer', description: 'True mastery of time.', icon: '⏳', color: '#44ffcc', branch: 'temporal', cost: { raw: 8000, liquid: 2000, crystal: 1000, renown: 200, shards: 20 }, effect: 'All temporal effects doubled', effectValue: 2.0, prerequisites: ['time_05'], children: [], tier: 5, synergyGroup: null },
]

// ── Synergy Groups ──────────────────────────────────────

const SYNERGY_GROUPS: Record<string, { name: string; description: string; bonusEffect: string; bonusValue: number }> = {
  combat_mastery: { name: 'Combat Mastery', description: 'All combat techs unlocked.', bonusEffect: '+50% damage', bonusValue: 0.50 },
  economic_dominance: { name: 'Economic Dominance', description: 'All economy techs unlocked.', bonusEffect: '+100% all income', bonusValue: 1.0 },
  explorer_instinct: { name: 'Explorer Instinct', description: 'All exploration techs unlocked.', bonusEffect: '+100% POI rewards', bonusValue: 1.0 },
  master_builder: { name: 'Master Builder', description: 'All building techs unlocked.', bonusEffect: 'Blocks cost 50% less', bonusValue: -0.50 },
  time_master: { name: 'Time Master', description: 'All temporal techs unlocked.', bonusEffect: '-30% all cooldowns', bonusValue: -0.30 },
}

// ── State ─────────────────────────────────────────────────

let _techNodes: TechNode[] = TECH_TREE.map(t => ({ ...t, unlocked: false }))
let _totalTechsUnlocked = 0

export function getTechNodes(): TechNode[] { return _techNodes.map(t => ({ ...t })) }
export function getTotalUnlocked(): number { return _totalTechsUnlocked }
export function getSynergyGroups(): typeof SYNERGY_GROUPS { return { ...SYNERGY_GROUPS } }

/** Check if a node can be unlocked */
export function canUnlockTech(nodeId: string): boolean {
  const node = _techNodes.find(n => n.id === nodeId)
  if (!node || node.unlocked) return false

  // Check prerequisites
  for (const prereq of node.prerequisites) {
    const prereqNode = _techNodes.find(n => n.id === prereq)
    if (!prereqNode || !prereqNode.unlocked) return false
  }

  // Check cost
  const inv = useStore.getState().inventory
  if (inv.raw < node.cost.raw || inv.liquid < node.cost.liquid ||
      inv.crystal < node.cost.crystal || inv.renown < node.cost.renown) return false
  if (node.cost.shards && (inv.shards ?? 0) < node.cost.shards) return false

  return true
}

/** Unlock a tech node */
export function unlockTech(nodeId: string): boolean {
  if (!canUnlockTech(nodeId)) return false

  const node = _techNodes.find(n => n.id === nodeId)!

  // Deduct cost
  useStore.setState(s => ({
    inventory: {
      ...s.inventory,
      raw: s.inventory.raw - node.cost.raw,
      liquid: s.inventory.liquid - node.cost.liquid,
      crystal: s.inventory.crystal - node.cost.crystal,
      renown: s.inventory.renown - node.cost.renown,
      shards: (s.inventory.shards ?? 0) - (node.cost.shards ?? 0),
    },
  }))

  node.unlocked = true
  _totalTechsUnlocked++

  // Apply immediate effect
  applyTechEffect(node)

  // Check synergy groups
  checkSynergyGroups()

  return true
}

function applyTechEffect(node: TechNode): void {
  // Store on window for other systems to read
  const bonuses = (window as any).__TECH_BONUSES ?? {}
  bonuses[node.id] = { effect: node.effect, value: node.effectValue }
  ;(window as any).__TECH_BONUSES = bonuses
}

function checkSynergyGroups(): void {
  for (const [groupId, nodes] of Object.entries(getGroupMembers())) {
    const allUnlocked = nodes.every(n => n.unlocked)
    if (allUnlocked) {
      const group = SYNERGY_GROUPS[groupId]
      if (group) {
        const bonuses = (window as any).__SYNERGY_BONUSES ?? {}
        if (!bonuses[groupId]) {
          bonuses[groupId] = { effect: group.bonusEffect, value: group.bonusValue }
          ;(window as any).__SYNERGY_BONUSES = bonuses
        }
      }
    }
  }
}

function getGroupMembers(): Record<string, TechNode[]> {
  const groups: Record<string, TechNode[]> = {}
  for (const node of _techNodes) {
    if (node.synergyGroup) {
      if (!groups[node.synergyGroup]) groups[node.synergyGroup] = []
      groups[node.synergyGroup].push(node)
    }
  }
  return groups
}

/** Get total bonus for a specific stat */
export function getTechBonus(effect: string): number {
  let total = 0
  const bonuses = (window as any).__TECH_BONUSES ?? {}
  const synergyBonuses = (window as any).__SYNERGY_BONUSES ?? {}
  for (const [, b] of Object.entries(bonuses) as [string, { effect: string; value: number }][]) {
    if (b.effect === effect) total += b.value
  }
  for (const [, b] of Object.entries(synergyBonuses) as [string, { effect: string; value: number }][]) {
    if (b.effect === effect) total += b.value
  }
  return total
}

/** Get nodes grouped by tier */
export function getNodesByBranch(): Record<string, TechNode[]> {
  const branches: Record<string, TechNode[]> = {}
  for (const node of _techNodes) {
    if (!branches[node.branch]) branches[node.branch] = []
    branches[node.branch].push(node)
  }
  return branches
}

/** Get the next affordable techs (for hint UI) */
export function getAffordableTechs(): TechNode[] {
  return _techNodes.filter(n => !n.unlocked && canUnlockTech(n.id))
}

export function serializeTechWeb(): { nodes: TechNode[]; total: number } {
  return {
    nodes: _techNodes.map(t => ({ ...t })),
    total: _totalTechsUnlocked,
  }
}

export function loadTechWeb(data: { nodes: TechNode[]; total: number }): void {
  if (data.nodes) _techNodes = data.nodes.map(t => ({ ...t }))
  if (data.total) _totalTechsUnlocked = data.total
}
