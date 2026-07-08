import { useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useFrameThrottled } from '../hooks/useFrameThrottled'
import { ISLAND_SIZE } from '../config/constants'

const COUNT = 150
const SPREAD = ISLAND_SIZE * 0.7

export const DustMotes = () => {
  const { scene } = useThree()
  const pointsRef = useRef<THREE.Points>(null)
  const time = useRef(0)
  const keyLightRef = useRef<THREE.DirectionalLight | null>(null)
  const sunDirRef = useRef(new THREE.Vector3(0, 1, 0))

  const { geometry, velocities } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3)
    const sizes = new Float32Array(COUNT)
    const phases = new Float32Array(COUNT)
    const speeds: number[] = []

    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * SPREAD
      pos[i * 3 + 1] = 0.5 + Math.random() * 6
      pos[i * 3 + 2] = (Math.random() - 0.5) * SPREAD
      sizes[i] = 0.02 + Math.random() * 0.04
      phases[i] = Math.random() * Math.PI * 2
      speeds.push(0.1 + Math.random() * 0.3)
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    geo.setAttribute('phase', new THREE.BufferAttribute(phases, 1))

    return { geometry: geo, velocities: speeds }
  }, [])

  useFrameThrottled((_, delta) => {
    time.current += delta
    if (!pointsRef.current) return

    const pos = geometry.attributes.position.array as Float32Array
    const size = geometry.attributes.size.array as Float32Array
    const phase = geometry.attributes.phase.array as Float32Array

    // Read sun direction for dust lighting (cached reference, no allocation)
    if (!keyLightRef.current) {
      keyLightRef.current = scene.getObjectByName('keyLight') as THREE.DirectionalLight | null
    }
    const keyLight = keyLightRef.current
    const sunDir = sunDirRef.current
    if (keyLight) {
      sunDir.copy(keyLight.position).normalize()
    } else {
      sunDir.set(0, 1, 0)
    }
    const sunElevation = sunDir.y
    const visibility = THREE.MathUtils.smoothstep(sunElevation + 0.1, 0, 0.5)

    for (let i = 0; i < COUNT; i++) {
      const t = time.current * velocities[i] + phase[i]
      pos[i * 3] += Math.sin(t * 0.3) * delta * 0.2
      pos[i * 3 + 1] += Math.sin(t * 0.5 + 1) * delta * 0.15
      pos[i * 3 + 2] += Math.cos(t * 0.4) * delta * 0.2

      // Soft wrap
      const half = SPREAD / 2
      if (pos[i * 3] > half) pos[i * 3] = -half
      if (pos[i * 3] < -half) pos[i * 3] = half
      if (pos[i * 3 + 2] > half) pos[i * 3 + 2] = -half
      if (pos[i * 3 + 2] < -half) pos[i * 3 + 2] = half
      if (pos[i * 3 + 1] > 7) pos[i * 3 + 1] = 0.5
      if (pos[i * 3 + 1] < 0.5) pos[i * 3 + 1] = 7

      const twinkle = Math.sin(t * 2 + phase[i]) * 0.5 + 0.5
      size[i] = (0.02 + Math.sin(phase[i]) * 0.02) * (0.3 + twinkle * 0.7) * (0.2 + visibility * 0.8)
    }

    geometry.attributes.position.needsUpdate = true
    geometry.attributes.size.needsUpdate = true
  }, 2) // throttled: every ~2nd frame

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        color="#ffffcc"
        size={0.04}
        transparent
        opacity={0.5}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}
