import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useFrameThrottled } from '../hooks/useFrameThrottled'
import * as THREE from 'three'
import { setTimeScaleTarget } from './TimeManager'
import { getInfiniteTerrainHeight } from '../world/chunkTerrain'
import { playTimeZoneEnterSound, playTimeZoneExitSound } from '../utils/audio'

// ── Types ─────────────────────────────────────────────
export type TimeZoneType = 'chronosphere' | 'slowBubble' | 'stasisField' | 'surgeZone'

interface TimeZoneDef {
  type: TimeZoneType
  position: [number, number, number]
  radius: number
}

interface TimeZoneConfig {
  label: string
  color: string
  glowColor: string
  timeScale: number
  description: string
  icon: string
}

export const ZONE_CONFIG: Record<TimeZoneType, TimeZoneConfig> = {
  chronosphere: {
    label: 'Chronosphere',
    color: '#44ddff',
    glowColor: '#22aadd',
    timeScale: 2.0,
    description: 'Time flows twice as fast',
    icon: '⟳',
  },
  slowBubble: {
    label: 'Slow Bubble',
    color: '#ffaa44',
    glowColor: '#dd8822',
    timeScale: 0.3,
    description: 'Time crawls inside',
    icon: '⊙',
  },
  stasisField: {
    label: 'Stasis Field',
    color: '#cc66ff',
    glowColor: '#aa44dd',
    timeScale: 0.05,
    description: 'Time nearly stops',
    icon: '◎',
  },
  surgeZone: {
    label: 'Surge Zone',
    color: '#ffd700',
    glowColor: '#ddaa00',
    timeScale: 1.5,
    description: 'Harvest yields doubled',
    icon: '⚡',
  },
}

// ── Zone positions ──────────────────────────────────
const ZONES: TimeZoneDef[] = [
  { type: 'chronosphere', position: [30, 0, 15], radius: 12 },
  { type: 'slowBubble', position: [-20, 0, 35], radius: 10 },
  { type: 'stasisField', position: [40, 0, -25], radius: 8 },
  { type: 'surgeZone', position: [-35, 0, -15], radius: 12 },
  { type: 'chronosphere', position: [55, 0, 10], radius: 10 },
  { type: 'slowBubble', position: [15, 0, 50], radius: 9 },
  { type: 'stasisField', position: [-45, 0, 30], radius: 7 },
  { type: 'surgeZone', position: [-10, 0, -40], radius: 11 },
  { type: 'chronosphere', position: [60, 0, -40], radius: 14 },
  { type: 'stasisField', position: [-50, 0, -35], radius: 9 },
]

// ── Module-level state ──────────────────────────────
let _currentZoneType: TimeZoneType | null = null
let _currentZoneDist = Infinity

export function getCurrentZoneType(): TimeZoneType | null { return _currentZoneType }
export function getCurrentZoneDist(): number { return _currentZoneDist }

/** Check if a position is inside any time zone */
export function getTimeZoneAt(x: number, z: number): TimeZoneType | null {
  for (const zone of ZONES) {
    const dx = x - zone.position[0]
    const dz = z - zone.position[2]
    if (dx * dx + dz * dz < zone.radius * zone.radius) return zone.type
  }
  return null
}

// ── Ground ring component ──────────────────────────
const ZoneRing = ({ zone }: { zone: TimeZoneDef }) => {
  const ringRef = useRef<THREE.Mesh>(null)
  const glowRingRef = useRef<THREE.Mesh>(null)
  const innerRef = useRef<THREE.Mesh>(null)
  const time = useRef(Math.random() * 100)
  const cfg = ZONE_CONFIG[zone.type]
  const terrainY = getInfiniteTerrainHeight(zone.position[0], zone.position[2])

  useFrameThrottled((_, delta) => {
    time.current += delta
    if (!ringRef.current || !glowRingRef.current || !innerRef.current) return

    const pulse = 0.6 + Math.sin(time.current * 0.8) * 0.4
    ;(ringRef.current.material as THREE.MeshBasicMaterial).opacity = 0.04 + pulse * 0.04
    ;(glowRingRef.current.material as THREE.MeshBasicMaterial).opacity = 0.02 + pulse * 0.03
    ;(innerRef.current.material as THREE.MeshBasicMaterial).opacity = 0.15 + Math.sin(time.current * 1.2) * 0.05

    ringRef.current.rotation.z += delta * 0.02
    glowRingRef.current.rotation.z -= delta * 0.015
  }, 3)

  return (
    <group>
      {/* Outer glow ring */}
      <mesh
        ref={ringRef}
        position={[zone.position[0], terrainY + 0.05, zone.position[2]]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[zone.radius - 0.5, zone.radius + 0.5, 64]} />
        <meshBasicMaterial color={cfg.color} transparent opacity={0.06} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* Inner glow disc */}
      <mesh
        ref={innerRef}
        position={[zone.position[0], terrainY + 0.02, zone.position[2]]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[zone.radius - 0.5, 48]} />
        <meshBasicMaterial color={cfg.glowColor} transparent opacity={0.15} depthWrite={false} />
      </mesh>
      {/* Outer glow disc */}
      <mesh
        ref={glowRingRef}
        position={[zone.position[0], terrainY + 0.03, zone.position[2]]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[zone.radius + 0.5, zone.radius + 2, 64]} />
        <meshBasicMaterial color={cfg.color} transparent opacity={0.04} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* Zone pillars at cardinal points */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (i / 4) * Math.PI * 2
        const px = zone.position[0] + Math.cos(angle) * zone.radius
        const pz = zone.position[2] + Math.sin(angle) * zone.radius
        const py = getInfiniteTerrainHeight(px, pz)
        return (
          <mesh key={i} position={[px, py + 1.5, pz]}>
            <cylinderGeometry args={[0.06, 0.1, 3, 6]} />
            <meshBasicMaterial color={cfg.color} transparent opacity={0.3} />
          </mesh>
        )
      })}
    </group>
  )
}

