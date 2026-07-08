import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getTerrainHeight } from '../terrain'
import { useStore } from '../store'

/**
 * Clean spawn platform — player appears on a visible stone platform.
 * The glow ring reacts to progression: more formulas discovered = brighter,
 * more colorful glow. All three formulas = golden-purple celebration ring.
 */
// Pre-allocated colors for progression-reactive glow — avoids GC pressure from new in useFrame
const _ringColor = new THREE.Color()
const _innerTargets = [
  new THREE.Color('#44ffcc'),
  new THREE.Color('#8866dd'),  // teal→violet
  new THREE.Color('#cc77aa'),  // +pink
  new THREE.Color('#ffd700'),  // +gold
]
const _outerTargets = [
  new THREE.Color('#aa88ff'),
  new THREE.Color('#ddaa55'),  // violet→gold
]

export const SpawnPlatform = () => {
  const ringRef = useRef<THREE.Mesh>(null)
  const outerRingRef = useRef<THREE.Mesh>(null)
  const terrainY = getTerrainHeight(0, 0)
  const formulas = useStore((s) => s.formulas)
  const discoveredCount = formulas.filter(f => f.discovered).length

  useFrame(({ clock }) => {
    if (ringRef.current) {
      const t = clock.getElapsedTime()
      ringRef.current.rotation.z = t * 0.2

      // Evolve glow based on progression
      const mat = ringRef.current.material as THREE.MeshBasicMaterial
      const baseOpacity = 0.08 + discoveredCount * 0.06
      const pulse = Math.sin(t * 1.5) * 0.04 * (discoveredCount + 1)
      mat.opacity = Math.min(0.6, baseOpacity + pulse)

      // Shift color using pre-allocated targets
      _ringColor.copy(_innerTargets[Math.min(discoveredCount, 3)])
      mat.color.copy(_ringColor)

      // Scale ring as you progress
      const scale = 0.9 + discoveredCount * 0.12
      ringRef.current.scale.set(scale, scale, scale)
    }

    // Outer ring — appears after first formula
    if (outerRingRef.current && discoveredCount >= 1) {
      const t = clock.getElapsedTime()
      outerRingRef.current.rotation.z = -t * 0.15
      const mat = outerRingRef.current.material as THREE.MeshBasicMaterial
      const pulse = 0.04 + Math.sin(t * 1.2) * 0.02
      mat.opacity = Math.min(0.2, pulse + discoveredCount * 0.03)

      _ringColor.copy(_outerTargets[Math.min(discoveredCount - 1, 1)])
      mat.color.copy(_ringColor)
    }
  })

  return (
    <group position={[0, terrainY, 0]}>
      {/* Base tier */}
      <mesh receiveShadow position={[0, 0.1, 0]}>
        <cylinderGeometry args={[3.5, 4.0, 0.2, 24]} />
        <meshStandardMaterial color="#3a3a4a" roughness={0.9} />
      </mesh>

      {/* Middle tier */}
      <mesh receiveShadow position={[0, 0.3, 0]}>
        <cylinderGeometry args={[2.5, 2.8, 0.2, 24]} />
        <meshStandardMaterial color="#4a4a5a" roughness={0.85} />
      </mesh>

      {/* Top tier */}
      <mesh receiveShadow position={[0, 0.55, 0]}>
        <cylinderGeometry args={[1.8, 2.0, 0.3, 24]} />
        <meshStandardMaterial color="#5a5a6a" roughness={0.8} />
      </mesh>

      {/* Subtle glow ring on top surface */}
      <mesh ref={ringRef} position={[0, 0.71, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.7, 1.6, 32]} />
        <meshBasicMaterial color="#44ffcc" transparent opacity={0.12} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Outer ring — appears after first formula */}
      {discoveredCount >= 1 && (
        <mesh ref={outerRingRef} position={[0, 0.71, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.8, 2.6, 32]} />
          <meshBasicMaterial color="#aa88ff" transparent opacity={0.06} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      )}
    </group>
  )
}
