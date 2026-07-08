import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { useFrameThrottled } from '../hooks/useFrameThrottled'
import { ISLAND_SIZE } from '../config/constants'

const FOG_SIZE = ISLAND_SIZE * 1.5
const FOG_PATCHES = 20

export const GroundFog = () => {
  const groupRef = useRef<THREE.Group>(null)
  const time = useRef(0)

  const patches = useMemo(() => {
    return Array.from({ length: FOG_PATCHES }, (_, i) => ({
      pos: [
        (Math.random() - 0.5) * FOG_SIZE * 0.8,
        0.1 + Math.random() * 0.3,
        (Math.random() - 0.5) * FOG_SIZE * 0.8,
      ] as [number, number, number],
      size: 5 + Math.random() * 15,
      rot: Math.random() * Math.PI,
      speed: 0.03 + Math.random() * 0.05,
      phase: i * 1.1,
      opacity: 0.04 + Math.random() * 0.06,
    }))
  }, [])

  useFrameThrottled((_, delta) => {
    time.current += delta
    if (!groupRef.current) return

    groupRef.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh
      const p = patches[i]
      const t = time.current * p.speed + p.phase

      mesh.position.x = p.pos[0] + Math.sin(t * 0.5) * 8
      mesh.position.z = p.pos[2] + Math.cos(t * 0.4 + p.phase) * 8
      mesh.position.y = p.pos[1] + Math.sin(t * 0.7) * 0.05

      // Scale breathing
      const scalePulse = 1 + Math.sin(t * 0.3) * 0.1
      mesh.scale.set(scalePulse, scalePulse, 1)

      const mat = mesh.material as THREE.MeshBasicMaterial
      mat.opacity = p.opacity * (0.5 + Math.sin(t * 0.4 + p.phase) * 0.5)
    })
  }, 2) // throttled: ground fog drift, every ~2nd frame

  return (
    <group ref={groupRef}>
      {patches.map((p, i) => (
        <mesh
          key={`fog-${i}`}
          position={p.pos}
          rotation={[-Math.PI / 2, 0, p.rot]}
        >
          <planeGeometry args={[p.size, p.size * (0.6 + Math.random() * 0.4)]} />
          <meshBasicMaterial
            color="#8899bb"
            transparent
            opacity={p.opacity}
            depthWrite={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  )
}