// ── Rising particle columns ─────────────────────────
const ZoneParticles = ({ zone }: { zone: TimeZoneDef }) => {
  const pointsRef = useRef<THREE.Points>(null)
  const cfg = ZONE_CONFIG[zone.type]
  const terrainY = getInfiniteTerrainHeight(zone.position[0], zone.position[2])
  const COUNT = 40

  const { positions, speeds } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3)
    const spd = new Float32Array(COUNT)
    for (let i = 0; i < COUNT; i++) {
      const theta = Math.random() * Math.PI * 2
      const r = Math.random() * (zone.radius - 1)
      pos[i * 3] = Math.cos(theta) * r
      pos[i * 3 + 1] = Math.random() * 5
      pos[i * 3 + 2] = Math.sin(theta) * r
      spd[i] = 0.3 + Math.random() * 0.5
    }
    return { positions: pos, speeds: spd }
  }, [COUNT])

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return g
  }, [positions])

  useFrameThrottled((_, delta) => {
    if (!pointsRef.current) return
    const pos = pointsRef.current.geometry.attributes.position.array as Float32Array
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3 + 1] += speeds[i] * delta
      if (pos[i * 3 + 1] > 5) {
        pos[i * 3 + 1] = 0
        const theta = Math.random() * Math.PI * 2
        const r = Math.random() * (zone.radius - 1)
        pos[i * 3] = Math.cos(theta) * r
        pos[i * 3 + 2] = Math.sin(theta) * r
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true
  }, 3)

  return (
    <points ref={pointsRef} position={[zone.position[0], terrainY, zone.position[2]]} frustumCulled={false}>
      <bufferGeometry {...geo}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.08} color={cfg.color} transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation />
    </points>
  )
}

// ── Main system ─────────────────────────────────────
export const TimeZoneSystem = () => {
  const { camera } = useThree()
  const prevZone = useRef<TimeZoneType | null>(null)
  const latestZone = useRef<TimeZoneType | null>(null)

  useFrame(() => {
    const px = camera.position.x
    const pz = camera.position.z
    let closestZone: TimeZoneType | null = null
    let closestDist = Infinity

    for (const zone of ZONES) {
      const dx = px - zone.position[0]
      const dz = pz - zone.position[2]
      const distSq = dx * dx + dz * dz
      const radiusSq = zone.radius * zone.radius
      if (distSq < radiusSq) {
        const dist = Math.sqrt(distSq)
        if (dist < closestDist) {
          closestDist = dist
          closestZone = zone.type
        }
      }
    }

    _currentZoneType = closestZone
    _currentZoneDist = closestDist

    // Apply time scale effect when player is inside a zone
    if (closestZone && closestZone !== prevZone.current) {
      const cfg = ZONE_CONFIG[closestZone]
      setTimeScaleTarget(cfg.timeScale)
      latestZone.current = closestZone
      playTimeZoneEnterSound()

      // Dispatch event for HUD
      window.dispatchEvent(new CustomEvent('timezone-enter', { detail: { type: closestZone } }))
    } else if (!closestZone && prevZone.current) {
      setTimeScaleTarget(1.0)
      latestZone.current = null
      playTimeZoneExitSound()
      window.dispatchEvent(new CustomEvent('timezone-exit'))
    }

    prevZone.current = closestZone
  })

  return (
    <group>
      {ZONES.map((zone, i) => (
        <group key={i}>
          <ZoneRing zone={zone} />
          <ZoneParticles zone={zone} />
        </group>
      ))}
    </group>
  )
}
