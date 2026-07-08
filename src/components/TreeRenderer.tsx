import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getTerrainHeight } from '../terrain'
import { getBiomeAt, BIOMES } from '../world/biome'
import { ISLAND_SIZE } from '../config/constants'

/** Generate tree positions scattered across the island, varying by biome.
 * Uses size tiers (Small/Medium/Big) ported from arnis-main's tree schematic system.
 */
function generateTreePositions(seed: number = 42): [number, number, number, number, number, number][] {
  let s = seed
  const rand = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
  const trees: [number, number, number, number, number, number][] = []
  const treeCount = 350
  for (let i = 0; i < treeCount; i++) {
    const x = (rand() - 0.5) * ISLAND_SIZE * 0.88
    const z = (rand() - 0.5) * ISLAND_SIZE * 0.88
    if (Math.abs(x) < 8 && Math.abs(z) < 8) continue
    const y = getTerrainHeight(x, z)
    if (y < -0.3 || Math.abs(y) > 1.5) continue

    const biome = getBiomeAt(x, z)
    const props = BIOMES[biome]

    // Tree density filter per biome
    const densityRoll = rand()
    if (densityRoll > props.treeDensity) continue

    // Size tier: Small (0) / Medium (1) / Big (2)
    const sizeRoll = rand()
    const sizeTier = sizeRoll < 0.35 ? 0 : sizeRoll < 0.75 ? 1 : 2
    const sizeScale = sizeTier === 0 ? 0.5 + rand() * 0.2 : sizeTier === 1 ? 0.7 + rand() * 0.3 : 1.0 + rand() * 0.5

    const variants = props.treeVariants
    let variant = variants.length > 0 ? variants[Math.floor(rand() * variants.length)] : 3
    const scale = (0.4 + rand() * 0.6) * sizeScale

    trees.push([x, y, z, scale, variant, sizeTier])
  }
  return trees
}

const TREE_POSITIONS = generateTreePositions()

/** Shared wind phase for all trees */
let globalWindPhase = 0
export const tickWind = (delta: number) => {
  globalWindPhase += delta * 0.6
}

/**
 * Tree wind sway data stored per-tree in a shared registry.
 * Instead of 350 individual useFrame hooks, TreeRenderer runs
 * a single loop over this registry each frame.
 */
interface TreeWindEntry {
  ref: React.RefObject<THREE.Group | null>
  speed: number
  amp: number
  phase: number
}
const treeWindRegistry: TreeWindEntry[] = []

export const tickTreeWind = () => {
  for (let i = 0; i < treeWindRegistry.length; i++) {
    const entry = treeWindRegistry[i]
    const group = entry.ref.current
    if (!group) continue
    const wind = Math.sin(globalWindPhase * entry.speed + entry.phase) * entry.amp
    const wind2 = Math.sin(globalWindPhase * entry.speed * 0.7 + entry.phase * 1.3) * entry.amp * 0.3
    group.rotation.z = wind + wind2
    group.rotation.x = wind2 * 0.5
  }
}

const useWindSway = (speed: number, amp: number) => {
  const groupRef = useRef<THREE.Group>(null)
  const phase = useRef(Math.random() * 100)

  useEffect(() => {
    const entry: TreeWindEntry = { ref: groupRef, speed, amp, phase: phase.current }
    treeWindRegistry.push(entry)
    return () => {
      const idx = treeWindRegistry.indexOf(entry)
      if (idx >= 0) treeWindRegistry.splice(idx, 1)
    }
  }, [speed, amp])

  return groupRef
}

