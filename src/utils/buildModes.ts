/**
 * Building mode utilities — Single/Line/Rect placement modes
 * using Bresenham line and flood fill algorithms.
 */

import { bresenhamLine2D, bresenhamRectPerimeter } from './bresenham'

export type BuildMode = 'single' | 'line' | 'rect' | 'fill'

/** Read the current build mode from a global. */
export function getBuildMode(): BuildMode {
  return (window as any).__BUILD_MODE ?? 'single'
}

/** Set the current build mode globally so BuildPreview can read it. */
export function setBuildMode(mode: BuildMode) {
  ;(window as any).__BUILD_MODE = mode
}

/**
 * Get the positions to place blocks in the current build mode.
 *
 * @param mode - The build mode
 * @param startPos - [x, y, z] starting position
 * @param endPos - [x, y, z] ending position (for line/rect modes)
 * @returns Array of [x, y, z] positions to place blocks at
 */
export function getBuildPositions(
  mode: BuildMode,
  startPos: [number, number, number],
  endPos: [number, number, number],
): [number, number, number][] {
  switch (mode) {
    case 'single':
      return [endPos]

    case 'line': {
      // Horizontal line along ground plane (same Y)
      const points2D = bresenhamLine2D(startPos[0], startPos[2], endPos[0], endPos[2])
      return points2D.map(([x, z]) => [x, startPos[1], z] as [number, number, number])
    }

    case 'rect': {
      // Rectangular perimeter on the ground plane
      const perimeter = bresenhamRectPerimeter(
        startPos[0], startPos[2],
        endPos[0], endPos[2],
        startPos[1],
      )
      return perimeter
    }

    case 'fill': {
      // Fill the rectangular area completely
      const points: [number, number, number][] = []
      const minX = Math.min(startPos[0], endPos[0])
      const maxX = Math.max(startPos[0], endPos[0])
      const minZ = Math.min(startPos[2], endPos[2])
      const maxZ = Math.max(startPos[2], endPos[2])
      for (let x = minX; x <= maxX; x++) {
        for (let z = minZ; z <= maxZ; z++) {
          points.push([x, startPos[1], z])
        }
      }
      return points
    }

    default:
      return [endPos]
  }
}

/**
 * Get the preview positions for ghost rendering.
 * Same as getBuildPositions but may filter/limit for performance.
 */
export function getPreviewPositions(
  mode: BuildMode,
  startPos: [number, number, number],
  endPos: [number, number, number],
): [number, number, number][] {
  const positions = getBuildPositions(mode, startPos, endPos)
  // Limit preview count for performance
  return positions.slice(0, 200)
}
