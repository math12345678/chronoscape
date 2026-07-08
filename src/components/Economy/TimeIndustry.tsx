import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { INDUSTRY_POSITION } from '../../config/finance'

/**
 * Time Industry Factory — a mechanical building with spinning gears and smoke effects.
 * Represents automated production pipelines.
 */
export const TimeIndustry = () => {
  const groupRef = useRef<THREE.Group>(null)
  const gearRef = useRef<THREE.Mesh>(null)
  const smokeRef = useRef<THREE.Mesh>(null)
  const time = useRef(0)
  const pos = INDUSTRY_POSITION

  useFrame((_, delta) => {
    time.current += delta
    if (!groupRef.current) return
    groupRef.current.position.y = pos[1] + Math.sin(time.current * 0.3) * 0.01

    // Spinning gear
    if (gearRef.current) {
      gearRef.current.rotation.z += delta * 0.8
    }

    // Smoke puff opacity
    if (smokeRef.current) {
      const mat = smokeRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.05 + Math.sin(time.current * 0.6) * 0.03
    }
  })

  return (
    <group ref={groupRef} position={pos}>
      {/* Main factory building */}
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 0.8, 1.4]} />
        <meshStandardMaterial color="#1a2a1a" roughness={0.7} metalness={0.2} />
      </mesh>

      {/* Roof */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <boxGeometry args={[1.7, 0.05, 1.5]} />
        <meshStandardMaterial color="#2a3a2a" roughness={0.6} />
      </mesh>

      {/* Smokestack */}
      <mesh position={[0.3, 1.05, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.08, 0.4, 8]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.8} />
      </mesh>

      {/* Smoke puff */}
      <mesh ref={smokeRef} position={[0.3, 1.3, 0]}>
        <sphereGeometry args={[0.08, 6, 6]} />
        <meshBasicMaterial color="#666666" transparent opacity={0.06} depthWrite={false} />
      </mesh>

      {/* Conveyor belt entrance */}
      <mesh position={[0, 0.2, 0.73]}>
        <boxGeometry args={[0.6, 0.04, 0.1]} />
        <meshStandardMaterial color="#333333" roughness={0.9} />
      </mesh>

      {/* Gear on side */}
      <mesh ref={gearRef} position={[0.83, 0.5, 0]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.12, 0.03, 8, 16]} />
        <meshStandardMaterial color="#665544" roughness={0.6} metalness={0.4} />
      </mesh>

      {/* Windows — warm industrial glow */}
      {[-0.4, 0, 0.4].map((x, i) => (
        <mesh key={`win-${i}`} position={[x, 0.4, 0.73]}>
          <planeGeometry args={[0.2, 0.25]} />
          <meshStandardMaterial
            color="#ff8844"
            emissive="#ff8844"
            emissiveIntensity={0.1}
            transparent
            opacity={0.2}
            roughness={0.3}
            metalness={0.2}
          />
        </mesh>
      ))}

      {/* Pipeline pipe */}
      <mesh position={[0.5, 0.15, 0.73]} rotation={[0, 0, 0.1]}>
        <cylinderGeometry args={[0.03, 0.03, 0.5, 6]} />
        <meshStandardMaterial color="#556655" roughness={0.7} metalness={0.3} />
      </mesh>

      {/* Floor glow */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.8, 16]} />
        <meshBasicMaterial color="#44ff88" transparent opacity={0.03} />
      </mesh>

      {/* Interactive zone */}
      <mesh
        position={[0, 0.4, 1.0]}
        userData={{ interactable: true, type: 'industry', prompt: '[Click] Time Industries' }}
      >
        <planeGeometry args={[1.6, 1.0]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}
