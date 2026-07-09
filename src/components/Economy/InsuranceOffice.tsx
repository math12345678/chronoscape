import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { EXCHANGE_POSITION } from '../../config/economy'

/**
 * Insurance office — a modest building next to the exchange.
 * Click to open insurance policies.
 */
export const InsuranceOffice = () => {
  const time = useRef(0)
  const pos: [number, number, number] = [EXCHANGE_POSITION[0] + 2, EXCHANGE_POSITION[1], EXCHANGE_POSITION[2]]

  useFrame((_, delta) => {
    time.current += delta
  })

  return (
    <group position={pos}>
      {/* Building */}
      <mesh position={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[0.8, 0.5, 0.8]} />
        <meshStandardMaterial color="#2a3a2a" roughness={0.7} metalness={0.1} />
      </mesh>

      {/* Roof */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[0.9, 0.05, 0.9]} />
        <meshStandardMaterial color="#3a4a3a" roughness={0.6} />
      </mesh>

      {/* Door */}
      <mesh position={[0, 0.15, 0.41]}>
        <planeGeometry args={[0.2, 0.3]} />
        <meshStandardMaterial color="#5a6a5a" roughness={0.8} />
      </mesh>

      {/* Shield symbol */}
      <mesh position={[0, 0.45, 0.42]}>
        <planeGeometry args={[0.12, 0.12]} />
        <meshBasicMaterial color="#44ff88" transparent opacity={0.3} />
      </mesh>

      {/* Window glow */}
      <mesh position={[-0.2, 0.3, 0.41]}>
        <planeGeometry args={[0.12, 0.12]} />
        <meshBasicMaterial color="#88ffaa" transparent opacity={0.1} />
      </mesh>

      {/* Interactive zone */}
      <mesh
        position={[0, 0.3, 0.6]}
        userData={{ interactable: true, type: 'insurance', prompt: '[Click] Insurance Office' }}
      >
        <planeGeometry args={[0.8, 0.6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}
