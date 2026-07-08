import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface ShockwaveRingProps {
  position: [number, number, number]
  color?: string
  duration?: number
  maxScale?: number
  ringCount?: number
  baseRadius?: number
  thickness?: number
  onComplete?: () => void
}

/**
 * Expanding ground-level shockwave ring effect.
 * Inspired by wizard-masters super-nova-shockwave and fire-ball-explode systems.
 *
 * Creates concentric rings that expand outward and fade simultaneously.
 * Used for: detonations, formula discoveries, rift harvests.
 */
export const ShockwaveRing = ({
  position,
  color = '#44ffcc',
  duration = 1.2,
  maxScale = 12,
  ringCount = 3,
  baseRadius = 0.5,
  thickness = 0.8,
  onComplete,
}: ShockwaveRingProps) => {
  const groupRef = useRef<THREE.Group>(null)
  const elapsed = useRef(0)
  const done = useRef(false)

  useFrame((_, delta) => {
    elapsed.current += delta
    const t = Math.min(elapsed.current / duration, 1)
    const eased = 1 - Math.pow(1 - t, 1.5) // ease-out quad

    if (!groupRef.current) return

    const scale = 1 + eased * (maxScale - 1)
    groupRef.current.scale.set(scale, scale, scale)

    groupRef.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh
      const mat = mesh.material as THREE.MeshBasicMaterial
      const phase = i / ringCount

      // Each ring has staggered opacity peak
      const ringProgress = Math.max(0, Math.min(1, (t - phase * 0.15) / (1 - phase * 0.15)))
      const opacity = Math.max(0, (1 - ringProgress) * (0.5 - phase * 0.1))

      mat.opacity = opacity

      // Color shift from bright center to cooler edge
      const hue = 0.42 + ringProgress * 0.08 // teal → blue-green
      mat.color.setHSL(hue, 0.8, 0.4 + ringProgress * 0.2)
    })

    if (t >= 1 && !done.current) {
      done.current = true
      onComplete?.()
    }
  })

  return (
    <group ref={groupRef} position={position}>
      {Array.from({ length: ringCount }, (_, i) => (
        <mesh
          key={i}
          position={[0, 0.05 + i * 0.02, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry
            args={[
              baseRadius + i * thickness * 0.3,
              baseRadius + thickness + i * thickness * 0.3,
              48,
            ]}
          />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )).reverse()}
    </group>
  )
}

// ── Manager ─────────────────────────────────────────────

interface ActiveRing {
  id: number
  props: ShockwaveRingProps
}

let ringIdCounter = 0
let activeRings: ActiveRing[] = []
let ringListeners: ((rings: ActiveRing[]) => void)[] = []

function notifyRings() {
  ringListeners.forEach((fn) => fn(activeRings))
}

/**
 * Spawn a shockwave ring from anywhere in the codebase.
 */
export function spawnShockwave(props: Omit<ShockwaveRingProps, 'onComplete'>) {
  const id = ringIdCounter++
  const ring: ActiveRing = {
    id,
    props: {
      ...props,
      onComplete: () => {
        activeRings = activeRings.filter((r) => r.id !== id)
        notifyRings()
      },
    },
  }
  activeRings = [...activeRings, ring]
  notifyRings()
  return id
}

/**
 * React component that renders all active shockwave rings.
 * Place inside the Canvas once.
 */
export const ShockwaveRingManager = () => {
  const [rings, setRings] = useState<ActiveRing[]>([])

  useEffect(() => {
    ringListeners.push(setRings)
    return () => {
      ringListeners = ringListeners.filter((fn) => fn !== setRings)
    }
  }, [])

  return (
    <group>
      {rings.map((ring) => (
        <ShockwaveRing key={ring.id} {...ring.props} />
      ))}
    </group>
  )
}


