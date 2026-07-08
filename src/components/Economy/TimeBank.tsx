import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BANK_POSITION } from '../../config/finance'

/**
 * Time Bank — a magnificent financial temple with vault doors and gold accents.
 * Represents the core savings/loans system of the economy.
 * Click to open banking UI.
 */
export const TimeBank = () => {
  const groupRef = useRef<THREE.Group>(null)
  const vaultRef = useRef<THREE.Mesh>(null)
  const time = useRef(0)
  const pos = BANK_POSITION

  useFrame((_, delta) => {
    time.current += delta
    if (!groupRef.current) return

    // Subtle golden pulse
    groupRef.current.position.y = pos[1] + Math.sin(time.current * 0.25) * 0.01

    // Vault door glow pulse
    if (vaultRef.current) {
      const mat = vaultRef.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 0.1 + Math.sin(time.current * 0.4) * 0.05
    }
  })

  return (
    <group ref={groupRef} position={pos}>
      {/* Main building — grand financial temple */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.0, 1.0, 1.8]} />
        <meshStandardMaterial color="#1a1a22" roughness={0.5} metalness={0.2} />
      </mesh>

      {/* Marble columns on front */}
      {[-0.7, -0.35, 0, 0.35, 0.7].map((x, i) => (
        <mesh key={`col-${i}`} position={[x, 0.4, 0.95]} castShadow>
          <cylinderGeometry args={[0.06, 0.08, 0.8, 8]} />
          <meshStandardMaterial color="#d4c8a0" roughness={0.6} metalness={0.1} />
        </mesh>
      ))}

      {/* Pediment (triangular roof front) */}
      <mesh position={[0, 1.05, 0.95]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.9, 0.9, 0.01, 3]} />
        <meshStandardMaterial color="#2a2a33" roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[0, 1.05, 0.95]}>
        <planeGeometry args={[1.6, 0.3]} />
        <meshBasicMaterial color="#d4c8a0" transparent opacity={0.05} />
      </mesh>

      {/* Vault door */}
      <mesh ref={vaultRef} position={[0, 0.3, 0.92]}>
        <circleGeometry args={[0.22, 16]} />
        <meshStandardMaterial
          color="#443322"
          roughness={0.3}
          metalness={0.7}
          emissive="#ffd700"
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* Vault handle */}
      <mesh position={[0.08, 0.3, 0.95]}>
        <torusGeometry args={[0.05, 0.01, 8, 12]} />
        <meshStandardMaterial color="#665544" roughness={0.4} metalness={0.6} />
      </mesh>

      {/* Gold trim along roof */}
      <mesh position={[0, 1.05, 0]}>
        <boxGeometry args={[2.1, 0.02, 1.9]} />
        <meshStandardMaterial color="#ffd700" roughness={0.3} metalness={0.8} emissive="#ffd700" emissiveIntensity={0.05} />
      </mesh>

      {/* Side windows — glowing */}
      {[-0.5, 0.5].map((x, i) => (
        <mesh key={`win-${i}`} position={[x, 0.4, -0.92]}>
          <planeGeometry args={[0.3, 0.35]} />
          <meshStandardMaterial
            color="#ffd700"
            emissive="#ffd700"
            emissiveIntensity={0.08}
            transparent
            opacity={0.15}
            roughness={0.1}
            metalness={0.3}
          />
        </mesh>
      ))}

      {/* Bank name sign */}
      <mesh position={[0, 0.9, 0.95]}>
        <planeGeometry args={[0.6, 0.08]} />
        <meshBasicMaterial color="#ffd700" transparent opacity={0.2} />
      </mesh>

      {/* Golden floor glow */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.0, 24]} />
        <meshBasicMaterial color="#ffd700" transparent opacity={0.04} />
      </mesh>

      {/* Interactive zone */}
      <mesh
        position={[0, 0.5, 1.2]}
        userData={{ interactable: true, type: 'bank', prompt: '[Click] Time Bank' }}
      >
        <planeGeometry args={[2.0, 1.2]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}
