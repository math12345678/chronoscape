import { useRef, useEffect, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { FACTIONS } from '../../config/combat'
import type { FactionId } from '../../config/combat'
import { modifyReputation } from './GangSystem'
import { queueBurst } from '../HarvestVFX'
import { getInfiniteTerrainHeight } from '../../world/chunkTerrain'

// ── Skirmish state ────────────────────────────────────
interface Skirmish {
  attacker: FactionId
  defender: FactionId
  x: number
  z: number
  startTime: number
  duration: number
  active: boolean
  intensity: number
}

const skirmishes: Skirmish[] = []
const MAX_SKIRMISHES = 2
const SKIRMISH_INTERVAL = 25_000
const SKIRMISH_DURATION = 20_000
const nextSkirmishTime = { value: performance.now() + 10_000 }

// ── Territory center points for battle generation ────
const TERRITORY_POSITIONS: Record<string, [number, number]> = {
  chronoGuard: [25, 20],
  voidCult: [-25, -25],
  crystalSyndicate: [20, -20],
  timeless: [-15, 15],
  echoReapers: [-40, 30],
  dawnForged: [40, -30],
}

// ── Rival factions (who fights whom) ──────────────────
const RIVAL_PAIRS: [FactionId, FactionId][] = [
  ['chronoGuard', 'voidCult'],
  ['chronoGuard', 'timeless'],
  ['voidCult', 'crystalSyndicate'],
  ['crystalSyndicate', 'echoReapers'],
  ['timeless', 'dawnForged'],
  ['echoReapers', 'dawnForged'],
]

function generateSkirmish() {
  if (skirmishes.length >= MAX_SKIRMISHES) return

  // Pick a random rival pair
  const pair = RIVAL_PAIRS[Math.floor(Math.random() * RIVAL_PAIRS.length)]
  const attacker = pair[0]
  const defender = pair[1]

  // Position mid-way between their territories
  const aPos = TERRITORY_POSITIONS[attacker]
  const dPos = TERRITORY_POSITIONS[defender]
  const mx = (aPos[0] + dPos[0]) / 2 + (Math.random() - 0.5) * 10
  const mz = (aPos[1] + dPos[1]) / 2 + (Math.random() - 0.5) * 10

  skirmishes.push({
    attacker,
    defender,
    x: mx,
    z: mz,
    startTime: performance.now(),
    duration: SKIRMISH_DURATION,
    active: true,
    intensity: 0.5 + Math.random() * 0.5,
  })

  // Notify player
  window.dispatchEvent(new CustomEvent('skirmish-start', {
    detail: { attacker: FACTIONS[attacker].name, defender: FACTIONS[defender].name, x: mx, z: mz },
  }))
}

export function isNearSkirmish(x: number, z: number, range = 15): boolean {
  for (const s of skirmishes) {
    if (!s.active) continue
    const dx = x - s.x
    const dz = z - s.z
    if (dx * dx + dz * dz < range * range) return true
  }
  return false
}

export function getNearbySkirmish(x: number, z: number): Skirmish | null {
  for (const s of skirmishes) {
    if (!s.active) continue
    const dx = x - s.x
    const dz = z - s.z
    if (dx * dx + dz * dz < 15 * 15) return s
  }
  return null
}

export function isSkirmishActive(): boolean {
  return skirmishes.some(s => s.active)
}

// ── Skirmish visual: pulsing ground zone ──────────────
const SkirmishZone = ({ skirmish }: { skirmish: Skirmish }) => {
  const ringRef = useRef<THREE.Mesh>(null)
  const particlesRef = useRef<THREE.Points>(null)
  const time = useRef(0)
  const my = getInfiniteTerrainHeight(skirmish.x, skirmish.z)

  const particlePositions = useMemo(() => {
    const pos = new Float32Array(60 * 3)
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2
      const r = Math.random() * 12
      pos[i * 3] = Math.cos(angle) * r
      pos[i * 3 + 1] = Math.random() * 4
      pos[i * 3 + 2] = Math.sin(angle) * r
    }
    return pos
  }, [])

  useFrame((_, delta) => {
    time.current += delta
    const elapsed = performance.now() - skirmish.startTime
    const progress = Math.min(elapsed / skirmish.duration, 1)

    if (progress >= 1) {
      skirmish.active = false
      return
    }

    // Pulse ring
    if (ringRef.current) {
      const pulse = 0.3 + Math.sin(time.current * 3) * 0.2
      const attackerColor = FACTIONS[skirmish.attacker].color
      const defenderColor = FACTIONS[skirmish.defender].color
      const color = new THREE.Color(attackerColor).lerp(new THREE.Color(defenderColor), Math.sin(time.current * 0.5) * 0.5 + 0.5)
      ;(ringRef.current.material as THREE.MeshBasicMaterial).color.copy(color)
      ;(ringRef.current.material as THREE.MeshBasicMaterial).opacity = pulse * 0.3 * skirmish.intensity
      ringRef.current.scale.setScalar(1 + Math.sin(time.current * 2) * 0.05)
    }

    // Particles
    if (particlesRef.current) {
      const pos = particlesRef.current.geometry.attributes.position.array as Float32Array
      for (let i = 0; i < 60; i++) {
        pos[i * 3 + 1] += delta * (0.5 + Math.random() * 0.5)
        if (pos[i * 3 + 1] > 4) pos[i * 3 + 1] = 0
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true
      ;(particlesRef.current.material as THREE.PointsMaterial).opacity = (1 - progress) * 0.6
    }

    // Spawn visual bursts periodically
    if (Math.random() < 0.005 * skirmish.intensity) {
      const bx = skirmish.x + (Math.random() - 0.5) * 10
      const bz = skirmish.z + (Math.random() - 0.5) * 10
      const by = getInfiniteTerrainHeight(bx, bz)
      queueBurst(new THREE.Vector3(bx, by + 0.5, bz), 5, '#ff8844', 2)
    }
  })

  if (!skirmish.active) return null

  return (
    <group>
      {/* Ground ring */}
      <mesh ref={ringRef} position={[skirmish.x, my + 0.05, skirmish.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2, 14, 32]} />
        <meshBasicMaterial color="#ff8844" transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* Particles */}
      <points ref={particlesRef} position={[skirmish.x, my, skirmish.z]} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[particlePositions, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.1} color="#ff8844" transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>
      {/* Warning markers */}
      <mesh position={[skirmish.x, my + 2, skirmish.z]}>
        <sphereGeometry args={[0.2, 6, 6]} />
        <meshBasicMaterial color="#ff4444" transparent opacity={0.6 + Math.sin(performance.now() * 0.005) * 0.3} />
      </mesh>
    </group>
  )
}

