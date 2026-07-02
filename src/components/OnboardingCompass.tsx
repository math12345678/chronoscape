import { useEffect, useRef, useMemo } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'
import { TIME_RIFT_POSITIONS } from '../config/constants'

const ONBOARDING_WINDOW_MS = 10_000

/**
 * Lives inside the Canvas. For the first ONBOARDING_WINDOW_MS of play (or until
 * the player has harvested Raw), tracks the screen-space bearing from the
 * camera to the nearest Time Rift and writes it to the store so the HTML
 * OnboardingHint can render a directional glow pointing toward it.
 */
export const OnboardingCompass = () => {
  const { camera } = useThree()
  const setBearing = useStore((s) => s.setOnboardingRiftBearing)
  const startTime = useRef<number | null>(null)
  const forwardTmp = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    return () => setBearing(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useFrame(() => {
    const hasRaw = useStore.getState().inventory.raw > 0
    if (startTime.current === null) startTime.current = performance.now()
    const elapsed = performance.now() - startTime.current

    if (hasRaw || elapsed > ONBOARDING_WINDOW_MS) {
      setBearing(null)
      return
    }

    let nearest = TIME_RIFT_POSITIONS[0]
    let nearestDist = Infinity
    for (const pos of TIME_RIFT_POSITIONS) {
      const dx = pos[0] - camera.position.x
      const dz = pos[2] - camera.position.z
      const d = dx * dx + dz * dz
      if (d < nearestDist) {
        nearestDist = d
        nearest = pos
      }
    }

    const dx = nearest[0] - camera.position.x
    const dz = nearest[2] - camera.position.z
    const angleToRift = Math.atan2(dx, -dz)

    const forward = camera.getWorldDirection(forwardTmp)
    const cameraYaw = Math.atan2(forward.x, -forward.z)

    let relative = angleToRift - cameraYaw
    // Normalize to [-PI, PI]
    relative = ((relative + Math.PI) % (Math.PI * 2)) - Math.PI
    setBearing(relative)
  })

  return null
}
