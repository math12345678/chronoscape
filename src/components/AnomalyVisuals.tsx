import { useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { useFrameThrottled } from '../hooks/useFrameThrottled'
import * as THREE from 'three'
import { useStore } from '../store'

/**
 * 3D world visual effects during time anomaly events.
 * Follows the camera so effects are always visible around the player.
 */
export const AnomalyVisuals = () => {
  const anomalyActive = useStore((s) => s.anomalyActive)
  const groupRef = useRef<THREE.Group>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const ringRef2 = useRef<THREE.Mesh>(null)
  const time = useRef(0)
  const { camera } = useThree()

  const isSquall = anomalyActive === 'squall'
  const isSurge = anomalyActive === 'surge'
  const active = isSquall || isSurge

  useFrameThrottled((_, delta) => {
    time.current += delta

    // Follow camera
    if (groupRef.current) {
      groupRef.current.position.copy(camera.position)
    }

    if (!active) return

    // Pulse rings for squall: expanding rings that fade
    if (ringRef.current) {
      const t = time.current
      const ringScale = 5 + ((t * 1.5) % 15)
      ringRef.current.scale.set(ringScale, ringScale, ringScale)
      const mat = ringRef.current.material as THREE.MeshBasicMaterial
      const opacity = Math.max(0, 0.4 - ((t * 1.5) % 15) / 15 * 0.4)
      mat.opacity = isSquall ? opacity : opacity * 0.3
      mat.color.setHex(isSquall ? 0xff4433 : 0x44ffcc)
    }

    if (ringRef2.current) {
      const t = time.current + 2
      const ringScale = 5 + ((t * 1.5) % 15)
      ringRef2.current.scale.set(ringScale, ringScale, ringScale)
      const mat = ringRef2.current.material as THREE.MeshBasicMaterial
      const opacity = Math.max(0, 0.3 - ((t * 1.5) % 15) / 15 * 0.3)
      mat.opacity = isSquall ? opacity : opacity * 0.2
    }
  }, 3)

  if (!active) return null

  return (
    <group ref={groupRef}>
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
