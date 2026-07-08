import { getInfiniteTerrainHeight } from './world/chunkTerrain'

/**
 * Returns the terrain height at any (x, z) world coordinate.
 * Delegates to infinite procedural terrain via simplex noise.
 */
export function getTerrainHeight(x: number, z: number): number {
  return getInfiniteTerrainHeight(x, z)
}

/**
 * Pre-generates a heightmap lookup for quick floor queries.
 * Returns height at nearest grid cell.
 */
const heightCache = new Map<string, number>()

export function getGridHeight(x: number, z: number): number {
  const gx = Math.round(x)
  const gz = Math.round(z)
  const key = `${gx},${gz}`
  let h = heightCache.get(key)
  if (h === undefined) {
    h = getTerrainHeight(gx, gz)
    heightCache.set(key, h)
  }
  return h
}

/** Clear the cache (call if terrain params change) */
export function clearHeightCache() {
  heightCache.clear()
}
