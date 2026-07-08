import React, { useEffect, useRef, useState } from 'react'
import { useFrameThrottled } from '../hooks/useFrameThrottled'
import * as THREE from 'three'
import { getOutposts, getModuleDefs } from '../systems/ChronoOutposts'
import type { Outpost, OutpostModule } from '../systems/ChronoOutposts'
import { getInfiniteTerrainHeight } from '../world/chunkTerrain'

const MODULE_COLORS: Record<OutpostModule, string> = {
  storage: '#ffd700',
  turret: '#ff4444',
  teleporter: '#aa44ff',
  extractor: '#44ff88',
  barracks: '#44aaff',
  lab: '#ff8844',
}

const MODULE_ICONS: Record<OutpostModule, (color: string) => React.ReactNode> = {
  storage: (c) => (
    <mesh position={[0.4, 0.3, 0]}>
      <boxGeometry args={[0.12, 0.12, 0.12]} />
      <meshBasicMaterial color={c} transparent opacity={0.8} />
    </mesh>
  ),
  turret: (c) => (
    <mesh position={[-0.4, 0.3, 0]}>
      <coneGeometry args={[0.08, 0.18, 6]} />
      <meshBasicMaterial color={c} transparent opacity={0.8} />
    </mesh>
  ),
  teleporter: (c) => (
    <mesh position={[0, 0.3, 0.4]} rotation={[0, 0, 0]}>
      <torusGeometry args={[0.08, 0.03, 6, 12]} />
      <meshBasicMaterial color={c} transparent opacity={0.8} />
    </mesh>
  ),
  extractor: (c) => (
    <mesh position={[0, 0.3, -0.4]}>
      <cylinderGeometry args={[0.04, 0.1, 0.15, 6]} />
      <meshBasicMaterial color={c} transparent opacity={0.8} />
    </mesh>
  ),
  barracks: (c) => (
    <mesh position={[0.3, 0.3, 0.3]}>
      <boxGeometry args={[0.08, 0.14, 0.08]} />
      <meshBasicMaterial color={c} transparent opacity={0.8} />
    </mesh>
  ),
  lab: (c) => (
    <mesh position={[-0.3, 0.3, -0.3]}>
      <sphereGeometry args={[0.07, 6, 6]} />
      <meshBasicMaterial color={c} transparent opacity={0.8} />
    </mesh>
  ),
}

const SingleOutpost = ({ outpost }: { outpost: Outpost }) => {
  const groupRef = useRef<THREE.Group>(null)
  const domeRef = useRef<THREE.Mesh>(null)
  const beaconRef = useRef<THREE.Mesh>(null)
  const time = useRef(0)
  const terrainY = getInfiniteTerrainHeight(outpost.worldX, outpost.worldZ)

  useFrameThrottled((_, delta) => {
    time.current += delta
    if (!groupRef.current) return

    if (domeRef.current) {
      const mat = domeRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.08 + Math.sin(time.current * 0.6) * 0.04
    }
    if (beaconRef.current) {
      beaconRef.current.position.y = terrainY + 1.8 + Math.sin(time.current * 2) * 0.15
      const mat = beaconRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.4 + Math.sin(time.current * 3) * 0.2
    }
  }, 3)

  const hasTeleporter = outpost.modules.includes('teleporter')

  return (
    <group ref={groupRef} position={[outpost.worldX, terrainY, outpost.worldZ]}>
      {/* Territory ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[2, 3, 32]} />
        <meshBasicMaterial color="#44ffcc" transparent opacity={0.06} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* Main platform */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[1, 1.2, 0.2, 8]} />
        <meshStandardMaterial color="#334455" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Center tower */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.15, 0.3, 0.8, 8]} />
        <meshStandardMaterial color="#556677" emissive="#88aacc" emissiveIntensity={0.1} metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Core crystal */}
      <mesh position={[0, 0.8, 0]}>
        <octahedronGeometry args={[0.12, 0]} />
        <meshStandardMaterial color="#44ffcc" emissive="#44ffcc" emissiveIntensity={0.6} metalness={0.8} roughness={0.1} />
      </mesh>
      {/* Module indicators */}
      {outpost.modules.map(mod => MODULE_ICONS[mod](MODULE_COLORS[mod]))}
      {/* Beacon light */}
      <mesh ref={beaconRef} position={[0, terrainY + 1.8, 0]}>
        <sphereGeometry args={[0.05, 6, 6]} />
        <meshBasicMaterial color="#44ffcc" transparent opacity={0.4} />
      </mesh>
      {/* Health bar */}
      <mesh position={[0, 1.3, 0]}>
        <planeGeometry args={[0.8, 0.04]} />
        <meshBasicMaterial color="#333333" depthWrite={false} />
      </mesh>
      <mesh position={[-(1 - outpost.health / outpost.maxHealth) * 0.4, 1.3, 0.001]}>
        <planeGeometry args={[0.8 * (outpost.health / outpost.maxHealth), 0.04]} />
        <meshBasicMaterial color="#44ffcc" depthWrite={false} />
      </mesh>
      {/* Level indicator */}
      <mesh position={[0, -0.2, 0]}>
        <planeGeometry args={[0.2, 0.06]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.4} depthWrite={false} />
      </mesh>
      {/* Teleporter ring effect */}
      {hasTeleporter && (
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.35, 0]}>
          <ringGeometry args={[0.35, 0.5, 24]} />
          <meshBasicMaterial color="#aa44ff" transparent opacity={0.15} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}

const OutpostDome = () => {
  const ref = useRef<THREE.Mesh>(null)
  const outposts = getOutposts().filter(o => o.active)

  useFrameThrottled((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime
    const s = 0.92 + Math.sin(t * 0.3) * 0.02
    ref.current.scale.setScalar(s)
  }, 4)

  if (outposts.length === 0) return null

  return (
    <mesh ref={ref} position={[0, 0, 0]}>
      <sphereGeometry args={[50, 32, 16]} />
      <meshBasicMaterial color="#44ffcc" transparent opacity={0.015} wireframe depthWrite={false} side={THREE.BackSide} />
    </mesh>
  )
}

export const OutpostRenderer = () => {
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const handler = () => setVersion(v => v + 1)
    window.addEventListener('outpost-built', handler)
    window.addEventListener('outpost-destroyed', handler)
    return () => {
      window.removeEventListener('outpost-built', handler)
      window.removeEventListener('outpost-destroyed', handler)
    }
  }, [])

  const outposts = getOutposts().filter(o => o.active)

  return (
    <group>
      <OutpostDome />
      {outposts.map(o => (
        <SingleOutpost key={o.id + version} outpost={o} />
      ))}
    </group>
  )
}
