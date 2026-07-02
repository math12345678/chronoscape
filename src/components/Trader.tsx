import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getTerrainHeight } from '../terrain'

export const TRADER_POSITION: [number, number, number] = [-12, 0, -8]

/**
 * Trader booth with a living NPC merchant character.
 * The trader bob idly and looks around, giving life to the trading post.
 */
export const Trader = () => {
  const groupRef = useRef<THREE.Group>(null)
  const traderRef = useRef<THREE.Group>(null)
  const armLeftRef = useRef<THREE.Group>(null)
  const armRightRef = useRef<THREE.Group>(null)
  const time = useRef(Math.random() * 100)

  const terrainY = getTerrainHeight(TRADER_POSITION[0], TRADER_POSITION[2])
  const traderPos: [number, number, number] = [TRADER_POSITION[0], terrainY, TRADER_POSITION[2]]

  // NPC animation
  useFrame((_, delta) => {
    time.current += delta
    if (!groupRef.current || !traderRef.current) return

    // Gentle idle sway
    traderRef.current.position.y = terrainY + Math.sin(time.current * 1.2) * 0.02
    traderRef.current.position.x = traderPos[0] + Math.sin(time.current * 0.5) * 0.03
    traderRef.current.rotation.y = Math.sin(time.current * 0.3) * 0.2

    // Arm gesturing
    if (armLeftRef.current) {
      armLeftRef.current.rotation.x = Math.sin(time.current * 0.5) * 0.1 + 0.2
    }
    if (armRightRef.current) {
      armRightRef.current.rotation.x = Math.sin(time.current * 0.5 + Math.PI) * 0.05 + 0.15
    }
  })

  return (
    <group ref={groupRef} position={traderPos}>
      {/* Booth structure */}
      <mesh position={[0, 0.3, 0]} receiveShadow castShadow>
        <boxGeometry args={[1.2, 0.6, 1.2]} />
        <meshStandardMaterial color="#6a5a3a" roughness={0.8} />
      </mesh>

      <mesh position={[0, 0.7, 0]} receiveShadow castShadow>
        <boxGeometry args={[1.4, 0.1, 0.8]} />
        <meshStandardMaterial color="#8a7a5a" roughness={0.7} />
      </mesh>

      {/* Awning poles */}
      <mesh position={[-0.6, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 1, 6]} />
        <meshStandardMaterial color="#5a4a3a" roughness={0.8} />
      </mesh>
      <mesh position={[0.6, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 1, 6]} />
        <meshStandardMaterial color="#5a4a3a" roughness={0.8} />
      </mesh>

      <mesh position={[0, 1.3, 0]} castShadow>
        <boxGeometry args={[1.6, 0.05, 0.6]} />
        <meshStandardMaterial color="#cc8844" roughness={0.6} />
      </mesh>

      {/* Renown symbol — floating coin */}
      <mesh position={[0, 1.0, 0.6]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.15, 0.04, 8, 12]} />
        <meshStandardMaterial color="#ffcc44" emissive="#ffaa00" emissiveIntensity={0.3} metalness={0.6} roughness={0.2} />
      </mesh>

      {/* Glowing crystals on counter */}
      <mesh position={[0.4, 0.85, 0.3]}>
        <dodecahedronGeometry args={[0.08, 0]} />
        <meshStandardMaterial color="#aa88ff" emissive="#8844ff" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[-0.3, 0.85, -0.3]}>
        <dodecahedronGeometry args={[0.06, 0]} />
        <meshStandardMaterial color="#4488ff" emissive="#4488ff" emissiveIntensity={0.2} />
      </mesh>

      {/* Sign */}
      <mesh position={[0, 1.6, 0]}>
        <planeGeometry args={[0.6, 0.25]} />
        <meshBasicMaterial color="#332a1a" side={THREE.DoubleSide} />
      </mesh>

      {/* ── Trader NPC Character ── */}
      <group ref={traderRef} position={[0.5, terrainY, 0]}>
        {/* Shadow */}
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.2, 12]} />
          <meshBasicMaterial color="#000" transparent opacity={0.15} depthWrite={false} />
        </mesh>

        {/* Robed body */}
        <mesh position={[0, 0.5, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.25, 0.5, 8]} />
          <meshStandardMaterial color="#884466" roughness={0.8} />
        </mesh>

        {/* Gold belt */}
        <mesh position={[0, 0.32, 0]}>
          <torusGeometry args={[0.2, 0.03, 6, 12]} />
          <meshStandardMaterial color="#ccaa44" metalness={0.5} roughness={0.3} />
        </mesh>

        {/* Head */}
        <mesh position={[0, 0.78, 0]} castShadow>
          <sphereGeometry args={[0.12, 10, 10]} />
          <meshStandardMaterial color="#c8a878" roughness={0.6} />
        </mesh>

        {/* Turban hat */}
        <mesh position={[0, 0.86, 0]} castShadow>
          <sphereGeometry args={[0.15, 0.1, 0.1, 8]} />
          <meshStandardMaterial color="#cc8844" roughness={0.9} />
        </mesh>
        {/* Turban wrap */}
        <mesh position={[0, 0.88, 0.05]} castShadow>
          <torusGeometry args={[0.14, 0.025, 6, 12]} />
          <meshStandardMaterial color="#aa6633" roughness={0.9} />
        </mesh>

        {/* Eyes */}
        <mesh position={[-0.04, 0.78, -0.11]}>
          <sphereGeometry args={[0.02, 6, 6]} />
          <meshBasicMaterial color="#222" />
        </mesh>
        <mesh position={[0.04, 0.78, -0.11]}>
          <sphereGeometry args={[0.02, 6, 6]} />
          <meshBasicMaterial color="#222" />
        </mesh>

        {/* Arms — gesturing */}
        <group ref={armLeftRef} position={[-0.24, 0.5, 0]}>
          <mesh position={[0, -0.15, 0]} castShadow>
            <cylinderGeometry args={[0.03, 0.04, 0.3, 6]} />
            <meshStandardMaterial color="#884466" roughness={0.8} />
          </mesh>
        </group>
        <group ref={armRightRef} position={[0.24, 0.5, 0]}>
          <mesh position={[0, -0.15, 0]} castShadow>
            <cylinderGeometry args={[0.03, 0.04, 0.3, 6]} />
            <meshStandardMaterial color="#884466" roughness={0.8} />
          </mesh>
        </group>

        {/* Name tag glow */}
        <mesh position={[0, 1.0, 0]}>
          <planeGeometry args={[0.3, 0.06]} />
          <meshBasicMaterial color="#ccaa44" transparent opacity={0.2} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  )
}
