import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrameThrottled } from '../hooks/useFrameThrottled'
import { getTimeScale } from './TimeManager'

const BASE_COUNT = 80
const SPREAD = 50

// Adjust particle count dynamically
let PARTICLE_COUNT = BASE_COUNT

/**
 * Floating ambient particles that drift gently around the island.
 * Mimics dust motes catching the light or tiny fireflies.
 * Particles move in random, gentle patterns and fade in/out.
 */
export const AmbientParticles = () => {
  const pointsRef = useRef<THREE.Points>(null)
  const time = useRef(0)

  const { geometry, phases } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const opacities = new Float32Array(PARTICLE_COUNT)
    const sizes = new Float32Array(PARTICLE_COUNT)
    const ph: { x: number; y: number; z: number; speed: number; phase: number }[] = []

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * SPREAD
      positions[i * 3 + 1] = Math.random() * 8 + 0.5
      positions[i * 3 + 2] = (Math.random() - 0.5) * SPREAD
      opacities[i] = 0.2 + Math.random() * 0.4
      sizes[i] = 0.05 + Math.random() * 0.12

      ph.push({
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2,
        z: (Math.random() - 0.5) * 2,
        speed: 0.1 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2,
      })
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1))
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    return { geometry: geo, phases: ph }
  }, [])

  useFrameThrottled((_, baseDelta) => {
    const delta = baseDelta * getTimeScale()
    time.current += delta

    if (!pointsRef.current) return

    const pos = geometry.attributes.position.array as Float32Array
    const op = geometry.attributes.opacity.array as Float32Array

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = phases[i]
      const t = time.current * p.speed + p.phase

      // Gentle wandering
      pos[i * 3] += Math.sin(t * 0.5) * delta * 0.3
      pos[i * 3 + 1] += Math.sin(t * 0.7 + p.phase) * delta * 0.2
      pos[i * 3 + 2] += Math.cos(t * 0.6) * delta * 0.3

      // Keep within bounds with soft wrap-around
      for (let j = 0; j < 3; j++) {
        if (pos[i * 3 + j] > SPREAD / 2) pos[i * 3 + j] = -SPREAD / 2
        if (pos[i * 3 + j] < -SPREAD / 2) pos[i * 3 + j] = SPREAD / 2
      }

      // Soft fade in/out
      const fade = Math.sin(t * 0.8) * 0.5 + 0.5
      op[i] = (0.15 + fade * 0.4) * (0.5 + ((i % 3) + 1) * 0.2)
    }

    geometry.attributes.position.needsUpdate = true
    geometry.attributes.opacity.needsUpdate = true
  }, 2) // throttled: ambient particles, every ~2nd frame

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <primitive object={geometry} attach="geometry" />
      <pointsMaterial
        size={0.15}
        color="#aaddff"
        transparent
        opacity={0.5}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}
