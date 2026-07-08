import { createNoise2D } from 'simplex-noise'
import { WORLD_SEED, hashStringToSeed } from './seededRandom'

const noise2D = createNoise2D(() => hashStringToSeed(WORLD_SEED + ':terrain'))

export function getInfiniteTerrainHeight(x: number, z: number): number {
  const dist = Math.sqrt(x * x + z * z)

  // Base rolling hills
  const hills =
    noise2D(x * 0.015, z * 0.015) * 1.2 +
    noise2D(x * 0.03, z * 0.03) * 0.6 +
    noise2D(x * 0.06, z * 0.06) * 0.3 +
    noise2D(x * 0.12, z * 0.12) * 0.15

  // Gentle dome around origin so the starting area is land
  const dome = Math.max(0, 1 - dist / 80)
  const domeBoost = dome * 1.5

  // Water level at -0.4; terrain below that is underwater
  const height = hills + domeBoost - 0.2
  return height
}
