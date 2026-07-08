import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CEO_POSITION } from '../../config/finance'

/**
 * CEO Office — a sleek corporate tower where the player makes executive decisions.
 * Click to open CEO panel.
 */
export const CEOOffice = () => {
  const groupRef = useRef<THREE.Group>(null)
  const windowRef = useRef<THREE.Mesh>(null)
  const time = useRef(0)
  const pos = CEO_POSITION

  useFrame((_, delta) => {
    time.current += delta
    if (!groupRef.current) return
    groupRef.current.position.y = pos[1] + Math.sin(time.current * 0.2) * 0.01

    // Penthouse window pulse
    if (windowRef.current) {
      const mat = windowRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.15 + Math.sin(time.current * 0.3) * 0.08
    }
  })

  return (
    <group ref={groupRef} position={pos}>
      {/* Main tower */}
      <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 1.4, 1.0]} />
        <meshStandardMaterial color="#1a1a2a" roughness={0.4} metalness={0.3} />
      </mesh>

      {/* Glass panels on front */}
      {[-0.35, 0, 0.35].map((x, i) => (
        <mesh key={`glass-${i}`} position={[x, 0.6, 0.52]}>
          <planeGeometry args={[0.25, 0.9]} />
          <meshStandardMaterial
            color="#4488cc"
            emissive="#44aaff"
            emissiveIntensity={0.05}
            transparent
            opacity={0.2}
            roughness={0.1}
            metalness={0.6}
          />
        </mesh>
      ))}

      {/* Penthouse top */}
      <mesh position={[0, 1.45, 0]} castShadow>
        <boxGeometry args={[1.3, 0.05, 1.1]} />
        <meshStandardMaterial color="#2a2a3a" roughness={0.3} metalness={0.5} />
      </mesh>

      {/* Penthouse window (glowing) */}
      <mesh ref={windowRef} position={[0, 1.25, 0.52]}>
        <planeGeometry args={[0.3, 0.2]} />
        <meshBasicMaterial color="#ffd700" transparent opacity={0.12} />
      </mesh>

      {/* Corporate logo */}
      <mesh position={[0, 1.0, 0.52]}>
        <planeGeometry args={[0.2, 0.1]} />
        <meshBasicMaterial color="#ffd700" transparent opacity={0.08} />
      </mesh>

      {/* Side column accents */}
      {[-0.55, 0.55].map((x, i) => (
        <mesh key={`col-${i}`} position={[x, 0.4, 0]} castShadow>
          <boxGeometry args={[0.06, 0.8, 0.06]} />
          <meshStandardMaterial color="#334455" roughness={0.3} metalness={0.6} />
        </mesh>
      ))}

      {/* Steps */}
      <mesh position={[0, 0.02, 0.42]}>
        <boxGeometry args={[0.6, 0.04, 0.2]} />
        <meshStandardMaterial color="#2a2a33" roughness={0.6} />
      </mesh>

      {/* Floor glow */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.7, 16]} />
        <meshBasicMaterial color="#ffd700" transparent opacity={0.03} />
      </mesh>

      {/* Interactive zone */}
      <mesh
        position={[0, 0.5, 0.7]}
        userData={{ interactable: true, type: 'ceo', prompt: '[Click] CEO Office' }}
      >
        <planeGeometry args={[1.2, 1.5]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}
