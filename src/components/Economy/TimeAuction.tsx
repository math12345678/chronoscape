import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { AUCTION_POSITION } from '../../config/finance'

/**
 * Time Auction House — a vibrant auction venue with a marquee sign.
 * Click to open the bidding UI.
 */
export const TimeAuction = () => {
  const groupRef = useRef<THREE.Group>(null)
  const marqueeRef = useRef<THREE.Mesh>(null)
  const time = useRef(0)
  const pos = AUCTION_POSITION

  useFrame((_, delta) => {
    time.current += delta
    if (!groupRef.current) return
    groupRef.current.position.y = pos[1] + Math.sin(time.current * 0.35) * 0.01

    // Marquee pulse
    if (marqueeRef.current) {
      const mat = marqueeRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.2 + Math.sin(time.current * 0.6) * 0.1
    }
  })

  return (
    <group ref={groupRef} position={pos}>
      {/* Main auction hall */}
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.9, 1.2]} />
        <meshStandardMaterial color="#1a1a2a" roughness={0.5} metalness={0.2} />
      </mesh>

      {/* Arched roof */}
      <mesh position={[0, 0.95, 0]} castShadow>
        <boxGeometry args={[1.6, 0.05, 1.3]} />
        <meshStandardMaterial color="#2a2030" roughness={0.4} metalness={0.3} />
      </mesh>

      {/* Marquee sign */}
      <mesh ref={marqueeRef} position={[0, 0.7, 0.65]}>
        <planeGeometry args={[0.6, 0.15]} />
        <meshBasicMaterial color="#ff44ff" transparent opacity={0.2} />
      </mesh>

      {/* Entrance arch */}
      <mesh position={[0, 0.35, 0.63]}>
        <planeGeometry args={[0.4, 0.5]} />
        <meshBasicMaterial color="#ff44ff" transparent opacity={0.08} />
      </mesh>

      {/* Side columns */}
      {[-0.6, 0.6].map((x, i) => (
        <mesh key={`col-${i}`} position={[x, 0.3, 0.4]} castShadow>
          <boxGeometry args={[0.06, 0.6, 0.06]} />
          <meshStandardMaterial color="#443344" roughness={0.5} metalness={0.3} />
        </mesh>
      ))}

      {/* Auction podium */}
      <mesh position={[0, 0.12, 0.3]}>
        <boxGeometry args={[0.3, 0.04, 0.2]} />
        <meshStandardMaterial color="#332233" roughness={0.6} />
      </mesh>

      {/* Purple glow */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.8, 16]} />
        <meshBasicMaterial color="#ff44ff" transparent opacity={0.03} />
      </mesh>

      {/* Side windows */}
      {[-0.5, 0.5].map((x, i) => (
        <mesh key={`win-${i}`} position={[x, 0.45, -0.65]}>
          <planeGeometry args={[0.2, 0.3]} />
          <meshBasicMaterial color="#ff44ff" transparent opacity={0.06} />
        </mesh>
      ))}

      {/* Interactive zone */}
      <mesh
        position={[0, 0.4, 0.8]}
        userData={{ interactable: true, type: 'auction', prompt: '[Click] Auction House' }}
      >
        <planeGeometry args={[1.5, 1.0]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}