const TreeVariant0 = ({ position, scale }: { position: [number, number, number]; scale: number }) => {
  const s = scale
  const groupRef = useWindSway(0.8 + Math.random() * 0.3, 0.015 + Math.random() * 0.01)
  return (
    <group ref={groupRef} position={position}>
      <mesh receiveShadow castShadow position={[0, 0.5 * s, 0]}>
        <cylinderGeometry args={[0.08 * s, 0.15 * s, 1 * s, 5]} />
        <meshStandardMaterial color="#4a3a2a" roughness={0.9} />
      </mesh>
      <mesh receiveShadow castShadow position={[0, 1.3 * s, 0]}>
        <sphereGeometry args={[0.55 * s, 7, 7]} />
        <meshStandardMaterial color="#3a7a4a" roughness={0.8} />
      </mesh>
      <mesh receiveShadow castShadow position={[0.3 * s, 0.9 * s, 0.2 * s]}>
        <sphereGeometry args={[0.4 * s, 7, 7]} />
        <meshStandardMaterial color="#4a8a5a" roughness={0.8} />
      </mesh>
    </group>
  )
}

const TreeVariant1 = ({ position, scale }: { position: [number, number, number]; scale: number }) => {
  const s = scale
  const groupRef = useWindSway(0.6 + Math.random() * 0.2, 0.02 + Math.random() * 0.015)
  return (
    <group ref={groupRef} position={position}>
      <mesh receiveShadow castShadow position={[0, 0.6 * s, 0]}>
        <cylinderGeometry args={[0.06 * s, 0.12 * s, 1.2 * s, 5]} />
        <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
      </mesh>
      <mesh receiveShadow castShadow position={[0, 1.5 * s, 0]}>
        <coneGeometry args={[0.6 * s, 1.2 * s, 7]} />
        <meshStandardMaterial color="#2a6a3a" roughness={0.8} />
      </mesh>
      <mesh receiveShadow castShadow position={[0, 2.2 * s, 0]}>
        <coneGeometry args={[0.4 * s, 0.8 * s, 7]} />
        <meshStandardMaterial color="#3a7a4a" roughness={0.8} />
      </mesh>
    </group>
  )
}

const TreeVariant2 = ({ position, scale }: { position: [number, number, number]; scale: number }) => {
  const s = scale
  const groupRef = useWindSway(1.0 + Math.random() * 0.4, 0.012 + Math.random() * 0.008)
  return (
    <group ref={groupRef} position={position}>
      <mesh receiveShadow castShadow position={[0, 0.4 * s, 0]}>
        <cylinderGeometry args={[0.07 * s, 0.1 * s, 0.8 * s, 5]} />
        <meshStandardMaterial color="#3a2a1a" roughness={0.9} />
      </mesh>
      <mesh receiveShadow castShadow position={[0, 0.9 * s, 0]}>
        <cylinderGeometry args={[0.5 * s, 0.6 * s, 0.3 * s, 7]} />
        <meshStandardMaterial color="#4a8a5a" roughness={0.8} />
      </mesh>
      <mesh receiveShadow castShadow position={[0.2 * s, 1.0 * s, 0.1 * s]}>
        <cylinderGeometry args={[0.35 * s, 0.45 * s, 0.25 * s, 7]} />
        <meshStandardMaterial color="#3a7a4a" roughness={0.8} />
      </mesh>
    </group>
  )
}

const TreeVariant3 = ({ position, scale }: { position: [number, number, number]; scale: number }) => {
  const s = scale
  const groupRef = useWindSway(0.4 + Math.random() * 0.2, 0.02 + Math.random() * 0.01)
  return (
    <group ref={groupRef} position={position}>
      <mesh receiveShadow castShadow position={[0.15 * s, 0.15 * s, 0.1 * s]}>
        <sphereGeometry args={[0.25 * s, 7, 7]} />
        <meshStandardMaterial color="#3a7a3a" roughness={0.9} />
      </mesh>
      <mesh receiveShadow castShadow position={[-0.12 * s, 0.1 * s, -0.1 * s]}>
        <sphereGeometry args={[0.2 * s, 7, 7]} />
        <meshStandardMaterial color="#4a8a4a" roughness={0.9} />
      </mesh>
      <mesh receiveShadow castShadow position={[0, 0.22 * s, -0.08 * s]}>
        <sphereGeometry args={[0.22 * s, 7, 7]} />
        <meshStandardMaterial color="#2a6a3a" roughness={0.85} />
      </mesh>
      <mesh receiveShadow castShadow position={[-0.05 * s, 0.05 * s, 0.12 * s]}>
        <sphereGeometry args={[0.18 * s, 7, 7]} />
        <meshStandardMaterial color="#5a9a4a" roughness={0.85} />
      </mesh>
    </group>
  )
}

