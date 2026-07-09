import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { triggerShake } from '../../hooks/useScreenShake'
import { spawnShockwave } from '../ShockwaveRing'
import { useSoundEngine } from '../../hooks/useSoundEngine'

interface ExplosionEffectProps {
  position: [number, number, number]
  onComplete: () => void
}

const PARTICLE_COUNT = 100
const DURATION = 1.2

/**
 * Visual explosion effect that spawns when a detonation occurs.
 * Consists of:
 * - Expanding ring (shockwave)
 * - Ground ripple shockwave (Phase 4.4)
 * - Burst of colored particles
 * - Flash (via opacity)
 */
export const ExplosionEffect = ({ position, onComplete }: ExplosionEffectProps) => {
  const groupRef = useRef<THREE.Group>(null)
  const pointsRef = useRef<THREE.Points>(null)
  const rippleRef = useRef<THREE.Mesh>(null)
  const elapsed = useRef(0)
  const done = useRef(false)
  const sounds = useSoundEngine()

  // Trigger screen shake and sound on explosion — same frame as visual
  useEffect(() => {
    triggerShake(0.8, 5)
    spawnShockwave({ position: [position[0], position[1] - 0.5, position[2]], color: '#ff6644', duration: 0.8, maxScale: 8, ringCount: 3 })
    sounds.explosion()
    // Brief flash overlay in DOM
    const flash = document.getElementById('explosion-flash') || (() => {
      const el = document.createElement('div')
      el.id = 'explosion-flash'
      el.style.cssText = 'position:fixed;inset:0;background:white;pointer-events:none;z-index:9999;opacity:0;transition:opacity 0.05s ease-out'
      document.body.appendChild(el)
      return el
    })()
    flash.style.opacity = '0.6'
    requestAnimationFrame(() => { flash.style.opacity = '0' })
    setTimeout(() => { if (flash.parentNode) flash.parentNode.removeChild(flash) }, 200)
  }, [sounds, position])

  // Per-instance geometry and particles
  const { particles, geometry } = useMemo(() => {
    const posArray = new Float32Array(PARTICLE_COUNT * 3)
    const opArray = new Float32Array(PARTICLE_COUNT).fill(1)
    const colArray = new Float32Array(PARTICLE_COUNT * 3)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(posArray, 3))
    geo.setAttribute('opacity', new THREE.BufferAttribute(opArray, 1))
    geo.setAttribute('color', new THREE.BufferAttribute(colArray, 3))

    const parts: { velocity: THREE.Vector3; maxLife: number }[] = []
    const colorPalette = [
      new THREE.Color('#ff6633'),
      new THREE.Color('#ff8844'),
      new THREE.Color('#ffaa44'),
      new THREE.Color('#ff4433'),
      new THREE.Color('#ffcc66'),
      new THREE.Color('#ffffff'),
      new THREE.Color('#ff2200'),
      new THREE.Color('#ffaa22'),
    ]

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      const speed = 6 + Math.random() * 14
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
    return { particles: parts, geometry: geo }
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
          mat.opacity = Math.max(0, (child.userData.baseOpacity as number ?? 0.8) - t * 1.2)
        }
      })
    }

    // Ground ripple shockwave — expands outward and fades
    if (rippleRef.current) {
      const rippleScale = 1 + t * 8
      rippleRef.current.scale.set(rippleScale, rippleScale, rippleScale)
      const mat = rippleRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = Math.max(0, 0.4 * (1 - t))
      mat.color.setHSL(0.05 + t * 0.1, 0.8, 0.5 - t * 0.3)
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
      {/* Ground ripple shockwave — expands along terrain surface */}
      <mesh ref={rippleRef} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 1.5, 48]} />
        <meshBasicMaterial
          color="#ff8844"
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

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
          size={0.45}
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
