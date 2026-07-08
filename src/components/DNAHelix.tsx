import { useRef, useMemo, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getTimeScale } from './TimeManager'

const STRAND_COUNT = 2          // 2 strands = double helix
const NODE_COUNT = 30           // nodes per strand
const SPIRAL_RADIUS = 0.8       // radius of the spiral
const SPIRAL_HEIGHT = 6         // total height
const SPIRAL_TURNS = 2.5        // number of full rotations
const DURATION = 1.2            // seconds before cleanup

const BASE_PAIRS: [string, string][] = [
  ['#44ff88', '#ff4488'],   // A-T: green-magenta
  ['#4488ff', '#ffaa44'],   // G-C: blue-orange
  ['#44ffcc', '#ff44cc'],   // A-U: teal-pink
  ['#88ff44', '#cc44ff'],   // extra pair
  ['#44aaff', '#ff6644'],   // extra pair
]

interface DNAHelixProps {
  position: [number, number, number]
  scale?: number
  onComplete?: () => void
}

/**
 * DNA double helix particle effect.
 * Erupts from a point, forming a rotating double helix that fades out.
 * Each node is a colored sphere representing a base pair.
 * The two strands twist around each other, connected by color pairs.
 *
 * Inspired by the wizard-masters particle system and DNA data storage concept.
 */
export const DNAHelix = ({ position, scale = 1, onComplete }: DNAHelixProps) => {
  const groupRef = useRef<THREE.Group>(null)
  const elapsed = useRef(0)
  const done = useRef(false)

  const totalNodes = STRAND_COUNT * NODE_COUNT

  // Pre-compute base pair assignments
  const nodeData = useMemo(() => {
    const data: { color1: string; color2: string; pairIndex: number }[] = []
    for (let i = 0; i < NODE_COUNT; i++) {
      const pair = BASE_PAIRS[i % BASE_PAIRS.length]
      data.push({ color1: pair[0], color2: pair[1], pairIndex: i })
    }
    return data
  }, [])

  useFrame((_, baseDelta) => {
    const delta = baseDelta * getTimeScale()
    elapsed.current += delta
    const t = Math.min(elapsed.current / DURATION, 1)

    if (!groupRef.current) return

    // Growth: nodes pop in from bottom to top
    const growthProgress = Math.min(t * 2.5, 1) // fully grow in first 40% of animation

    // Rotation: spin the whole helix
    const rotation = t * Math.PI * 4

    // Opacity: fade in then out
    const opacity = t < 0.1
      ? t / 0.1
      : t > 0.7
        ? 1 - (t - 0.7) / 0.3
        : 1

    // Scale up then settle
    const popScale = t < 0.15
      ? 1 + (0.15 - t) * 3
      : 1

    groupRef.current.scale.setScalar(popScale * scale)
    groupRef.current.rotation.y = rotation

    groupRef.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh
      const pairIndex = Math.floor(i / STRAND_COUNT)
      const strandIndex = i % STRAND_COUNT

      // Calculate position along helix
      const nt = pairIndex / NODE_COUNT // 0..1 normalized position along strand
      const y = nt * SPIRAL_HEIGHT - SPIRAL_HEIGHT / 2
      const angle = nt * SPIRAL_TURNS * Math.PI * 2 + strandIndex * Math.PI

      // Only show nodes within growth progress
      const showNode = nt <= growthProgress
      mesh.visible = showNode

      if (showNode) {
        const r = SPIRAL_RADIUS * (0.8 + Math.sin(nt * Math.PI) * 0.3) // taper at ends
        mesh.position.set(
          Math.cos(angle) * r,
          y,
          Math.sin(angle) * r,
        )

        // Material updates
        const mat = mesh.material as THREE.MeshBasicMaterial
        mat.opacity = opacity * 0.9

        // Size based on growth progress (smaller near growing tip)
        const sizeProgress = nt <= growthProgress ? 1 : 0
        const size = 0.08 + sizeProgress * 0.06 * (1 - Math.abs(nt - 0.5) * 0.5)
        mesh.scale.setScalar(size * scale)
      }
    })

    // Cleanup when done
    if (t >= 1 && !done.current) {
      done.current = true
      onComplete?.()
    }
  })

  return (
    <group ref={groupRef} position={position}>
      {Array.from({ length: totalNodes }, (_, i) => {
        const pairIndex = Math.floor(i / STRAND_COUNT)
        const strandIndex = i % STRAND_COUNT
        const data = nodeData[pairIndex]
        const color = strandIndex === 0 ? data.color1 : data.color2

        return (
          <mesh key={i}>
            <sphereGeometry args={[1, 8, 8]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        )
      })}
    </group>
  )
}

// ── Manager ─────────────────────────────────────────────

interface ActiveHelix {
  id: number
  props: DNAHelixProps
}

let helixIdCounter = 0
let activeHelixes: ActiveHelix[] = []
let helixListeners: ((helixes: ActiveHelix[]) => void)[] = []

function notifyHelixes() {
  helixListeners.forEach((fn) => fn(activeHelixes))
}

/**
 * Spawn a DNA helix effect from anywhere in the codebase.
 */
export function spawnDNAHelix(props: Omit<DNAHelixProps, 'onComplete'>) {
  const id = helixIdCounter++
  const helix: ActiveHelix = {
    id,
    props: {
      ...props,
      onComplete: () => {
        activeHelixes = activeHelixes.filter((h) => h.id !== id)
        notifyHelixes()
      },
    },
  }
  activeHelixes = [...activeHelixes, helix]
  notifyHelixes()
  return id
}

/**
 * React component that renders all active DNA helix effects.
 */
export const DNAHelixManager = () => {
  const [helixes, setHelixes] = useState<ActiveHelix[]>([])

  useEffect(() => {
    helixListeners.push(setHelixes)
    return () => {
      helixListeners = helixListeners.filter((fn) => fn !== setHelixes)
    }
  }, [])

  return (
    <group>
      {helixes.map((h) => (
        <DNAHelix key={h.id} {...h.props} />
      ))}
    </group>
  )
}