const TreeVariant4 = ({ position, scale }: { position: [number, number, number]; scale: number }) => {
  const s = scale
  const groupRef = useWindSway(0.7 + Math.random() * 0.3, 0.025 + Math.random() * 0.015)
  return (
    <group ref={groupRef} position={position}>
      <mesh receiveShadow castShadow position={[0, 0.3 * s, 0]}>
        <cylinderGeometry args={[0.06 * s, 0.12 * s, 0.6 * s, 5]} />
        <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
      </mesh>
      <mesh receiveShadow castShadow position={[0, 0.7 * s, 0]}>
        <sphereGeometry args={[0.45 * s, 7, 7]} />
        <meshStandardMaterial color="#c86a8a" roughness={0.7} />
      </mesh>
      <mesh receiveShadow castShadow position={[0.2 * s, 0.6 * s, 0.15 * s]}>
        <sphereGeometry args={[0.35 * s, 7, 7]} />
        <meshStandardMaterial color="#d47a9a" roughness={0.7} />
      </mesh>
      <mesh receiveShadow castShadow position={[-0.18 * s, 0.55 * s, -0.1 * s]}>
        <sphereGeometry args={[0.3 * s, 7, 7]} />
        <meshStandardMaterial color="#c06a8a" roughness={0.7} />
      </mesh>
    </group>
  )
}

/**
 * Palm tree — tall thin trunk with frond crown at top.
 * Appears in beach and savanna biomes.
 */
