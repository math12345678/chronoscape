// ── World POI System — Points of Interest ──
// Procedural points of interest in the infinite world.
// Each POI has type, discovery state, rewards, lore, and optional LLM description.
// Player discovers by proximity.

import { llmGenerateText } from '../utils/llmClient'
import { useStore } from '../store'
import { getCurrentEpoch } from './EvolvingContentEngine'

export type POIType = 'ruin' | 'crystal_formation' | 'temporal_shrine' | 'crash_site' | 'ancient_lab' | 'time_wound'

export interface POIDef {
  type: POIType
  name: string
  icon: string
  color: string
  description: string
  rewardType: 'raw' | 'liquid' | 'crystal' | 'renown' | 'shards' | 'buff' | 'lore'
  rewardAmount: number
  buffDuration: number // seconds, 0 = permanent
  buffEffect: string // stat to buff
  buffMagnitude: number
}

const POI_TYPES: Record<POIType, Omit<POIDef, 'rewardAmount' | 'buffDuration' | 'buffEffect' | 'buffMagnitude'>> = {
  ruin: { type: 'ruin', name: 'Ancient Ruin', icon: '🏛️', color: '#ff8844', description: 'Remains of a civilization lost to time.', rewardType: 'raw', },
  crystal_formation: { type: 'crystal_formation', name: 'Crystal Formation', icon: '💎', color: '#aa88ff', description: 'A cluster of chrono-infused crystals.', rewardType: 'crystal', },
  temporal_shrine: { type: 'temporal_shrine', name: 'Temporal Shrine', icon: '⛩️', color: '#44ffcc', description: 'A shrine pulsing with chrono energy.', rewardType: 'renown', },
  crash_site: { type: 'crash_site', name: 'Crash Site', icon: '🚀', color: '#ff4444', description: 'Wreckage from another timeline.', rewardType: 'liquid', },
  ancient_lab: { type: 'ancient_lab', name: 'Ancient Lab', icon: '🔬', color: '#44aaff', description: 'An abandoned research facility.', rewardType: 'shards', },
  time_wound: { type: 'time_wound', name: 'Time Wound', icon: '🌀', color: '#ff00ff', description: 'A tear in reality. Raw chrono energy bleeds out.', rewardType: 'buff', },
}

// ── POI Instance ────────────────────────────────────────

export interface POIInstance {
  id: string
  type: POIType
  x: number
  z: number
  chunkX: number
  chunkZ: number
  discovered: boolean
  discoveredAt: number
  loreText: string
  rewardClaimed: boolean
  tier: number
  name: string
}

// ── State ─────────────────────────────────────────────────

let _pois: POIInstance[] = []
let _discoveredPois: string[] = []
let _activeBuffs: Map<string, { effect: string; magnitude: number; expiresAt: number }> = new Map()

export function getPOIs(): POIInstance[] { return _pois.map(p => ({ ...p })) }
export function getDiscoveredPOICount(): number { return _discoveredPois.length }
export function getActiveBuffs(): Map<string, { effect: string; magnitude: number; expiresAt: number }> {
  return new Map(_activeBuffs)
}

// ── POI Lore Generation ──────────────────────────────────

async function generatePOILore(type: POIType, tier: number): Promise<string> {
  const text = await llmGenerateText(
    `Generate 1-2 sentences of atmospheric lore for a "${type}" point of interest in a time-travel game called Chronoscape, at tier ${tier}. Make it feel ancient, mysterious, and fitting for a sci-fi time manipulation setting.`,
    `You are a world lore writer. Create evocative, concise descriptions.`
  )
  if (text) return text

  const fallbacks: Record<POIType, string[]> = {
    ruin: ['The stones hum with residual chrono energy.', 'Who built this? And when? The timeline is unclear.', 'Symbols on the walls depict events that haven\'t happened yet.'],
    crystal_formation: ['The crystals pulse with a rhythm matching your heartbeat.', 'Each facet shows a different possible future.', 'Touching them gives you a brief glimpse of another timeline.'],
    temporal_shrine: ['The shrine radiates warmth despite the cold air.', 'Offerings from countless travelers line the base.', 'A quiet presence watches from beyond the chrono-flow.'],
    crash_site: ['The wreckage is warm. It landed yesterday. And also 1000 years ago.', 'Symbols on the hull match no known language.', 'The black box contains recordings of a future war.'],
    ancient_lab: ['Experiments in time manipulation clearly took place here.', 'The equipment still hums with power after centuries.', 'Research notes describe breakthroughs that violate causality.'],
    time_wound: ['Reality bleeds here. The wound grows larger each day.', 'Through the tear you can see another version of this world.', 'The chrono-energy is raw, untamed, and incredibly dangerous.'],
  }
  const pool = fallbacks[type] ?? ['An ordinary point of interest.']
  return pool[Math.floor(Math.random() * pool.length)]
}

// ── POI Generation ──────────────────────────────────────

export function generatePOIsForChunk(chunkX: number, chunkZ: number): POIInstance[] {
  // Check if POIs already exist for this chunk
  const existing = _pois.filter(p => p.chunkX === chunkX && p.chunkZ === chunkZ)
  if (existing.length > 0) return existing

  const newPois: POIInstance[] = []
  const dist = Math.sqrt(chunkX * chunkX * 1024 + chunkZ * chunkZ * 1024)

  // POI density increases with distance
  const density = Math.min(3, 1 + Math.floor(dist / 500))
  const epoch = getCurrentEpoch()

  for (let i = 0; i < density; i++) {
    const types: POIType[] = ['ruin', 'crystal_formation', 'temporal_shrine', 'crash_site', 'ancient_lab', 'time_wound']
    const type = types[Math.floor(Math.random() * types.length)]

    // Position within chunk (chunk is 32x32)
    const x = chunkX * 32 + Math.random() * 28 + 2
    const z = chunkZ * 32 + Math.random() * 28 + 2

    const poi: POIInstance = {
      id: `poi_${chunkX}_${chunkZ}_${i}_${Date.now()}`,
      type,
      x, z,
      chunkX, chunkZ,
      discovered: false,
      discoveredAt: 0,
      loreText: '',
      rewardClaimed: false,
      tier: Math.floor(dist / 100) + epoch,
      name: `${POI_TYPES[type].name} ${['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta'][Math.floor(dist / 200) % 8]}`,
    }

    newPois.push(poi)
  }

  _pois.push(...newPois)
  return newPois
}

