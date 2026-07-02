import { ISLAND_SIZE } from './config/constants'

/**
 * Returns the terrain height at any (x, z) world coordinate.
 * Uses layered sine waves for organic rolling hills.
 * Center of the island is at y≈0, edges slope down toward water level.
 */
export function getTerrainHeight(x: number, z: number): number {
  // Distance from center (creates a gentle dome)
  const dist = Math.sqrt(x * x + z * z)
  const falloff = Math.max(0, 1 - dist / (ISLAND_SIZE * 0.45))

  // Organic rolling hills
  const hills =
    Math.sin(x * 0.04 + z * 0.03) * 0.6 +
    Math.cos(x * 0.06 - z * 0.05) * 0.4 +
    Math.sin((x + z) * 0.035) * 0.3 +
    Math.cos(x * 0.08 + z * 0.07) * 0.2

  return hills * falloff
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
