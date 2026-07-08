import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getClaims } from '../systems/ChronoOutposts'
import { getInfiniteTerrainHeight } from '../world/chunkTerrain'

const CHUNK_SIZE = 32

const ClaimTile = ({ claim }: { claim: import('../systems/ChronoOutposts').TerritoryClaim }) => {
  const borderRef = useRef<THREE.Group>(null)
  const time = useRef(0)
  const worldX = claim.chunkX * CHUNK_SIZE + CHUNK_SIZE / 2
  const worldZ = claim.chunkZ * CHUNK_SIZE + CHUNK_SIZE / 2
  const terrainY = getInfiniteTerrainHeight(worldX, worldZ)
  const hasOutpost = claim.outpostId !== null
  const color = claim.color || '#44ffcc'

  useFrame((_, delta) => {
    time.current += delta
    if (!borderRef.current) return
    const pulse = hasOutpost ? 0.05 + Math.sin(time.current * 0.8) * 0.02 : 0.03
    borderRef.current.children.forEach(child => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshBasicMaterial
        mat.opacity = pulse
      }
    })
  })

  return (
    <group position={[worldX, terrainY + 0.03, worldZ]}>
      {/* Claimed territory fill */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[CHUNK_SIZE - 0.5, CHUNK_SIZE - 0.5]} />
        <meshBasicMaterial color={color} transparent opacity={hasOutpost ? 0.04 : 0.02} depthWrite={false} />
      </mesh>
      {/* Border lines */}
      <group ref={borderRef}>
        {[
          [-CHUNK_SIZE / 2 + 0.25, -CHUNK_SIZE / 2 + 0.25, CHUNK_SIZE - 0.5, 0.1],
          [-CHUNK_SIZE / 2 + 0.25, CHUNK_SIZE / 2 - 0.25, CHUNK_SIZE - 0.5, 0.1],
          [-CHUNK_SIZE / 2 + 0.25, -CHUNK_SIZE / 2 + 0.25, 0.1, CHUNK_SIZE - 0.5],
          [CHUNK_SIZE / 2 - 0.25, -CHUNK_SIZE / 2 + 0.25, 0.1, CHUNK_SIZE - 0.5],
        ].map(([x, z, w, h], i) => (
          <mesh key={i} position={[x, 0, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[w as number, h as number]} />
            <meshBasicMaterial color={color} transparent opacity={hasOutpost ? 0.06 : 0.03} depthWrite={false} />
          </mesh>
        ))}
      </group>
      {/* Outpost indicator - tall beacon */}
      {hasOutpost && (
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.03, 0.06, 1, 6]} />
          <meshBasicMaterial color={color} transparent opacity={0.15} />
        </mesh>
      )}
    </group>
  )
}

export const TerritoryClaimOverlay = () => {
  const claims = getClaims()
  if (claims.length === 0) return null

  return (
    <group>
      {claims.map(c => (
        <ClaimTile key={c.id} claim={c} />
      ))}
    </group>
  )
}
