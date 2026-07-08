/**
 * Color utilities for Chronoscape.
 * Ported from arnis-main (colors.rs) — Oklab perceptual color distance,
 * hex color parsing, and color name mapping.
 */

export type RGBTuple = [number, number, number]

/**
 * Parse a hex color string (#RGB, #RRGGBB) to RGB tuple (0-255).
 */
export function hexToRgbTuple(text: string): RGBTuple | null {
  const trimmed = text.trim()
  
  // #RRGGBB
  if (trimmed.length === 7 && trimmed.startsWith('#')) {
    const r = parseInt(trimmed.slice(1, 3), 16)
    const g = parseInt(trimmed.slice(3, 5), 16)
    const b = parseInt(trimmed.slice(5, 7), 16)
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return [r, g, b]
  }
  
  // #RGB
  if (trimmed.length === 4 && trimmed.startsWith('#')) {
    const r = parseInt(trimmed[1] + trimmed[1], 16)
    const g = parseInt(trimmed[2] + trimmed[2], 16)
    const b = parseInt(trimmed[3] + trimmed[3], 16)
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return [r, g, b]
  }
  
  // Named color
  return colorNameToRgb(trimmed)
}

/**
 * Named colors to RGB.
 */
const NAMED_COLORS: Record<string, RGBTuple> = {
  aqua: [0, 255, 255],
  cyan: [0, 255, 255],
  beige: [187, 173, 142],
  black: [0, 0, 0],
  blue: [0, 0, 255],
  brown: [128, 64, 0],
  darkgray: [96, 96, 96],
  darkgrey: [96, 96, 96],
  darkbrown: [90, 50, 20],
  darkred: [139, 0, 0],
  dimgray: [105, 105, 105],
  dimgrey: [105, 105, 105],
  firebrick: [178, 34, 34],
  fuchsia: [255, 0, 255],
  magenta: [255, 0, 255],
  gold: [255, 215, 0],
  gray: [128, 128, 128],
  grey: [128, 128, 128],
  green: [0, 128, 0],
  ivory: [255, 255, 240],
  khaki: [240, 230, 140],
  lightblue: [173, 216, 230],
  lightgray: [211, 211, 211],
  lightgrey: [211, 211, 211],
  lightgreen: [144, 238, 144],
  lightyellow: [255, 255, 224],
  lime: [0, 255, 0],
  limestone: [246, 240, 208],
  maroon: [128, 0, 0],
  navy: [0, 0, 128],
  olive: [128, 128, 0],
  orange: [255, 128, 0],
  pink: [255, 192, 203],
  purple: [128, 0, 128],
  red: [255, 0, 0],
  salmon: [250, 128, 114],
  sandstone: [215, 188, 138],
  silver: [192, 192, 192],
  tan: [210, 180, 140],
  teal: [0, 128, 128],
  white: [255, 255, 255],
  yellow: [255, 255, 0],
}

function colorNameToRgb(text: string): RGBTuple | null {
  const normalized = text
    .toLowerCase()
    .replace(/[\s_-]/g, '')
  return NAMED_COLORS[normalized] ?? null
}

/**
 * Raw RGB Euclidean distance (fast but not perceptually accurate).
 */
export function rgbDistance(from: RGBTuple, to: RGBTuple): number {
  const dr = from[0] - to[0]
  const dg = from[1] - to[1]
  const db = from[2] - to[2]
  return dr * dr + dg * dg + db * db
}

// ── Oklab Color Space ──────────────────────────────────
// Perceptually uniform color space for accurate distance measurement.
// Ported from arnis-main's colors.rs.

function srgbToLinear(c: number): number {
  const cNorm = c / 255
  if (cNorm <= 0.04045) return cNorm / 12.92
  return Math.pow((cNorm + 0.055) / 1.055, 2.4)
}

function rgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const rL = srgbToLinear(r)
  const gL = srgbToLinear(g)
  const bL = srgbToLinear(b)
  
  // Linear LMS
  const l = 0.4122214708 * rL + 0.5363325363 * gL + 0.0514459929 * bL
  const m = 0.2119034982 * rL + 0.6806995451 * gL + 0.1073969566 * bL
  const s = 0.0883024619 * rL + 0.2817188376 * gL + 0.6299787005 * bL
  
  // Cube root (LMS')
  const lC = Math.cbrt(l)
  const mC = Math.cbrt(m)
  const sC = Math.cbrt(s)
  
  // Oklab
  return [
    0.2104542553 * lC + 0.7936177850 * mC - 0.0040720468 * sC,
    1.9779984951 * lC - 2.4285922050 * mC + 0.4505937099 * sC,
    0.0259040371 * lC + 0.7827717662 * mC - 0.8086757660 * sC,
  ]
}

/**
 * Squared perceptual distance between two sRGB colors using Oklab.
 * Lower values = more perceptually similar.
 * Ported from arnis-main (colors.rs → oklab_distance).
 */
export function oklabDistance(from: RGBTuple, to: RGBTuple): number {
  const [l1, a1, b1] = rgbToOklab(from[0], from[1], from[2])
  const [l2, a2, b2] = rgbToOklab(to[0], to[1], to[2])
  const dl = l1 - l2
  const da = a1 - a2
  const db = b1 - b2
  return dl * dl + da * da + db * db
}

/**
 * Find the closest matching color from a palette using Oklab distance.
 */
export function findClosestColor(target: RGBTuple, palette: RGBTuple[]): RGBTuple {
  let best = palette[0]
  let bestDist = Infinity
  
  for (const color of palette) {
    const dist = oklabDistance(target, color)
    if (dist < bestDist) {
      bestDist = dist
      best = color
    }
  }
  
  return best
}