// ── Discovery ────────────────────────────────────────────

export function tryDiscoverPOI(playerX: number, playerZ: number): POIInstance | null {
  const playerChunkX = Math.floor(playerX / 32)
  const playerChunkZ = Math.floor(playerZ / 32)

  // Check POIs in nearby chunks
  const nearby = _pois.filter(p =>
    !p.discovered &&
    Math.abs(p.chunkX - playerChunkX) <= 1 &&
    Math.abs(p.chunkZ - playerChunkZ) <= 1 &&
    Math.sqrt((p.x - playerX) ** 2 + (p.z - playerZ) ** 2) < 15
  )

  if (nearby.length === 0) return null
  const poi = nearby[Math.floor(Math.random() * nearby.length)]

  poi.discovered = true
  poi.discoveredAt = Date.now()
  poi.loreText = `[Generating lore...]`
  _discoveredPois.push(poi.id)

  // Generate lore asynchronously
  generatePOILore(poi.type, poi.tier).then(lore => {
    poi.loreText = lore
  })

  // Award initial discovery reward
  grantPOIReward(poi)

  // Dispatch for UI
  try {
    window.dispatchEvent(new CustomEvent('poi-discovered', {
      detail: { id: poi.id, name: poi.name, type: poi.type, icon: POI_TYPES[poi.type].icon, color: POI_TYPES[poi.type].color, lore: poi.loreText },
    }))
  } catch {}

  return poi
}

function grantPOIReward(poi: POIInstance): void {
  const def = POI_TYPES[poi.type]
  const amount = (poi.tier + 1) * 50

  switch (def.rewardType) {
    case 'raw':
      useStore.setState(s => ({ inventory: { ...s.inventory, raw: s.inventory.raw + amount } }))
      break
    case 'liquid':
      useStore.setState(s => ({ inventory: { ...s.inventory, liquid: s.inventory.liquid + amount } }))
      break
    case 'crystal':
      useStore.setState(s => ({ inventory: { ...s.inventory, crystal: s.inventory.crystal + amount } }))
      break
    case 'renown':
      useStore.setState(s => ({ inventory: { ...s.inventory, renown: s.inventory.renown + amount } }))
      break
    case 'shards':
      useStore.setState(s => ({ inventory: { ...s.inventory, shards: (s.inventory.shards ?? 0) + amount } }))
      break
    case 'buff':
      applyPOIBuff(poi)
      break
    case 'lore':
      // Lore is already generated
      break
  }
}

function applyPOIBuff(poi: POIInstance): void {
  const buffs = [
    { effect: 'damage', magnitude: 1.2 },
    { effect: 'harvest', magnitude: 1.3 },
    { effect: 'speed', magnitude: 1.4 },
    { effect: 'defense', magnitude: 1.25 },
  ]
  const buff = buffs[Math.floor(Math.random() * buffs.length)]
  _activeBuffs.set(poi.id, {
    effect: buff.effect,
    magnitude: buff.magnitude,
    expiresAt: Date.now() + 300_000, // 5 minutes
  })
}

/** Claim reward from a discovered POI (for POIs that give repeatable rewards) */
export function claimPOIReward(poiId: string): boolean {
  const poi = _pois.find(p => p.id === poiId)
  if (!poi || poi.rewardClaimed) return false
  poi.rewardClaimed = true
  grantPOIReward(poi)
  return true
}

/** Get POIs near a player position */
export function getPOIsNear(x: number, z: number, radius: number): POIInstance[] {
  return _pois.filter(p => Math.sqrt((p.x - x) ** 2 + (p.z - z) ** 2) < radius)
}

/** Get POI buff total for a given stat */
export function getPOIBuffTotal(effect: string): number {
  let total = 1.0
  const now = Date.now()
  for (const [, buff] of _activeBuffs) {
    if (buff.effect === effect && buff.expiresAt > now) {
      total *= buff.magnitude
    } else if (buff.expiresAt <= now) {
      _activeBuffs.delete(buff.effect) // cleanup
    }
  }
  return total
}

export function serializePOIs(): { pois: POIInstance[]; discovered: string[]; buffs: Array<{ id: string; effect: string; magnitude: number; expiresAt: number }> } {
  return {
    pois: _pois.map(p => ({ ...p })),
    discovered: [..._discoveredPois],
    buffs: Array.from(_activeBuffs.entries()).map(([id, b]) => ({ id, ...b })),
  }
}

export function loadPOIs(data: { pois: POIInstance[]; discovered: string[]; buffs: Array<{ id: string; effect: string; magnitude: number; expiresAt: number }> }): void {
  if (data.pois) _pois = data.pois.map(p => ({ ...p }))
  if (data.discovered) _discoveredPois = [...data.discovered]
  if (data.buffs) {
    _activeBuffs.clear()
    for (const b of data.buffs) _activeBuffs.set(b.id, { effect: b.effect, magnitude: b.magnitude, expiresAt: b.expiresAt })
  }
}
