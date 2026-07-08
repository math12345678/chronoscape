import { useMemo, useRef, useLayoutEffect, useEffect, useState } from 'react'
import { useFrameThrottled } from '../../hooks/useFrameThrottled'
import * as THREE from 'three'
import { useStore, BLOCK_COLOR_MAP, SHOP_BLOCK_COLORS } from '../../store'
import type { BlockData } from '../../store'
import { getFacetedBlockGeometry } from '../../utils/blockGeometry'

// Duration of the place-in scale pop, in ms.
const PLACE_POP_MS = 200

/** Eases a block's scale from 0 to 1 over PLACE_POP_MS with a slight overshoot. */
function placeScale(placedAt: number, now: number): number {
  const t = Math.min(1, (now - placedAt) / PLACE_POP_MS)
  if (t >= 1) return 1
  // Overshoot ease-out for a satisfying "pop" — goes to 1.08 then settles to 1
  if (t < 0.6) {
    const p = t / 0.6
    return p * p * 1.08
  }
  const p = (t - 0.6) / 0.4
  return 1.08 - p * 0.08
}

/**
 * Computes current block colors from the store.
 * Re-renders when selectedBlockColor changes.
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
      emissive: { vapour: '#ffaa00', crystal: '#8855dd' },
    }
  }, [selectedBlockColor])
}

function useDecayingBlocks(entries: [string, BlockData][]) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  return useMemo(() => {
    void tick
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

// ── Shared faceted block geometry — cut-crystal look instead of plain cubes ──
// Uses a custom geometry with beveled edges and faceted faces that makes blocks
// look like time crystals rather than Minecraft blocks.
const blockGeo = getFacetedBlockGeometry()

// ── Main WorldBlocks ───────────────────────────────────

export const WorldBlocks = () => {
  const blocks = useStore((s) => s.blocks)
  const colors = useBlockColors()
  const blockEntries = useMemo(() => Object.entries(blocks), [blocks])
  const recordProudestBuild = useStore((s) => s.recordProudestBuild)
  const blockCount = Object.keys(blocks).length

  useEffect(() => {
    recordProudestBuild()
  }, [blockCount, recordProudestBuild])

  const vapourBlocks = useMemo(() => blockEntries.filter(([, b]) => b.type === 'vapour'), [blockEntries])
  const crystalBlocks = useMemo(() => blockEntries.filter(([, b]) => b.type === 'crystal'), [blockEntries])
  const { normal: normalVapour, decaying } = useDecayingBlocks(vapourBlocks)

  return (
    <group>
      {normalVapour.length > 0 && (
        <VapourBlockInstances entries={normalVapour} color={colors.vapour} />
      )}
      {decaying.length > 0 && (
        <DecayingBlockInstances entries={decaying} color={colors.vapour} />
      )}
      {crystalBlocks.length > 0 && (
        <CrystalBlockInstances entries={crystalBlocks} color={colors.crystal} />
      )}
    </group>
  )
}

// ── Vapour Block Instances (warm glow, slight transparency) ──

const VapourBlockInstances = ({
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

  // Animated emissive pulse + floating bob + gentle rotation (throttled to 30fps)
  useFrameThrottled((state) => {
    if (!meshRef.current) return
    const t = state.clock.elapsedTime
    const pulse = 0.4 + Math.sin(t * 0.8) * 0.15 + Math.sin(t * 1.7) * 0.08
    ;(meshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse

    // Per-instance floating animation — each block bobs at slightly different phase
    const now = Date.now()
    for (let i = 0; i < count; i++) {
      const [key, block] = entries[i]
      const [x, y, z] = key.split(',').map(Number)
      
      // Floating bob: sine wave offset using position as seed
      const phase = (x * 1.7 + y * 2.3 + z * 1.1) % (Math.PI * 2)
      const bobOffset = Math.sin(t * 0.6 + phase) * 0.08
      
      // Gentle rotation oscillation
      const rotX = Math.sin(t * 0.3 + phase) * 0.04
      const rotZ = Math.cos(t * 0.35 + phase * 0.7) * 0.04
      
      // Scale-pop
      const s = now - block.placedAt < PLACE_POP_MS 
        ? placeScale(block.placedAt, now)
        : 1
      
      dummy.position.set(x + 0.5, y + 0.5 + bobOffset, z + 0.5)
      dummy.scale.setScalar(s)
      dummy.rotation.x = rotX
      dummy.rotation.z = rotZ
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[blockGeo, undefined, Math.max(count, 1)]}
      castShadow
      receiveShadow
    >
      <meshPhysicalMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.4}
        roughness={0.4}
        metalness={0.3}
        clearcoat={0.25}
        clearcoatRoughness={0.3}
        transparent
        opacity={0.95}
      />
    </instancedMesh>
  )
}

// ── Crystal Block Instances (premium, permanent, prismatic) ──

const CrystalBlockInstances = ({
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

  // Persistent color ref to avoid per-frame allocation
  const emissiveColor = useRef(new THREE.Color(color))

  // Premium animated glow + floating bob + gentle rotation + prismatic shift (throttled to 30fps)
  useFrameThrottled((state) => {
    if (!meshRef.current) return
    const t = state.clock.elapsedTime
    const pulse = 0.5 + Math.sin(t * 0.7) * 0.2 + Math.sin(t * 1.9) * 0.1
    const mat = meshRef.current.material as THREE.MeshPhysicalMaterial
    mat.emissiveIntensity = pulse

    // Subtle prismatic shift — reuse ref, no allocation
    const hueShift = Math.sin(t * 0.3) * 0.05
    emissiveColor.current.set(color)
    emissiveColor.current.offsetHSL(hueShift, 0, 0)
    mat.emissive.copy(emissiveColor.current)

    // Per-instance floating animation — crystal blocks bob more elegantly
    const now = Date.now()
    for (let i = 0; i < count; i++) {
      const [key, block] = entries[i]
      const [x, y, z] = key.split(',').map(Number)
      
      // Float: elegant sine wave, slower and more pronounced for crystals
      const phase = (x * 1.7 + y * 2.3 + z * 1.1) % (Math.PI * 2)
      const bobOffset = Math.sin(t * 0.4 + phase) * 0.1
      
      // Gentle rotation — crystals twist slowly
      const rotX = Math.sin(t * 0.25 + phase) * 0.06
      const rotY = t * 0.05 + phase * 0.3
      const rotZ = Math.cos(t * 0.3 + phase * 0.7) * 0.05
      
      // Scale-pop
      const s = now - block.placedAt < PLACE_POP_MS 
        ? placeScale(block.placedAt, now)
        : 1
      
      dummy.position.set(x + 0.5, y + 0.5 + bobOffset, z + 0.5)
      dummy.scale.setScalar(s)
      dummy.rotation.x = rotX
      dummy.rotation.y = rotY
      dummy.rotation.z = rotZ
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[blockGeo, undefined, Math.max(count, 1)]}
      castShadow
      receiveShadow
    >
      <meshPhysicalMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.6}
        roughness={0.1}
        metalness={0.5}
        clearcoat={0.6}
        clearcoatRoughness={0.15}
        transparent
        opacity={0.98}
      />
    </instancedMesh>
  )
}

// ── Decaying Vapour Blocks (urgent pulsing red, near death) ──

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

  // Aggressive flickering pulse + desperate wobble (throttled to 30fps)
  useFrameThrottled((state) => {
    if (!meshRef.current) return
    const t = state.clock.elapsedTime
    const pulse = 0.4 + Math.abs(Math.sin(t * 6)) * 0.6 + Math.sin(t * 13) * 0.15
    const mat = meshRef.current.material as THREE.MeshStandardMaterial
    mat.emissiveIntensity = pulse
    mat.opacity = 0.5 + Math.sin(t * 8) * 0.3

    // Decaying blocks wobble violently before dissipating
    for (let i = 0; i < count; i++) {
      const [key] = entries[i]
      const [x, y, z] = key.split(',').map(Number)
      const phase = (x * 1.7 + y * 2.3 + z * 1.1) % (Math.PI * 2)
      const wobble = Math.sin(t * 3 + phase) * 0.15
      const rotZ = Math.sin(t * 4 + phase * 0.5) * 0.12
      
      dummy.position.set(x + 0.5, y + 0.5 + wobble, z + 0.5)
      dummy.scale.setScalar(0.8 + Math.sin(t * 5 + phase) * 0.15)
      dummy.rotation.x = Math.sin(t * 3.5 + phase) * 0.1
      dummy.rotation.z = rotZ
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[blockGeo, undefined, Math.max(count, 1)]}
      castShadow
      receiveShadow
    >
      <meshPhysicalMaterial
        color={color}
        emissive="#ff3300"
        emissiveIntensity={0.6}
        roughness={0.3}
        metalness={0.1}
        clearcoat={0.2}
        transparent
        opacity={0.85}
      />
    </instancedMesh>
  )
}
