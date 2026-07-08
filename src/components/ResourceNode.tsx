import { useMemo, useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { generateWorldResources, findNodesNear } from '../world/oreGeneration'
import type { ResourceNode } from '../world/oreGeneration'

// Export shared WORLD_NODES for use by other modules (e.g., InteractionHandler)
// to avoid duplicate generation calls.
export const WORLD_NODES = generateWorldResources()

/**
 * Single underground resource node rendered as a floating crystal/gem.
 * Glows with its resource color, pulses gently, has a subtle hover animation.
 * Sets interactable userData on the mesh for InteractionScanner to detect.
 */
const ResourceCrystal = ({ node, interactable = false }: { node: ResourceNode; interactable?: boolean }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const baseY = node.y + 0.25
  const color = node.color

  // Set interactable userData on mount — includes node position for depletion lookup
  useEffect(() => {
    if (meshRef.current && interactable) {
      meshRef.current.userData.interactable = true
      meshRef.current.userData.type = 'resource'
      meshRef.current.userData.prompt = '[Click] Harvest ' + node.label
      meshRef.current.userData.resourceAmount = 5
    }
  }, [interactable, node.label])

  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.elapsedTime
    const float = Math.sin(t * 0.5 + node.x * 0.1 + node.z * 0.07) * 0.08
    meshRef.current.position.y = baseY + float
    const pulse = 0.3 + Math.sin(t * 0.8 + node.x * 0.05) * 0.15
    const mat = meshRef.current.material as THREE.MeshStandardMaterial
    mat.emissiveIntensity = pulse
  })

  return (
    <mesh
      ref={meshRef}
      position={[node.x + 0.5, baseY, node.z + 0.5]}
      castShadow
    >
      <octahedronGeometry args={[0.15, 0]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.4}
        roughness={0.2}
        metalness={0.3}
        transparent
        opacity={0.9}
      />
    </mesh>
  )
}

/**
 * Glowing ring indicator beneath a resource node.
 */
const ResourceRing = ({ node }: { node: ResourceNode }) => {
  const ringRef = useRef<THREE.Mesh>(null)
  const color = node.color

  useFrame((state) => {
    if (!ringRef.current) return
    const t = state.clock.elapsedTime
    const scale = 0.4 + Math.sin(t * 0.6 + node.x * 0.03) * 0.08
    ringRef.current.scale.set(scale, scale, scale)
    const mat = ringRef.current.material as THREE.MeshBasicMaterial
    mat.opacity = 0.15 + Math.sin(t * 0.7 + node.z * 0.04) * 0.08
  })

  return (
    <mesh
      ref={ringRef}
      position={[node.x + 0.5, node.y - 0.1, node.z + 0.5]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <ringGeometry args={[0.2, 0.35, 24]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.2}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}

/**
 * Subsurface beam connecting the node upward to the surface.
 */
const ResourceBeam = ({ node }: { node: ResourceNode }) => {
  const beamRef = useRef<THREE.Mesh>(null)
  const height = Math.max(0.5, -node.y + 0.5)

  useFrame((state) => {
    if (!beamRef.current) return
    const mat = beamRef.current.material as THREE.MeshBasicMaterial
    mat.opacity = 0.08 + Math.sin(state.clock.elapsedTime * 0.3 + node.x * 0.02) * 0.04
  })

  return (
    <mesh
      ref={beamRef}
      position={[node.x + 0.5, (node.y + 0.5) / 2, node.z + 0.5]}
      scale={[0.015, height, 0.015]}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial
        color={node.color}
        transparent
        opacity={0.08}
        depthWrite={false}
      />
    </mesh>
  )
}

/**
 * Renders all resource nodes in the world.
 * Uses frame-count throttle — only queries nearby nodes every ~3s.
 */
export const ResourceNodeManager = () => {
  const frameCountRef = useRef(0)
  const [visibleNodes, setVisibleNodes] = useState<ResourceNode[]>([])

  useFrame(({ camera }) => {
    frameCountRef.current++
    if (frameCountRef.current % 180 !== 0) return
    const near = findNodesNear(WORLD_NODES, camera.position.x, camera.position.y, camera.position.z, 40)
    setVisibleNodes(near.filter(n => !n.depleted))
  })

  // Show surface-near nodes initially
  const initialNodes = useMemo(() =>
    WORLD_NODES.filter(n => !n.depleted && n.y > -5).slice(0, 100),
  [])

  const renderNodes = visibleNodes.length > 0 ? visibleNodes : initialNodes

  if (renderNodes.length === 0) return null

  return (
    <group>
      {renderNodes.map((node) => (
        <group key={node.id}>
          <ResourceCrystal node={node} interactable={true} />
          <ResourceRing node={node} />
          <ResourceBeam node={node} />
        </group>
      ))}
    </group>
  )
}
