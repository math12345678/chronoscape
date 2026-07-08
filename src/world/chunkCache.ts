import type { ChunkData } from './chunkContent'
import { generateChunkData, getLabChunkForRegion, getTraderChunkForRegion, getRegionCoord } from './chunkContent'
import { chunkKey } from './chunkContent'

const MAX_CACHED_CHUNKS = 400

interface CachedChunk {
  data: ChunkData
  lastAccessed: number
  labChecked: boolean
  traderChecked: boolean
}

const cache = new Map<string, CachedChunk>()
let accessCounter = 0

export function getOrGenerateChunk(cx: number, cz: number): ChunkData {
  const key = chunkKey(cx, cz)
  const now = ++accessCounter
  const existing = cache.get(key)
  if (existing) {
    existing.lastAccessed = now
    return existing.data
  }

  const data = generateChunkData(cx, cz)

  // Check if this chunk should host a Lab or Trader
  const region = getRegionCoord(cx, cz)
  const labCoord = getLabChunkForRegion(region.rx, region.rz)
  const traderCoord = getTraderChunkForRegion(region.rx, region.rz)

  if (labCoord.cx === cx && labCoord.cz === cz) {
    data.hasLab = true
  }
  if (traderCoord.cx === cx && traderCoord.cz === cz) {
    data.hasTrader = true
  }

  cache.set(key, { data, lastAccessed: now, labChecked: true, traderChecked: true })

  // LRU eviction
  if (cache.size > MAX_CACHED_CHUNKS) {
    let oldestKey = ''
    let oldestAccess = Infinity
    for (const [k, v] of cache) {
      if (v.lastAccessed < oldestAccess) {
        oldestAccess = v.lastAccessed
        oldestKey = k
      }
    }
    if (oldestKey) cache.delete(oldestKey)
  }

  return data
}

export function clearChunkCache() {
  cache.clear()
}

export function getChunkCount(): number {
  return cache.size
}

export function hasCachedChunk(cx: number, cz: number): boolean {
  return cache.has(chunkKey(cx, cz))
}
