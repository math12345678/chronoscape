import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ESTATE_POSITION } from '../../config/finance'

/**
 * Time Real Estate Office — a clean property development building.
 * Click to open the property management UI.
 */
export const TimeRealEstate = () => {
  const groupRef = useRef<THREE.Group>(null)
  const signRef = useRef<THREE.Mesh>(null)
  const time = useRef(0)
  const pos = ESTATE_POSITION

  useFrame((_, delta) => {
    time.current += delta
    if (!groupRef.current) return
    groupRef.current.position.y = pos[1] + Math.sin(time.current * 0.3) * 0.01

    if (signRef.current) {
      const mat = signRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.15 + Math.sin(time.current * 0.5) * 0.05
    }
  })

  return (
    <group ref={groupRef} position={pos}>
      {/* Main building */}
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.0, 0.6, 0.8]} />
        <meshStandardMaterial color="#1a2a2a" roughness={0.6} metalness={0.2} />
      </mesh>

      {/* Glass front */}
      <mesh position={[0, 0.3, 0.42]}>
        <planeGeometry args={[0.6, 0.4]} />
        <meshStandardMaterial
          color="#44aacc"
          emissive="#44aacc"
          emissiveIntensity={0.05}
          transparent
          opacity={0.2}
          roughness={0.1}
          metalness={0.5}
        />
      </mesh>

      {/* Roof */}
      <mesh position={[0, 0.65, 0]} castShadow>
        <boxGeometry args={[1.1, 0.04, 0.9]} />
        <meshStandardMaterial color="#2a3a3a" roughness={0.5} />
      </mesh>

      {/* Awning */}
      <mesh position={[0, 0.45, 0.43]}>
        <boxGeometry args={[0.7, 0.02, 0.1]} />
        <meshStandardMaterial color="#44aacc" roughness={0.5} metalness={0.1} />
      </mesh>

      {/* "FOR SALE" sign */}
      <mesh ref={signRef} position={[0.4, 0.5, 0.45]}>
        <planeGeometry args={[0.15, 0.2]} />
        <meshBasicMaterial color="#ffd700" transparent opacity={0.15} />
      </mesh>

      {/* Side window */}
      <mesh position={[0.4, 0.3, 0.42]}>
        <planeGeometry args={[0.1, 0.12]} />
        <meshBasicMaterial color="#44aacc" transparent opacity={0.1} />
      </mesh>

      {/* Floor glow */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.5, 16]} />
        <meshBasicMaterial color="#44aacc" transparent opacity={0.04} />
      </mesh>

      {/* Interactive zone */}
      <mesh
        position={[0, 0.3, 0.6]}
        userData={{ interactable: true, type: 'estate', prompt: '[Click] Real Estate Office' }}
      >
        <planeGeometry args={[1.0, 0.8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}
