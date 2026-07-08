import { useRef, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useFrameThrottled } from '../hooks/useFrameThrottled'
import { ISLAND_SIZE } from '../config/constants'
import { getBiomeAt } from '../world/biome'

const FOG_PATCH_COUNT = 8
const WIND_STREAK_COUNT = 30
const WIND_RANGE = ISLAND_SIZE * 0.8
const FOG_SPREAD = ISLAND_SIZE * 0.5
const RAIN_DROP_COUNT = 2000
const RAIN_AREA = ISLAND_SIZE * 1.2
const SNOW_DROP_COUNT = 1500

// ── Biome-to-weather mapping ─────────────────────────────
const WET_BIOMES = new Set(['wetlands', 'jungle', 'dense_forest'])
const SNOW_BIOMES = new Set(['taiga', 'tundra', 'snowy_plains'])
const DUST_BIOMES = new Set(['desert', 'rocky_desert'])

/**
 * Biome-aware weather system.
 * - Wetlands/Jungle: heavy rain
 * - Taiga/Tundra/Snowy: gentle snow
 * - Desert/Rocky Desert: dust haze
 * - Others: light atmospheric effects only
 */
export const WeatherSystem = () => {
  const { camera } = useThree()
  const groupRef = useRef<THREE.Group>(null)
  const rainRef = useRef<THREE.Points>(null)
  const snowRef = useRef<THREE.Points>(null)
  const time = useRef(0)
  const weatherType = useRef<'rain' | 'snow' | 'dust' | 'clear'>('clear')
  const weatherIntensity = useRef(0)
  const currentBiome = useRef<string>('plains')

  const rainMatRef = useRef<THREE.PointsMaterial>(null)
  const snowMatRef = useRef<THREE.PointsMaterial>(null)

  const fogPatches = useMemo(() => {
    return Array.from({ length: FOG_PATCH_COUNT }, (_, i) => ({
      x: (Math.random() - 0.5) * FOG_SPREAD,
      z: (Math.random() - 0.5) * FOG_SPREAD,
      size: 8 + Math.random() * 16,
      speed: 0.3 + Math.random() * 0.5,
      phase: i * 1.2,
      opacity: 0.04 + Math.random() * 0.06,
    }))
  }, [])

  const streaks = useMemo(() => {
    return Array.from({ length: WIND_STREAK_COUNT }, (_, i) => ({
      x: (Math.random() - 0.5) * WIND_RANGE,
      y: 3 + Math.random() * 6,
      z: (Math.random() - 0.5) * WIND_RANGE,
      speed: 3 + Math.random() * 5,
      length: 2 + Math.random() * 4,
      phase: i * 0.7,
      initialX: (Math.random() - 0.5) * WIND_RANGE,
    }))
  }, [])

  // Rain drops
  const rainGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const pos = new Float32Array(RAIN_DROP_COUNT * 3)
    const speeds = new Float32Array(RAIN_DROP_COUNT)
    for (let i = 0; i < RAIN_DROP_COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * RAIN_AREA
      pos[i * 3 + 1] = Math.random() * 80
      pos[i * 3 + 2] = (Math.random() - 0.5) * RAIN_AREA
      speeds[i] = 15 + Math.random() * 20
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('speed', new THREE.BufferAttribute(speeds, 1))
    return geo
  }, [])

  // Snow flakes
  const snowGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const pos = new Float32Array(SNOW_DROP_COUNT * 3)
    const drifts = new Float32Array(SNOW_DROP_COUNT)
    for (let i = 0; i < SNOW_DROP_COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * RAIN_AREA
      pos[i * 3 + 1] = Math.random() * 50
      pos[i * 3 + 2] = (Math.random() - 0.5) * RAIN_AREA
      drifts[i] = 0.2 + Math.random() * 0.6
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('drift', new THREE.BufferAttribute(drifts, 1))
    return geo
  }, [])

  useFrameThrottled((_, delta) => {
    time.current += delta

    // Detect biome at camera position
    const px = camera.position.x
    const pz = camera.position.z
    const biome = getBiomeAt(px, pz)
    const prevBiome = currentBiome.current
    currentBiome.current = biome

    // Determine weather type from biome
    let targetType: 'rain' | 'snow' | 'dust' | 'clear'
    let targetIntensity: number

    if (WET_BIOMES.has(biome)) {
      targetType = 'rain'
      targetIntensity = 0.6 + Math.sin(time.current * 0.03) * 0.2
    } else if (SNOW_BIOMES.has(biome)) {
      targetType = 'snow'
      targetIntensity = 0.5 + Math.sin(time.current * 0.02) * 0.15
    } else if (DUST_BIOMES.has(biome)) {
      targetType = 'dust'
      targetIntensity = 0.4 + Math.sin(time.current * 0.025) * 0.1
    } else {
      targetType = 'clear'
      targetIntensity = 0
    }

    // Smooth transitions on biome change
    if (prevBiome !== biome || weatherType.current !== targetType) {
      weatherType.current = targetType
    }
    weatherIntensity.current += (targetIntensity - weatherIntensity.current) * delta * 0.5

    if (!groupRef.current) return

    const children = groupRef.current.children
    const fogCount = FOG_PATCH_COUNT

    // Update fog patches
    for (let i = 0; i < fogCount; i++) {
      const child = children[i]
      if (!child) continue
      const p = fogPatches[i]
      child.position.x = p.x + Math.sin(time.current * p.speed + p.phase) * 8
      child.position.z = p.z + Math.cos(time.current * p.speed * 0.7 + p.phase) * 8
      const fade = Math.sin(time.current * 0.3 + p.phase) * 0.5 + 0.5
      const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial
      mat.opacity = p.opacity * (0.3 + fade * 0.7)
    }

    // Update wind streaks
    for (let i = 0; i < WIND_STREAK_COUNT; i++) {
      const idx = fogCount + i
      const child = children[idx]
      if (!child) continue
      const s = streaks[i]
      const t = time.current * s.speed + s.phase
      const x = s.initialX + ((t * 2) % (WIND_RANGE * 2) - WIND_RANGE)
      child.position.x = x
      const fadeFactor = 1 - Math.abs(x) / WIND_RANGE
      const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial
      mat.opacity = Math.max(0, fadeFactor * 0.15)
    }

    // Update rain
    if (rainRef.current && weatherType.current === 'rain') {
      const pos = rainGeo.attributes.position.array as Float32Array
      const speed = rainGeo.attributes.speed.array as Float32Array
      const intensity = weatherIntensity.current

      for (let i = 0; i < RAIN_DROP_COUNT; i++) {
        pos[i * 3 + 1] -= speed[i] * delta * intensity
        pos[i * 3] -= 5 * delta * intensity
        pos[i * 3 + 2] -= 3 * delta * intensity
        if (pos[i * 3 + 1] < -2) {
          pos[i * 3] = (Math.random() - 0.5) * RAIN_AREA
          pos[i * 3 + 1] = 60 + Math.random() * 20
          pos[i * 3 + 2] = (Math.random() - 0.5) * RAIN_AREA
        }
      }
      rainGeo.attributes.position.needsUpdate = true
    }

    // Update snow
    if (snowRef.current && weatherType.current === 'snow') {
      const pos = snowGeo.attributes.position.array as Float32Array
      const drift = snowGeo.attributes.drift.array as Float32Array
      const intensity = weatherIntensity.current

      for (let i = 0; i < SNOW_DROP_COUNT; i++) {
        pos[i * 3 + 1] -= (1 + drift[i] * 3) * delta * intensity * 0.5
        pos[i * 3] += Math.sin(time.current * 0.5 + i) * delta * intensity * 0.3
        pos[i * 3 + 2] += Math.cos(time.current * 0.4 + i * 0.5) * delta * intensity * 0.3
        if (pos[i * 3 + 1] < -2) {
          pos[i * 3] = (Math.random() - 0.5) * RAIN_AREA
          pos[i * 3 + 1] = 40 + Math.random() * 10
          pos[i * 3 + 2] = (Math.random() - 0.5) * RAIN_AREA
        }
      }
      snowGeo.attributes.position.needsUpdate = true
    }

    // ── Update material opacity for rain/snow/dust ───
    if (rainMatRef.current) {
      const targetOpacity = weatherType.current === 'rain' ? 0.4 : 0
      rainMatRef.current.opacity += (targetOpacity - rainMatRef.current.opacity) * delta * 2
    }
    if (snowMatRef.current) {
      const targetOpacity = weatherType.current === 'snow' ? 0.6 : 0
      snowMatRef.current.opacity += (targetOpacity - snowMatRef.current.opacity) * delta * 2
    }
  }, 2) // throttled: weather is atmospheric, every ~2nd frame

  return (
    <>
      <group ref={groupRef}>
        {fogPatches.map((patch, i) => (
          <mesh
            key={`fog-${i}`}
            position={[patch.x, 1.5 + (i % 3) * 2, patch.z]}
            rotation={[-Math.PI / 2, 0, i * 0.5]}
          >
            <planeGeometry args={[patch.size, patch.size]} />
            <meshBasicMaterial
              color="#aabbcc" transparent opacity={patch.opacity}
              depthWrite={false} side={THREE.DoubleSide}
            />
          </mesh>
        ))}
        {streaks.map((s, i) => (
          <mesh
            key={`wind-${i}`}
            position={[s.initialX, s.y, s.z]}
            rotation={[0, -0.3, 0.1]}
          >
            <planeGeometry args={[s.length * 2, 0.03]} />
            <meshBasicMaterial
              color="#8899aa" transparent opacity={0.1}
              depthWrite={false} side={THREE.DoubleSide}
            />
          </mesh>
        ))}
      </group>

      {/* Rain particles — shown in wetlands, jungle, dense_forest */}
      <points ref={rainRef} geometry={rainGeo} frustumCulled={false}>
        <pointsMaterial
          color="#8899bb"
          size={0.08}
          transparent
          opacity={0}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          ref={rainMatRef}
        />
      </points>

      {/* Snow particles — shown in taiga, tundra, snowy_plains */}
      <points ref={snowRef} geometry={snowGeo} frustumCulled={false}>
        <pointsMaterial
          color="#ddeeff"
          size={0.12}
          transparent
          opacity={0}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          ref={snowMatRef}
        />
      </points>
    </>
  )
}
