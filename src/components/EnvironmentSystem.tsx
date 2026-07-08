import { useMemo, useRef, useEffect } from 'react'
import { useFrameThrottled } from '../hooks/useFrameThrottled'
import * as THREE from 'three'
import { getTerrainHeight } from '../terrain'
import { ISLAND_SIZE } from '../config/constants'
import { useSoundEngine } from '../hooks/useSoundEngine'
import { getTimeScale } from './TimeManager'
import { getDayFactor as getDayNightFactor } from './DayNightCycle'

// ── Fireflies ───────────────────────────────────────────

const FIREFLY_COUNT = 15

const FireflySwarm = () => {
  const pointsRef = useRef<THREE.Points>(null)
  const time = useRef(0)

  const { geometry, velocities } = useMemo(() => {
    const pos = new Float32Array(FIREFLY_COUNT * 3)
    const sizes = new Float32Array(FIREFLY_COUNT)
    const colors = new Float32Array(FIREFLY_COUNT * 3)
    const vel: { x: number; z: number; speed: number; phase: number; yBase: number }[] = []

    for (let i = 0; i < FIREFLY_COUNT; i++) {
      const x = (Math.random() - 0.5) * ISLAND_SIZE * 0.8
      const z = (Math.random() - 0.5) * ISLAND_SIZE * 0.8
      const y = getTerrainHeight(x, z)
      const yOffset = 0.3 + Math.random() * 0.8

      pos[i * 3] = x
      pos[i * 3 + 1] = y + yOffset
      pos[i * 3 + 2] = z

      sizes[i] = 0.06 + Math.random() * 0.08

      // Yellow-green glow
      colors[i * 3] = 0.6 + Math.random() * 0.3
      colors[i * 3 + 1] = 0.8 + Math.random() * 0.2
      colors[i * 3 + 2] = 0.2 + Math.random() * 0.1

      vel.push({
        x: (Math.random() - 0.5) * 2,
        z: (Math.random() - 0.5) * 2,
        speed: 0.3 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        yBase: y + yOffset,
      })
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    return { geometry: geo, velocities: vel }
  }, [])

  useFrameThrottled((_, baseDelta) => {
    const delta = baseDelta * getTimeScale()
    time.current += delta
    if (!pointsRef.current) return

    const pos = geometry.attributes.position.array as Float32Array
    const size = geometry.attributes.size.array as Float32Array

    for (let i = 0; i < FIREFLY_COUNT; i++) {
      const v = velocities[i]
      const t = time.current * v.speed + v.phase

      pos[i * 3] += Math.sin(t * 0.5) * delta * 0.5
      pos[i * 3 + 1] = v.yBase + Math.sin(t * 1.3) * 0.15
      pos[i * 3 + 2] += Math.cos(t * 0.4) * delta * 0.5

      // Flicker glow
      const flicker = Math.sin(t * 3 + Math.sin(t * 2) * 2) * 0.5 + 0.5
      size[i] = (0.04 + flicker * 0.1) * (0.5 + Math.sin(t * 2) * 0.5)
    }

    geometry.attributes.position.needsUpdate = true
    geometry.attributes.size.needsUpdate = true
  }, 3)

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <primitive object={geometry} attach="geometry" />
      <pointsMaterial
        size={0.12}
        vertexColors
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}

// ── Butterflies ─────────────────────────────────────────

const BUTTERFLY_COUNT = 8

interface ButterflyData {
  pos: [number, number, number]
  phase: number
  speed: number
  color: string
  scale: number
}

const Butterfly = ({ data }: { data: ButterflyData }) => {
  const groupRef = useRef<THREE.Group>(null)
  const time = useRef(Math.random() * 100)

  useFrameThrottled((_, baseDelta) => {
    const delta = baseDelta * getTimeScale()
    time.current += delta
    if (!groupRef.current) return

    const t = time.current * data.speed + data.phase
    const x = data.pos[0] + Math.sin(t * 0.3) * 2
    const z = data.pos[2] + Math.cos(t * 0.2) * 2
    const y = data.pos[1] + 0.3 + Math.sin(t * 1.5) * 0.2

    groupRef.current.position.set(x, y, z)
    groupRef.current.rotation.y = t * 0.5

    // Wing flap
    const flap = Math.sin(t * 8) * 0.4 + 0.6
    groupRef.current.scale.y = flap * data.scale
  }, 3)

  return (
    <group ref={groupRef} position={data.pos}>
      {/* Left wing */}
      <mesh position={[-0.08, 0, 0]} rotation={[0, 0, 0.3]}>
        <planeGeometry args={[0.12, 0.08]} />
        <meshBasicMaterial color={data.color} side={THREE.DoubleSide} transparent opacity={0.7} />
      </mesh>
      {/* Right wing */}
      <mesh position={[0.08, 0, 0]} rotation={[0, 0, -0.3]}>
        <planeGeometry args={[0.12, 0.08]} />
        <meshBasicMaterial color={data.color} side={THREE.DoubleSide} transparent opacity={0.7} />
      </mesh>
      {/* Body */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.015, 6, 6]} />
        <meshBasicMaterial color="#443322" />
      </mesh>
    </group>
  )
}

