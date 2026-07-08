import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrameThrottled } from '../hooks/useFrameThrottled'
const SHADOW_COUNT = 6
const SIZE = 80

export const CloudShadows = () => {
  const groupRef = useRef<THREE.Group>(null)
  const time = useRef(0)

  const shadows = useMemo(() => {
    return Array.from({ length: SHADOW_COUNT }, () => ({
      x: (Math.random() - 0.5) * SIZE,
      z: (Math.random() - 0.5) * SIZE,
      scale: 5 + Math.random() * 15,
      speed: 0.3 + Math.random() * 0.5,
      opacity: 0.02 + Math.random() * 0.04,
      phase: Math.random() * Math.PI * 2,
      angle: Math.random() * Math.PI * 2,
    }))
  }, [])

  useFrameThrottled((_, delta) => {
    time.current += delta * 0.3
    if (!groupRef.current) return

    const children = groupRef.current.children as THREE.Mesh[]
    children.forEach((child, i) => {
      const s = shadows[i]
      const drift = time.current * s.speed
      const wobble = Math.sin(time.current * 0.2 + s.phase) * 5
      child.position.x = s.x + drift + wobble
      child.position.z = s.z + Math.cos(time.current * 0.15 + s.phase) * 5

      // Wrap around
      const half = SIZE * 0.5
      if (child.position.x > half) { child.position.x -= SIZE; s.x -= SIZE }
      if (child.position.x < -half) { child.position.x += SIZE; s.x += SIZE }
      if (child.position.z > half) { child.position.z -= SIZE; s.z -= SIZE }
      if (child.position.z < -half) { child.position.z += SIZE; s.z += SIZE }

      const mat = child.material as THREE.MeshBasicMaterial
      mat.opacity = s.opacity * (0.6 + Math.sin(time.current * 0.5 + s.phase) * 0.4)
    })
  }, 3) // throttled: cloud shadows are subtle, update every ~3rd frame

  return (
    <group ref={groupRef}>
      {shadows.map((s, i) => (
        <mesh
          key={i}
          position={[s.x, 0.15, s.z]}
          rotation={[-Math.PI / 2, 0, s.angle]}
        >
          <planeGeometry args={[s.scale, s.scale * (0.5 + Math.random() * 0.5)]} />
          <meshBasicMaterial
            color="#000000"
            transparent
            opacity={s.opacity}
            depthWrite={false}
            blending={THREE.MultiplyBlending}
            premultipliedAlpha
          />
        </mesh>
      ))}
    </group>
  )
}