// ── Main component ────────────────────────────────────
export const GangWarManager = () => {
  // Generate skirmishes periodically
  useFrame(() => {
    const now = performance.now()
    if (now > nextSkirmishTime.value) {
      nextSkirmishTime.value = now + SKIRMISH_INTERVAL + Math.random() * 15000
      generateSkirmish()
    }
  })

  return (
    <group>
      {skirmishes.filter(s => s.active).map((s, i) => (
        <SkirmishZone key={i} skirmish={s} />
      ))}
    </group>
  )
}

// ── Player can earn rep by killing near skirmishes ────
export function handleSkirmishKill(x: number, z: number) {
  const skirmish = getNearbySkirmish(x, z)
  if (!skirmish) return
  // Gain rep with defender, lose with attacker
  modifyReputation(skirmish.defender, 1)
  modifyReputation(skirmish.attacker, -1)
}

// ── DOM notification for skirmish start ───────────────
export const SkirmishNotification = () => {
  const [notif, setNotif] = useState<{ attacker: string; defender: string } | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      setNotif({ attacker: detail.attacker, defender: detail.defender })
      setTimeout(() => setNotif(null), 5000)
    }
    window.addEventListener('skirmish-start', handler)
    return () => window.removeEventListener('skirmish-start', handler)
  }, [])

  if (!notif) return null

  return (
    <div style={{
      position: 'fixed', top: 100, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, textAlign: 'center',
      background: 'rgba(0,0,0,0.7)', padding: '8px 20px', borderRadius: 8,
      border: '1px solid rgba(255,68,68,0.4)',
      animation: 'fadeIn 0.3s ease-out',
    }}>
      <div style={{ color: '#ff6644', fontFamily: 'monospace', fontSize: 13, fontWeight: 'bold', letterSpacing: 1 }}>
        ⚔ TERRITORY SKIRMISH
      </div>
      <div style={{ color: '#aaa', fontFamily: 'monospace', fontSize: 11, marginTop: 2 }}>
        {notif.attacker} vs {notif.defender}
      </div>
    </div>
  )
}
