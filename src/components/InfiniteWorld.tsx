import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { LOAD_RADIUS, getChunkCoord, chunkKey } from '../world/chunkContent'
import { getOrGenerateChunk } from '../world/chunkCache'
import { getInfiniteTerrainHeight } from '../world/chunkTerrain'
import { updateChunks, tickChunkWind, animateChunkTrees } from '../world/ChunkManager'
import { buildChunkRifts, updateRifts, clearRiftsForChunk } from '../world/riftManager'
import { buildChunkStructures } from '../world/chunkStructures'
import { WraithManager, spawnWraith, clearWraithsForChunk } from '../world/WraithManager'
import type { LoadedChunk } from '../world/ChunkManager'

export function getHeightAt(x: number, z: number): number {
  return getInfiniteTerrainHeight(x, z)
}

export { getInfiniteTerrainHeight as getWorldTerrainHeight }

export const InfiniteWorld = () => {
  const { scene } = useThree()
  const chunkRefs = useRef(new Map<string, LoadedChunk>())
  const lastChunkCoord = useRef({ cx: 999999, cz: 999999 })
  const time = useRef(0)
  const wraithSpawnedRef = useRef<Set<string>>(new Set())

  useFrame((state, delta) => {
    time.current += delta
    const px = state.camera.position.x
    const pz = state.camera.position.z

    const cur = getChunkCoord(px, pz)

    if (cur.cx !== lastChunkCoord.current.cx || cur.cz !== lastChunkCoord.current.cz) {
      lastChunkCoord.current = cur

      // Clean up rifts + wraiths for chunks that will be unloaded
      const needed = new Set<string>()
      for (let dx = -LOAD_RADIUS; dx <= LOAD_RADIUS; dx++) {
        for (let dz = -LOAD_RADIUS; dz <= LOAD_RADIUS; dz++) {
          needed.add(chunkKey(cur.cx + dx, cur.cz + dz))
        }
      }
      for (const [key] of chunkRefs.current) {
        if (!needed.has(key)) {
          const [cxc, czc] = key.split(',').map(Number)
          clearRiftsForChunk(cxc, czc)
          clearWraithsForChunk(cxc, czc)
          wraithSpawnedRef.current.delete(key)
        }
      }

      // Update chunk scene groups
      updateChunks(px, pz, scene, chunkRefs.current)

      // Build rifts + structures for newly added chunks
      for (let dx = -LOAD_RADIUS; dx <= LOAD_RADIUS; dx++) {
        for (let dz = -LOAD_RADIUS; dz <= LOAD_RADIUS; dz++) {
          const cx = cur.cx + dx
          const cz = cur.cz + dz
          const key = chunkKey(cx, cz)
          const loaded = chunkRefs.current.get(key)
          if (loaded && !(loaded as any)._riftsBuilt) {
            buildChunkRifts(cx, cz, loaded.group)
            buildChunkStructures(cx, cz, loaded.group)
            ;(loaded as any)._riftsBuilt = true
          }
        }
      }

      // Spawn wraiths for newly loaded chunks that don't have them yet
      for (let dx = -LOAD_RADIUS; dx <= LOAD_RADIUS; dx++) {
        for (let dz = -LOAD_RADIUS; dz <= LOAD_RADIUS; dz++) {
          const cx = cur.cx + dx
          const cz = cur.cz + dz
          const key = chunkKey(cx, cz)
          if (chunkRefs.current.has(key) && !wraithSpawnedRef.current.has(key)) {
            const data = getOrGenerateChunk(cx, cz)
            for (const w of data.wraiths) {
              spawnWraith(w.x, w.z, cx, cz)
            }
            wraithSpawnedRef.current.add(key)
          }
        }
      }
    }

    // Update global systems
    tickChunkWind(delta)
    animateChunkTrees(chunkRefs.current)
    updateRifts(time.current)
  })

  return (
    <group>
      <WraithManager />
    </group>
  )
}
