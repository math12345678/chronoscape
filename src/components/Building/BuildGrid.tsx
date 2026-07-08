import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useStore } from '../../store'
import * as THREE from 'three'

const RING_RADIUS = 3.5

/**
 * Build energy field — replaces the Minecraft-style grid overlay.
 * Shows a circular energy ring at the ground level where the player
 * is aiming, with orbiting energy motes and a pulsing glow.
 * Fades in/out with build mode toggle.
 */
export const BuildGrid = () => {
  const selectedBlockType = useStore((s) => s.selectedBlockType)
  const groupRef = useRef<THREE.Group>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const time = useRef(0)
  const opacity = useRef(0)
  const targetOpacity = useRef(0)

  const isBuilding = selectedBlockType !== null

  // Energy motes that orbit the ring
  const motes = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      angle: (i / 8) * Math.PI * 2,
      speed: 0.4 + Math.random() * 0.3,
      phase: Math.random() * Math.PI * 2,
      size: 0.04 + Math.random() * 0.04,
    }))
  }, [])

  useFrame((state, delta) => {
    time.current += delta
    const t = time.current

    // Smooth opacity transition
    targetOpacity.current = isBuilding ? 1 : 0
    opacity.current += (targetOpacity.current - opacity.current) * delta * 4

    if (!groupRef.current) return

    const vis = opacity.current
    groupRef.current.visible = vis > 0.01
    if (vis < 0.01) return

    // Pulse ring
    if (ringRef.current) {
      const mat = ringRef.current.material as THREE.MeshBasicMaterial
      const pulse = 0.3 + Math.sin(t * 0.8) * 0.15
      mat.opacity = pulse * 0.2 * vis
      
      // Expand/contract breathing
      const breathe = 1 + Math.sin(t * 0.5) * 0.03
      ringRef.current.scale.setScalar(breathe)
    }

    // Pulse ground glow
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial
      const pulse = 0.5 + Math.sin(t * 0.6 + 1) * 0.3
      mat.opacity = pulse * 0.04 * vis
    }

    // Update orbiting motes (children after ring and glow)
    if (groupRef.current.children.length > 2) {
      for (let i = 2; i < groupRef.current.children.length; i++) {
        const mote = groupRef.current.children[i] as THREE.Mesh
        const data = motes[i - 2]
        if (!data) continue
        const angle = data.angle + t * data.speed
        const radius = RING_RADIUS + Math.sin(t * 0.7 + data.phase) * 0.3
        mote.position.x = Math.cos(angle) * radius
        mote.position.z = Math.sin(angle) * radius
        mote.position.y = 0.05 + Math.sin(t * 1.2 + data.phase) * 0.08

        const moteVis = 0.3 + Math.sin(t * 2 + data.phase) * 0.3
        ;(mote.material as THREE.MeshBasicMaterial).opacity = moteVis * vis
      }
    }
  })

  if (!isBuilding) return null

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Outer ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[RING_RADIUS - 0.05, RING_RADIUS + 0.05, 32]} />
        <meshBasicMaterial
          color="#44ffcc"
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Ground glow disc */}
      <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[RING_RADIUS - 0.2, 24]} />
        <meshBasicMaterial
          color="#44ffcc"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Orbiting energy motes */}
      {motes.map((mote, i) => (
        <mesh key={i}>
          <sphereGeometry args={[mote.size, 6, 6]} />
          <meshBasicMaterial
            color="#66ffdd"
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  )
}
