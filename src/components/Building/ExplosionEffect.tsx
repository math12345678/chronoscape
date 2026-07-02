import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useShakeStore } from '../../hooks/useScreenShake'
import { useSoundEngine } from '../../hooks/useSoundEngine'

interface ExplosionEffectProps {
  position: [number, number, number]
  onComplete: () => void
}

const PARTICLE_COUNT = 60
const DURATION = 0.8

/**
 * Visual explosion effect that spawns when a detonation occurs.
 * Consists of:
 * - Expanding ring (shockwave)
 * - Burst of colored particles
 * - Flash (via opacity)
 */
export const ExplosionEffect = ({ position, onComplete }: ExplosionEffectProps) => {
  const groupRef = useRef<THREE.Group>(null)
  const pointsRef = useRef<THREE.Points>(null)
  const elapsed = useRef(0)
  const done = useRef(false)
  const sounds = useSoundEngine()

  // Trigger screen shake and sound on explosion
  useEffect(() => {
    useShakeStore.getState().triggerShake(0.5, 3)
    sounds.explosion()
  }, [sounds])

  // Per-instance geometry and particles
  const { particles, geometry, colors } = useMemo(() => {
    const posArray = new Float32Array(PARTICLE_COUNT * 3)
    const opArray = new Float32Array(PARTICLE_COUNT).fill(1)
    const colArray = new Float32Array(PARTICLE_COUNT * 3)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(posArray, 3))
    geo.setAttribute('opacity', new THREE.BufferAttribute(opArray, 1))
    geo.setAttribute('color', new THREE.BufferAttribute(colArray, 3))

    const parts: { velocity: THREE.Vector3; maxLife: number }[] = []
    const colorPalette = [
      new THREE.Color('#444444'),
      new THREE.Color('#666666'),
      new THREE.Color('#888888'),
      new THREE.Color('#aaaaaa'),
      new THREE.Color('#333333'),
    ]

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      const speed = 4 + Math.random() * 10
      parts.push({
        velocity: new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta) * speed,
          Math.abs(Math.sin(phi) * Math.sin(theta)) * speed * 0.6 + 2,
          Math.cos(phi) * speed,
        ),
        maxLife: DURATION * (0.3 + Math.random() * 0.7),
      })

      const c = colorPalette[Math.floor(Math.random() * colorPalette.length)]
      colArray[i * 3] = c.r
      colArray[i * 3 + 1] = c.g
      colArray[i * 3 + 2] = c.b
    }
    return { particles: parts, geometry: geo, colors: colArray }
  }, [])

  useFrame((_, delta) => {
    elapsed.current += delta
    const t = elapsed.current / DURATION

    if (t >= 1 && !done.current) {
      done.current = true
      onComplete()
      return
    }

    // Expand all ring children
    if (groupRef.current) {
      const scale = 1 + t * 4
      groupRef.current.scale.set(scale, scale, scale)
      groupRef.current.children.forEach((child) => {
        if (child.type === 'Mesh') {
          const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial
          mat.opacity = Math.max(0, (child.userData.baseOpacity as number ?? 0.8) - t * 1.5)
        }
      })
    }

    // Particles
    if (pointsRef.current) {
      const pos = pointsRef.current.geometry.attributes.position.array as Float32Array
      const op = pointsRef.current.geometry.attributes.opacity.array as Float32Array

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = particles[i]
        const lt = Math.min(t / (p.maxLife / DURATION), 1)
        pos[i * 3] = p.velocity.x * lt
        pos[i * 3 + 1] = p.velocity.y * lt - 3 * lt * lt
        pos[i * 3 + 2] = p.velocity.z * lt
        op[i] = Math.max(0, 1 - lt)
      }

      pointsRef.current.geometry.attributes.position.needsUpdate = true
      pointsRef.current.geometry.attributes.opacity.needsUpdate = true
    }
  })

  return (
    <group ref={groupRef} position={position}>
      {/* Expanding shockwave ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} userData={{ baseOpacity: 0.8 }}>
        <ringGeometry args={[0.5, 1.5, 32]} />
        <meshBasicMaterial
          color="#ff6644"
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Vertical ring */}
      <mesh rotation={[0, 0, 0]} userData={{ baseOpacity: 0.6 }}>
        <ringGeometry args={[0.3, 1.0, 24]} />
        <meshBasicMaterial
          color="#ff8844"
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Particle burst */}
      <points ref={pointsRef} frustumCulled={false}>
        <primitive object={geometry} attach="geometry" />
        <pointsMaterial
          size={0.35}
          vertexColors
          transparent
          opacity={1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
    </group>
  )
}
