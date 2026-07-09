import { useRef, useState, useEffect } from 'react'
import { useFrameThrottled } from '../hooks/useFrameThrottled'
import * as THREE from 'three'
import { getPOIs } from '../systems/POISystem'
import type { POIType, POIInstance } from '../systems/POISystem'
import { getInfiniteTerrainHeight } from '../world/chunkTerrain'

const POI_COLORS: Record<POIType, string> = {
  ruin: '#ff8844',
  crystal_formation: '#aa88ff',
  temporal_shrine: '#44ffcc',
  crash_site: '#ff4444',
  ancient_lab: '#44aaff',
  time_wound: '#ff00ff',
}

const SinglePOIMarker = ({ poi }: { poi: POIInstance }) => {
  const groupRef = useRef<THREE.Group>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const time = useRef(0)
  const color = POI_COLORS[poi.type] || '#ffffff'
  const terrainY = getInfiniteTerrainHeight(poi.x, poi.z)

  useFrameThrottled((_, delta) => {
    time.current += delta
    if (!groupRef.current) return

    groupRef.current.position.y = terrainY + 0.3 + Math.sin(time.current * 1.2 + poi.x * 0.1) * 0.1

    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.2 + Math.sin(time.current * 2 + poi.x * 0.05) * 0.1
      const scale = 1 + Math.sin(time.current * 1.5) * 0.1
      glowRef.current.scale.setScalar(scale)
    }
  }, 3)

  const renderPOIMesh = () => {
    switch (poi.type) {
      case 'ruin':
        return (
          <group>
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[0.15, 0.4, 0.15]} />
              <meshStandardMaterial color="#887766" roughness={0.9} />
            </mesh>
            <mesh position={[0.1, -0.05, 0.08]}>
              <boxGeometry args={[0.08, 0.15, 0.08]} />
              <meshStandardMaterial color="#776655" roughness={0.9} />
            </mesh>
            <mesh position={[-0.08, -0.1, -0.07]}>
              <boxGeometry args={[0.06, 0.1, 0.06]} />
              <meshStandardMaterial color="#665544" roughness={0.9} />
            </mesh>
          </group>
        )
      case 'crystal_formation':
        return (
          <group>
            <mesh position={[0, 0.1, 0]}>
              <octahedronGeometry args={[0.15, 0]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} metalness={0.3} roughness={0.2} transparent opacity={0.9} />
            </mesh>
            <mesh position={[0.08, 0, 0.06]} scale={[0.6, 0.6, 0.6]}>
              <octahedronGeometry args={[0.15, 0]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} metalness={0.3} roughness={0.2} transparent opacity={0.7} />
            </mesh>
          </group>
        )
      case 'temporal_shrine':
        return (
          <group>
            <mesh>
              <cylinderGeometry args={[0.1, 0.18, 0.3, 6]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} metalness={0.5} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.2, 0]}>
              <torusGeometry args={[0.1, 0.03, 6, 12]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} metalness={0.6} roughness={0.2} />
            </mesh>
          </group>
        )
      case 'crash_site':
        return (
          <group>
            <mesh position={[0.06, 0, 0.06]} rotation={[0.1, 0.3, 0.1]}>
              <boxGeometry args={[0.12, 0.04, 0.08]} />
              <meshStandardMaterial color="#887744" roughness={0.8} metalness={0.4} />
            </mesh>
            <mesh position={[-0.05, 0.02, -0.04]} rotation={[0.2, -0.2, 0.1]}>
              <boxGeometry args={[0.08, 0.03, 0.06]} />
              <meshStandardMaterial color="#997755" roughness={0.8} metalness={0.3} />
            </mesh>
            <mesh position={[0.02, 0, -0.07]} rotation={[0.3, 0.1, -0.1]}>
              <boxGeometry args={[0.06, 0.02, 0.04]} />
              <meshStandardMaterial color="#aa8866" roughness={0.8} metalness={0.2} />
            </mesh>
            <mesh position={[0, 0.01, 0]}>
              <sphereGeometry args={[0.03, 6, 6]} />
              <meshBasicMaterial color="#ff4444" transparent opacity={0.5} />
            </mesh>
          </group>
        )
      case 'ancient_lab':
        return (
          <group>
            <mesh>
              <cylinderGeometry args={[0.2, 0.15, 0.15, 8]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} metalness={0.6} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.12, 0]}>
              <torusGeometry args={[0.15, 0.02, 6, 16]} />
              <meshBasicMaterial color={color} transparent opacity={0.6} />
            </mesh>
          </group>
        )
      case 'time_wound':
        return (
          <group>
            <mesh ref={glowRef}>
              <sphereGeometry args={[0.15, 8, 8]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} metalness={0.2} roughness={0.1} transparent opacity={0.8} />
            </mesh>
            <mesh scale={[1.5, 1.5, 1.5]}>
              <sphereGeometry args={[0.15, 6, 6]} />
              <meshBasicMaterial color={color} transparent opacity={0.1} wireframe depthWrite={false} />
            </mesh>
          </group>
        )
    }
  }

  return (
    <group ref={groupRef} position={[poi.x, terrainY, poi.z]}>
      {/* Ground ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.25, 0.4, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* POI mesh */}
      {renderPOIMesh()}
    </group>
  )
}

export const POIMarkers = () => {
  const [, refresh] = useState(0)

  useEffect(() => {
    const handler = () => refresh(v => v + 1)
    window.addEventListener('poi-discovered', handler)
    return () => window.removeEventListener('poi-discovered', handler)
  }, [])

  const pois = getPOIs().filter(p => p.discovered)

  return (
    <group>
      {pois.map(p => (
        <SinglePOIMarker key={p.id} poi={p} />
      ))}
    </group>
  )
}