const TreeVariant5 = ({ position, scale }: { position: [number, number, number]; scale: number }) => {
  const s = scale
  const groupRef = useWindSway(0.5 + Math.random() * 0.2, 0.03 + Math.random() * 0.02)
  return (
    <group ref={groupRef} position={position}>
      {/* Curved trunk */}
      <mesh receiveShadow castShadow position={[0.02 * s, 0.6 * s, 0]} rotation={[0.1, 0, 0.05]}>
        <cylinderGeometry args={[0.04 * s, 0.08 * s, 1.2 * s, 6]} />
        <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
      </mesh>
      {/* Fronds */}
      {[0, 60, 120, 180, 240, 300].map((angle, i) => (
        <mesh key={i} receiveShadow castShadow
          position={[0, 1.15 * s, 0]}
          rotation={[0.4, (angle * Math.PI) / 180, 0.2]}
        >
          <planeGeometry args={[0.5 * s, 0.08 * s]} />
          <meshStandardMaterial color="#3a7a3a" roughness={0.8} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* Coconuts */}
      {[0, 180].map((angle, i) => (
        <mesh key={`coco-${i}`} position={[0.08 * s * (i === 0 ? 1 : -1), 0.92 * s, 0.06 * s]}>
          <sphereGeometry args={[0.06 * s, 6, 6]} />
          <meshStandardMaterial color="#4a3a2a" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Dead tree — bare twisted branches, no foliage.
 * Appears in desert and rocky_desert biomes.
 */
const TreeVariant6 = ({ position, scale }: { position: [number, number, number]; scale: number }) => {
  const s = scale * 0.8
  const groupRef = useWindSway(0.3 + Math.random() * 0.2, 0.01 + Math.random() * 0.005)
  return (
    <group ref={groupRef} position={position}>
      {/* Trunk */}
      <mesh receiveShadow castShadow position={[0, 0.3 * s, 0]} rotation={[0.05, 0, -0.08]}>
        <cylinderGeometry args={[0.03 * s, 0.06 * s, 0.6 * s, 5]} />
        <meshStandardMaterial color="#4a3a2a" roughness={0.95} />
      </mesh>
      {/* Branch 1 */}
      <mesh receiveShadow castShadow position={[0.15 * s, 0.45 * s, 0]} rotation={[0, 0, 0.5]}>
        <cylinderGeometry args={[0.015 * s, 0.02 * s, 0.25 * s, 4]} />
        <meshStandardMaterial color="#4a3a2a" roughness={0.95} />
      </mesh>
      {/* Branch 2 */}
      <mesh receiveShadow castShadow position={[-0.12 * s, 0.35 * s, 0.05 * s]} rotation={[0.3, 0, -0.4]}>
        <cylinderGeometry args={[0.012 * s, 0.018 * s, 0.2 * s, 4]} />
        <meshStandardMaterial color="#4a3a2a" roughness={0.95} />
      </mesh>
      {/* Branch 3 - top */}
      <mesh receiveShadow castShadow position={[0.05 * s, 0.55 * s, -0.04 * s]} rotation={[-0.2, 0.3, 0.3]}>
        <cylinderGeometry args={[0.01 * s, 0.015 * s, 0.18 * s, 4]} />
        <meshStandardMaterial color="#4a3a2a" roughness={0.95} />
      </mesh>
    </group>
  )
}

/**
 * Snowy pine — cone-shaped with white-tipped branches.
 * Appears in taiga and tundra biomes.
 */
const TreeVariant7 = ({ position, scale }: { position: [number, number, number]; scale: number }) => {
  const s = scale
  const groupRef = useWindSway(0.5 + Math.random() * 0.2, 0.015 + Math.random() * 0.008)
  return (
    <group ref={groupRef} position={position}>
      {/* Trunk */}
      <mesh receiveShadow castShadow position={[0, 0.4 * s, 0]}>
        <cylinderGeometry args={[0.05 * s, 0.08 * s, 0.8 * s, 5]} />
        <meshStandardMaterial color="#4a3a2a" roughness={0.9} />
      </mesh>
      {/* Snowy layers */}
      <mesh receiveShadow castShadow position={[0, 1.0 * s, 0]}>
        <coneGeometry args={[0.5 * s, 0.8 * s, 7]} />
        <meshStandardMaterial color="#c8d8e0" roughness={0.7} emissive="#aabbcc" emissiveIntensity={0.08} />
      </mesh>
      <mesh receiveShadow castShadow position={[0, 1.6 * s, 0]}>
        <coneGeometry args={[0.38 * s, 0.6 * s, 7]} />
        <meshStandardMaterial color="#d0dde5" roughness={0.7} emissive="#aabbcc" emissiveIntensity={0.06} />
      </mesh>
      <mesh receiveShadow castShadow position={[0, 2.1 * s, 0]}>
        <coneGeometry args={[0.25 * s, 0.4 * s, 7]} />
        <meshStandardMaterial color="#d8e5ee" roughness={0.7} emissive="#bbccdd" emissiveIntensity={0.05} />
      </mesh>
    </group>
  )
}

const treeComponents = [TreeVariant0, TreeVariant1, TreeVariant2, TreeVariant3, TreeVariant4, TreeVariant5, TreeVariant6, TreeVariant7]

/**
 * Renders all 350 trees with size tiers, wind sway, and biome-specific variants.
 * Variants:
 *   0-4: General (round, cone, flat-top, bush, flowering)
 *   5: Palm tree (beach, savanna)
 *   6: Dead tree (desert, rocky_desert)
 *   7: Snowy pine (taiga, tundra)
 */
export const TreeRenderer = () => {
  useFrame((_, delta) => {
    tickWind(delta)
    tickTreeWind()
  })

  return (
    <group>
      {TREE_POSITIONS.map(([x, y, z, scale, variant], i) => {
        const idx = Math.min(variant, 7)
        const TreeComp = treeComponents[idx]
        return (
          <TreeComp
            key={`tree-${i}`}
            position={[x, y, z]}
            scale={scale}
          />
        )
      })}
    </group>
  )
}
