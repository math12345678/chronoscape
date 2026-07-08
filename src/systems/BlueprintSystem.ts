// ── Blueprint System (ported from Cubyz blueprint patterns) ──
// Serialize/deserialize placed block regions to JSON, save/load from localStorage.

import type { BlockData, BlockType, WorldBlockMap } from '../store'
import { useStore } from '../store'

export interface BlueprintEntry {
  type: BlockType
  localX: number
  localY: number
  localZ: number
}

export interface BlueprintData {
  id: string
  name: string
  created: number
  blocks: BlueprintEntry[]
  /** Bounds of the original selection (for paste offset) */
  width: number
  height: number
  depth: number
}

const STORAGE_KEY = 'chronoscape-blueprints'

/** Load all saved blueprints from localStorage. */
export function loadBlueprints(): BlueprintData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/** Save all blueprints to localStorage. */
export function saveBlueprints(bps: BlueprintData[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(bps)) } catch {}
}

/** Get all blocks in a cuboid region. */
export function getBlocksInRegion(
  minX: number, minY: number, minZ: number,
  maxX: number, maxY: number, maxZ: number
): BlueprintEntry[] {
  const blocks = useStore.getState().blocks
  const entries: BlueprintEntry[] = []

  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      for (let z = minZ; z <= maxZ; z++) {
        const key = `${x},${y},${z}`
        const block = blocks[key]
        if (block) {
          entries.push({
            type: block.type,
            localX: x - minX,
            localY: y - minY,
            localZ: z - minZ,
          })
        }
      }
    }
  }

  return entries
}

/** Check if a blueprint can be placed (no occupied positions). */
export function canPlaceBlueprint(
  targetX: number, targetY: number, targetZ: number,
  bp: BlueprintData
): boolean {
  const blocks = useStore.getState().blocks
  for (const entry of bp.blocks) {
    const key = `${targetX + entry.localX},${targetY + entry.localY},${targetZ + entry.localZ}`
    if (blocks[key]) return false
  }
  return true
}

/** Place all blocks from a blueprint at the target position. */
export function placeBlueprint(
  targetX: number, targetY: number, targetZ: number,
  bp: BlueprintData,
  ownerId: string = 'player'
): boolean {
  if (!canPlaceBlueprint(targetX, targetY, targetZ, bp)) return false

  const now = Date.now()
  const newBlocks: [string, BlockData][] = []

  for (const entry of bp.blocks) {
    const x = targetX + entry.localX
    const y = targetY + entry.localY
    const z = targetZ + entry.localZ
    const key = `${x},${y},${z}`

    newBlocks.push([key, {
      id: key,
      type: entry.type,
      placedAt: now,
      decayDeadline: null,
      ownerId,
    }])
  }

  useStore.setState(s => {
    const updated: WorldBlockMap = { ...s.blocks }
    for (const [key, data] of newBlocks) {
      updated[key] = data
    }
    return { blocks: updated }
  })

  return true
}

/** Create a new blueprint from a region. */
export function createBlueprint(
  name: string,
  minX: number, minY: number, minZ: number,
  maxX: number, maxY: number, maxZ: number
): BlueprintData | null {
  const blocks = getBlocksInRegion(minX, minY, minZ, maxX, maxY, maxZ)
  if (blocks.length === 0) return null

  const bps = loadBlueprints()
  const bp: BlueprintData = {
    id: `bp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    created: Date.now(),
    blocks,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    depth: maxZ - minZ + 1,
  }

  bps.push(bp)
  saveBlueprints(bps)
  return bp
}

/** Delete a blueprint by ID. */
export function deleteBlueprint(id: string): void {
  const bps = loadBlueprints().filter(b => b.id !== id)
  saveBlueprints(bps)
}

/** Rename a blueprint. */
export function renameBlueprint(id: string, newName: string): void {
  const bps = loadBlueprints().map(b => b.id === id ? { ...b, name: newName } : b)
  saveBlueprints(bps)
}
