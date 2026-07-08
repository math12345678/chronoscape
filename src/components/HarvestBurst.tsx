import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { triggerShake } from '../hooks/useScreenShake'

const PARTICLE_COUNT = 30
const BURST_DURATION = 0.8

interface Particle {
  velocity: THREE.Vector3
  life: number
  maxLife: number
  offset: THREE.Vector3
}

interface HarvestBurstProps {
  position: [number, number, number]
  onComplete: () => void
}

/**
 * Short-lived particle burst that spawns when a Time Rift is harvested.
 * Particles fly outward from the rift position and fade over ~0.8 seconds.
 * Each instance gets its own geometry to prevent cross-instance buffer corruption.
 */
export const HarvestBurst = ({ position, onComplete }: HarvestBurstProps) => {
  const meshRef = useRef<THREE.Points>(null)

  // Subtle screen shake on harvest — makes it feel tactile
  useEffect(() => {
    triggerShake(0.12, 7)
  }, [])

  const { particles, geometry } = useMemo(() => {
    const posArray = new Float32Array(PARTICLE_COUNT * 3)
    const opArray = new Float32Array(PARTICLE_COUNT).fill(1)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(posArray, 3))
    geo.setAttribute('opacity', new THREE.BufferAttribute(opArray, 1))

    const parts: Particle[] = []
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      const speed = 2 + Math.random() * 4
      parts.push({
        velocity: new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta) * speed,
          Math.sin(phi) * Math.sin(theta) * speed + 2,
          Math.cos(phi) * speed,
        ),
        life: 0,
        maxLife: BURST_DURATION * (0.5 + Math.random() * 0.5),
        offset: new THREE.Vector3(
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.2,
        ),
      })
    }
    return { particles: parts, geometry: geo }
  }, [])

  useFrame((_, delta) => {
    const mesh = meshRef.current
    if (!mesh) return
    const pos = mesh.geometry.attributes.position.array as Float32Array
    const op = mesh.geometry.attributes.opacity.array as Float32Array

    let allDead = true
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = particles[i]
      p.life += delta

      if (p.life < p.maxLife) {
        allDead = false
        const t = p.life / p.maxLife
        pos[i * 3] = p.offset.x + p.velocity.x * t
        pos[i * 3 + 1] = p.offset.y + p.velocity.y * t - 2 * t * t
        pos[i * 3 + 2] = p.offset.z + p.velocity.z * t
        op[i] = Math.max(0, 1 - t)
      } else {
        pos[i * 3] = 0
        pos[i * 3 + 1] = -10
        pos[i * 3 + 2] = 0
        op[i] = 0
      }
    }

    mesh.geometry.attributes.position.needsUpdate = true
    mesh.geometry.attributes.opacity.needsUpdate = true

    if (allDead) onComplete()
  })

  return (
    <points ref={meshRef} position={position} frustumCulled={false}>
      <primitive object={geometry} attach="geometry" />        <pointsMaterial
          size={0.3}
          color="#22ddaa"
          transparent
          opacity={1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
    </points>
  )
}