const ButterflySwarm = () => {
  const butterflies = useMemo(() => {
    const colors = ['#ff88cc', '#ffcc88', '#88ccff', '#cc88ff', '#ffaa88']
    const result: ButterflyData[] = []
    for (let i = 0; i < BUTTERFLY_COUNT; i++) {
      const x = (Math.random() - 0.5) * ISLAND_SIZE * 0.5
      const z = (Math.random() - 0.5) * ISLAND_SIZE * 0.5
      const y = getTerrainHeight(x, z)
      result.push({
        pos: [x, y, z],
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.4,
        color: colors[i % colors.length],
        scale: 0.5 + Math.random() * 0.5,
      })
    }
    return result
  }, [])

  return (
    <group>
      {butterflies.map((b, i) => (
        <Butterfly key={`bf-${i}`} data={b} />
      ))}
    </group>
  )
}

// ── Flower Clusters ─────────────────────────────────────

const FLOWER_COUNT = 16

const FlowerClusters = () => {
  const flowers = useMemo(() => {
    const result: { pos: [number, number, number]; color: string; size: number }[] = []
    const colors = ['#ff6699', '#ffaa44', '#ee88ff', '#ff4466', '#ffdd44', '#ff88aa']

    for (let i = 0; i < FLOWER_COUNT; i++) {
      const x = (Math.random() - 0.5) * ISLAND_SIZE * 0.7
      const z = (Math.random() - 0.5) * ISLAND_SIZE * 0.7
      const y = getTerrainHeight(x, z)
      // Only on gentle slopes, not too near center
      if (Math.abs(y) > 0.4) continue
      const dist = Math.sqrt(x * x + z * z)
      if (dist < 4) continue // away from center

      result.push({
        pos: [x, y, z],
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 0.03 + Math.random() * 0.04,
      })
    }
    return result
  }, [])

  return (
    <group>
      {flowers.map((f, i) => (
        <group key={`flower-${i}`} position={[f.pos[0], f.pos[1], f.pos[2]]}>
          {/* Stem */}
          <mesh position={[0, 0.04, 0]}>
            <cylinderGeometry args={[0.005, 0.01, 0.08, 4]} />
            <meshBasicMaterial color="#3a7a3a" />
          </mesh>
          {/* Petals */}
          {[0, 1, 2, 3, 4].map((p) => (
            <mesh
              key={p}
              position={[Math.cos(p * 1.256) * f.size, 0.08 + f.size * 0.3, Math.sin(p * 1.256) * f.size]}
              rotation={[0.4, p * 1.256, 0.2]}
            >
              <planeGeometry args={[f.size * 1.5, f.size * 0.8]} />
              <meshBasicMaterial color={f.color} side={THREE.DoubleSide} transparent opacity={0.7} />
            </mesh>
          ))}
          {/* Center */}
          <mesh position={[0, 0.08, 0]}>
            <sphereGeometry args={[f.size * 0.4, 6, 6]} />
            <meshBasicMaterial color="#ffdd44" />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ── Ground Moss Patches ─────────────────────────────────

const MossPatches = () => {
  const patches = useMemo(() => {
    const result: { pos: [number, number, number]; size: number }[] = []
    for (let i = 0; i < 30; i++) {
      const x = (Math.random() - 0.5) * ISLAND_SIZE * 0.75
      const z = (Math.random() - 0.5) * ISLAND_SIZE * 0.75
      const y = getTerrainHeight(x, z)
      if (Math.abs(y) > 0.6) continue
      result.push({ pos: [x, y + 0.02, z], size: 0.1 + Math.random() * 0.3 })
    }
    return result
  }, [])

  return (
    <group>
      {patches.map((p, i) => (
        <mesh key={`moss-${i}`} position={p.pos} rotation={[-Math.PI / 2, 0, Math.random() * Math.PI]}>
          <circleGeometry args={[p.size, 6]} />
          <meshBasicMaterial color="#4a7a4a" transparent opacity={0.3} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

// ── Main Component ──────────────────────────────────────

/**
 * Enhanced environment system adding:
 * - Firefly swarm (glowing yellow-green particles)
 * - Butterfly entities (simple wing-flap animation)
 * - Flower clusters (colorful scattered flowers)
 * - Moss patches (subtle ground texture)
 * - Ambient audio: wind, birdsong (day), crickets (night), wind gusts
 */
export const EnvironmentSystem = () => {
  const sounds = useSoundEngine()

  useEffect(() => {
    // Wind — periodic soft howls (more frequent for richer atmosphere)
    let windTimer: ReturnType<typeof setTimeout>
    const playWind = () => {
      sounds.ambientWind()
      windTimer = setTimeout(playWind, 6000 + Math.random() * 6000)
    }
    windTimer = setTimeout(playWind, 1500)

    // Birdsong — melodic chirps during daytime (2-6s intervals)
    let birdTimer: ReturnType<typeof setTimeout>
    const playBird = () => {
      const hour = getDayFactor()
      if (hour > 0.25) {
        sounds.birdsong()
      }
      birdTimer = setTimeout(playBird, 2000 + Math.random() * 4000)
    }
    birdTimer = setTimeout(playBird, 3000)

    // Wind gusts — occasional stronger wind bursts (10-25s intervals)
    let gustTimer: ReturnType<typeof setTimeout>
    const playGust = () => {
      sounds.windGust()
      gustTimer = setTimeout(playGust, 10000 + Math.random() * 15000)
    }
    gustTimer = setTimeout(playGust, 8000)

    // Crickets — night-time ambient chirping (faster interval)
    let cricketTimer: ReturnType<typeof setTimeout>
    const playCrickets = () => {
      const hour = getDayFactor()
      if (hour < 0.35) {
        sounds.crickets()
      }
      cricketTimer = setTimeout(playCrickets, 1500 + Math.random() * 2500)
    }
    cricketTimer = setTimeout(playCrickets, 4000)

    // NPC chatter — distant murmurs near landmarks
    let chatterTimer: ReturnType<typeof setTimeout>
    const playChatter = () => {
      if (Math.random() < 0.4) {
        sounds.npcChatter()
      }
      chatterTimer = setTimeout(playChatter, 12000 + Math.random() * 12000)
    }
    chatterTimer = setTimeout(playChatter, 6000)

    return () => {
      clearTimeout(windTimer)
      clearTimeout(birdTimer)
      clearTimeout(gustTimer)
      clearTimeout(cricketTimer)
      clearTimeout(chatterTimer)
    }
  }, [sounds])

  return (
    <group>
      <MossPatches />
      <FlowerClusters />
      <FireflySwarm />
      <ButterflySwarm />
    </group>
  )
}

/** Read the current day factor from DayNightCycle module-level variable */
function getDayFactor(): number {
  return getDayNightFactor()
}
