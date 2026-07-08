import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'

const CYCLE_DURATION = 120 // seconds for a full day/night cycle
const SUN_DISTANCE = 80

// Module-level day factor — avoids calling useStore.setState every frame
let _dayFactor = 1.0
export function getDayFactor(): number {
  return _dayFactor
}

// Module-level golden hour factor for other components (SunSource, AtmosphereSky)
let _goldenHourFactor = 0.0
export function getGoldenHourFactor(): number {
  return _goldenHourFactor
}

// Module-level sun height for other components
let _sunHeight = 1.0
export function getSunHeight(): number {
  return _sunHeight
}

/**
 * Dynamic day/night cycle with dramatic golden hour lighting.
 * 
 * Features:
 * - Smooth day/night transitions with hemisphere light changes
 * - Dramatic golden hour at dawn/dusk: warm oranges, increased sun glow, atmospheric fog
 * - Sun position and intensity tied to time of day
 * - Fog color shifts through warm tones during golden hour
 */
export const DayNightCycle = () => {
  const frameCount = useRef(0)
  const storeSyncCount = useRef(0)
  // Start at t=0.25 (afternoon = bright daylight) so players don't spawn in pitch black dawn
  const time = useRef(0.25)
  const { scene, gl } = useThree()
  const scratchColor = useRef(new THREE.Color())
  const cachedLights = useRef<{
    sunLight: THREE.DirectionalLight | null
    hemiLight: THREE.HemisphereLight | null
    fillLight: THREE.DirectionalLight | null
    rimLight: THREE.DirectionalLight | null
  }>({ sunLight: null, hemiLight: null, fillLight: null, rimLight: null })

  useFrame((_, delta) => {
    time.current += delta / CYCLE_DURATION
    const t = time.current % 1 // 0-1, 0 = noon, 0.5 = midnight

    // Sun angle (0 = noon, PI = midnight)
    const angle = t * Math.PI * 2
    _sunHeight = Math.sin(angle) // -1 (midnight) to 1 (noon)

    // Day factor: 0 = night, 1 = noon
    const rawDay = Math.max(0, Math.min(1, (_sunHeight + 0.3) / 1.3))
    _dayFactor = rawDay * rawDay * (3 - 2 * rawDay) // smoothstep

    // Golden hour factor: peaks when sun is near horizon (height between -0.1 and 0.2)
    const goldenRaw = Math.max(0, 1 - Math.abs(_sunHeight - 0.05) * 6)
    _goldenHourFactor = goldenRaw * goldenRaw * (3 - 2 * goldenRaw) // smoothstep for smooth falloff

    // Sync to store once per second (good enough for NPC AI, avoids per-frame setState)
    storeSyncCount.current++
    if (storeSyncCount.current >= 60) {
      storeSyncCount.current = 0
      useStore.setState({ dayFactor: _dayFactor })
    }

    // Throttle light/scene updates to every 3rd frame — imperceptible for slow sky changes
    frameCount.current++
    if (frameCount.current % 3 !== 0) return

    // Sun position
    const sunX = Math.cos(angle) * SUN_DISTANCE
    const sunY = _sunHeight * SUN_DISTANCE * 0.4
    const sunZ = Math.sin(angle) * SUN_DISTANCE * 0.6

    // Update sun directional light (cached references)
    const cached = cachedLights.current
    if (!cached.sunLight) cached.sunLight = scene.getObjectByName('keyLight') as THREE.DirectionalLight | null
    if (!cached.hemiLight) cached.hemiLight = scene.getObjectByName('hemiLight') as THREE.HemisphereLight | null
    if (!cached.fillLight) cached.fillLight = scene.getObjectByName('fillLight') as THREE.DirectionalLight | null
    if (!cached.rimLight) cached.rimLight = scene.getObjectByName('rimLight') as THREE.DirectionalLight | null

    const smoothDay = _dayFactor
    const gh = _goldenHourFactor

    // ── Sun (keyLight) ──
    const sunLight = cached.sunLight
    if (sunLight) {
      sunLight.position.set(sunX, sunY, sunZ)
      sunLight.intensity = 0.6 + smoothDay * 1.4 + gh * 0.3
      // Golden hour: warm orange sun. Daytime: warm white. Night: cool blue
      const hue = 0.08 - gh * 0.04 // shift from 0.08 (yellow-orange) toward 0.04 (oranger)
      const sat = 0.3 + smoothDay * 0.3 + gh * 0.3
      const light = 0.7 + smoothDay * 0.3 + gh * 0.15
      sunLight.color.setHSL(hue, Math.min(1, sat), Math.min(1, light))
    }

    // ── Hemisphere light ──
    const hemiLight = cached.hemiLight
    if (hemiLight) {
      hemiLight.intensity = 0.2 + smoothDay * 0.4 + gh * 0.15
      // Sky color: warm during golden hour
      const skyHue = 0.6 - gh * 0.25 // shift from blue toward orange
      scratchColor.current.setHSL(
        Math.max(0.08, skyHue),
        0.3 + smoothDay * 0.3,
        0.1 + smoothDay * 0.5 + gh * 0.1
      )
      hemiLight.color.copy(scratchColor.current)
      // Ground color: warm reflection during golden hour
      scratchColor.current.setHSL(0.08, 0.4 + gh * 0.3, 0.1 + smoothDay * 0.2 + gh * 0.08)
      hemiLight.groundColor.copy(scratchColor.current)
    }

    // ── Fill light ──
    const fillLight = cached.fillLight
    if (fillLight) {
      fillLight.intensity = 0.15 + smoothDay * 0.5 + gh * 0.2
      const fillHue = 0.58 - gh * 0.3 // warm fill during golden hour
      scratchColor.current.setHSL(Math.max(0.05, fillHue), 0.2 + gh * 0.3, 0.05 + smoothDay * 0.2 + gh * 0.1)
      fillLight.color.copy(scratchColor.current)
    }

    // ── Rim light ──
    const rimLight = cached.rimLight
    if (rimLight) {
      rimLight.intensity = 0.3 + smoothDay * 0.8 + gh * 0.4
      const rimHue = 0.65 - gh * 0.35
      scratchColor.current.setHSL(Math.max(0.05, rimHue), 0.3 + gh * 0.4, 0.08 + smoothDay * 0.25 + gh * 0.12)
      rimLight.color.copy(scratchColor.current)
    }

    // ── Fog: warm amber during golden hour, cool blue at night ──
    if (scene.fog) {
      const fogHue = 0.58 - gh * 0.3 // shift from blue toward orange
      scratchColor.current.setHSL(
        Math.max(0.07, fogHue),
        0.3 + gh * 0.2,
        0.03 + smoothDay * 0.15 + gh * 0.06
      )
      scene.fog.color.copy(scratchColor.current)
    }

    // ── Renderer clear color (sky background) ──
    const clearHue = 0.58 - gh * 0.25
    scratchColor.current.setHSL(
      Math.max(0.08, clearHue),
      0.3 + smoothDay * 0.2 + gh * 0.15,
      0.02 + smoothDay * 0.12 + gh * 0.04
    )
    gl.setClearColor(scratchColor.current)
  })

  return null
}
