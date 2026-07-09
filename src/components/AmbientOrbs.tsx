import { useRef } from 'react'
import * as THREE from 'three'
import { useFrameThrottled } from '../hooks/useFrameThrottled'
import { getInfiniteTerrainHeight } from '../world/chunkTerrain'

const ORB_POSITIONS: [number, number][] = [
  [5, 5], [-5, -5], [10, -8], [-8, 10], [15, 0], [0, 15],
  [-12, -8], [8, -12], [-15, 5], [5, -15], [20, 10], [-20, -10],
  [10, 20], [-10, -20], [25, -5], [-25, 5], [0, -25], [30, 0],
]

const ORB_COLORS = ['#44ffcc', '#4488ff', '#ff66aa', '#ffcc44', '#aa88ff', '#44ff88']

export const AmbientOrbs = () => {
  return (
    <group>
      {ORB_POSITIONS.map((pos, i) => (
        <FloatingOrb key={i} px={pos[0]} pz={pos[1]} index={i} />
      ))}
    </group>
  )
}

const FloatingOrb = ({ px, pz, index }: { px: number; pz: number; index: number }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const time = useRef(Math.random() * 100)
  const terrainY = getInfiniteTerrainHeight(px, pz)
  const baseY = terrainY + 2 + Math.random() * 3
  const color = ORB_COLORS[index % ORB_COLORS.length]
  const speed = 0.3 + Math.random() * 0.5

  useFrameThrottled((_, delta) => {
    time.current += delta * speed
    if (!meshRef.current || !glowRef.current) return
    const bob = Math.sin(time.current) * 0.5
    const driftX = Math.sin(time.current * 0.3 + index) * 0.3
    const driftZ = Math.cos(time.current * 0.4 + index) * 0.3
    meshRef.current.position.set(px + driftX, baseY + bob, pz + driftZ)
    glowRef.current.position.set(px + driftX, baseY + bob, pz + driftZ)
    const pulse = 0.4 + Math.sin(time.current * 2 + index) * 0.3
    meshRef.current.scale.setScalar(0.8 + pulse * 0.3)
    ;(glowRef.current.material as THREE.MeshBasicMaterial).opacity = pulse * 0.12
  }, 3) // throttled: update every ~3rd frame

  return (
    <group>
      <mesh ref={meshRef} position={[px, baseY, pz]}>
        <dodecahedronGeometry args={[0.08, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} transparent opacity={0.6} />
      </mesh>
      <mesh ref={glowRef} position={[px, baseY, pz]}>
        <sphereGeometry args={[0.5, 6, 6]} />
        <meshBasicMaterial color={color} transparent opacity={0.1} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  )
}
