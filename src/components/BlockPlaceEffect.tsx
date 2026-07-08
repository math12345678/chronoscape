import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'
import { useSoundEngine } from '../hooks/useSoundEngine'
import { spawnShockwave } from './ShockwaveRing'
import type { BlockType } from '../store'

const PARTICLE_COUNT = 20
const DURATION = 0.6

const BLOCK_COLORS: Record<string, string> = {
  vapour: '#ffaa00',
  crystal: '#aa88ff',
}

const BLOCK_EMISSIVE: Record<string, string> = {
  vapour: '#ffaa00',
  crystal: '#cc88ff',
}

/**
 * Satisfying pop-in effect when placing a block.
 * Particles erupt from the block position, expanding outward in the block's color.
 * A quick glow flash accompanies the particles.
 */
const BlockPlaceEffect = ({ position, type }: { position: [number, number, number]; type: BlockType }) => {
  const groupRef = useRef<THREE.Group>(null)
  const pointsRef = useRef<THREE.Points>(null)
  const elapsed = useRef(0)
  const done = useRef(false)
  const sounds = useSoundEngine()

  useEffect(() => {
    sounds.placeBlock()
    // Ground ripple shockwave
    spawnShockwave({ position: [position[0], position[1] - 0.5, position[2]], color: type === 'crystal' ? '#aa88ff' : '#ffaa00', duration: 0.4, maxScale: 4, ringCount: 2 })
    // Brief flash
    const flash = document.getElementById('block-flash') || (() => {
      const el = document.createElement('div')
      el.id = 'block-flash'
      el.style.cssText = 'position:fixed;inset:0;background:transparent;pointer-events:none;z-index:9998;transition:opacity 0.15s ease-out'
      document.body.appendChild(el)
      return el
    })()
    flash.style.background = type === 'crystal' ? '#aa88ff' : '#ffaa00'
    flash.style.opacity = '0.15'
    requestAnimationFrame(() => { flash.style.opacity = '0' })
    setTimeout(() => { if (flash.parentNode) flash.parentNode.removeChild(flash) }, 200)
  }, [sounds, type])

  const color = BLOCK_COLORS[type] ?? '#ffffff'
  const emissive = BLOCK_EMISSIVE[type] ?? '#ffffff'

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
      const phi = Math.random() * Math.PI
      const speed = 2 + Math.random() * 4
      parts.push({
        velocity: new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta) * speed,
          Math.abs(Math.sin(phi) * Math.sin(theta)) * speed + 0.5,
          Math.cos(phi) * speed,
        ),
        maxLife: DURATION * (0.4 + Math.random() * 0.6),
      })

      // Mix between block color and white for sparkle
      const variant = baseColor.clone().lerp(whiteColor, Math.random() * 0.4)
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

    if (!pointsRef.current) return

    // Scale up group (pop-in effect)
    if (groupRef.current) {
      const popScale = Math.min(t * 5, 1)
      groupRef.current.scale.set(popScale, popScale, popScale)
    }

    const pos = pointsRef.current.geometry.attributes.position.array as Float32Array
    const op = pointsRef.current.geometry.attributes.opacity.array as Float32Array

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = particles[i]
      const lt = Math.min(t / (p.maxLife / DURATION), 1)
      pos[i * 3] = p.velocity.x * lt
      pos[i * 3 + 1] = p.velocity.y * lt - 1.5 * lt * lt
      pos[i * 3 + 2] = p.velocity.z * lt
      op[i] = Math.max(0, 1 - lt * 2)
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true
    pointsRef.current.geometry.attributes.opacity.needsUpdate = true
  })

  return (
    <group ref={groupRef} position={position} scale={[0, 0, 0]}>
      {/* Glow flash — expands and fades */}
      <mesh>
        <boxGeometry args={[1.3, 1.3, 1.3]} />
        <meshBasicMaterial
          color={emissive}
          transparent
          opacity={0.4}
          depthWrite={false}
        />
      </mesh>
      
      {/* Solid pop-in block with enhanced material */}
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial 
          color={color} 
          emissive={emissive}
          emissiveIntensity={0.5}
          roughness={0.4} 
          metalness={0.2}
        />
      </mesh>

      {/* Particles */}
      <points ref={pointsRef} frustumCulled={false}>
        <primitive object={geometry} attach="geometry" />
        <pointsMaterial
          size={0.15}
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

/**
 * Watches the store for placeBlock events and spawns BlockPlaceEffect.
 */
export const BlockPlaceEffectManager = () => {
  const lastPlacedBlock = useStore((s) => s.lastPlacedBlock)
  const lastPlacedBlockTime = useStore((s) => s.lastPlacedBlockTime)

  if (!lastPlacedBlock) return null

  const key = `${lastPlacedBlock.x}-${lastPlacedBlock.y}-${lastPlacedBlock.z}-${lastPlacedBlockTime}`

  return (
    <BlockPlaceEffect
      key={key}
      position={[lastPlacedBlock.x, lastPlacedBlock.y, lastPlacedBlock.z]}
      type={lastPlacedBlock.type}
    />
  )
}
