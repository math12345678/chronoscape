import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'
import type { TimeState } from '../store'
import { useSoundEngine } from '../hooks/useSoundEngine'

const PARTICLE_COUNT = 25
const DURATION = 0.6

const RESOURCE_COLORS: Record<string, string> = {
  vapour: '#ffaa00',
  liquid: '#4488ff',
  crystal: '#aa88ff',
}

interface RefineVFXProps {
  position: [number, number, number]
  type: TimeState
}

/**
 * Short-lived particle burst that plays when resources are refined.
 * Particles match the resource color and fly upward in a cone shape.
 * Centered at the refining apparatus position.
 */
const RefineVFX = ({ position, type }: RefineVFXProps) => {
  const meshRef = useRef<THREE.Points>(null)
  const lightRef = useRef<THREE.PointLight>(null)
  const elapsed = useRef(0)
  const done = useRef(false)
  const sounds = useSoundEngine()

  useEffect(() => {
    sounds.refine()
  }, [sounds])

  const color = RESOURCE_COLORS[type] ?? '#ffffff'

  const { particles, geometry } = useMemo(() => {
    const posArray = new Float32Array(PARTICLE_COUNT * 3)
    const opArray = new Float32Array(PARTICLE_COUNT).fill(1)
    const colArray = new Float32Array(PARTICLE_COUNT * 3)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(posArray, 3))
    geo.setAttribute('opacity', new THREE.BufferAttribute(opArray, 1))
    geo.setAttribute('color', new THREE.BufferAttribute(colArray, 3))

    const baseColor = new THREE.Color(color)
    const parts: { velocity: THREE.Vector3; maxLife: number }[] = []

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2
      const speed = 1.5 + Math.random() * 3
      parts.push({
        velocity: new THREE.Vector3(
          Math.sin(theta) * speed * 0.4,
          2 + Math.random() * 4,
          Math.cos(theta) * speed * 0.4,
        ),
        maxLife: DURATION * (0.3 + Math.random() * 0.7),
      })

      const variant = baseColor.clone()
      const hsl = { h: 0, s: 0, l: 0 }
      variant.getHSL(hsl)
      variant.setHSL(hsl.h, hsl.s, hsl.l + (Math.random() - 0.5) * 0.2)
      colArray[i * 3] = variant.r
      colArray[i * 3 + 1] = variant.g
      colArray[i * 3 + 2] = variant.b
    }

    return { particles: parts, geometry: geo }
  }, [color])

  useFrame((_, delta) => {
    elapsed.current += delta
    const t = elapsed.current / DURATION

    if (t >= 1 && !done.current) {
      done.current = true
      return
    }

    if (!meshRef.current) return
    const pos = meshRef.current.geometry.attributes.position.array as Float32Array
    const op = meshRef.current.geometry.attributes.opacity.array as Float32Array

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = particles[i]
      const lt = Math.min(t / (p.maxLife / DURATION), 1)
      pos[i * 3] = p.velocity.x * lt
      pos[i * 3 + 1] = p.velocity.y * lt - 1.5 * lt * lt
      pos[i * 3 + 2] = p.velocity.z * lt
      op[i] = Math.max(0, 1 - lt * 1.5)
    }

    meshRef.current.geometry.attributes.position.needsUpdate = true
    meshRef.current.geometry.attributes.opacity.needsUpdate = true
    
    if (lightRef.current) {
      lightRef.current.intensity = Math.max(0, 2.5 - t * 3)
    }
  })

  return (
    <points ref={meshRef} position={position} frustumCulled={false}>
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
      
      {/* Light flash */}
      <pointLight 
        ref={lightRef}
        color={color} 
        intensity={2.5} 
        distance={10} 
        decay={2} 
      />
    </points>
  )
}

/**
 * Watches the store for refine events and spawns RefineVFX when they happen.
 * Only keeps the most recent effect active.
 */
export const RefineVFXManager = () => {
  const lastRefineType = useStore((s) => s.lastRefineType)
  const lastRefineTime = useStore((s) => s.lastRefineTime)
  const key = `${lastRefineType}-${lastRefineTime}`

  if (!lastRefineType || !lastRefineTime) return null

  return (
    <RefineVFX
      key={key}
      position={[0, 1.5, 0]}
      type={lastRefineType}
    />
  )
}
