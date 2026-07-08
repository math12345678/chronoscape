// ── Automation Constructs — Deployable AI Entities ──
// Deploy autonomous constructs that harvest, defend, build, and explore.
// Each has level, durability, efficiency. Upgradeable with forge items.

import { useStore } from '../store'
import { getBiomeTierAtDistance } from './InfiniteWorldGenerator'

export type ConstructType = 'harvester' | 'sentinel' | 'builder' | 'explorer'

export interface ConstructDef {
  id: string
  type: ConstructType
  name: string
  description: string
  icon: string
  color: string
  baseCost: { raw: number; liquid: number; crystal: number; renown: number }
  perLevelCost: { raw: number; liquid: number; crystal: number; renown: number }
  baseEfficiency: number
  efficiencyPerLevel: number
  maxLevel: number
  range: number
  durability: number
}

const CONSTRUCT_DEFS: ConstructDef[] = [
  {
    id: 'construct_harvester', type: 'harvester', name: 'Time Harvester',
    description: 'Auto-gathers resources within range.',
    icon: 'sickle', color: '#ffd700',
    baseCost: { raw: 500, liquid: 100, crystal: 50, renown: 10 },
    perLevelCost: { raw: 200, liquid: 40, crystal: 20, renown: 5 },
    baseEfficiency: 1, efficiencyPerLevel: 0.5,
    maxLevel: 50, range: 15, durability: 100,
  },
  {
    id: 'construct_sentinel', type: 'sentinel', name: 'Chrono Sentinel',
    description: 'Auto-defends territory from enemies.',
    icon: 'shield', color: '#ff4444',
    baseCost: { raw: 800, liquid: 200, crystal: 100, renown: 25 },
    perLevelCost: { raw: 300, liquid: 80, crystal: 40, renown: 10 },
    baseEfficiency: 1, efficiencyPerLevel: 0.4,
    maxLevel: 50, range: 20, durability: 200,
  },
  {
    id: 'construct_builder', type: 'builder', name: 'Timeless Architect',
    description: 'Auto-places blocks following a pattern.',
    icon: 'wrench', color: '#44aaff',
    baseCost: { raw: 1000, liquid: 300, crystal: 150, renown: 30 },
    perLevelCost: { raw: 400, liquid: 120, crystal: 60, renown: 12 },
    baseEfficiency: 1, efficiencyPerLevel: 0.3,
    maxLevel: 30, range: 10, durability: 150,
  },
  {
    id: 'construct_explorer', type: 'explorer', name: 'Void Explorer',
    description: 'Auto-explores new chunks and reports findings.',
    icon: 'compass', color: '#aa44ff',
    baseCost: { raw: 600, liquid: 150, crystal: 80, renown: 15 },
    perLevelCost: { raw: 250, liquid: 60, crystal: 30, renown: 8 },
    baseEfficiency: 1, efficiencyPerLevel: 0.6,
    maxLevel: 40, range: 30, durability: 80,
  },
]

export interface DeployedConstruct {
  id: string
  defId: string
  level: number
  x: number
  z: number
  health: number
  maxHealth: number
  active: boolean
  deployedAt: number
  totalEarned: number
  kills: number
  chunksExplored: number
  blocksPlaced: number
}

// ── State ─────────────────────────────────────────────────

let _deployed: DeployedConstruct[] = []
let _totalConstructsDeployed = 0

export function getConstructDefs(): ConstructDef[] { return CONSTRUCT_DEFS.map(d => ({ ...d })) }
export function getConstructDef(id: string): ConstructDef | undefined { return CONSTRUCT_DEFS.find(d => d.id === id) }
export function getDeployed(): DeployedConstruct[] { return _deployed.map(c => ({ ...c })) }
export function getTotalDeployed(): number { return _totalConstructsDeployed }

