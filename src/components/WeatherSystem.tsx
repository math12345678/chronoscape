import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const FOG_PATCH_COUNT = 6
const WIND_STREAK_COUNT = 20
const WIND_RANGE = 40

interface StreakData {
  x: number
  y: number
  z: number
  speed: number
  length: number
  phase: number
  initialX: number
}

/**
 * Atmospheric weather effects:
 * - Drifting fog patches: Semi-transparent white planes that drift slowly across the island
 * - Wind streaks: Thin lines that streak across the sky, visible in peripheral vision
 *
 * All animations run from a single useFrame for performance.
 */
export const WeatherSystem = () => {
  const groupRef = useRef<THREE.Group>(null)
  const time = useRef(0)

  const fogPatches = useMemo(() => {
    return Array.from({ length: FOG_PATCH_COUNT }, (_, i) => ({
      x: (Math.random() - 0.5) * 40,
      z: (Math.random() - 0.5) * 40,
      size: 5 + Math.random() * 10,
      speed: 0.3 + Math.random() * 0.5,
      phase: i * 1.2,
      opacity: 0.04 + Math.random() * 0.06,
    }))
  }, [])

  const streaks = useMemo(() => {
    return Array.from({ length: WIND_STREAK_COUNT }, (_, i) => ({
      x: (Math.random() - 0.5) * 80,
      y: 3 + Math.random() * 6,
      z: (Math.random() - 0.5) * 80,
      speed: 3 + Math.random() * 5,
      length: 2 + Math.random() * 4,
      phase: i * 0.7,
      initialX: (Math.random() - 0.5) * 80,
    }))
  }, [])

  // Single useFrame manages all animations
  useFrame((_, delta) => {
    time.current += delta
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
      // Move streak across, wrapping at range
      const x = s.initialX + ((t * 2) % (WIND_RANGE * 2) - WIND_RANGE)
      child.position.x = x

      // Fade at edges
      const fadeFactor = 1 - Math.abs(x) / WIND_RANGE
      const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial
      mat.opacity = Math.max(0, fadeFactor * 0.15)
    }
  })

  return (
    <group ref={groupRef}>
      {/* Fog patches */}
      {fogPatches.map((patch, i) => (
        <mesh
          key={`fog-${i}`}
          position={[patch.x, 1.5 + (i % 3) * 2, patch.z]}
          rotation={[-Math.PI / 2, 0, i * 0.5]}
        >
          <planeGeometry args={[patch.size, patch.size]} />
          <meshBasicMaterial
            color="#aabbcc"
            transparent
            opacity={patch.opacity}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* Wind streaks */}
      {streaks.map((s, i) => (
        <mesh
          key={`wind-${i}`}
          position={[s.initialX, s.y, s.z]}
          rotation={[0, -0.3, 0.1]}
        >
          <planeGeometry args={[s.length * 2, 0.03]} />
          <meshBasicMaterial
            color="#8899aa"
            transparent
            opacity={0.1}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}
