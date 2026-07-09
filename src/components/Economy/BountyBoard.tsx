import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BOUNTY_POSITION } from '../../config/economy'

/** Bounty Board — a wooden board with pinned bounties. Click to open bounty UI. */
export const BountyBoard = () => {
  const time = useRef(0)
  const pos = BOUNTY_POSITION

  useFrame((_, delta) => {
    time.current += delta
  })

  return (
    <group position={pos}>
      {/* Board post */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.06, 0.6, 0.06]} />
        <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
      </mesh>

      {/* Board surface */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[0.5, 0.3, 0.02]} />
        <meshStandardMaterial color="#6a5a3a" roughness={0.9} />
      </mesh>

      {/* Paper bounties */}
      {[
        { color: '#ff6644', p: [-0.14, 0.58, 0.02] as [number, number, number] },
        { color: '#ff4466', p: [0, 0.55, 0.02] as [number, number, number] },
        { color: '#8866ff', p: [0.14, 0.58, 0.02] as [number, number, number] },
      ].map((paper, i) => (
        <mesh key={`paper-${i}`} position={paper.p}>
          <planeGeometry args={[0.1, 0.14]} />
          <meshBasicMaterial color={paper.color} transparent opacity={0.7} />
        </mesh>
      ))}

      {/* Red pin dots */}
      {[-0.14, 0, 0.14].map((x, i) => (
        <mesh key={`pin-${i}`} position={[x, 0.62, 0.03]}>
          <sphereGeometry args={[0.015, 6, 6]} />
          <meshBasicMaterial color="#ff2222" />
        </mesh>
      ))}

      {/* Glow */}
      <mesh position={[0, 0.45, 0.02]}>
        <planeGeometry args={[0.4, 0.2]} />
        <meshBasicMaterial color="#ff4444" transparent opacity={0.04} />
      </mesh>

      {/* Interactive zone */}
      <mesh
        position={[0, 0.45, 0.15]}
        userData={{ interactable: true, type: 'bounty', prompt: '[Click] Bounty Board' }}
      >
        <planeGeometry args={[0.6, 0.5]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}
