import { useMemo, useRef, useLayoutEffect, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore, BLOCK_COLOR_MAP, SHOP_BLOCK_COLORS } from '../../store'
import type { BlockData } from '../../store'
import { VAPOUR_BLOCK_DECAY_MS } from '../../config/constants'

// Duration of the place-in scale pop, in ms.
const PLACE_POP_MS = 150

/** Eases a block's scale from 0 to 1 over PLACE_POP_MS after it was placed. */
function placeScale(placedAt: number, now: number): number {
  const t = Math.min(1, (now - placedAt) / PLACE_POP_MS)
  if (t >= 1) return 1
  // Overshoot ease-out for a satisfying "pop"
  const eased = 1 - Math.pow(1 - t, 3)
  return eased
}

/**
 * Computes current block colors from the store.
 * Re-renders when selectedBlockColor changes via useStore subscription.
 */
function useBlockColors() {
  const selectedBlockColor = useStore((s) => s.selectedBlockColor)
  return useMemo(() => {
    if (selectedBlockColor) {
      const key = selectedBlockColor.replace('blockColor', '').toLowerCase() as keyof typeof SHOP_BLOCK_COLORS
      const colors = SHOP_BLOCK_COLORS[key]
      if (colors) {
        return {
          vapour: colors.vapour,
          crystal: colors.crystal,
          emissive: { vapour: colors.vapour, crystal: colors.crystal },
        }
      }
    }
    return {
      vapour: BLOCK_COLOR_MAP.vapour,
      crystal: BLOCK_COLOR_MAP.crystal,
      emissive: { vapour: '#885500', crystal: '#5533aa' },
    }
  }, [selectedBlockColor])
}

/**
 * Separates vapour blocks into "normal" and "decaying" groups.
 * A block is decaying if it has less than 10 seconds (10,000ms) until its deadline.
 */
function useDecayingBlocks(entries: [string, BlockData][]) {
  // Tick every second so blocks approaching their decay deadline get the pulse visual
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return useMemo(() => {
    void tick // read tick to include it in deps
    const now = Date.now()
    const normal: [string, BlockData][] = []
    const decaying: [string, BlockData][] = []
    for (const entry of entries) {
      const [, block] = entry
      if (block.type === 'vapour' && block.decayDeadline !== null) {
        const remaining = block.decayDeadline - now
        if (remaining > 0 && remaining < 3_000) {
          decaying.push(entry)
          continue
        }
      }
      normal.push(entry)
    }
    return { normal, decaying }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, tick])
}

/**
 * Renders all blocks from the store's WorldBlockMap using InstancedMesh.
 * Vapour blocks near their decay deadline get a pulsing red/orange glow.
 */
export const WorldBlocks = () => {
  const blocks = useStore((s) => s.blocks)
  const colors = useBlockColors()
  const blockEntries = useMemo(() => Object.entries(blocks), [blocks])

  const vapourBlocks = useMemo(
    () => blockEntries.filter(([, b]) => b.type === 'vapour'),
    [blockEntries],
  )
  const crystalBlocks = useMemo(
    () => blockEntries.filter(([, b]) => b.type === 'crystal'),
    [blockEntries],
  )

  const { normal: normalVapour, decaying } = useDecayingBlocks(vapourBlocks)

  return (
    <group>
      {normalVapour.length > 0 && (
        <BlockInstances
          entries={normalVapour}
          color={colors.vapour}
          emissive={colors.emissive.vapour}
          emissiveIntensity={0.15}
        />
      )}
      {decaying.length > 0 && (
        <DecayingBlockInstances
          entries={decaying}
          color={colors.vapour}
        />
      )}
      {crystalBlocks.length > 0 && (
        <CrystalBlockInstances
          entries={crystalBlocks}
          color={colors.crystal}
          emissive={colors.emissive.crystal}
        />
      )}
    </group>
  )
}