/** Deploy a construct at a position */
export function deployConstruct(defId: string, x: number, z: number): DeployedConstruct | null {
  const def = CONSTRUCT_DEFS.find(d => d.id === defId)
  if (!def) return null

  // Check max deployed (per type)
  const typeCount = _deployed.filter(c => {
    const d = CONSTRUCT_DEFS.find(cd => cd.id === c.defId)
    return d?.type === def.type && c.active
  }).length
  const maxPerType: Record<ConstructType, number> = { harvester: 5, sentinel: 5, builder: 3, explorer: 3 }
  if (typeCount >= maxPerType[def.type]) return null

  // Check cost
  const inv = useStore.getState().inventory
  if (inv.raw < def.baseCost.raw || inv.liquid < def.baseCost.liquid ||
      inv.crystal < def.baseCost.crystal || inv.renown < def.baseCost.renown) return null

  // Deduct cost
  useStore.setState(s => ({
    inventory: {
      ...s.inventory,
      raw: s.inventory.raw - def.baseCost.raw,
      liquid: s.inventory.liquid - def.baseCost.liquid,
      crystal: s.inventory.crystal - def.baseCost.crystal,
      renown: s.inventory.renown - def.baseCost.renown,
    },
  }))

  const construct: DeployedConstruct = {
    id: `construct_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    defId,
    level: 1,
    x, z,
    health: def.durability,
    maxHealth: def.durability,
    active: true,
    deployedAt: Date.now(),
    totalEarned: 0,
    kills: 0,
    chunksExplored: 0,
    blocksPlaced: 0,
  }

  _deployed.push(construct)
  _totalConstructsDeployed++

  // Dispatch for 3D renderer
  try {
    window.dispatchEvent(new CustomEvent('construct-deployed', { detail: construct }))
  } catch {}

  return construct
}

/** Upgrade a construct */
export function upgradeConstruct(id: string): boolean {
  const c = _deployed.find(c => c.id === id)
  if (!c || !c.active) return false
  const def = CONSTRUCT_DEFS.find(d => d.id === c.defId)
  if (!def || c.level >= def.maxLevel) return false

  const cost = def.perLevelCost
  const inv = useStore.getState().inventory
  if (inv.raw < cost.raw || inv.liquid < cost.liquid ||
      inv.crystal < cost.crystal || inv.renown < cost.renown) return false

  useStore.setState(s => ({
    inventory: {
      ...s.inventory,
      raw: s.inventory.raw - cost.raw,
      liquid: s.inventory.liquid - cost.liquid,
      crystal: s.inventory.crystal - cost.crystal,
      renown: s.inventory.renown - cost.renown,
    },
  }))

  c.level++
  c.maxHealth = def.durability + c.level * 10
  c.health = c.maxHealth
  return true
}

/** Damage a construct (from enemy attacks) */
export function damageConstruct(id: string, amount: number): boolean {
  const c = _deployed.find(c => c.id === id)
  if (!c || !c.active) return false
  c.health -= amount
  if (c.health <= 0) {
    c.active = false
    try { window.dispatchEvent(new CustomEvent('construct-destroyed', { detail: { id: c.id, defId: c.defId } })) } catch {}
  }
  return c.active
}

/** Repair a construct */
export function repairConstruct(id: string): boolean {
  const c = _deployed.find(c => c.id === id)
  if (!c || !c.active) return false
  const def = CONSTRUCT_DEFS.find(d => d.id === c.defId)
  if (!def) return false

  const cost = { raw: 50, liquid: 10, crystal: 5, renown: 1 }
  const inv = useStore.getState().inventory
  if (inv.raw < cost.raw || inv.liquid < cost.liquid || inv.crystal < cost.crystal) return false

  useStore.setState(s => ({
    inventory: {
      ...s.inventory,
      raw: s.inventory.raw - cost.raw,
      liquid: s.inventory.liquid - cost.liquid,
      crystal: s.inventory.crystal - cost.crystal,
    },
  }))

  c.health = Math.min(c.maxHealth, c.health + c.maxHealth * 0.3)
  return true
}

/** Recall (remove) a construct, refunding a portion */
export function recallConstruct(id: string): boolean {
  const c = _deployed.find(c => c.id === id)
  if (!c || !c.active) return false
  c.active = false

  // Refund 30% of base cost
  const def = CONSTRUCT_DEFS.find(d => d.id === c.defId)
  if (def) {
    useStore.setState(s => ({
      inventory: {
        ...s.inventory,
        raw: s.inventory.raw + Math.floor(def.baseCost.raw * 0.3),
        liquid: s.inventory.liquid + Math.floor(def.baseCost.liquid * 0.3),
      },
    }))
  }

  try { window.dispatchEvent(new CustomEvent('construct-recalled', { detail: { id: c.id } })) } catch {}
  return true
}

/** Get efficiency for a construct type (sum of all active) */
export function getConstructEfficiency(type: ConstructType): number {
  let total = 0
  for (const c of _deployed) {
    if (!c.active) continue
    const def = CONSTRUCT_DEFS.find(d => d.id === c.defId)
    if (def?.type === type) {
      total += def.baseEfficiency + (c.level - 1) * def.efficiencyPerLevel
    }
  }
  return total
}

/** Tick constructs — call from TimeManager */
export function tickConstructs(dt: number): void {
  for (const c of _deployed) {
    if (!c.active) continue
    const def = CONSTRUCT_DEFS.find(d => d.id === c.defId)
    if (!def) continue

    const efficiency = def.baseEfficiency + (c.level - 1) * def.efficiencyPerLevel

    switch (def.type) {
      case 'harvester': {
        // Generate raw resources based on biome tier at position
        const tier = getBiomeTierAtDistance(Math.sqrt(c.x * c.x + c.z * c.z))
        const amount = efficiency * 0.5 * tier.resourceMultiplier * dt
        if (amount > 0) {
          c.totalEarned += amount
          useStore.setState(s => ({
            inventory: { ...s.inventory, raw: s.inventory.raw + amount },
          }))
        }
        break
      }
      case 'sentinel': {
        // Periodically damage nearby enemies (simulated)
        // In practice, the 3D renderer would handle actual combat
        c.kills += efficiency * 0.01 * dt
        break
      }
      case 'builder': {
        // Periodically place blocks in range
        c.blocksPlaced += efficiency * 0.005 * dt
        break
      }
      case 'explorer': {
        // Periodically discover new chunks
        c.chunksExplored += efficiency * 0.008 * dt
        break
      }
    }
  }
}

export function serializeConstructs(): { deployed: DeployedConstruct[]; total: number } {
  return {
    deployed: _deployed.map(c => ({ ...c })),
    total: _totalConstructsDeployed,
  }
}

export function loadConstructs(data: { deployed: DeployedConstruct[]; total: number }): void {
  if (data.deployed) _deployed = data.deployed.map(c => ({ ...c }))
  if (data.total) _totalConstructsDeployed = data.total
}
