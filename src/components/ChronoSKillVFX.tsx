import { useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { useFrameThrottled } from '../hooks/useFrameThrottled'
import * as THREE from 'three'
import { isChronoShieldActive } from '../skills/ChronoSKills'

// ── Chrono Shield 3D sphere that follows the player ─
export const ChronoShieldVFX = () => {
  const meshRef = useRef<THREE.Mesh>(null)
  const wireRef = useRef<THREE.Mesh>(null)
  const time = useRef(0)

  useFrameThrottled((_, delta) => {
    time.current += delta
    const active = isChronoShieldActive()
    if (!meshRef.current || !wireRef.current) return

    // Follow camera/player
    const cam = (useThree as any).getState().camera
    meshRef.current.position.copy(cam.position)
    meshRef.current.position.y -= 0.3
    wireRef.current.position.copy(meshRef.current.position)

    if (active) {
      meshRef.current.visible = true
      wireRef.current.visible = true
      const pulse = 0.12 + Math.sin(time.current * 4) * 0.06
      ;(meshRef.current.material as THREE.MeshBasicMaterial).opacity = pulse
      ;(wireRef.current.material as THREE.MeshBasicMaterial).opacity = pulse * 0.8
      meshRef.current.scale.setScalar(1 + Math.sin(time.current * 3) * 0.05)
      wireRef.current.scale.setScalar(1.05 + Math.sin(time.current * 3) * 0.05)
      meshRef.current.rotation.y += delta * 0.5
    } else {
      meshRef.current.visible = false
      wireRef.current.visible = false
    }
  }, 2)

  return (
    <group>
      <mesh ref={meshRef} visible={false}>
        <sphereGeometry args={[1.2, 16, 16]} />
        <meshBasicMaterial color="#ffcc44" transparent opacity={0.1} depthWrite={false} side={THREE.BackSide} />
      </mesh>
      <mesh ref={wireRef} visible={false}>
        <sphereGeometry args={[1.25, 8, 8]} />
        <meshBasicMaterial color="#ffcc44" transparent opacity={0.08} wireframe depthWrite={false} />
      </mesh>
    </group>
  )
}

// ── Time Freeze tint overlay (React DOM, not 3D) ───
// Rendered as part of the existing overlay system
