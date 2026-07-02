import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ISLAND_SIZE } from '../config/constants'
import { getTerrainHeight } from '../terrain'

const STONE_COUNT = 16
const RADIUS = ISLAND_SIZE * 0.42

/**
 * Glowing runestones arranged in a circle around the island edge.
 * Each stone has a subtle floating animation and pulsing glow.
 * They define the playable area boundary with a visual "edge of the world" feel.
 */
export const BoundaryRunestones = () => {
  const time = useRef(0)

  // Generate stone positions in a circle
  const stones = useMemo(() => {
    const result: { angle: number; x: number; z: number; y: number; phase: number }[] = []
    for (let i = 0; i < STONE_COUNT; i++) {
      const angle = (i / STONE_COUNT) * Math.PI * 2
      const x = Math.cos(angle) * RADIUS
      const z = Math.sin(angle) * RADIUS
      const y = getTerrainHeight(x, z)
      result.push({ angle, x, z, y, phase: Math.random() * Math.PI * 2 })
    }
    return result
  }, [])

  useFrame((_, delta) => {
    time.current += delta
  })

  return (
    <group>
      {stones.map((stone, i) => (
        <StoneMarker
          key={i}
          position={[stone.x, stone.y, stone.z]}
          phase={stone.phase}
          index={i}
        />
      ))}
    </group>
  )
}

const StoneMarker = ({
  position,
  phase,
  index,
}: {
  position: [number, number, number]
  phase: number
  index: number
}) => {
  const groupRef = useRef<THREE.Group>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const time = useRef(phase)

  const color = index % 3 === 0 ? '#4488ff' : index % 3 === 1 ? '#aa88ff' : '#22ddaa'

  useFrame((_, delta) => {
    time.current += delta
    if (!groupRef.current) return

    // Gentle float
    groupRef.current.position.y = position[1] + Math.sin(time.current * 0.5 + phase) * 0.08

    // Slow rotation
    groupRef.current.rotation.y += delta * 0.1

    if (glowRef.current) {
      const pulse = 0.3 + Math.sin(time.current * 0.8 + phase) * 0.2
      ;(glowRef.current.material as THREE.MeshBasicMaterial).opacity = pulse
    }
  })

  return (
    <group ref={groupRef} position={[position[0], position[1], position[2]]}>
      {/* Stone body */}
      <mesh castShadow>
        <octahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial
          color="#4a4a5a"
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>

      {/* Glow crystal on top */}
      <mesh ref={glowRef} position={[0, 0.35, 0]}>
        <octahedronGeometry args={[0.12, 0]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.4}
        />
      </mesh>

      {/* Glow aura */}
      <mesh position={[0, 0.1, 0]}>
        <sphereGeometry args={[0.5, 8, 8]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.05}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  )
}
