import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { EXCHANGE_POSITION } from '../../config/economy'

/**
 * Time Stock Exchange — a sleek financial building with a live ticker display.
 * Represents the "time is money" core of the economy.
 * Click to open the trading UI.
 */
export const TimeExchange = () => {
  const groupRef = useRef<THREE.Group>(null)
  const tickerRef = useRef<THREE.Mesh>(null)
  const time = useRef(0)
  const pos = EXCHANGE_POSITION

  useFrame((_, delta) => {
    time.current += delta
    if (!groupRef.current) return

    // Gentle floating
    groupRef.current.position.y = pos[1] + Math.sin(time.current * 0.3) * 0.02

    // Ticker scroll
    if (tickerRef.current) {
      ;(tickerRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.3 + Math.sin(time.current * 0.5) * 0.1
    }
  })

  return (
    <group ref={groupRef} position={pos}>
      {/* Building structure — futuristic financial tower */}
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 0.6, 1.6]} />
        <meshStandardMaterial color="#1a2233" roughness={0.4} metalness={0.3} />
      </mesh>

      {/* Upper structure */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <boxGeometry args={[1.2, 0.4, 1.2]} />
        <meshStandardMaterial color="#223344" roughness={0.3} metalness={0.4} />
      </mesh>

      {/* Glass panels */}
      {[-0.5, 0, 0.5].map((x, i) => (
        <mesh key={`glass-${i}`} position={[x, 0.3, 0.81]} castShadow>
          <planeGeometry args={[0.35, 0.4]} />
          <meshStandardMaterial
            color="#4488cc"
            emissive="#44aaff"
            emissiveIntensity={0.05}
            transparent
            opacity={0.3}
            roughness={0.1}
            metalness={0.5}
          />
        </mesh>
      ))}

      {/* Roof with neon trim */}
      <mesh position={[0, 1.05, 0]} castShadow>
        <boxGeometry args={[1.4, 0.05, 1.4]} />
        <meshStandardMaterial color="#334455" roughness={0.5} metalness={0.6} emissive="#4488ff" emissiveIntensity={0.1} />
      </mesh>

      {/* Neon edge glow */}
      <mesh position={[0, 1.05, 0]}>
        <boxGeometry args={[1.5, 0.01, 1.5]} />
        <meshBasicMaterial color="#44aaff" transparent opacity={0.15} />
      </mesh>

      {/* ── Ticker Display ── */}
      {(() => {
        const dots: [number, number, number][] = []
        for (let i = 0; i < 25; i++) {
          const angle = (i / 25) * Math.PI * 2
          const r = 0.85
          dots.push([Math.cos(angle) * r, 0.55 + Math.sin(angle * 3) * 0.02, Math.sin(angle) * r])
        }
        return dots.map((dp, i) => (
          <mesh key={`tick-dot-${i}`} position={dp}>
            <sphereGeometry args={[0.025, 4, 4]} />
            <meshBasicMaterial color="#44ffcc" transparent opacity={0.4 + Math.sin(i * 0.5) * 0.2} />
          </mesh>
        ))
      })()}

      {/* Ticker tape panel */}
      <mesh ref={tickerRef} position={[0, 0.85, 0.85]} rotation={[0, 0, 0]}>
        <planeGeometry args={[0.9, 0.12]} />
        <meshBasicMaterial color="#00ff88" transparent opacity={0.25} />
      </mesh>

      {/* Stock price pillars */}
      {[
        { color: '#ff8844', h: 0.2 },   // RAW
        { color: '#ffaa00', h: 0.25 },  // VPR
        { color: '#44ccff', h: 0.35 },  // LIQ
        { color: '#aa88ff', h: 0.45 },  // CRY
        { color: '#ffd700', h: 0.55 },  // RNW
      ].map((stock, i) => (
        <group key={`pillar-${i}`} position={[-0.5 + i * 0.25, 0, -0.5]}>
          <mesh position={[0, stock.h / 2, 0]}>
            <boxGeometry args={[0.08, stock.h, 0.08]} />
            <meshStandardMaterial color={stock.color} emissive={stock.color} emissiveIntensity={0.2} />
          </mesh>
          <mesh position={[0, stock.h, 0]}>
            <sphereGeometry args={[0.04, 6, 6]} />
            <meshBasicMaterial color={stock.color} transparent opacity={0.6} />
          </mesh>
        </group>
      ))}

      {/* Floor glow */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.9, 24]} />
        <meshBasicMaterial color="#44aaff" transparent opacity={0.04} />
      </mesh>

      {/* "Exchange" label */}
      <mesh position={[0, 1.25, 0]}>
        <planeGeometry args={[0.5, 0.1]} />
        <meshBasicMaterial color="#44ffcc" transparent opacity={0.15} />
      </mesh>

      {/* Interactive zone */}
      <mesh
        position={[0, 0.5, 1.2]}
        userData={{ interactable: true, type: 'exchange', prompt: '[Click] Time Exchange' }}
      >
        <planeGeometry args={[1.5, 1.0]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}
