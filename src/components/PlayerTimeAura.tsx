import { useRef, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { useFrameThrottled } from '../hooks/useFrameThrottled'
import * as THREE from 'three'
import { useStore } from '../store'
import { getTerrainHeight } from '../terrain'

/**
 * Player Time Aura — a glowing ground ring at the player's feet.
 * 
 * Visualizes the player's held time-energy:
 * - Color blends based on resource composition (raw=yellow, vapour=orange, liquid=blue, crystal=purple)
 * - Brightness/intensity scales with total energy held
 * - Pulses with energy level
 * - Leaves a faint trail when moving fast
 * - The ring sits on the terrain surface, following the player's camera position (XZ only)
 *
 * This makes the player feel present and powerful — Minecraft never does this.
 */
export const PlayerTimeAura = () => {
  const { camera } = useThree()
  const groupRef = useRef<THREE.Group>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const time = useRef(0)
  const prevPos = useRef({ x: 0, z: 0 })
  const speed = useRef(0)

  // Module-level store access (no re-render dependency)
  const lastResources = useRef({ raw: 0, vapour: 0, liquid: 0, crystal: 0 })
  const lastTotal = useRef(0)

  useFrameThrottled((state, delta) => {
    time.current += delta
    if (!groupRef.current) return

    const cx = camera.position.x
    const cz = camera.position.z

    // Calculate speed
    const dx = cx - prevPos.current.x
    const dz = cz - prevPos.current.z
    const dist = Math.sqrt(dx * dx + dz * dz)
    speed.current += (dist / Math.max(delta, 0.016) - speed.current) * delta * 3
    prevPos.current = { x: cx, z: cz }

    // Get player's current resources from store (read directly, no re-render)
    const inv = useStore.getState().inventory
    const total = inv.raw + inv.vapour + inv.liquid + inv.crystal

    lastResources.current = inv
    lastTotal.current = total

    // Position ring at player's feet on terrain surface
    const terrainY = getTerrainHeight(cx, cz)
    groupRef.current.position.x = cx
    if (groupRef.current.position.y !== terrainY + 0.05) {
      groupRef.current.position.y += (terrainY + 0.05 - groupRef.current.position.y) * delta * 8
    }
    groupRef.current.position.z = cz

    // Compute color from resource composition
    const totalSafe = Math.max(total, 1)
    const rawFrac = inv.raw / totalSafe
    const vapourFrac = inv.vapour / totalSafe
    const liquidFrac = inv.liquid / totalSafe
    const crystalFrac = inv.crystal / totalSafe

    // Blend colors: gold (raw) → orange (vapour) → cyan (liquid) → violet (crystal)
    const rawColor = new THREE.Color('#ffcc44')
    const vapourColor = new THREE.Color('#ff8844')
    const liquidColor = new THREE.Color('#44ddff')
    const crystalColor = new THREE.Color('#aa88ff')

    const blended = rawColor
      .clone().lerp(vapourColor, vapourFrac / Math.max(rawFrac + vapourFrac + liquidFrac + crystalFrac, 0.01))
      .lerp(liquidColor, liquidFrac / Math.max(rawFrac + vapourFrac + liquidFrac + crystalFrac, 0.01))
      .lerp(crystalColor, crystalFrac / Math.max(rawFrac + vapourFrac + liquidFrac + crystalFrac, 0.01))

    // Intensity scales with total energy (0-1, biased toward feeling present even at low levels)
    const intensity = Math.min(1, 0.15 + total * 0.008)
    const speedFactor = Math.min(1, speed.current / 6)

    // Update ring material
    if (ringRef.current) {
      const mat = ringRef.current.material as THREE.MeshBasicMaterial
      const pulse = 0.8 + Math.sin(time.current * 0.6) * 0.15 + Math.sin(time.current * 1.4) * 0.05
      mat.color.copy(blended)
      mat.opacity = intensity * pulse * 0.35

      // Ring expands slightly when moving fast
      const trailScale = 1 + speedFactor * 0.15
      ringRef.current.scale.setScalar(trailScale)
    }

    // Update glow disc
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial
      const glowPulse = 0.7 + Math.sin(time.current * 0.4 + 1) * 0.2
      mat.color.copy(blended)
      mat.opacity = intensity * glowPulse * 0.08
    }
  }, 2)

  // Create shared geometries (once, cached)
  const ringGeo = useMemo(() => new THREE.RingGeometry(0.4, 0.55, 32), [])
  const glowGeo = useMemo(() => new THREE.CircleGeometry(0.8, 24), [])

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Main ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} geometry={ringGeo}>
        <meshBasicMaterial
          color="#44ffcc"
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Inner glow disc */}
      <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]} geometry={glowGeo}>
        <meshBasicMaterial
          color="#44ffcc"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}
