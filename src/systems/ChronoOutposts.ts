// ── Chrono Outposts — World Territory Claiming ──
// Claim chunks, build outpost modules, generate passive income,
// fast-travel network, territory defense.

import { useStore } from '../store'
import { getBiomeTierAtDistance } from './InfiniteWorldGenerator'
import { getEvolutionStage } from './AdaptiveDifficultySystem'

// ── Types ────────────────────────────────────────────────

export type OutpostModule = 'storage' | 'turret' | 'teleporter' | 'extractor' | 'barracks' | 'lab'

export interface OutpostModuleDef {
  id: OutpostModule
  name: string
  description: string
  icon: string
  color: string
  cost: { raw: number; liquid: number; crystal: number; renown: number }
  effect: string
  effectValue: number
}

const MODULE_DEFS: OutpostModuleDef[] = [
  { id: 'storage', name: 'Time Vault', description: 'Increases resource capacity for this outpost.', icon: 'chest', color: '#ffd700', cost: { raw: 200, liquid: 50, crystal: 20, renown: 5 }, effect: 'capacity', effectValue: 500 },
  { id: 'turret', name: 'Chrono Turret', description: 'Defends outpost from evolved enemies.', icon: 'cannon', color: '#ff4444', cost: { raw: 500, liquid: 100, crystal: 50, renown: 15 }, effect: 'defense', effectValue: 50 },
  { id: 'teleporter', name: 'Temporal Gate', description: 'Enables fast-travel between outposts.', icon: 'gate', color: '#aa44ff', cost: { raw: 1000, liquid: 300, crystal: 150, renown: 30 }, effect: 'teleport', effectValue: 1 },
  { id: 'extractor', name: 'Void Extractor', description: 'Extracts resources from the local biome.', icon: 'drill', color: '#44ff88', cost: { raw: 300, liquid: 80, crystal: 30, renown: 10 }, effect: 'extraction', effectValue: 1 },
  { id: 'barracks', name: 'Time Barracks', description: 'Houses construct garrisons for defense.', icon: 'flag', color: '#44aaff', cost: { raw: 800, liquid: 200, crystal: 100, renown: 25 }, effect: 'garrison', effectValue: 3 },
  { id: 'lab', name: 'Field Lab', description: 'Researches local biome properties for bonuses.', icon: 'flask', color: '#ff8844', cost: { raw: 1500, liquid: 500, crystal: 200, renown: 50 }, effect: 'research', effectValue: 0.1 },
]

export interface Outpost {
  id: string
  name: string
  chunkX: number
  chunkZ: number
  worldX: number
  worldZ: number
  modules: OutpostModule[]
  level: number
  health: number
  maxHealth: number
  claimedAt: number
  lastAttackedAt: number
  incomeGenerated: number
  active: boolean
}

export interface TerritoryClaim {
  id: string
  chunkX: number
  chunkZ: number
  outpostId: string | null
  claimedAt: number
  color: string
}

// ── State ─────────────────────────────────────────────────

let _outposts: Outpost[] = []
let _claims: TerritoryClaim[] = []
let _maxClaims = 5

export function getOutposts(): Outpost[] { return _outposts.map(o => ({ ...o })) }
export function getClaims(): TerritoryClaim[] { return _claims.map(c => ({ ...c })) }
export function getMaxClaims(): number { return _maxClaims }
export function getModuleDefs(): OutpostModuleDef[] { return MODULE_DEFS.map(m => ({ ...m })) }

