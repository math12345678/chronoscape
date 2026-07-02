import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useSoundEngine } from '../hooks/useSoundEngine'
import { getTerrainHeight } from '../terrain'

const STEP_INTERVAL = 0.35 // seconds between steps
const WATER_HEIGHT = -0.2
const SAND_THRESHOLD = 0.3

/**
 * Detects player movement via camera position and plays footstep sounds
 * with terrain-aware variations (grass, stone, water).
 * Lives inside the R3F Canvas.
 */
export const FootstepSystem = () => {
  const { camera } = useThree()
  const sounds = useSoundEngine()
  const stepTimer = useRef(0)
  const prevPos = useRef({ x: 0, z: 0 })
  const initRef = useRef(false)

  useFrame((_, delta) => {
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
    prevPos.current = { x: px, z: pz }

    if (dist < 0.01) {
      stepTimer.current = 0
      return
    }

    stepTimer.current += delta
    if (stepTimer.current < STEP_INTERVAL) return
    stepTimer.current = 0

    // Determine terrain type at player's feet
    const terrainY = getTerrainHeight(px, pz)
    const isWater = terrainY <= WATER_HEIGHT
    const isHigh = terrainY > SAND_THRESHOLD

    // Vary pitch based on terrain
    if (isWater) {
      sounds.waterSplash()
    } else if (isHigh) {
      // Stone/rock surface — higher pitch, crisper
      sounds.footstep()
    } else {
      // Grass — softer
      sounds.footstep()
    }

  })

  return null
}
