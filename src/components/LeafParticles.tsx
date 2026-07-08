import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrameThrottled } from '../hooks/useFrameThrottled'
import { ISLAND_SIZE } from '../config/constants'

const LEAF_COUNT = 25
const HALF = ISLAND_SIZE * 0.4

export const LeafParticles = () => {
  const pointsRef = useRef<THREE.Points>(null)
  const time = useRef(0)

  const { geometry, velocities } = useMemo(() => {
    const pos = new Float32Array(LEAF_COUNT * 3)
    const sizes = new Float32Array(LEAF_COUNT)
    const phases = new Float32Array(LEAF_COUNT)
    const speeds: number[] = []
    const rotations = new Float32Array(LEAF_COUNT)

    for (let i = 0; i < LEAF_COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * HALF * 2
      pos[i * 3 + 1] = 1 + Math.random() * 4
      pos[i * 3 + 2] = (Math.random() - 0.5) * HALF * 2
      sizes[i] = 0.04 + Math.random() * 0.06
      phases[i] = Math.random() * Math.PI * 2
      speeds.push(0.5 + Math.random() * 0.8)
      rotations[i] = Math.random() * Math.PI * 2
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    geo.setAttribute('phase', new THREE.BufferAttribute(phases, 1))
    geo.setAttribute('rotation', new THREE.BufferAttribute(rotations, 1))

    return { geometry: geo, velocities: speeds }
  }, [])

  useFrameThrottled((_, delta) => {
    time.current += delta
    if (!pointsRef.current) return

    const pos = geometry.attributes.position.array as Float32Array
    const size = geometry.attributes.size.array as Float32Array
    const phase = geometry.attributes.phase.array as Float32Array

    for (let i = 0; i < LEAF_COUNT; i++) {
      const t = time.current * velocities[i] + phase[i]

      // Fall with wind drift and horizontal wobble
      pos[i * 3] += Math.sin(t * 0.7) * delta * 0.4
      pos[i * 3 + 1] -= (0.5 + Math.sin(t * 1.3) * 0.3) * delta
      pos[i * 3 + 2] += Math.cos(t * 0.5) * delta * 0.3

      // Gentle spin (simulated by size pulsing)
      const spin = Math.sin(t * 3) * 0.5 + 0.5
      size[i] = (0.04 + Math.sin(phase[i]) * 0.03) * (0.6 + spin * 0.4)

      // Reset when below ground
      if (pos[i * 3 + 1] < -0.5) {
        pos[i * 3] = (Math.random() - 0.5) * HALF * 2
        pos[i * 3 + 1] = 3 + Math.random() * 3
        pos[i * 3 + 2] = (Math.random() - 0.5) * HALF * 2
      }

      // Soft wrap horizontally
      if (pos[i * 3] > HALF) pos[i * 3] = -HALF
      if (pos[i * 3] < -HALF) pos[i * 3] = HALF
      if (pos[i * 3 + 2] > HALF) pos[i * 3 + 2] = -HALF
      if (pos[i * 3 + 2] < -HALF) pos[i * 3 + 2] = HALF
    }

    geometry.attributes.position.needsUpdate = true
    geometry.attributes.size.needsUpdate = true
  }, 3) // throttled: every ~3rd frame

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        color="#4a8a4a"
        size={0.06}
        transparent
        opacity={0.4}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}
