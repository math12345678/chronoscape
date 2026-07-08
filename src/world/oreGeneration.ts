/**
 * Vein-based ore/resource generation system.
 * Ported from arnis-main (ore_generation.rs) — distributes resource nodes
 * across the world using chunk-seeded RNG with depth-based vein spawning.
 *
 * Adapts the Minecraft-style ore vein system to Chronoscape's resource
 * model: rifts (harvest nodes) instead of ore blocks.
 */

import { getTerrainHeight } from '../terrain'
import { getBiomeAt } from './biome'
import type { BiomeType } from './biome'
import { ISLAND_SIZE } from '../config/constants'

// ── Ore/Resource Definitions ────────────────────────────

interface ResourceDef {
  id: string
  /** Shallowest depth below local surface */
  depthMin: number
  /** Deepest depth below local surface */
  depthMax: number
  /** Min nodes per vein */
  veinMin: number
  /** Max nodes per vein */
  veinMax: number
  /** Average veins per chunk (16x16 area) */
  avgVeinsPerChunk: number
  /** Biomes where this resource can appear (empty = all) */
  allowedBiomes?: BiomeType[]
  /** Visual tint for the node */
  color: string
  /** Label for UI */
  label: string
}

export const RESOURCE_TYPES: ResourceDef[] = [
  {
    id: 'time_crystal',
    depthMin: 3,
    depthMax: 30,
    veinMin: 2,
    veinMax: 5,
    avgVeinsPerChunk: 4,
    allowedBiomes: ['forest', 'dense_forest', 'rocky_highlands', 'taiga'],
    color: '#aa88ff',
    label: 'Time Crystal',
  },
  {
    id: 'raw_deposit',
    depthMin: 1,
    depthMax: 15,
    veinMin: 3,
    veinMax: 8,
    avgVeinsPerChunk: 8,
    color: '#ff8844',
    label: 'Raw Deposit',
  },
  {
    id: 'vapour_geode',
    depthMin: 5,
    depthMax: 25,
    veinMin: 2,
    veinMax: 4,
    avgVeinsPerChunk: 3,
    allowedBiomes: ['desert', 'rocky_desert', 'rocky_highlands'],
    color: '#ffaa00',
    label: 'Vapour Geode',
  },
  {
    id: 'liquid_spring',
    depthMin: 10,
    depthMax: 40,
    veinMin: 1,
    veinMax: 3,
    avgVeinsPerChunk: 2,
    allowedBiomes: ['wetlands', 'beach', 'jungle'],
    color: '#44ccff',
    label: 'Liquid Spring',
  },
  {
    id: 'chrono_emerald',
    depthMin: 20,
    depthMax: 50,
    veinMin: 1,
    veinMax: 2,
    avgVeinsPerChunk: 1,
    allowedBiomes: ['dense_forest', 'taiga', 'rocky_highlands'],
    color: '#44ff88',
    label: 'Chrono Emerald',
  },
  {
    id: 'desert_relic',
    depthMin: 8,
    depthMax: 35,
    veinMin: 1,
    veinMax: 3,
    avgVeinsPerChunk: 2,
    allowedBiomes: ['desert', 'savanna', 'beach'],
    color: '#ffcc44',
    label: 'Desert Relic',
  },
  {
    id: 'frozen_essence',
    depthMin: 15,
    depthMax: 45,
    veinMin: 2,
    veinMax: 5,
    avgVeinsPerChunk: 3,
    allowedBiomes: ['tundra', 'snowy_plains', 'taiga'],
    color: '#88ccff',
    label: 'Frozen Essence',
  },
]

// ── Generated Resource Node ─────────────────────────────

export interface ResourceNode {
  id: string
  x: number
  y: number
  z: number
  type: string
  amount: number
  color: string
  label: string
  /** Timestamp when this node was last harvested */
  lastHarvested: number
  /** Whether this node has been depleted */
  depleted: boolean
}

// ── Seeded RNG ─────────────────────────────────────────

function createRng(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807 + 12345) % 2147483647
    return (s - 1) / 2147483646
  }
}

// ── Vein Generation ─────────────────────────────────────

/**
 * Generate resource nodes for a given chunk (16x16 block area).
 * Uses chunk-seeded RNG for deterministic placement.
 */
