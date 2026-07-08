import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../store'

/**
 * Temporary dark scorch marks left on the ground after explosions.
 * Fades out over the scorch mark's lifetime (10s).
 */
export const ScorchMarks = () => {
  const scorchMarks = useStore((s) => s.scorchMarks)
  const groupRef = useRef<THREE.Group>(null)

  useFrame(() => {
    if (!groupRef.current) return
    const now = Date.now()
    groupRef.current.children.forEach((child) => {
      const mesh = child as THREE.Mesh
      const createdAt = mesh.userData.createdAt as number
      const elapsed = now - createdAt
      const lifetime = 10000
      const opacity = Math.max(0, 1 - elapsed / lifetime)
      const mat = mesh.material as THREE.MeshBasicMaterial
      mat.opacity = opacity * 0.4
    })
  })

  if (scorchMarks.length === 0) return null

  return (
    <group ref={groupRef}>
      {scorchMarks.map((mark) => (
        <mesh
          key={mark.id}
          position={mark.position}
          rotation={[-Math.PI / 2, 0, 0]}
          userData={{ createdAt: mark.createdAt }}
        >
          <circleGeometry args={[0.6 + Math.random() * 0.4, 8]} />
          <meshBasicMaterial
            color="#111111"
            transparent
            opacity={0.4}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}