/** Internal: renders normal blocks via a single InstancedMesh. */
const BlockInstances = ({
  entries,
  color,
  emissive,
  emissiveIntensity,
}: {
  entries: [string, BlockData][]
  color: string
  emissive: string
  emissiveIntensity: number
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const count = entries.length
  const dummy = useMemo(() => new THREE.Object3D(), [])

  useLayoutEffect(() => {
    if (!meshRef.current) return
    const now = Date.now()
    for (let i = 0; i < count; i++) {
      const [key, block] = entries[i]
      const [x, y, z] = key.split(',').map(Number)
      const s = placeScale(block.placedAt, now)
      dummy.position.set(x + 0.5, y + 0.5, z + 0.5)
      dummy.scale.setScalar(s)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
    meshRef.current.count = count
  }, [entries, count, dummy])

  // Animate the scale-in pop for blocks placed within the last PLACE_POP_MS.
  useFrame(() => {
    if (!meshRef.current) return
    const now = Date.now()
    let anyPopping = false
    for (let i = 0; i < count; i++) {
      const [key, block] = entries[i]
      if (now - block.placedAt >= PLACE_POP_MS) continue
      anyPopping = true
      const [x, y, z] = key.split(',').map(Number)
      const s = placeScale(block.placedAt, now)
      dummy.position.set(x + 0.5, y + 0.5, z + 0.5)
      dummy.scale.setScalar(s)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    if (anyPopping) meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, Math.max(count, 1)]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        roughness={0.6}
        metalness={0.1}
        transparent
        opacity={0.95}
      />
    </instancedMesh>
  )
}

/** Internal: renders crystal blocks with a subtle pulsing ambient glow. */
const CrystalBlockInstances = ({
  entries,
  color,
  emissive,
}: {
  entries: [string, BlockData][]
  color: string
  emissive: string
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const count = entries.length
  const dummy = useMemo(() => new THREE.Object3D(), [])

  useLayoutEffect(() => {
    if (!meshRef.current) return
    const now = Date.now()
    for (let i = 0; i < count; i++) {
      const [key, block] = entries[i]
      const [x, y, z] = key.split(',').map(Number)
      const s = placeScale(block.placedAt, now)
      dummy.position.set(x + 0.5, y + 0.5, z + 0.5)
      dummy.scale.setScalar(s)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
    meshRef.current.count = count
  }, [entries, count, dummy])

  // Subtle pulsing glow + scale-in pop for freshly placed blocks
  useFrame((state) => {
    if (!meshRef.current) return
    const pulse = 0.25 + Math.sin(state.clock.elapsedTime * 1.2) * 0.12
    ;(meshRef.current.material as THREE.MeshPhysicalMaterial).emissiveIntensity = pulse

    const now = Date.now()
    let anyPopping = false
    for (let i = 0; i < count; i++) {
      const [key, block] = entries[i]
      if (now - block.placedAt >= PLACE_POP_MS) continue
      anyPopping = true
      const [x, y, z] = key.split(',').map(Number)
      const s = placeScale(block.placedAt, now)
      dummy.position.set(x + 0.5, y + 0.5, z + 0.5)
      dummy.scale.setScalar(s)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    if (anyPopping) meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, Math.max(count, 1)]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshPhysicalMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={0.3}
        roughness={0.1}
        metalness={0.1}
        transmission={1.0}
        thickness={0.5}
        ior={1.5}
        transparent
      />
    </instancedMesh>
  )
}

/** Internal: renders vapour blocks near their decay deadline with a pulsing red/orange glow. */
const DecayingBlockInstances = ({
  entries,
  color,
}: {
  entries: [string, BlockData][]
  color: string
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const count = entries.length
  const dummy = useMemo(() => new THREE.Object3D(), [])

  useLayoutEffect(() => {
    if (!meshRef.current) return
    for (let i = 0; i < count; i++) {
      const [key] = entries[i]
      const [x, y, z] = key.split(',').map(Number)
      dummy.position.set(x + 0.5, y + 0.5, z + 0.5)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
    meshRef.current.count = count
  }, [entries, count, dummy])

  // Pulse the emissive intensity every frame
  useFrame((state) => {
    if (!meshRef.current) return
    const pulse = 0.4 + Math.sin(state.clock.elapsedTime * 4) * 0.35
    ;(meshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, Math.max(count, 1)]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={color}
        emissive="#ff4444"
        emissiveIntensity={0.5}
        roughness={0.5}
        metalness={0.05}
        transparent
        opacity={0.9}
      />
    </instancedMesh>
  )
}