function generateChunkVeins(
  chunkX: number,
  chunkZ: number,
  resources: ResourceDef[]
): ResourceNode[] {
  const rng = createRng(chunkX * 31337 + chunkZ * 13331 + 0xC0DE)
  const nodes: ResourceNode[] = []

  // Sample terrain at chunk center for depth reference
  const centerX = chunkX * 16 + 8
  const centerZ = chunkZ * 16 + 8
  const groundY = getTerrainHeight(centerX, centerZ)

  for (const res of resources) {
    const biome = getBiomeAt(centerX, centerZ)
    // Biome filter
    if (res.allowedBiomes && !res.allowedBiomes.includes(biome)) continue

    const yMin = Math.floor(groundY - res.depthMax)
    const yMax = Math.floor(groundY - res.depthMin)
    if (yMin > yMax) continue

    // Number of veins per chunk
    const maxVeins = res.avgVeinsPerChunk * 2
    const numVeins = Math.floor(rng() * (maxVeins + 1))

    for (let v = 0; v < numVeins; v++) {
      // Random position within chunk
      const vx = chunkX * 16 + Math.floor(rng() * 16)
      const vz = chunkZ * 16 + Math.floor(rng() * 16)
      const vy = yMin + Math.floor(rng() * (yMax - yMin + 1))

      // Vein size
      const veinSize = res.veinMin + Math.floor(rng() * (res.veinMax - res.veinMin + 1))

      // Place nodes along a random walk within the vein
      let px = vx, py = vy, pz = vz
      for (let n = 0; n < veinSize; n++) {
        // Verify the position is valid (within island bounds, underground)
        const dist = Math.sqrt(px * px + pz * pz)
        if (dist < ISLAND_SIZE * 0.5) {
          nodes.push({
            id: `ore-${chunkX}-${chunkZ}-${v}-${n}`,
            x: px,
            y: py,
            z: pz,
            type: res.id,
            amount: res.veinMin + Math.floor(rng() * 3),
            color: res.color,
            label: res.label,
            lastHarvested: 0,
            depleted: false,
          })
        }
        // Random walk step
        const dir = Math.floor(rng() * 6)
        switch (dir) {
          case 0: px += 1; break
          case 1: px -= 1; break
          case 2: py += 1; break
          case 3: py -= 1; break
          case 4: pz += 1; break
          case 5: pz -= 1; break
        }
      }
    }
  }

  return nodes
}

// ── World-scale Generation ──────────────────────────────

/**
 * Generate resource nodes across the entire island.
 * Processes chunks within the island bounds.
 */
export function generateWorldResources(
  islandSize: number = ISLAND_SIZE,
  customResources?: ResourceDef[]
): ResourceNode[] {
  const resources = customResources ?? RESOURCE_TYPES
  const allNodes: ResourceNode[] = []

  const halfSize = Math.floor(islandSize / 2)
  const minChunkX = Math.floor(-halfSize / 16) - 1
  const maxChunkX = Math.ceil(halfSize / 16) + 1
  const minChunkZ = Math.floor(-halfSize / 16) - 1
  const maxChunkZ = Math.ceil(halfSize / 16) + 1

  for (let cx = minChunkX; cx <= maxChunkX; cx++) {
    for (let cz = minChunkZ; cz <= maxChunkZ; cz++) {
      const nodes = generateChunkVeins(cx, cz, resources)
      allNodes.push(...nodes)
    }
  }

  return allNodes
}

// ── Runtime Query ──────────────────────────────────────

/**
 * Find resource nodes near a position within a given radius.
 */
export function findNodesNear(
  nodes: ResourceNode[],
  x: number, y: number, z: number,
  radius: number
): ResourceNode[] {
  const radiusSq = radius * radius
  return nodes.filter(n =>
    !n.depleted &&
    (n.x - x) ** 2 + (n.y - y) ** 2 + (n.z - z) ** 2 <= radiusSq
  )
}

/**
 * Get resources by type at a specific position.
 */
export function getNodeAt(
  nodes: ResourceNode[],
  x: number, y: number, z: number
): ResourceNode | undefined {
  return nodes.find(n =>
    Math.floor(n.x) === Math.floor(x) &&
    Math.floor(n.y) === Math.floor(y) &&
    Math.floor(n.z) === Math.floor(z)
  )
}

/**
 * Mark a node as harvested (returns the amount harvested).
 */
export function harvestNode(node: ResourceNode, harvestAmount: number): number {
  if (node.depleted) return 0
  const amount = Math.min(node.amount, harvestAmount)
  node.amount -= amount
  node.lastHarvested = Date.now()
  if (node.amount <= 0) {
    node.depleted = true
  }
  return amount
}
