import { useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { useFrameThrottled } from '../hooks/useFrameThrottled'
import { useSoundEngine } from '../hooks/useSoundEngine'
import { getTerrainHeight } from '../terrain'
import { getBiomeAt, BIOMES } from '../world/biome'
import { spawnGroundEffect } from './GroundReactivity'

const BASE_STEP_INTERVAL = 0.38 // seconds between steps at walk speed
const MIN_STEP_INTERVAL = 0.15 // max sprint
const WATER_HEIGHT = -0.2

/**
 * Detects player movement via camera position and plays footstep sounds
 * with terrain-aware variations and velocity-based timing + intensity.
 * Also spawns biome-reactive ground particles and glow rings.
 * Lives inside the R3F Canvas.
 */
export const FootstepSystem = () => {
  const { camera } = useThree()
  const sounds = useSoundEngine()
  const stepTimer = useRef(0)
  const prevPos = useRef({ x: 0, z: 0 })
  const initRef = useRef(false)

  useFrameThrottled((_, delta) => {
    const px = camera.position.x
    const pz = camera.position.z

    if (!initRef.current) {
      prevPos.current = { x: px, z: pz }
      initRef.current = true
      return
    }

    const dx = px - prevPos.current.x
    const dz = pz - prevPos.current.z
    const dist = Math.sqrt(dx * dx + dz * dz)
    const speed = dist / Math.max(delta, 0.001)
    prevPos.current = { x: px, z: pz }

    if (dist < 0.01) {
      stepTimer.current = 0
      return
    }

    // Velocity-based step interval: faster = shorter
    const speedRatio = Math.min(speed / 6, 1.5)
    const interval = BASE_STEP_INTERVAL - (BASE_STEP_INTERVAL - MIN_STEP_INTERVAL) * speedRatio

    stepTimer.current += delta
    if (stepTimer.current < interval) return
    stepTimer.current = 0

    // Determine terrain surface at player's feet
    const terrainY = getTerrainHeight(px, pz)
    const isWater = terrainY <= WATER_HEIGHT

    // Get biome surface material
    const biome = getBiomeAt(px, pz)
    const props = BIOMES[biome]
    const surface = props?.surfaceMaterial ?? 'grass'

    // Velocity-based intensity
    const intensity = 0.5 + speedRatio * 0.6

    // Spawn reactive ground particles + glow ring (bigger when faster)
    if (!isWater) {
      spawnGroundEffect(px, pz, 0.2 + intensity * 0.3, surface as 'grass' | 'sand' | 'stone' | 'snow' | 'mud' | 'dirt' | 'gravel')
    }

    // Velocity-based pitch and volume
    const pitch = 0.7 + speedRatio * 0.5
    if (isWater) {
      sounds.waterSplash()
    } else if (surface === 'stone' || surface === 'gravel') {
      sounds.footstep(pitch, undefined, intensity)
    } else if (surface === 'snow') {
      sounds.footstep(pitch, undefined, intensity * 0.8)
    } else {
      sounds.footstep(pitch, undefined, intensity)
    }
  }, 2)

  return null
}
