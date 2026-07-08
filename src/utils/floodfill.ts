/**
 * Compact bitmapped flood fill algorithm.
 * Ported from arnis-main (floodfill.rs) — uses 1-bit-per-cell bitmap
 * for memory-efficient visited tracking, with multi-seed detection for
 * complex shapes (U-shapes, concave polygons).
 *
 * Useful for: block area selection, water body simulation,
 * building footprint expansion, terrain region analysis.
 */

interface FloodFillOptions {
  /** Optional timeout in milliseconds */
  timeoutMs?: number
  /** Whether to use span filling (faster for large areas, default true) */
  useSpanFilling?: boolean
}

/** Bitmap for compact visited-coordinate tracking (1 bit per cell) */
class FloodBitmap {
  private bits: Uint8Array
  private minX: number
  private minZ: number
  private width: number

  constructor(minX: number, maxX: number, minZ: number, maxZ: number) {
    this.minX = minX
    this.minZ = minZ
    this.width = maxX - minX + 1
    const height = maxZ - minZ + 1
    const numBytes = Math.ceil((this.width * height) / 8)
    this.bits = new Uint8Array(numBytes)
  }

  /** Mark (x, z) as visited. Returns true if this is the FIRST visit. */
  insert(x: number, z: number): boolean {
    const idx = (z - this.minZ) * this.width + (x - this.minX)
    const byte = idx >> 3
    const bit = idx & 7
    const mask = 1 << bit
    if (this.bits[byte] & mask) return false
    this.bits[byte] |= mask
    return true
  }

  contains(x: number, z: number): boolean {
    const idx = (z - this.minZ) * this.width + (x - this.minX)
    const byte = idx >> 3
    const bit = idx & 7
    return ((this.bits[byte] >> bit) & 1) === 1
  }
}

/**
 * Check if a point is inside a polygon using ray casting.
 * @param px - point x
 * @param pz - point z
 * @param polygon - array of [x, z] vertices (closed: first == last)
 */
function pointInPolygon(px: number, pz: number, polygon: [number, number][]): boolean {
  let inside = false
  const n = polygon.length
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, zi] = polygon[i]
    const [xj, zj] = polygon[j]
    if ((zi > pz) !== (zj > pz) &&
        px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi) {
      inside = !inside
    }
  }
  return inside
}

/**
 * Flood fill a polygon area.
 * @param polygonCoords - Array of [x, z] polygon vertices (closed)
 * @param options - Optional timeout and algorithm settings
 * @returns Array of [x, z] points inside the polygon
 */
export function floodFillArea(
  polygonCoords: [number, number][],
  options: FloodFillOptions = {}
): [number, number][] {
  if (polygonCoords.length < 3) return []

  const { timeoutMs, useSpanFilling = true } = options

  // Reject open polylines
  const first = polygonCoords[0]
  const last = polygonCoords[polygonCoords.length - 1]
  if (first[0] !== last[0] || first[1] !== last[1]) return []

  // Calculate bounding box
  let minX = Infinity, maxX = -Infinity
  let minZ = Infinity, maxZ = -Infinity
  for (const [x, z] of polygonCoords) {
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minZ = Math.min(minZ, z)
    maxZ = Math.max(maxZ, z)
  }

  const area = (maxX - minX + 1) * (maxZ - minZ + 1)

  // Safety cap
  if (area > 25_000_000) return []

  const startTime = Date.now()
  const filled: [number, number][] = []
  const visited = new FloodBitmap(minX, maxX, minZ, maxZ)

  function isTimedOut(): boolean {
    return timeoutMs !== undefined && (Date.now() - startTime) > timeoutMs
  }

  // Scan for seed points
  const width = maxX - minX + 1
  const height = maxZ - minZ + 1
  const stepX = useSpanFilling
    ? Math.max(1, Math.floor(width / 6))
    : Math.max(1, Math.floor(width / 8))
  const stepZ = useSpanFilling
    ? Math.max(1, Math.floor(height / 6))
    : Math.max(1, Math.floor(height / 8))

  const queue: [number, number][] = []

  for (let z = minZ; z <= maxZ; z += stepZ) {
    for (let x = minX; x <= maxX; x += stepX) {
      if (filled.length % 100 === 0 && isTimedOut()) return filled
      if (visited.contains(x, z)) continue
      if (!pointInPolygon(x, z, polygonCoords)) continue

      // BFS from this seed
      queue.length = 0
      queue.push([x, z])
      visited.insert(x, z)

      while (queue.length > 0) {
        const [cx, cz] = queue.shift()!

        if (pointInPolygon(cx, cz, polygonCoords)) {
          filled.push([cx, cz])

          const neighbors: [number, number][] = [
            [cx - 1, cz], [cx + 1, cz],
            [cx, cz - 1], [cx, cz + 1],
          ]

          for (const [nx, nz] of neighbors) {
            if (nx >= minX && nx <= maxX && nz >= minZ && nz <= maxZ && visited.insert(nx, nz)) {
              queue.push([nx, nz])
            }
          }
        }
      }
    }
  }

  return filled
}

/**
 * Flood fill from a starting point within bounds.
 * Uses 4-directional BFS with a custom passability check.
 *
 * @param startX - Starting X coordinate
 * @param startZ - Starting Z coordinate
 * @param isPassable - Function returning true if a cell is passable
 * @param bounds - Optional bounding box { minX, maxX, minZ, maxZ }
 * @returns Array of [x, z] reachable points
 */
export function floodFillFromPoint(
  startX: number,
  startZ: number,
  isPassable: (x: number, z: number) => boolean,
  bounds?: { minX: number; maxX: number; minZ: number; maxZ: number }
): [number, number][] {
  const visited = new Set<string>()
  const queue: [number, number][] = [[startX, startZ]]
  const result: [number, number][] = []

  visited.add(`${startX},${startZ}`)

  while (queue.length > 0) {
    const [x, z] = queue.shift()!
    result.push([x, z])

    for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nx = x + dx
      const nz = z + dz
      const key = `${nx},${nz}`

      if (visited.has(key)) continue
      if (bounds) {
        if (nx < bounds.minX || nx > bounds.maxX || nz < bounds.minZ || nz > bounds.maxZ) continue
      }
      if (!isPassable(nx, nz)) continue

      visited.add(key)
      queue.push([nx, nz])
    }
  }

  return result
}
