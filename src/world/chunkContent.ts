import { seededRandom, chunkSalt, WORLD_SEED as WS } from './seededRandom'
import { getInfiniteTerrainHeight } from './chunkTerrain'

export const WORLD_SEED = WS

export const CHUNK_SIZE = 32
export const LOAD_RADIUS = 3
export const REGION_SIZE = 4

export interface ChunkCoord {
  cx: number
  cz: number
}

export function getChunkCoord(x: number, z: number): ChunkCoord {
  return { cx: Math.floor(x / CHUNK_SIZE), cz: Math.floor(z / CHUNK_SIZE) }
}

export function chunkKey(cx: number, cz: number): string {
  return `${cx},${cz}`
}

export interface RiftData {
  x: number
  y: number
  z: number
}

export interface TreeData {
  x: number
  z: number
  scale: number
  hue: number
  variant: number
}

export interface DecorationData {
  x: number
  z: number
  type: 'rock' | 'crystal' | 'grass' | 'bush' | 'flower' | 'mushroom'
  scale: number
}

export interface WraithSpawn {
  x: number
  z: number
}

export interface ChunkData {
  coord: ChunkCoord
  rifts: RiftData[]
  trees: TreeData[]
  decorations: DecorationData[]
  wraiths: WraithSpawn[]
  hasLab: boolean
  hasTrader: boolean
}

function generateRifts(cx: number, cz: number): RiftData[] {
  const rand = seededRandom(chunkSalt(cx, cz, 'rifts'))
  const count = 3 + Math.floor(rand() * 4)
  const rifts: RiftData[] = []
  for (let i = 0; i < count; i++) {
    const x = (rand() - 0.5) * CHUNK_SIZE + cx * CHUNK_SIZE
    const z = (rand() - 0.5) * CHUNK_SIZE + cz * CHUNK_SIZE
    const y = getInfiniteTerrainHeight(x, z) + 1.2
    rifts.push({ x, y, z })
  }
  return rifts
}

function generateTrees(cx: number, cz: number): TreeData[] {
  const rand = seededRandom(chunkSalt(cx, cz, 'trees'))
  const count = 2 + Math.floor(rand() * 6)
  const trees: TreeData[] = []
  for (let i = 0; i < count; i++) {
    const x = (rand() - 0.5) * CHUNK_SIZE + cx * CHUNK_SIZE
    const z = (rand() - 0.5) * CHUNK_SIZE + cz * CHUNK_SIZE
    const y = getInfiniteTerrainHeight(x, z)
    if (y < -0.2) { i--; continue }
    trees.push({
      x, z,
      scale: 0.6 + rand() * 0.6,
      hue: 0.25 + rand() * 0.1,
      variant: Math.floor(rand() * 3),
    })
  }
  return trees
}

function generateDecorations(cx: number, cz: number): DecorationData[] {
  const rand = seededRandom(chunkSalt(cx, cz, 'decorations'))
  const count = 5 + Math.floor(rand() * 10)
  const decos: DecorationData[] = []
  const types: DecorationData['type'][] = ['rock', 'crystal', 'grass', 'bush', 'flower', 'mushroom']
  for (let i = 0; i < count; i++) {
    const x = (rand() - 0.5) * CHUNK_SIZE + cx * CHUNK_SIZE
    const z = (rand() - 0.5) * CHUNK_SIZE + cz * CHUNK_SIZE
    const y = getInfiniteTerrainHeight(x, z)
    if (y < -0.2) { i--; continue }
    decos.push({
      x, z,
      type: types[Math.floor(rand() * 6)],
      scale: 0.3 + rand() * 0.7,
    })
  }
  return decos
}

function generateWraiths(cx: number, cz: number): WraithSpawn[] {
  const rand = seededRandom(chunkSalt(cx, cz, 'wraiths'))
  const distFromOrigin = Math.sqrt(
    (cx * CHUNK_SIZE) ** 2 + (cz * CHUNK_SIZE) ** 2
  )
  // More wraiths further from origin
  const baseCount = Math.floor(distFromOrigin / 80)
  const count = Math.min(3 + baseCount, 8)
  const wraiths: WraithSpawn[] = []
  for (let i = 0; i < count; i++) {
    const x = (rand() - 0.5) * CHUNK_SIZE + cx * CHUNK_SIZE
    const z = (rand() - 0.5) * CHUNK_SIZE + cz * CHUNK_SIZE
    const y = getInfiniteTerrainHeight(x, z)
    if (y < -0.2) { i--; continue }
    wraiths.push({ x, z })
  }
  return wraiths
}

export function generateChunkData(cx: number, cz: number): ChunkData {
  return {
    coord: { cx, cz },
    rifts: generateRifts(cx, cz),
    trees: generateTrees(cx, cz),
    decorations: generateDecorations(cx, cz),
    wraiths: generateWraiths(cx, cz),
    hasLab: false,
    hasTrader: false,
  }
}

/** Deterministically pick one chunk per 4×4 region for a Lab */
export function getLabChunkForRegion(rx: number, rz: number): ChunkCoord {
  const rand = seededRandom(`${WORLD_SEED}:lab:${rx}:${rz}`)
  return {
    cx: rx * REGION_SIZE + Math.floor(rand() * REGION_SIZE),
    cz: rz * REGION_SIZE + Math.floor(rand() * REGION_SIZE),
  }
}

export function getTraderChunkForRegion(rx: number, rz: number): ChunkCoord {
  const rand = seededRandom(`${WORLD_SEED}:trader:${rx}:${rz}`)
  return {
    cx: rx * REGION_SIZE + Math.floor(rand() * REGION_SIZE),
    cz: rz * REGION_SIZE + Math.floor(rand() * REGION_SIZE),
  }
}

export function getRegionCoord(cx: number, cz: number): { rx: number; rz: number } {
  return {
    rx: Math.floor(cx / REGION_SIZE),
    rz: Math.floor(cz / REGION_SIZE),
  }
}

