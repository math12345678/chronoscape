import { useMemo } from 'react'
import { TimeRift } from './TimeRift'
import { WorldBlocks } from './Building/WorldBlocks'
import { BuildPreview } from './Building/BuildPreview'
import { LabStructure } from './Lab/LabStructure'
import { LabTrigger } from './Lab/LabTrigger'
import { Terrain } from './Terrain'
import { Water } from './Water'
import { NPCTick } from './NPC/NPCTick'
import { NPCSpawner } from './NPC/NPCSpawner'
import { WorldDecorations } from './WorldDecorations'
import { Trader } from './Trader'
import { TimeShrine } from './Shrine/TimeShrine'
import { TIME_RIFT_POSITIONS } from '../config/constants'

/** Pre-generated tree positions scattered across the island */
const TREE_POSITIONS: [number, number, number, number, number][] = [
  // [x, z, scale, hue, variant]
  [5, 8, 0.8, 0.28, 0],   [7, 6, 1.0, 0.32, 1],    [4, 11, 0.6, 0.25, 2],
  [15, 5, 1.1, 0.30, 0],   [12, 12, 0.7, 0.26, 1],  [-5, 8, 0.9, 0.33, 2],
  [-7, 6, 0.7, 0.27, 0],   [-4, 11, 1.0, 0.31, 1],  [-15, 5, 0.8, 0.29, 2],
  [-12, 12, 0.9, 0.25, 0], [5, -8, 0.7, 0.32, 1],   [7, -6, 1.0, 0.28, 2],
  [4, -11, 0.6, 0.26, 0],  [15, -5, 0.9, 0.30, 1],  [12, -12, 1.1, 0.27, 2],
  [-5, -8, 0.8, 0.33, 0],  [-7, -6, 0.7, 0.25, 1],  [-4, -11, 1.0, 0.31, 2],
  [-15, -5, 0.9, 0.28, 0], [-12, -12, 0.7, 0.29, 1],[0, 5, 0.9, 0.30, 2],
  [0, -5, 0.7, 0.26, 0],   [20, 0, 0.8, 0.32, 1],   [-20, 0, 1.0, 0.27, 2],
  [0, 22, 0.7, 0.31, 0],   [0, -22, 0.9, 0.25, 1],  [18, 12, 0.6, 0.28, 2],
  [-18, -12, 0.8, 0.30, 0],[13, -18, 1.0, 0.26, 1], [-13, 18, 0.7, 0.33, 2],
  [22, -8, 0.7, 0.29, 0],  [-22, 8, 0.9, 0.31, 1],  [8, -22, 0.6, 0.27, 2],
  [-8, 22, 1.0, 0.25, 0],  [3, 18, 0.8, 0.32, 1],   [-3, -18, 0.9, 0.28, 2],
]

/** 3 tree variants for visual variety */
const TreeVariant0 = ({ position, scale }: { position: [number, number, number]; scale: number }) => {
  const s = scale
  return (
    <group position={position}>
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
  return (
    <group position={position}>
      <mesh receiveShadow castShadow position={[0, 0.6 * s, 0]}>
        <cylinderGeometry args={[0.06 * s, 0.12 * s, 1.2 * s, 5]} />
        <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
      </mesh>
      {/* Tall cone shape */}
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
  return (
    <group position={position}>
      <mesh receiveShadow castShadow position={[0, 0.4 * s, 0]}>
        <cylinderGeometry args={[0.07 * s, 0.1 * s, 0.8 * s, 5]} />
        <meshStandardMaterial color="#3a2a1a" roughness={0.9} />
      </mesh>
      {/* Flat top canopy */}
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

const treeComponents = [TreeVariant0, TreeVariant1, TreeVariant2]

export const World = () => {
  return (
    <group>
      {/* Animated water below the terrain */}
      <Water />

      {/* Rolling hills terrain */}
      <Terrain />

      {/* Path connecting key locations */}
      <PathMesh />

      {/* Decorative trees — 3 variants for variety */}
      {TREE_POSITIONS.map(([x, z, scale, _hue, variant], i) => {
        const TreeComp = treeComponents[variant as 0 | 1 | 2]
        return (
          <TreeComp
            key={`tree-${i}`}
            position={[x, 0, z]}
            scale={scale}
          />
        )
      })}

      {/* Time Rifts — float above terrain */}
      {TIME_RIFT_POSITIONS.map((pos, i) => (
        <TimeRift key={i} position={pos} />
      ))}

      {/* Placed blocks */}
      <WorldBlocks />

      {/* Ghost preview when building */}
      <BuildPreview />

      {/* The Lab structure + proximity trigger */}
      <LabStructure />
      <LabTrigger />

      {/* Procedural decorations: rocks, crystals, grass */}
      <WorldDecorations />

      {/* NPC AI tick + render */}
      <NPCTick />
      <NPCSpawner />

      {/* Trader booth */}
      <Trader />

      {/* Time Investment Altar */}
      <TimeShrine />
    </group>
  )
}

/** Subtle path markers between key locations */
const PATH_POINTS = [
  [0, 0.05, 0],
  [2, 0.05, -3],
  [3, 0.05, -7],
  [1, 0.05, -11],
  [0, 0.05, -14.5],
] as const

const PathMesh = () => {
  const dots = useMemo(() => {
    const result: [number, number, number][] = []
    for (const p of PATH_POINTS) {
      for (let i = 0; i < 3; i++) {
        const theta = Math.random() * Math.PI * 2
        const r = 0.3 + Math.random() * 0.4
        result.push([
          p[0] + Math.cos(theta) * r,
          p[1] + 0.02,
          p[2] + Math.sin(theta) * r,
        ])
      }
    }
    return result
  }, [])

  return (
    <group>
      {dots.map((pos, i) => (
        <mesh key={i} position={pos} receiveShadow>
          <circleGeometry args={[0.08, 6]} />
          <meshBasicMaterial color="#8899aa" transparent opacity={0.3} />
        </mesh>
      ))}
    </group>
  )
}
