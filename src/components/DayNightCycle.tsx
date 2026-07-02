import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const CYCLE_DURATION = 120 // seconds for a full day/night cycle
const SUN_DISTANCE = 80

/**
 * Dynamic day/night cycle that rotates the sun around the scene,
 * changes the sky color, ambient light intensity, and fog color.
 * The cycle is slow and atmospheric — players will notice the shift
 * as they play for a few minutes.
 */
export const DayNightCycle = () => {
  const time = useRef(0)
  const { scene, gl } = useThree()

  useFrame((_, delta) => {
    time.current += delta / CYCLE_DURATION
    const t = time.current % 1 // 0-1, 0 = noon, 0.5 = midnight

    // Sun angle (0 = noon, PI = midnight)
    const angle = t * Math.PI * 2
    const sunHeight = Math.sin(angle) // -1 (midnight) to 1 (noon)

    // Day factor: 0 = night, 1 = noon
    const dayFactor = Math.max(0, Math.min(1, (sunHeight + 0.3) / 1.3))
    const smoothDay = dayFactor * dayFactor * (3 - 2 * dayFactor) // smoothstep

    // Sun position
    const sunX = Math.cos(angle) * SUN_DISTANCE
    const sunY = sunHeight * SUN_DISTANCE * 0.4
    const sunZ = Math.sin(angle) * SUN_DISTANCE * 0.6

    // Update sun directional light
    const sunLight = scene.getObjectByName('sunLight') as THREE.DirectionalLight | null
    if (sunLight) {
      sunLight.position.set(sunX, sunY, sunZ)
      sunLight.intensity = 0.6 + smoothDay * 1.4
      sunLight.color.setHSL(0.08, 0.3 + smoothDay * 0.3, 0.7 + smoothDay * 0.3)
    }

    // Update hemisphere light
    const hemiLight = scene.getObjectByName('hemiLight') as THREE.HemisphereLight | null
    if (hemiLight) {
      hemiLight.intensity = 0.2 + smoothDay * 0.4
      const skyColor = new THREE.Color().setHSL(0.6, 0.3 + smoothDay * 0.3, 0.1 + smoothDay * 0.5)
      const groundColor = new THREE.Color().setHSL(0.3, 0.2, 0.1 + smoothDay * 0.2)
      hemiLight.color.copy(skyColor)
      hemiLight.groundColor.copy(groundColor)
    }

    // Update ambient light
    const ambientLight = scene.getObjectByName('ambientLight') as THREE.AmbientLight | null
    if (ambientLight) {
      ambientLight.intensity = 0.05 + smoothDay * 0.35
      const ambientColor = new THREE.Color().setHSL(0.6, 0.3, 0.05 + smoothDay * 0.25)
      ambientLight.color.copy(ambientColor)
    }

    // Update fog color
    if (scene.fog) {
      const fogColor = new THREE.Color().setHSL(0.58, 0.3, 0.03 + smoothDay * 0.15)
      scene.fog.color.copy(fogColor)
    }

    // Update clear color of renderer
    const clearColor = new THREE.Color().setHSL(0.58, 0.3 + smoothDay * 0.2, 0.02 + smoothDay * 0.12)
    gl.setClearColor(clearColor)
  })

  return null
}
