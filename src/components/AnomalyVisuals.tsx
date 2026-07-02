import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'

/**
 * 3D world visual effects during time anomaly events.
 *
 * - Time Squall: Expanding red/orange pulse rings that ripple across the island
 * - Time Surge: Cyan sparkle aura with floating light motes
 *
 * These effects play inside the 3D scene to complement the UI banner.
 */
export const AnomalyVisuals = () => {
  const anomalyActive = useStore((s) => s.anomalyActive)
  const anomalyEndsAt = useStore((s) => s.anomalyEndsAt)
  const ringRef = useRef<THREE.Mesh>(null)
  const ringRef2 = useRef<THREE.Mesh>(null)
  const time = useRef(0)

  const isSquall = anomalyActive === 'squall'
  const isSurge = anomalyActive === 'surge'
  const active = isSquall || isSurge

  useFrame((_, delta) => {
    time.current += delta

    if (!active) return

    // Pulse rings for squall: expanding rings that fade
    if (ringRef.current) {
      const t = time.current
      // Two alternating rings
      const ringScale = 5 + ((t * 1.5) % 15)
      ringRef.current.scale.set(ringScale, ringScale, ringScale)
      const mat = ringRef.current.material as THREE.MeshBasicMaterial
      const opacity = Math.max(0, 0.4 - ((t * 1.5) % 15) / 15 * 0.4)
      mat.opacity = isSquall ? opacity : opacity * 0.3
      mat.color.setHex(isSquall ? 0xff4433 : 0x44ffcc)
    }

    if (ringRef2.current) {
      const t = time.current + 2 // offset phase
      const ringScale = 5 + ((t * 1.5) % 15)
      ringRef2.current.scale.set(ringScale, ringScale, ringScale)
      const mat = ringRef2.current.material as THREE.MeshBasicMaterial
      const opacity = Math.max(0, 0.3 - ((t * 1.5) % 15) / 15 * 0.3)
      mat.opacity = isSquall ? opacity : opacity * 0.2
    }
  })

  if (!active) return null

  return (
    <group>
      {/* Expanding pulse ring 1 */}
      <mesh
        ref={ringRef}
        position={[0, 1.5, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[1, 1.5, 48]} />
        <meshBasicMaterial
          color={isSquall ? '#ff4433' : '#44ffcc'}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Expanding pulse ring 2 (offset phase) */}
      <mesh
        ref={ringRef2}
        position={[0, 1.5, 0]}
        rotation={[-Math.PI / 2, 0, Math.PI / 4]}
      >
        <ringGeometry args={[0.8, 1.2, 48]} />
        <meshBasicMaterial
          color={isSquall ? '#ff6644' : '#66ffdd'}
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Central glow pillar during squall */}
      {isSquall && (
        <mesh position={[0, 2, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 4, 12]} />
          <meshBasicMaterial
            color="#ff4433"
            transparent
            opacity={0.08}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Central glow aura during surge */}
      {isSurge && (
        <mesh position={[0, 2, 0]}>
          <sphereGeometry args={[8, 16, 16]} />
          <meshBasicMaterial
            color="#44ffcc"
            transparent
            opacity={0.04}
            side={THREE.BackSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  )
}
