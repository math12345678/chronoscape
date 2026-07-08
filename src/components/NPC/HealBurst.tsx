import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const PARTICLE_COUNT = 20
const DURATION = 0.7

interface HealBurstProps {
  position: [number, number, number]
  onComplete: () => void
}

/**
 * Short-lived green sparkle burst that plays when an NPC is healed.
 * Particles float upward with a golden-green color and fade out.
 */
export const HealBurst = ({ position, onComplete }: HealBurstProps) => {
  const pointsRef = useRef<THREE.Points>(null)
  const elapsed = useRef(0)
  const done = useRef(false)

  const { geometry } = useMemo(() => {
    const posArray = new Float32Array(PARTICLE_COUNT * 3)
    const opArray = new Float32Array(PARTICLE_COUNT).fill(1)
    const colArray = new Float32Array(PARTICLE_COUNT * 3)

    const colorPalette = [
      new THREE.Color('#44ff88'),
      new THREE.Color('#66ffaa'),
      new THREE.Color('#88ffcc'),
      new THREE.Color('#aaffdd'),
      new THREE.Color('#22dd66'),
    ]

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      posArray[i * 3] = (Math.random() - 0.5) * 0.3
      posArray[i * 3 + 1] = Math.random() * 0.3
      posArray[i * 3 + 2] = (Math.random() - 0.5) * 0.3

      const c = colorPalette[Math.floor(Math.random() * colorPalette.length)]
      colArray[i * 3] = c.r
      colArray[i * 3 + 1] = c.g
      colArray[i * 3 + 2] = c.b

      opArray[i] = 1
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(posArray, 3))
    geo.setAttribute('opacity', new THREE.BufferAttribute(opArray, 1))
    geo.setAttribute('color', new THREE.BufferAttribute(colArray, 3))

    return { geometry: geo }
  }, [])

  useFrame((_, delta) => {
    elapsed.current += delta
    const t = elapsed.current / DURATION

    if (t >= 1 && !done.current) {
      done.current = true
      onComplete()
      return
    }

    if (pointsRef.current) {
      const pos = pointsRef.current.geometry.attributes.position.array as Float32Array
      const op = pointsRef.current.geometry.attributes.opacity.array as Float32Array

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const theta = i * 1.3
        const phi = i * 0.7
        const speed = 1.5 + (i % 5) * 0.5

        // Float upward with gentle spiral
        pos[i * 3] = Math.sin(t * 4 + theta) * t * 1.5 * 0.3
        pos[i * 3 + 1] = t * speed * 0.5 + Math.sin(t * 3 + phi) * 0.1
        pos[i * 3 + 2] = Math.cos(t * 4 + theta) * t * 1.5 * 0.3
        op[i] = Math.max(0, 1 - t * 1.2)
      }

      pointsRef.current.geometry.attributes.position.needsUpdate = true
      pointsRef.current.geometry.attributes.opacity.needsUpdate = true
    }
  })

  return (
    <points ref={pointsRef} position={position} frustumCulled={false}>
      <primitive object={geometry} attach="geometry" />
      <pointsMaterial
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
