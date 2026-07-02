import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ISLAND_SIZE } from '../config/constants'

const WATER_SIZE = ISLAND_SIZE * 2.0
const SEGMENTS = 72

/**
 * Semi-transparent animated water plane surrounding the island.
 * Gentle vertex oscillation creates a dynamic wave effect.
 * Positioned below the terrain's lowest point.
 * Visual improvements: layered waves, color variation by depth, subtle foam edges.
 */
export const Water = () => {
  const meshRef = useRef<THREE.Mesh>(null)
  const time = useRef(0)

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(WATER_SIZE, WATER_SIZE, SEGMENTS, SEGMENTS)
    geo.rotateX(-Math.PI / 2)
    return geo
  }, [])

  // Precompute color attributes for a gradient effect
  useMemo(() => {
    const colors = new Float32Array((SEGMENTS + 1) * (SEGMENTS + 1) * 3)
    const half = SEGMENTS / 2
    const step = WATER_SIZE / SEGMENTS

    for (let i = 0; i <= SEGMENTS; i++) {
      for (let j = 0; j <= SEGMENTS; j++) {
        const idx = (i * (SEGMENTS + 1) + j) * 3
        // Distance from center
        const x = (j - half) * step
        const z = (i - half) * step
        const dist = Math.sqrt(x * x + z * z) / (WATER_SIZE * 0.5)

        // Deeper = darker blue, shallower = more teal
        const deepness = Math.min(1, dist)
        const r = 0.08 + deepness * 0.06
        const g = 0.45 + deepness * 0.1
        const b = 0.55 + deepness * 0.2
        colors[idx] = r
        colors[idx + 1] = g
        colors[idx + 2] = b
      }
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  }, [geometry])

  useFrame((_, delta) => {
    if (!meshRef.current) return
    time.current += delta * 0.5

    const pos = meshRef.current.geometry.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const baseY = -0.4

      // Multi-layer wave system for more organic water
      const wave =
        Math.sin(x * 0.08 + time.current * 1.0) * 0.1 +
        Math.sin(z * 0.1 + time.current * 1.4) * 0.08 +
        Math.sin((x + z) * 0.06 + time.current * 0.6) * 0.06 +
        Math.sin(x * 0.15 - z * 0.05 + time.current * 1.8) * 0.04 +
        Math.cos(x * 0.04 + z * 0.12 + time.current * 0.9) * 0.05

      pos.setY(i, baseY + wave)
    }
    pos.needsUpdate = true
    meshRef.current.geometry.computeVertexNormals()
  })

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      position={[0, -0.5, 0]}
      receiveShadow
      frustumCulled={false}
    >
      <meshStandardMaterial
        vertexColors
        transparent
        opacity={0.55}
        roughness={0.15}
        metalness={0.5}
        side={THREE.DoubleSide}
        envMapIntensity={0.6}
      />
    </mesh>
  )
}
