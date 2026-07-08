import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'
import type { TimeState } from '../store'
import { useSoundEngine } from '../hooks/useSoundEngine'

const PARTICLE_COUNT = 60
const DURATION = 1.2

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
 * Satisfying particle burst + ring expansion when resources are refined.
 * Particles fly upward in a cone, a ring expands outward, and a point light flashes.
 */
const RefineVFX = ({ position, type }: RefineVFXProps) => {
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Points>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const lightRef = useRef<THREE.PointLight>(null)
  const elapsed = useRef(0)
  const done = useRef(false)
  const sounds = useSoundEngine()
  const color = RESOURCE_COLORS[type] ?? '#ffffff'

  useEffect(() => {
    sounds.refine(type as 'vapour' | 'liquid' | 'crystal')

    // Screen flash on refine
    const flash = document.createElement('div')
    flash.style.cssText = `position:fixed;inset:0;background:radial-gradient(ellipse at 50% 60%, ${color}22 0%, ${color}11 30%, transparent 70%);pointer-events:none;z-index:9999;transition:opacity 0.4s ease-out`
    document.body.appendChild(flash)
    requestAnimationFrame(() => { flash.style.opacity = '0' })
    setTimeout(() => { if (flash.parentNode) flash.parentNode.removeChild(flash) }, 600)
  }, [sounds, type, color])

  const { particles, geometry } = useMemo(() => {
    const posArray = new Float32Array(PARTICLE_COUNT * 3)
    const opArray = new Float32Array(PARTICLE_COUNT).fill(1)
    const colArray = new Float32Array(PARTICLE_COUNT * 3)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(posArray, 3))
    geo.setAttribute('opacity', new THREE.BufferAttribute(opArray, 1))
    geo.setAttribute('color', new THREE.BufferAttribute(colArray, 3))

    const baseColor = new THREE.Color(color)
    const whiteColor = new THREE.Color('#ffffff')
    const parts: { velocity: THREE.Vector3; maxLife: number }[] = []

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2
      const speed = 3 + Math.random() * 6
      parts.push({
        velocity: new THREE.Vector3(
          Math.sin(theta) * speed * 0.6,
          3 + Math.random() * 7,
          Math.cos(theta) * speed * 0.6,
        ),
        maxLife: 0.5 + Math.random() * 0.4,
      })

      const variant = baseColor.clone().lerp(whiteColor, Math.random() * 0.3)
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

    // Ring expansion
    if (ringRef.current) {
      const ringScale = 1 + t * 4
      ringRef.current.scale.set(ringScale, ringScale, ringScale)
      const mat = ringRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = Math.max(0, 0.3 * (1 - t))
    }

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
      lightRef.current.intensity = Math.max(0, 3 - t * 4)
    }
  })

  return (
    <group ref={groupRef} position={position}>
      {/* Expanding ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 1.2, 24]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.3}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Particles */}
      <points ref={meshRef} frustumCulled={false}>
        <primitive object={geometry} attach="geometry" />
        <pointsMaterial
          size={0.25}
          vertexColors
          transparent
          opacity={1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>

      {/* Light flash */}
      <pointLight
        ref={lightRef}
        color={color}
        intensity={3}
        distance={12}
        decay={2}
      />
    </group>
  )
}

/**
 * Watches the store for refine events and spawns RefineVFX when they happen.
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
