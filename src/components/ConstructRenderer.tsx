import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getDeployed, getConstructDef } from '../systems/AutomationConstructs'
import type { DeployedConstruct, ConstructType } from '../systems/AutomationConstructs'
import { getInfiniteTerrainHeight } from '../world/chunkTerrain'

const CONSTRUCT_COLORS: Record<ConstructType, string> = {
  harvester: '#ffd700',
  sentinel: '#ff4444',
  builder: '#44aaff',
  explorer: '#aa44ff',
}

const SingleConstruct = ({ construct }: { construct: DeployedConstruct }) => {
  const groupRef = useRef<THREE.Group>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const time = useRef(0)
  const def = getConstructDef(construct.defId)
  const color = def ? CONSTRUCT_COLORS[def.type] || '#ffffff' : '#ffffff'
  const terrainY = getInfiniteTerrainHeight(construct.x, construct.z)

  useFrame((_, delta) => {
    if (!def) return
    time.current += delta
    time.current += delta
    if (!groupRef.current) return
    groupRef.current.position.y = terrainY + 0.5 + Math.sin(time.current * 1.5 + construct.x * 0.1) * 0.15
    if (ringRef.current) {
      ringRef.current.rotation.x = time.current * 0.5
      ringRef.current.rotation.z = time.current * 0.3
    }
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.3 + Math.sin(time.current * 2 + construct.x * 0.05) * 0.15
    }
  })

  const renderConstructMesh = () => {
    if (!def) return null
    switch (def.type) {
      case 'harvester':
        return (
          <group>
            <mesh>
              <torusGeometry args={[0.4, 0.08, 12, 24]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} metalness={0.6} roughness={0.3} />
            </mesh>
            <mesh ref={ringRef} position={[0, 0.15, 0]}>
              <torusGeometry args={[0.3, 0.05, 8, 20]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} metalness={0.4} roughness={0.4} transparent opacity={0.7} />
            </mesh>
            <mesh position={[0, -0.15, 0]}>
              <coneGeometry args={[0.15, 0.3, 6]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} metalness={0.5} roughness={0.3} />
            </mesh>
          </group>
        )
      case 'sentinel':
        return (
          <group>
            <mesh>
              <dodecahedronGeometry args={[0.35, 0]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} metalness={0.7} roughness={0.2} />
            </mesh>
            <mesh ref={glowRef} scale={[1.4, 1.4, 1.4]}>
              <dodecahedronGeometry args={[0.35, 0]} />
              <meshBasicMaterial color={color} transparent opacity={0.15} depthWrite={false} />
            </mesh>
          </group>
        )
      case 'builder':
        return (
          <group>
            <mesh ref={ringRef}>
              <boxGeometry args={[0.4, 0.4, 0.4]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} metalness={0.5} roughness={0.3} />
            </mesh>
            {[0, 1, 2, 3].map((i) => (
              <mesh key={i} position={[Math.cos(i * Math.PI / 2) * 0.35, 0, Math.sin(i * Math.PI / 2) * 0.35]}>
                <boxGeometry args={[0.08, 0.08, 0.08]} />
                <meshBasicMaterial color={color} transparent opacity={0.6} />
              </mesh>
            ))}
          </group>
        )
      case 'explorer':
        return (
          <group>
            <mesh>
              <octahedronGeometry args={[0.3, 0]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} metalness={0.6} roughness={0.2} />
            </mesh>
            <mesh position={[0, 0.3, 0]}>
              <coneGeometry args={[0.06, 0.2, 4]} />
              <meshBasicMaterial color={color} transparent opacity={0.7} />
            </mesh>
            <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
              <ringGeometry args={[0.25, 0.3, 24]} />
              <meshBasicMaterial color={color} transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
          </group>
        )
    }
  }

  if (!def) return null

  return (
    <group ref={groupRef} position={[construct.x, terrainY, construct.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <ringGeometry args={[0.3, 0.45, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.9, 0]}>
        <planeGeometry args={[0.5, 0.04]} />
        <meshBasicMaterial color="#333333" depthWrite={false} />
      </mesh>
      <mesh position={[-(1 - construct.health / construct.maxHealth) * 0.25, 0.9, 0.001]}>
        <planeGeometry args={[0.5 * (construct.health / construct.maxHealth), 0.04]} />
        <meshBasicMaterial color={color} depthWrite={false} />
      </mesh>
      {renderConstructMesh()}
      <mesh position={[0, -0.55, 0]}>
        <planeGeometry args={[0.3, 0.08]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.5} depthWrite={false} />
      </mesh>
    </group>
  )
}

export const ConstructRenderer = () => {
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const handler = () => setVersion(v => v + 1)
    window.addEventListener('construct-deployed', handler)
    window.addEventListener('construct-destroyed', handler)
    window.addEventListener('construct-recalled', handler)
    return () => {
      window.removeEventListener('construct-deployed', handler)
      window.removeEventListener('construct-destroyed', handler)
      window.removeEventListener('construct-recalled', handler)
    }
  }, [])

  const constructs = getDeployed().filter(c => c.active)

  return (
    <group>
      {constructs.map(c => (
        <SingleConstruct key={c.id + version} construct={c} />
      ))}
    </group>
  )
}