/** Claim a chunk as territory */
export function claimChunk(chunkX: number, chunkZ: number): TerritoryClaim | null {
  const existing = _claims.find(c => c.chunkX === chunkX && c.chunkZ === chunkZ)
  if (existing) return null

  // Check claim limit
  const activeClaims = _claims.filter(c => c.outpostId !== null)
  if (activeClaims.length >= _maxClaims && !_claims.some(c => c.chunkX === chunkX && c.chunkZ === chunkZ)) return null

  const dist = Math.sqrt(chunkX * chunkX * 1024 + chunkZ * chunkZ * 1024)
  const tier = getBiomeTierAtDistance(dist)
  const claimCost = { raw: 200 + Math.floor(dist * 0.1), liquid: 50 + Math.floor(dist * 0.05), renown: 5 + Math.floor(dist * 0.01) }

  const inv = useStore.getState().inventory
  if (inv.raw < claimCost.raw || inv.liquid < claimCost.liquid || inv.renown < claimCost.renown) return null

  useStore.setState(s => ({
    inventory: {
      ...s.inventory,
      raw: s.inventory.raw - claimCost.raw,
      liquid: s.inventory.liquid - claimCost.liquid,
      renown: s.inventory.renown - claimCost.renown,
    },
  }))

  const claim: TerritoryClaim = {
    id: `claim_${chunkX}_${chunkZ}_${Date.now()}`,
    chunkX, chunkZ,
    outpostId: null,
    claimedAt: Date.now(),
    color: tier.color,
  }

  _claims.push(claim)
  return claim
}

/** Build an outpost on a claimed chunk */
export function buildOutpost(chunkX: number, chunkZ: number, name?: string): Outpost | null {
  const claim = _claims.find(c => c.chunkX === chunkX && c.chunkZ === chunkZ)
  if (!claim) return null
  if (claim.outpostId) return null // already has an outpost

  const cost = { raw: 1000, liquid: 300, crystal: 100, renown: 50 }
  const inv = useStore.getState().inventory
  if (inv.raw < cost.raw || inv.liquid < cost.liquid || inv.crystal < cost.crystal || inv.renown < cost.renown) return null

  useStore.setState(s => ({
    inventory: {
      ...s.inventory,
      raw: s.inventory.raw - cost.raw,
      liquid: s.inventory.liquid - cost.liquid,
      crystal: s.inventory.crystal - cost.crystal,
      renown: s.inventory.renown - cost.renown,
    },
  }))

  const worldX = chunkX * 32 + 16
  const worldZ = chunkZ * 32 + 16
  const dist = Math.sqrt(worldX * worldX + worldZ * worldZ)
  const tier = getBiomeTierAtDistance(dist)

  const outpost: Outpost = {
    id: `outpost_${chunkX}_${chunkZ}_${Date.now()}`,
    name: name || `${tier.name} Outpost #${_outposts.length + 1}`,
    chunkX, chunkZ,
    worldX, worldZ,
    modules: [],
    level: 1,
    health: 200,
    maxHealth: 200,
    claimedAt: Date.now(),
    lastAttackedAt: 0,
    incomeGenerated: 0,
    active: true,
  }

  _outposts.push(outpost)
  claim.outpostId = outpost.id

  // Dispatch for 3D renderer
  try {
    window.dispatchEvent(new CustomEvent('outpost-built', { detail: outpost }))
  } catch {}

  return outpost
}

/** Add a module to an outpost */
export function addOutpostModule(outpostId: string, moduleId: OutpostModule): boolean {
  const outpost = _outposts.find(o => o.id === outpostId)
  if (!outpost || !outpost.active) return false
  if (outpost.modules.includes(moduleId)) return false // already has this module

  const mod = MODULE_DEFS.find(m => m.id === moduleId)
  if (!mod) return false

  const inv = useStore.getState().inventory
  if (inv.raw < mod.cost.raw || inv.liquid < mod.cost.liquid || inv.crystal < mod.cost.crystal || inv.renown < mod.cost.renown) return false

  useStore.setState(s => ({
    inventory: {
      ...s.inventory,
      raw: s.inventory.raw - mod.cost.raw,
      liquid: s.inventory.liquid - mod.cost.liquid,
      crystal: s.inventory.crystal - mod.cost.crystal,
      renown: s.inventory.renown - mod.cost.renown,
    },
  }))

  outpost.modules.push(moduleId)
  outpost.level++

  // Apply module effects
  if (moduleId === 'turret') {
    outpost.maxHealth += mod.effectValue
    outpost.health = Math.min(outpost.maxHealth, outpost.health + mod.effectValue)
  }

  return true
}

