import { useMemo, useRef } from 'react'
import { useFrameThrottled } from '../hooks/useFrameThrottled'
import * as THREE from 'three'
import { ISLAND_SIZE } from '../config/constants'
import { getTerrainHeight } from '../terrain'

const ISLAND_RADIUS = ISLAND_SIZE * 0.44
const FOAM_PATCH_COUNT = 40

/**
 * Dynamic shoreline foam that reacts to waves.
 * 
 * Places animated foam patches around the island perimeter.
 * Each patch:
 * - Rides the terrain height at its position (so it sits on the shoreline)
 * - Pulsates opacity and scale with wave energy
 * - Has subtle position wobble for organic feel
 * - Fades in/out as waves crash and recede
 */
export const ShorelineFoam = () => {
  const groupRef = useRef<THREE.Group>(null)
  const time = useRef(0)
  const frameTick = useRef(0)

  // Foam patch data — positions around the island
  const patches = useMemo(() => {
    const data: {
      angle: number
      radius: number
      phase: number
      speed: number
      size: number
      seed: number
    }[] = []

    for (let i = 0; i < FOAM_PATCH_COUNT; i++) {
      const angle = (i / FOAM_PATCH_COUNT) * Math.PI * 2
      // Vary radius slightly so patches interlock
      const radiusVar = (Math.sin(i * 7.3) * 0.5 + 0.5) * 0.08 + 0.96
      data.push({
        angle,
        radius: ISLAND_RADIUS * radiusVar,
        phase: Math.random() * Math.PI * 2,
        speed: 0.6 + Math.random() * 0.6,
        size: 2 + Math.random() * 4,
        seed: Math.random() * 100,
      })
    }
    return data
  }, [])

  // Create shared geometry for foam patch (a flat cloud-like shape)
  const foamGeo = useMemo(() => {
    const geo = new THREE.CircleGeometry(1, 8)
    geo.rotateX(-Math.PI / 2)
    return geo
  }, [])

  useFrameThrottled((_, baseDelta) => {
    time.current += baseDelta
    frameTick.current++
    if (!groupRef.current) return

    const group = groupRef.current
    const t = time.current

    for (let i = 0; i < patches.length; i++) {
      const p = patches[i]
      const child = group.children[i] as THREE.Mesh
      if (!child) continue

      // Wave energy at this patch's angle
      const waveAngle = p.angle + Math.sin(t * 0.2) * 0.3
      const waveEnergy = (
        Math.sin(waveAngle * 3 + t * 0.8) * 0.5 +
        Math.sin(waveAngle * 5 - t * 1.2 + p.phase) * 0.3 +
        Math.sin(t * 0.5 + p.seed) * 0.2
      ) * 0.5 + 0.5  // 0-1

      // Foam appears when wave energy is high enough
      const foamStrength = Math.max(0, waveEnergy - 0.3) * 1.5
      const opacity = Math.min(1, foamStrength * 0.5)

      // Position: orbit around island with slight tidal wobble
      const angleOffset = Math.sin(t * 0.3 + p.seed) * 0.03
      const radiusOffset = Math.sin(t * 0.4 + p.phase) * 0.05
      const radius = p.radius + radiusOffset + foamStrength * 0.08

      const x = Math.cos(p.angle + angleOffset) * radius
      const z = Math.sin(p.angle + angleOffset) * radius
      const terrainY = getTerrainHeight(x, z)

      // Only show foam where terrain dips to water level
      const shoreProximity = Math.max(0, 1 - Math.abs(terrainY + 0.3) * 2)

      child.position.x = x
      child.position.y = Math.max(-0.35, terrainY) + 0.02
      child.position.z = z

      // Scale pulsing with wave energy
      const scale = p.size * (0.5 + foamStrength * 1.2)
      child.scale.setScalar(scale)

      // Material properties
      const mat = child.material as THREE.MeshBasicMaterial
      mat.opacity = opacity * shoreProximity * 0.5
    }
  }, 3)

  return (
    <group ref={groupRef}>
      {patches.map((_, i) => (
        <mesh
          key={i}
          geometry={foamGeo}
        >
          <meshBasicMaterial
            color="#eef4ff"
            transparent
            opacity={0}
            depthWrite={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  )
}
