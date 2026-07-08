import { useRef } from 'react'
import { useFrameThrottled } from '../hooks/useFrameThrottled'
import * as THREE from 'three'
import { TRADER_POSITION } from './Trader'
import { getTerrainHeight } from '../terrain'

const CHIME_COUNT = 5

/**
 * Hanging wind chimes suspended from the Trader's awning.
 * Each chime is a small metallic rod that sways in the breeze
 * and occasionally tinkles against its neighbors.
 */
export const TraderWindChimes = () => {
  const groupRef = useRef<THREE.Group>(null)
  const time = useRef(Math.random() * 100)

  const terrainY = getTerrainHeight(TRADER_POSITION[0], TRADER_POSITION[2])

  useFrameThrottled((_, delta) => {
    time.current += delta
    if (!groupRef.current) return

    // Each chime sways independently with a gentle breeze
    groupRef.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh
      const phase = (i / CHIME_COUNT) * Math.PI * 2

      // Organic sway with overlapping sine waves
      const swayX = Math.sin(time.current * 0.8 + phase) * 0.06
      const swayZ = Math.cos(time.current * 0.6 + phase * 1.2) * 0.06
      mesh.rotation.x = swayZ
      mesh.rotation.z = swayX

      // Slight position drift from sway
      mesh.position.x = (i - CHIME_COUNT / 2) * 0.18 + Math.sin(time.current * 0.5 + phase) * 0.02
    })
  }, 4)

  return (
    <group
      ref={groupRef}
      position={[
        TRADER_POSITION[0] + 0.4,
        terrainY + 1.1,
        TRADER_POSITION[2],
      ]}
    >
      {/* Horizontal string bar */}
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[0.9, 0.02, 0.02]} />
        <meshBasicMaterial color="#664422" />
      </mesh>

      {/* Hanging strings */}
      {Array.from({ length: CHIME_COUNT }, (_, i) => (
        <mesh
          key={`string-${i}`}
          position={[(i - CHIME_COUNT / 2) * 0.18, 0.17, 0]}
        >
          <cylinderGeometry args={[0.005, 0.005, 0.35, 4]} />
          <meshBasicMaterial color="#664422" />
        </mesh>
      ))}

      {/* Chime rods */}
      {Array.from({ length: CHIME_COUNT }, (_, i) => {
        const hue = 0.08 + i * 0.02 // Warm gold gradient
        const color = new THREE.Color().setHSL(hue, 0.5, 0.55)
        const length = 0.12 + i * 0.015
        return (
          <mesh
            key={`chime-${i}`}
            position={[(i - CHIME_COUNT / 2) * 0.18, 0.02, 0]}
            rotation={[0, 0, 0]}
          >
            <cylinderGeometry args={[0.015, 0.018, length, 6]} />
            <meshStandardMaterial
              color={color}
              metalness={0.7}
              roughness={0.2}
            />
          </mesh>
        )
      })}

      {/* Tinkler disc (hits chimes in wind) */}
      <mesh position={[0, -0.06, 0]}>
        <torusGeometry args={[0.08, 0.015, 6, 10]} />
        <meshStandardMaterial
          color="#ddcc88"
          metalness={0.6}
          roughness={0.3}
        />
      </mesh>
    </group>
  )
}
