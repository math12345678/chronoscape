/**
 * 3D Bresenham line algorithm.
 * Ported from arnis-main (bresenham.rs) — generates all integer coordinates
 * along a line between two 3D points using integer arithmetic.
 *
 * Useful for: building alignment tools, pathfinding visualization,
 * raycasting, and line-of-sight checks.
 */

interface Point3D {
  x: number
  y: number
  z: number
}

/**
 * Generate all integer coordinates along a 3D Bresenham line.
 * Returns an array of [x, y, z] points from start to end (inclusive).
 */
export function bresenhamLine(
  x1: number, y1: number, z1: number,
  x2: number, y2: number, z2: number
): [number, number, number][] {
  const dx = Math.abs(x2 - x1)
  const dy = Math.abs(y2 - y1)
  const dz = Math.abs(z2 - z1)

  const xs = x1 < x2 ? 1 : -1
  const ys = y1 < y2 ? 1 : -1
  const zs = z1 < z2 ? 1 : -1

  let x = x1, y = y1, z = z1
  const points: [number, number, number][] = []

  if (dx >= dy && dx >= dz) {
    let p1 = 2 * dy - dx
    let p2 = 2 * dz - dx

    while (x !== x2) {
      points.push([x, y, z])
      if (p1 >= 0) { y += ys; p1 -= 2 * dx }
      if (p2 >= 0) { z += zs; p2 -= 2 * dx }
      p1 += 2 * dy
      p2 += 2 * dz
      x += xs
    }
  } else if (dy >= dx && dy >= dz) {
    let p1 = 2 * dx - dy
    let p2 = 2 * dz - dy

    while (y !== y2) {
      points.push([x, y, z])
      if (p1 >= 0) { x += xs; p1 -= 2 * dy }
      if (p2 >= 0) { z += zs; p2 -= 2 * dy }
      p1 += 2 * dx
      p2 += 2 * dz
      y += ys
    }
  } else {
    let p1 = 2 * dy - dz
    let p2 = 2 * dx - dz

    while (z !== z2) {
      points.push([x, y, z])
      if (p1 >= 0) { y += ys; p1 -= 2 * dz }
      if (p2 >= 0) { x += xs; p2 -= 2 * dz }
      p1 += 2 * dy
      p2 += 2 * dx
      z += zs
    }
  }

  points.push([x2, y2, z2])
  return points
}

/**
 * Compute all integer positions on a 2D grid line (ignoring Y).
 * Returns [x, z] coordinates.
 */
export function bresenhamLine2D(
  x1: number, z1: number,
  x2: number, z2: number
): [number, number][] {
  return bresenhamLine(x1, 0, z1, x2, 0, z2).map(([x, , z]) => [x, z])
}

/**
 * Check if two points in 3D have line-of-sight (no blocks in the way).
 * Checks against a set of occupied positions.
 *
 * @returns The blocking point if obstructed, null if clear.
 */
export function hasLineOfSight(
  from: Point3D,
  to: Point3D,
  occupied: Set<string>
): Point3D | null {
  const line = bresenhamLine(from.x, from.y, from.z, to.x, to.y, to.z)
  for (const [x, y, z] of line) {
    if (x === from.x && y === from.y && z === from.z) continue
    if (x === to.x && y === to.y && z === to.z) break
    if (occupied.has(`${x},${y},${z}`)) return { x, y, z }
  }
  return null
}

/**
 * Generate a hollow rectangular perimeter of points.
 * Useful for building structure outlines.
 */
export function bresenhamRectPerimeter(
  x1: number, z1: number,
  x2: number, z2: number,
  y: number = 0
): [number, number, number][] {
  const points = new Set<string>()
  const add = (pts: [number, number][]) => {
    for (const [x, z] of pts) {
      const key = `${x},${y},${z}`
      if (!points.has(key)) {
        points.add(key)
      }
    }
  }
  add(bresenhamLine2D(x1, z1, x2, z1))
  add(bresenhamLine2D(x2, z1, x2, z2))
  add(bresenhamLine2D(x2, z2, x1, z2))
  add(bresenhamLine2D(x1, z2, x1, z1))
  return Array.from(points).map(k => {
    const [px, py, pz] = k.split(',').map(Number)
    return [px, py ?? y, pz] as [number, number, number]
  })
}
