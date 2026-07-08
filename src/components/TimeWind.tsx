import { useRef, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useFrameThrottled } from '../hooks/useFrameThrottled'
import { getTimeScale } from './TimeManager'

const PARTICLE_COUNT = 400
const SPREAD = 120
const WIND_HEIGHT = 8

/**
 * Time Wind — flowing energy particles that drift across the world.
 * Creates the illusion of time as a visible, flowing substance.
 * Particles stream in slow, curling paths with a subtle aurora-like shimmer.
 */
export const TimeWind = () => {
  const pointsRef = useRef<THREE.Points>(null)
  const time = useRef(0)
  const { camera } = useThree()

  // Pre-compute per-particle data: initial positions, speeds, drift phases, sizes
  const particleData = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const speeds = new Float32Array(PARTICLE_COUNT)
    const phases = new Float32Array(PARTICLE_COUNT)
    const sizes = new Float32Array(PARTICLE_COUNT)
    const colors = new Float32Array(PARTICLE_COUNT * 3)
    const offsets = new Float32Array(PARTICLE_COUNT)

    const palette = [
      new THREE.Color('#44ffcc'), // teal
      new THREE.Color('#22ddaa'), // green-teal
      new THREE.Color('#66ffdd'), // light teal
      new THREE.Color('#88ffee'), // pale teal
      new THREE.Color('#44ccff'), // blue
    ]

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * SPREAD
      positions[i * 3 + 1] = Math.random() * WIND_HEIGHT
      positions[i * 3 + 2] = (Math.random() - 0.5) * SPREAD

      speeds[i] = 0.3 + Math.random() * 0.6
      phases[i] = Math.random() * Math.PI * 2
      sizes[i] = 0.04 + Math.random() * 0.1
      offsets[i] = Math.random() * 100

      const c = palette[Math.floor(Math.random() * palette.length)]
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }

    return { positions, speeds, phases, sizes, colors, offsets }
  }, [])

  // Pre-allocate geometry
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(particleData.positions, 3))
    g.setAttribute('size', new THREE.BufferAttribute(particleData.sizes, 1))
    g.setAttribute('color', new THREE.BufferAttribute(particleData.colors, 3))
    return g
  }, [particleData])

  useFrameThrottled((_, delta) => {
    time.current += delta * getTimeScale()
    if (!pointsRef.current) return

    const pos = pointsRef.current.geometry.attributes.position.array as Float32Array
    const sizes = pointsRef.current.geometry.attributes.size.array as Float32Array
    const t = time.current
    const camX = camera.position.x
    const camZ = camera.position.z

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const speed = particleData.speeds[i]
      const phase = particleData.phases[i]
      const offset = particleData.offsets[i]

      // Primary flow direction (east, with gentle meandering)
      const flowX = Math.sin(t * 0.3 + offset) * 0.15 + 0.2
      const flowZ = Math.cos(t * 0.2 + phase) * 0.2

      pos[i * 3] += delta * speed * flowX
      pos[i * 3 + 1] += Math.sin(t * 0.5 + phase) * delta * 0.08
      pos[i * 3 + 2] += delta * speed * flowZ

      // Curling motion
      pos[i * 3] += Math.sin(t * 0.7 + phase * 1.3) * delta * 0.05
      pos[i * 3 + 2] += Math.cos(t * 0.6 + phase * 0.7) * delta * 0.05

      // Ascending drift
      pos[i * 3 + 1] += delta * 0.05

      // Wrap around when out of bounds — relative to camera for infinite feel
      if (pos[i * 3] > camX + SPREAD / 2) pos[i * 3] = camX - SPREAD / 2
      if (pos[i * 3] < camX - SPREAD / 2) pos[i * 3] = camX + SPREAD / 2
      if (pos[i * 3 + 2] > camZ + SPREAD / 2) pos[i * 3 + 2] = camZ - SPREAD / 2
      if (pos[i * 3 + 2] < camZ - SPREAD / 2) pos[i * 3 + 2] = camZ + SPREAD / 2
      if (pos[i * 3 + 1] > WIND_HEIGHT) pos[i * 3 + 1] = 0
      if (pos[i * 3 + 1] < 0) pos[i * 3 + 1] = WIND_HEIGHT

      // Pulsing size to simulate shimmer
      const shimmer = Math.sin(t * 1.2 + phase * 2 + offset) * 0.3 + 0.7
      sizes[i] = particleData.sizes[i] * (0.5 + shimmer * 0.5)
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true
    pointsRef.current.geometry.attributes.size.needsUpdate = true
  }, 2) // throttled: time wind particles, every ~2nd frame

  return (
    <points ref={pointsRef} geometry={geo} frustumCulled={false}>
      <pointsMaterial
        size={0.08}
        vertexColors
        transparent
        opacity={0.25}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}
