import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'
import { useSoundEngine } from '../hooks/useSoundEngine'

const PARTICLE_COUNT = 12
const DURATION = 0.6

/**
 * Short-lived smoke puff effect that spawns at the position of a decayed block.
 * Orange/brown particles puff outward and fade, matching the vapour block color.
 */
const DecayPuff = ({ position }: { position: [number, number, number] }) => {
  const pointsRef = useRef<THREE.Points>(null)
  const matRef = useRef<THREE.PointsMaterial>(null)
  const elapsed = useRef(0)
  const done = useRef(false)
  const soundPlayed = useRef(false)
  const sounds = useSoundEngine()

  const { geometry } = useMemo(() => {
    const posArray = new Float32Array(PARTICLE_COUNT * 3)
    const colArray = new Float32Array(PARTICLE_COUNT * 3)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(posArray, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colArray, 3))

    const colors = [new THREE.Color('#ff8844'), new THREE.Color('#ffaa44'), new THREE.Color('#cc6633'), new THREE.Color('#ff6644')]

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      posArray[i * 3] = (Math.random() - 0.5) * 0.3
      posArray[i * 3 + 1] = Math.random() * 0.2
      posArray[i * 3 + 2] = (Math.random() - 0.5) * 0.3

      const c = colors[Math.floor(Math.random() * colors.length)]
      colArray[i * 3] = c.r
      colArray[i * 3 + 1] = c.g
      colArray[i * 3 + 2] = c.b
    }

    return { geometry: geo }
  }, [])

  useFrame((_, delta) => {
    elapsed.current += delta
    const t = elapsed.current / DURATION

    // Play sound on first frame
    if (!soundPlayed.current) {
      soundPlayed.current = true
      sounds.blockDecay()
    }

    if (t >= 1) {
      // Fade material to 0, then stop updates
      if (matRef.current) matRef.current.opacity = 0
      return
    }

    if (!pointsRef.current || !matRef.current) return
    const pos = pointsRef.current.geometry.attributes.position.array as Float32Array

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = i * 1.1
      const speed = 1 + (i % 4) * 0.5
      pos[i * 3] = Math.sin(t * 3 + theta) * t * 1.2
      pos[i * 3 + 1] = t * speed * 0.4 + Math.sin(t * 2 + theta) * 0.1
      pos[i * 3 + 2] = Math.cos(t * 3 + theta) * t * 1.2
    }

    // Fade the entire particle system via material.opacity
    matRef.current.opacity = Math.max(0, 1 - t * 1.8)
    pointsRef.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={pointsRef} position={position} frustumCulled={false}>
      <primitive object={geometry} attach="geometry" />
      <pointsMaterial
        ref={matRef}
        size={0.2}
        vertexColors
        transparent
        opacity={1}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}

/**
 * Watches the store for recently decayed blocks and spawns DecayPuff effects.
 */
export const BlockDecayVFXManager = () => {
  const recentDecayedBlocks = useStore((s) => s.recentDecayedBlocks)

  if (recentDecayedBlocks.length === 0) return null

  return (
    <group>
      {recentDecayedBlocks.map((pos, i) => (
        <DecayPuff
          key={`decay-${i}-${pos.x}-${pos.y}-${pos.z}`}
          position={[pos.x, pos.y, pos.z]}
        />
      ))}
    </group>
  )
}