/** Get total passive income from all outposts per tick */
export function getOutpostIncome(): { raw: number; liquid: number; renown: number } {
  let raw = 0, liquid = 0, renown = 0
  for (const o of _outposts) {
    if (!o.active) continue
    const dist = Math.sqrt(o.worldX * o.worldX + o.worldZ * o.worldZ)
    const tier = getBiomeTierAtDistance(dist)
    const hasExtractor = o.modules.includes('extractor')
    const researchBonus = o.modules.includes('lab') ? 0.1 : 0
    const extractMul = hasExtractor ? 2.0 : 1.0
    raw += tier.resourceMultiplier * o.level * extractMul * (1 + researchBonus)
    if (hasExtractor) liquid += tier.resourceMultiplier * 0.5
    renown += o.level * 0.1
  }
  return { raw, liquid, renown }
}

/** Attack an outpost (from evolved enemies) */
export function attackOutpost(outpostId: string, damage: number): boolean {
  const o = _outposts.find(o => o.id === outpostId)
  if (!o || !o.active) return false

  const hasTurret = o.modules.includes('turret')
  const effectiveDamage = hasTurret ? damage * 0.5 : damage

  o.health -= effectiveDamage
  o.lastAttackedAt = Date.now()

  if (o.health <= 0) {
    o.active = false
    // Remove claim
    const claim = _claims.find(c => c.outpostId === o.id)
    if (claim) claim.outpostId = null
    try { window.dispatchEvent(new CustomEvent('outpost-destroyed', { detail: { id: o.id } })) } catch {}
    return false
  }
  return true
}

/** Repair an outpost */
export function repairOutpost(outpostId: string): boolean {
  const o = _outposts.find(o => o.id === outpostId)
  if (!o || !o.active) return false

  const cost = { raw: 100 * o.level, liquid: 20 * o.level, crystal: 10 * o.level }
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

  o.health = Math.min(o.maxHealth, o.health + o.maxHealth * 0.4)
  return true
}

/** Abandon an outpost */
export function abandonOutpost(outpostId: string): boolean {
  const o = _outposts.find(o => o.id === outpostId)
  if (!o) return false

  o.active = false
  const claim = _claims.find(c => c.outpostId === o.id)
  if (claim) claim.outpostId = null

  // Refund 20% of base cost
  useStore.setState(s => ({
    inventory: {
      ...s.inventory,
      raw: s.inventory.raw + Math.floor(1000 * 0.2),
      liquid: s.inventory.liquid + Math.floor(300 * 0.2),
    },
  }))

  return true
}

/** Get fast-travel destinations */
export function getTeleportDestinations(): Array<{ id: string; name: string; x: number; z: number }> {
  return _outposts
    .filter(o => o.active && o.modules.includes('teleporter'))
    .map(o => ({
      id: o.id,
      name: o.name,
      x: o.worldX,
      z: o.worldZ,
    }))
}

/** Increase max claims */
export function increaseMaxClaims(amount: number): void {
  _maxClaims += amount
}

/** Tick outpost income */
export function tickOutposts(dt: number): void {
  const income = getOutpostIncome()
  if (income.raw > 0 || income.liquid > 0 || income.renown > 0) {
    useStore.setState(s => ({
      inventory: {
        ...s.inventory,
        raw: s.inventory.raw + income.raw * dt,
        liquid: s.inventory.liquid + income.liquid * dt,
        renown: s.inventory.renown + income.renown * dt,
      },
    }))
    for (const o of _outposts) {
      if (o.active) o.incomeGenerated += income.raw * dt
    }
  }

  // Periodically check for enemy attacks (simulated)
  const stage = getEvolutionStage()
  if (stage > 0 && Math.random() < 0.001 * stage * _outposts.length) {
    const target = _outposts.filter(o => o.active)
    if (target.length > 0) {
      const o = target[Math.floor(Math.random() * target.length)]
      attackOutpost(o.id, 10 + stage * 5)
    }
  }
}

export function serializeOutposts(): { outposts: Outpost[]; claims: TerritoryClaim[]; maxClaims: number } {
  return {
    outposts: _outposts.map(o => ({ ...o })),
    claims: _claims.map(c => ({ ...c })),
    maxClaims: _maxClaims,
  }
}

export function loadOutposts(data: { outposts: Outpost[]; claims: TerritoryClaim[]; maxClaims: number }): void {
  if (data.outposts) _outposts = data.outposts.map(o => ({ ...o }))
  if (data.claims) _claims = data.claims.map(c => ({ ...c }))
  if (data.maxClaims) _maxClaims = data.maxClaims
}
