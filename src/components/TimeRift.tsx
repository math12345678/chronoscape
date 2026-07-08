import { useRef, useState, useMemo, useCallback, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useFrameThrottled } from '../hooks/useFrameThrottled'
import * as THREE from 'three'
import { useStore } from '../store'
import { HARVEST_AMOUNT, RIFT_RESPAWN_MS, RIFT_TYPE_CONFIG } from '../config/constants'
import type { RiftType } from '../config/constants'
import { getTimeScale } from './TimeManager'
import { getTerrainHeight } from '../terrain'
import { triggerShake } from '../hooks/useScreenShake'
import { spawnShockwave } from './ShockwaveRing'
import { spawnDNAHelix } from './DNAHelix'
import { SequenceStream } from './SequenceStream'
import { useSoundEngine } from '../hooks/useSoundEngine'
import { getTimeZoneAt } from './TimeZoneSystem'
import { getHarvestYieldBonus } from './Gangs/GangSystem'

// Registry for fancy rifts so InteractionHandler can trigger harvest
const fancyRiftRegistry = new Map<string, () => void>()

// Pre-allocated colors for progression-reactive effects — avoids GC pressure
const _riftPurple = new THREE.Color('#aa88ff')
const _riftPink = new THREE.Color('#ff88cc')

// ── Time Warp state ────────────────────────────────────
let _timeWarpEndTime = 0
let _timeWarpPreviousScale = 1
export function isTimeWarpActive() { return performance.now() < _timeWarpEndTime }
export function clearTimeWarp() { _timeWarpEndTime = 0 }
export function registerFancyRift(id: string, harvestFn: () => void) {
  fancyRiftRegistry.set(id, harvestFn)
}
export function unregisterFancyRift(id: string) {
  fancyRiftRegistry.delete(id)
}
export function triggerFancyRiftHarvest(id: string): boolean {
  const fn = fancyRiftRegistry.get(id)
  if (fn) { fn(); return true }
  return false
}

interface TimeRiftProps {
  position: [number, number, number]
  type?: RiftType
}

// ── Default constants (overridden by RiftType config) ──

const HARVEST_PARTICLE_COUNT = 80

// ── Helper: pool-based particle system for the harvest stream ──

interface StreamParticle {
  pos: THREE.Vector3
  vel: THREE.Vector3
  life: number
  maxLife: number
  size: number
}

function createStreamParticle(from: THREE.Vector3, to: THREE.Vector3): StreamParticle {
  const dir = new THREE.Vector3().copy(to).sub(from).normalize()
  const speed = 8 + Math.random() * 6
  return {
    pos: from.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3)),
    vel: new THREE.Vector3(
      dir.x * speed + (Math.random() - 0.5) * 2,
      dir.y * speed + (Math.random() - 0.5) * 2,
      dir.z * speed + (Math.random() - 0.5) * 2,
    ),
    life: 0,
    maxLife: 0.3 + Math.random() * 0.4,
    size: 0.12 + Math.random() * 0.15,
  }
}

// ── Sky Beacon (dramatically visible from any distance) ──

const RIFT_BEACON_STATE = { harvestedCount: 0 }
export function isFirstHarvestEver() { return RIFT_BEACON_STATE.harvestedCount === 0 }
export function markHarvested() { RIFT_BEACON_STATE.harvestedCount++ }

const SkyBeam = ({ active, color, glowColor, beamHeight, proximity }: { active: boolean; color: string; glowColor: string; beamHeight: number; proximity?: number }) => {
  const beamRef = useRef<THREE.Mesh>(null)
  const glowBeamRef = useRef<THREE.Mesh>(null)
  const topFlareRef = useRef<THREE.Mesh>(null)
  const beaconLightRef = useRef<THREE.Mesh>(null)
  const particlesRef = useRef<THREE.Points>(null)
  const time = useRef(0)
  const prevProx = useRef(0)

  const isFirstHarvest = isFirstHarvestEver()

  // Rising particles
  const particleData = useMemo(() => {
    const particleCount = isFirstHarvest ? 60 : 30
    const pos = new Float32Array(particleCount * 3)
    const speeds = new Float32Array(particleCount)
    const offsets = new Float32Array(particleCount)
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = 1.5 + Math.random() * 2
      pos[i * 3] = Math.cos(angle) * radius
      pos[i * 3 + 1] = Math.random() * beamHeight * 0.6
      pos[i * 3 + 2] = Math.sin(angle) * radius
      speeds[i] = 2 + Math.random() * 3
      offsets[i] = Math.random() * Math.PI * 2
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return { speeds, offsets, count: particleCount }
  }, [beamHeight, isFirstHarvest])

  useFrameThrottled((_, delta) => {
    time.current += delta * getTimeScale()
    const t = time.current
    const prox = Math.max(prevProx.current, proximity ?? 0)
    prevProx.current = prox

    // First-harvest beacon boost: extra dramatic pulsing before player's first harvest
    const firstBoost = active && isFirstHarvestEver() ? 2.0 : 1.0

    if (!active) {
      // Fade out everything
      if (beamRef.current) {
        const m = beamRef.current.material as THREE.MeshBasicMaterial
        m.opacity *= 0.97
      }
      if (glowBeamRef.current) {
        const m = glowBeamRef.current.material as THREE.MeshBasicMaterial
        m.opacity *= 0.97
      }
      if (topFlareRef.current) {
        const m = topFlareRef.current.material as THREE.MeshBasicMaterial
        m.opacity *= 0.97
      }
      if (beaconLightRef.current) {
        const m = beaconLightRef.current.material as THREE.MeshBasicMaterial
        m.opacity *= 0.97
      }
      return
    }

    // ── Core beam — bright, pulsing, proximity-responsive ──
    if (beamRef.current) {
      const coreBase = (0.35 + prox * 0.35) * firstBoost
      const coreFreq = 1.3 + prox * 2
      const coreAmp = (0.15 + prox * 0.2) * firstBoost
      const corePulse = coreBase + Math.sin(t * coreFreq) * coreAmp
      const mat = beamRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = Math.min(1, corePulse)
      const scale = 0.8 + prox * 0.4 + Math.sin(t * (0.9 + prox)) * (0.15 + prox * 0.15)
      beamRef.current.scale.x = scale * (firstBoost > 1 ? 1.3 : 1)
      beamRef.current.scale.z = scale * (firstBoost > 1 ? 1.3 : 1)
    }

    // ── Outer glow beam ──
    if (glowBeamRef.current) {
      const glowBase = (0.12 + prox * 0.15) * firstBoost
      const glowFreq = 0.7 + prox * 1.5
      const glowAmp = (0.05 + prox * 0.08) * firstBoost
      const glowPulse = glowBase + Math.sin(t * glowFreq) * glowAmp
      const mat = glowBeamRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = Math.min(0.5, glowPulse)
    }

    // ── Top flare — bright disc that pulses ──
    if (topFlareRef.current) {
      const flareBase = (0.4 + prox * 0.3) * firstBoost
      const flareFreq = 1.8 + prox * 2.5
      const flareAmp = (0.2 + prox * 0.2) * firstBoost
      const flarePulse = flareBase + Math.sin(t * flareFreq) * flareAmp
      const mat = topFlareRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = Math.min(1, flarePulse)
      const scale = (1 + prox * 0.5 + Math.sin(t * (1.2 + prox)) * (0.3 + prox * 0.2)) * firstBoost
      topFlareRef.current.scale.setScalar(scale)
    }

    // ── Beacon light — far-visible point at top ──
    if (beaconLightRef.current) {
      const lightBase = (0.3 + prox * 0.4) * firstBoost
      const lightFreq = 2.0 + prox * 3
      const lightAmp = (0.15 + prox * 0.2) * firstBoost
      const lightPulse = lightBase + Math.sin(t * lightFreq + 1) * lightAmp
      const mat = beaconLightRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = Math.min(1, lightPulse)
      const scale = (0.8 + prox * 0.6 + Math.sin(t * (1.5 + prox)) * (0.3 + prox * 0.3)) * firstBoost
      beaconLightRef.current.scale.setScalar(scale)
    }

    // ── Rising particles ──
    if (particlesRef.current) {
      const pos = particlesRef.current.geometry.attributes.position.array as Float32Array
      const speedMult = (1 + prox * 2) * firstBoost
      for (let i = 0; i < particleData.count; i++) {
        pos[i * 3 + 1] += delta * particleData.speeds[i] * getTimeScale() * speedMult
        pos[i * 3] += Math.sin(t * 2 + particleData.offsets[i]) * delta * 0.15
        pos[i * 3 + 2] += Math.cos(t * 2.3 + particleData.offsets[i]) * delta * 0.15
        if (pos[i * 3 + 1] > beamHeight * 0.6) {
          const angle = Math.random() * Math.PI * 2
          const radius = 1.5 + Math.random() * 2
          pos[i * 3] = Math.cos(angle) * radius
          pos[i * 3 + 1] = 0
          pos[i * 3 + 2] = Math.sin(angle) * radius
        }
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true
    }
  }, 2)

  if (!active) return null

  return (
    <group>
      {/* Core beam */}
      <mesh ref={beamRef} position={[0, beamHeight / 2, 0]}>
        <cylinderGeometry args={[0.4, 1.0, beamHeight, 8, 1]} />
        <meshBasicMaterial color={color} transparent opacity={0.35} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>

      {/* Outer glow beam */}
      <mesh ref={glowBeamRef} position={[0, beamHeight / 2, 0]}>
        <cylinderGeometry args={[1.5, 3.5, beamHeight, 12, 1]} />
        <meshBasicMaterial color={glowColor} transparent opacity={0.12} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>

      {/* Top flare disc */}
      <mesh ref={topFlareRef} position={[0, beamHeight, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[4, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Beacon light—bright center dot at top */}
      <mesh ref={beaconLightRef} position={[0, beamHeight, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.5, 16]} />
        <meshBasicMaterial color={'#ffffff'} transparent opacity={0.3} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Rising spark particles */}
      <points ref={particlesRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[new Float32Array(particleData.count * 3), 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.12} color={color} transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation />
      </points>
    </group>
  )
}

// ── Particle Fountain (accepts color config) ────────

const ParticleFountain = ({ active, color, count }: { active: boolean; color: string; count: number }) => {
  const POINT_COUNT = count
  const pointsRef = useRef<THREE.Points>(null)
  const particles = useMemo(() => {
    const pos = new Float32Array(POINT_COUNT * 3)
    const speeds = new Float32Array(POINT_COUNT)
    const offsets = new Float32Array(POINT_COUNT)
    for (let i = 0; i < POINT_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2
      const r = Math.random() * 0.8
      pos[i * 3] = Math.cos(theta) * r
      pos[i * 3 + 1] = Math.random() * 3
      pos[i * 3 + 2] = Math.sin(theta) * r
      speeds[i] = 0.5 + Math.random() * 1.0
      offsets[i] = Math.random() * Math.PI * 2
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return { positions: pos, speeds, offsets }
  }, [POINT_COUNT])

  useFrameThrottled((_, delta) => {
    if (!pointsRef.current || !active) return
    const pos = pointsRef.current.geometry.attributes.position.array as Float32Array
    const dt = delta * getTimeScale()
    const now = performance.now() * 0.001

    for (let i = 0; i < POINT_COUNT; i++) {
      pos[i * 3] += Math.sin(now * 2 + particles.offsets[i]) * dt * 0.2
      pos[i * 3 + 1] += dt * particles.speeds[i]
      pos[i * 3 + 2] += Math.cos(now * 2.3 + particles.offsets[i]) * dt * 0.2
      if (pos[i * 3 + 1] > 4) {
        const theta = Math.random() * Math.PI * 2
        const r = Math.random() * 0.6
        pos[i * 3] = Math.cos(theta) * r
        pos[i * 3 + 1] = 0
        pos[i * 3 + 2] = Math.sin(theta) * r
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true
  }, 2)

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[particles.positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.06} color={color} transparent opacity={active ? 0.6 * (count / 60) : 0} blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation />
    </points>
  )
}

// ── Energy Rings (accepts color + count) ────────────

const EnergyRings = ({ active, color, glowColor, ringCount }: { active: boolean; color: string; glowColor: string; ringCount: number }) => {
  const groupRef = useRef<THREE.Group>(null)
  const time = useRef(0)
  const RC = ringCount

  useFrameThrottled((_, delta) => {
    time.current += delta * getTimeScale()
    if (!groupRef.current) return

    groupRef.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh
      const speed = 0.5 + i * 0.3
      const phase = (i / RC) * Math.PI * 2
      const t = time.current * speed + phase

      mesh.position.y = Math.sin(t * 0.5) * 2.0 + 0.5
      mesh.rotation.z = t * 0.2
      mesh.rotation.x = Math.PI / 3 + Math.sin(t * 0.3 + i) * 0.2
      const mat = mesh.material as THREE.MeshBasicMaterial
      mat.opacity = active ? (0.08 + Math.sin(t) * 0.04) : 0.02
    })
  }, 2)

  // Generate ring colors — gradient from color to glowColor
  const ringColors = useMemo(() => {
    const c = new THREE.Color(color)
    const g = new THREE.Color(glowColor)
    return Array.from({ length: RC }, (_, i) => {
      const t = RC > 1 ? i / (RC - 1) : 0
      return c.clone().lerp(g, t).getStyle()
    })
  }, [color, glowColor, RC])

  return (
    <group ref={groupRef}>
      {Array.from({ length: RC }, (_, i) => (
        <mesh key={i} position={[0, 0.5, 0]}>
          <ringGeometry args={[1.0 + i * 0.4, 1.1 + i * 0.4, 24]} />
          <meshBasicMaterial
            color={ringColors[i]}
            transparent
            opacity={active ? 0.12 : 0}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}

// ── Ground Pulse Ring (periodic expanding ring to help locate rifts) ──

const GroundPulseRing = ({ active, color, glowColor, proximity }: { active: boolean; color: string; glowColor: string; proximity?: number }) => {
  const ringRef = useRef<THREE.Mesh>(null)
  const time = useRef(0)
  const pulsePhase = useRef(Math.random() * Math.PI * 2)

  useFrameThrottled((_, delta) => {
    time.current += delta * getTimeScale()
    if (!ringRef.current) return
    const prox = proximity ?? 0
    const freq = 0.6 + prox * 2
    const t = time.current * freq + pulsePhase.current
    const progress = (Math.sin(t) * 0.5 + 0.5)

    const scale = 1 + progress * (8 + prox * 12)
    const maxOpacity = 0.08 * (1 + prox * 3)
    const opacity = active ? (1 - progress) * maxOpacity : 0
    ringRef.current.scale.setScalar(scale)
    const mat = ringRef.current.material as THREE.MeshBasicMaterial
    mat.opacity = opacity
  }, 2)

  return (
    <mesh ref={ringRef} position={[0, -0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1.5, 2.0, 32]} />
      <meshBasicMaterial color={glowColor} transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  )
}

// ── Harvest Stream (cinematic particle flow to player) ──

const HarvestStream = ({ from, onComplete }: { from: THREE.Vector3; onComplete: () => void }) => {
  const { camera } = useThree()
  const pointsRef = useRef<THREE.Points>(null)
  const particles = useRef<StreamParticle[]>([])
  const elapsed = useRef(0)
  const spawned = useRef(false)

  // Spawn particles in staggered waves
  useFrame((_, delta) => {
    elapsed.current += delta

    if (!spawned.current && elapsed.current > 0) {
      spawned.current = true
      const target = new THREE.Vector3()
      target.copy(camera.position)
      target.y -= 0.8

      for (let i = 0; i < HARVEST_PARTICLE_COUNT; i++) {
        const stagger = (i / HARVEST_PARTICLE_COUNT) * 0.5
        setTimeout(() => {
          particles.current.push(createStreamParticle(from, target))
        }, stagger * 1000)
      }

      // Screen shake + flash
      triggerShake(0.35, 8)
    }

    // Update particles
    const posArray = new Float32Array(HARVEST_PARTICLE_COUNT * 3)
    const opArray = new Float32Array(HARVEST_PARTICLE_COUNT)
    let alive = 0

    for (let i = particles.current.length - 1; i >= 0; i--) {
      const p = particles.current[i]
      p.life += delta
      if (p.life >= p.maxLife) {
        particles.current.splice(i, 1)
        continue
      }
      const t = p.life / p.maxLife
      p.pos.addScaledVector(p.vel, delta)
      p.vel.multiplyScalar(0.97)

      posArray[alive * 3] = p.pos.x
      posArray[alive * 3 + 1] = p.pos.y
      posArray[alive * 3 + 2] = p.pos.z
      opArray[alive] = Math.max(0, 1 - t * t) * 0.8
      alive++
    }

    if (pointsRef.current) {
      const geo = pointsRef.current.geometry as THREE.BufferGeometry
      geo.attributes.position.array.set(posArray, 0)
      geo.attributes.opacity.array.set(opArray, 0)
      geo.attributes.position.needsUpdate = true
      geo.attributes.opacity.needsUpdate = true
      geo.setDrawRange(0, alive)
    }

    if (particles.current.length === 0 && elapsed.current > 1.5) {
      onComplete()
    }
  })

  // Pre-allocate buffer geometry
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(HARVEST_PARTICLE_COUNT * 3), 3))
    g.setAttribute('opacity', new THREE.BufferAttribute(new Float32Array(HARVEST_PARTICLE_COUNT), 1))
    g.setDrawRange(0, 0)
    return g
  }, [])

  return (
    <points ref={pointsRef} geometry={geo} frustumCulled={false}>
      <pointsMaterial
        size={0.25}
        color="#44ffcc"
        transparent
        opacity={0.9}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}

// ── Main TimeRift Component ────────────────────────────

export const TimeRift = ({ position, type = 'teal' }: TimeRiftProps) => {
  // Rift type config
  const cfg = RIFT_TYPE_CONFIG[type]
  const yieldAmount = Math.round(HARVEST_AMOUNT * cfg.yieldMultiplier)
  const respawnMs = RIFT_RESPAWN_MS * cfg.respawnMultiplier
  const fountainCount = Math.round(60 * cfg.particleMultiplier)
  const beamHeight = cfg.beamHeight
  const ringCount = cfg.ringCount
  const color = cfg.color
  const glowColor = cfg.glowColor
  const orbScale = cfg.scale

  const [active, setActive] = useState(true)
  const [burst, setBurst] = useState<boolean>(false)
  const [stream, setStream] = useState<boolean>(false)
  const [beam, setBeam] = useState<boolean>(false)
  const [sequenceStream, setSequenceStream] = useState<boolean>(false)
  const riftScale = useRef(1)
  const riftScaleTarget = useRef(1)
  const respawnFlash = useRef(0)
  const lastActivation = useRef(performance.now())
  const groupRef = useRef<THREE.Group>(null)
  const orbRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const cooldownRingRef = useRef<THREE.Mesh>(null)
  const orbitRingRef = useRef<THREE.Mesh>(null)
  const cooldownStartRef = useRef(0)
  const addRaw = useStore((s) => s.addRaw)
  const formulas = useStore((s) => s.formulas)
  const discoveredCount = formulas.filter(f => f.discovered).length
  const progressionBoost = 1 + discoveredCount * 0.15 // +15% per formula
  const bobPhase = useRef(Math.random() * Math.PI * 2)
  const sounds = useSoundEngine()
  const { camera } = useThree()
  const emissiveColor = useRef(new THREE.Color())
  const proximityRef = useRef(0)
  const resonanceIntensityRef = useRef(0)

  // Sit above terrain surface
  const terrainY = getTerrainHeight(position[0], position[2])
  const floatY = terrainY + 1.2

  const riftIdRef = useRef(`fancy-rift-${Math.random().toString(36).slice(2, 8)}`)

  const userData = useMemo(
    () => ({ interactable: true, type: 'rift' as const, riftId: riftIdRef.current, prompt: `[Click] Harvest ${cfg.label}` }),
    [cfg.label],
  )

  const triggerHarvest = useCallback(() => {
    if (!active) return
    const inSurge = getTimeZoneAt(position[0], position[2]) === 'surgeZone'
    const repBonus = getHarvestYieldBonus()
    const baseYield = Math.round(yieldAmount * (inSurge ? 2 : 1) * repBonus)
    const s = useStore.getState()
    let harvestAmount = 0

    if (type === 'rainbow') {
      const each = Math.max(1, Math.floor(baseYield / 4))
      harvestAmount = each * 4
      s.addRaw(each)
      const inv = useStore.getState().inventory
      useStore.setState({ inventory: { ...inv, vapour: inv.vapour + each, liquid: inv.liquid + each, crystal: inv.crystal + each } })
    } else if (type === 'void') {
      harvestAmount = baseYield * 2
      s.addRaw(harvestAmount)
      window.dispatchEvent(new CustomEvent('spawn-void-enemy', { detail: { x: position[0], z: position[2] } }))
    } else if (type === 'timeWarp') {
      harvestAmount = Math.round(baseYield * 0.5)
      s.addRaw(harvestAmount)
      _timeWarpPreviousScale = useStore.getState().timeScale
      const THREE_SEC = 3000
      _timeWarpEndTime = performance.now() + THREE_SEC
      useStore.getState().setTimeScale(0.2)
      setTimeout(() => {
        if (isTimeWarpActive()) {
          useStore.getState().setTimeScaleTarget(_timeWarpPreviousScale)
          _timeWarpEndTime = 0
        }
      }, THREE_SEC)
    } else {
      harvestAmount = baseYield
      addRaw(harvestAmount)
    }
    setActive(false)
    cooldownStartRef.current = performance.now()
    riftScaleTarget.current = 0.3 // Collapse to 30% size
    setBurst(true)
    setStream(true)
    setBeam(true)
    sounds.harvest()

    // Dispatch harvest event for UI popup
    if (harvestAmount > 0) {
      window.dispatchEvent(new CustomEvent('harvest-event', {
        detail: { amount: harvestAmount, combo: 0, multiplier: 1, color },
      }))
    }

    // ── First-ever harvest celebration ──
    const first = isFirstHarvestEver()
    if (first) {
      markHarvested()
      // Super shockwave
      spawnShockwave({ position: [position[0], terrainY + 0.1, position[2]], color, duration: 2, maxScale: 30, ringCount: 7 })
      triggerShake(1.2, 25)
      // Extra helices
      spawnDNAHelix({ position: [position[0] + 3, terrainY + 0.5, position[2] + 3], scale: 2.0 })
      spawnDNAHelix({ position: [position[0] - 3, terrainY + 0.5, position[2] - 3], scale: 2.0 })
      spawnDNAHelix({ position: [position[0], terrainY + 0.5, position[2]], scale: 2.5 })
      // Big screen flash
      const flash = document.createElement('div')
      flash.style.cssText = 'position:fixed;inset:0;background:radial-gradient(ellipse at 50% 50%, rgba(68,255,204,0.35) 0%, rgba(68,255,204,0.1) 40%, transparent 70%);pointer-events:none;z-index:99999;transition:opacity 0.5s ease-out'
      document.body.appendChild(flash)
      requestAnimationFrame(() => { flash.style.opacity = '1' })
      setTimeout(() => { flash.style.opacity = '0'; setTimeout(() => { if (flash.parentNode) flash.parentNode.removeChild(flash) }, 500) }, 200)
      // Surge popup
      window.dispatchEvent(new CustomEvent('harvest-event', {
        detail: { amount: harvestAmount, color: '#44ffcc', isSurge: true, combo: 1 },
      }))
      // Toast
      window.dispatchEvent(new CustomEvent('toast-event', {
        detail: {
          title: '✦ +' + harvestAmount + ' Epoch ✦',
          description: 'Auto-refined to Chrono • Press B to build',
          color: '#44ffcc',
          icon: '⟐',
        },
      }))
    }

    // Screen shake + flash with rift type color
    const shakeIntensity = type === 'gold' ? 0.6 : type === 'crimson' ? 0.5 : 0.4
    const shockwaveRings = type === 'gold' ? 3 : type === 'crimson' ? 1 : 2
    const shockwaveScale = type === 'gold' ? 8 : type === 'cyan' ? 7 : 6
    triggerShake(shakeIntensity, 5)

    // Colored screen flash per rift type
    const flash = document.createElement('div')
    const flashColor = type === 'gold' ? '255,215,0' : type === 'crimson' ? '255,68,102' : type === 'purple' ? '204,102,255' : type === 'cyan' ? '102,221,255' : type === 'rainbow' ? '255,102,238' : type === 'void' ? '68,17,170' : '68,255,204'
    flash.style.cssText = `position:fixed;inset:0;background:radial-gradient(ellipse at center, rgba(${flashColor},0.15) 0%, rgba(${flashColor},0.06) 50%, transparent 80%);pointer-events:none;z-index:9999;transition:opacity 0.5s ease-out`
    document.body.appendChild(flash)
    requestAnimationFrame(() => { flash.style.opacity = '0' })
    setTimeout(() => { if (flash.parentNode) flash.parentNode.removeChild(flash) }, 600)

    // Harvest border glow — edge lighting matching rift color
    const border = document.createElement('div')
    border.style.cssText = `position:fixed;inset:0;box-shadow:inset 0 0 50px 10px rgba(${flashColor},0.12);pointer-events:none;z-index:9998;transition:opacity 0.3s ease-out`
    document.body.appendChild(border)
    requestAnimationFrame(() => { border.style.opacity = '1' })
    setTimeout(() => { border.style.opacity = '0'; setTimeout(() => { if (border.parentNode) border.parentNode.removeChild(border) }, 400) }, 200)

    spawnShockwave({ position: [position[0], terrainY + 0.1, position[2]], color, duration: 0.8, maxScale: shockwaveScale, ringCount: shockwaveRings })
    spawnDNAHelix({ position: [position[0], terrainY + 0.5, position[2]], scale: type === 'gold' ? 1.2 : type === 'crimson' ? 0.6 : 0.8 })
    setSequenceStream(true)

    // ── Rift resonance chain: notify nearby rifts ──
    window.dispatchEvent(new CustomEvent('rift-harvested', {
      detail: { x: position[0], y: terrainY + 0.1, z: position[2], color, type },
    }))

    window.setTimeout(() => {
      setActive(true)
      riftScaleTarget.current = 1
      respawnFlash.current = 1
      spawnShockwave({ position: [position[0], terrainY + 0.1, position[2]], color, duration: 1.2, maxScale: 20, ringCount: 4 })
    }, respawnMs)
  }, [active, addRaw, yieldAmount, respawnMs, color, type, terrainY, position, sounds])

  // Register/unregister in the global fancy rift registry
  useEffect(() => {
    const id = riftIdRef.current
    registerFancyRift(id, triggerHarvest)
    return () => unregisterFancyRift(id)
  }, [triggerHarvest])

  // ── Rift resonance: listen for nearby rift harvests ──
  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail
      if (!d) return
      const dx = d.x - position[0]
      const dz = d.z - position[2]
      const dist = Math.sqrt(dx * dx + dz * dz)
      if (dist < 0.5 || dist > 35) return
      const intensity = Math.max(0.15, 1 - dist / 35)
      resonanceIntensityRef.current = intensity
      spawnShockwave({ position: [position[0], terrainY + 0.1, position[2]], color: d.color, duration: 0.6, maxScale: 6 * intensity, ringCount: 2 })
      sounds.uiClick()
    }
    window.addEventListener('rift-harvested', handler)
    return () => window.removeEventListener('rift-harvested', handler)
  }, [position, terrainY, color, sounds])

  const handleClick = useCallback(() => {
    triggerHarvest()
  }, [triggerHarvest])

  useFrame((_, baseDelta) => {
    const delta = baseDelta * getTimeScale()
    if (!groupRef.current) return

    // Compute proximity to player (0 = on top, 1 = far away, clamped to 10-40 range)
    const dx = camera.position.x - position[0]
    const dz = camera.position.z - position[2]
    const dist = Math.sqrt(dx * dx + dz * dz)
    const prox = Math.max(0, 1 - (dist - 20) / 50) // 1 at <=20u, 0 at >=70u — wider anticipation zone
    proximityRef.current = prox

    // ── Rift scale animation (collapse on harvest, grow on respawn) ──
    riftScale.current += (riftScaleTarget.current - riftScale.current) * Math.min(1, delta * 4)
    // Respawn flash decay
    if (respawnFlash.current > 0) {
      respawnFlash.current = Math.max(0, respawnFlash.current - delta * 3)
    }
    // Resonance intensity decay
    if (resonanceIntensityRef.current > 0) {
      resonanceIntensityRef.current = Math.max(0, resonanceIntensityRef.current - delta * 3)
    }

    bobPhase.current += delta * 1.2

    if (active) {
      // More dramatic bob when player is close
      const bobAmp = 0.25 + prox * 0.4
      const bobFreq = 1.5 + prox * 2.5
      const bob = Math.sin(bobPhase.current * bobFreq) * bobAmp
      groupRef.current.position.y = floatY + bob
      groupRef.current.rotation.y += delta * (0.2 + prox * 0.4)
      groupRef.current.scale.setScalar(riftScale.current)

      if (orbRef.current) {
        const pulseBase = 1.0 + prox * 0.8
        const pulseAmp = 0.5 + prox * 0.5
        const pulseFreq = 2.5 + prox * 3
        const pulse = pulseBase + Math.sin(bobPhase.current * pulseFreq) * pulseAmp
        const flashBoost = 1 + respawnFlash.current * 4
        const resonanceBoost = 1 + resonanceIntensityRef.current * 6
        // Progression boost: rifts glow brighter as you discover formulas
        const mat = orbRef.current.material as THREE.MeshStandardMaterial
        mat.emissiveIntensity = pulse * flashBoost * resonanceBoost * progressionBoost
        // Shift emissive color toward purple (1 formula) then pink (2+) as you progress
        if (discoveredCount >= 1) {
          emissiveColor.current.set(glowColor)
          emissiveColor.current.lerp(_riftPurple, 0.25)
          if (discoveredCount >= 2) emissiveColor.current.lerp(_riftPink, 0.2)
          mat.emissive.copy(emissiveColor.current)
        }
        // Scale pulse — more dramatic breathing
        const scaleAmp = 0.08 + prox * 0.08
        const scaleFreq = 2 + prox * 2
        const scalePulse = 1 + Math.sin(bobPhase.current * scaleFreq) * scaleAmp
        orbRef.current.scale.setScalar(scalePulse)
      }
      if (glowRef.current) {
        const glowBase = 0.5 + prox * 0.5
        const glowAmp = 0.3 + prox * 0.4
        const glowFreq = 2 + prox * 2
        const glowPulse = glowBase + Math.sin(bobPhase.current * glowFreq) * glowAmp
        ;(glowRef.current.material as THREE.MeshBasicMaterial).opacity = glowPulse
      }

      // Rotating orbit ring — faster spin
      if (orbitRingRef.current) {
        orbitRingRef.current.rotation.y += delta * 2
        orbitRingRef.current.rotation.x = Math.PI / 3 + Math.sin(bobPhase.current * 0.6) * 0.15
      }
    } else {
      // Dormant — update cooldown ring opacity to show progress
      const elapsed = performance.now() - cooldownStartRef.current
      const progress = Math.min(elapsed / RIFT_RESPAWN_MS, 1)

      if (cooldownRingRef.current) {
        const ringOpacity = 0.15 + progress * 0.35
        ;(cooldownRingRef.current.material as THREE.MeshBasicMaterial).opacity = ringOpacity
      }

      groupRef.current.rotation.y += delta * 0.05
      if (orbitRingRef.current) orbitRingRef.current.rotation.y += delta * 0.2

      // Dormant scale — grow from 0.3 → 1 as cooldown progresses and player is near
      const dormantTarget = 0.3 + progress * 0.7
      const dormantScale = dormantTarget * (1 + prox * 0.15)
      groupRef.current.scale.setScalar(riftScale.current * dormantScale)
    }
  })

  return (
    <group ref={groupRef} position={[position[0], floatY, position[2]]}>
      {/* Sky Beam */}
      <SkyBeam active={active} color={color} glowColor={glowColor} beamHeight={beamHeight} />

      {/* Particle Fountain */}
      <ParticleFountain active={active} color={color} count={fountainCount} />

      {/* Energy Rings */}
      <EnergyRings active={active} color={color} glowColor={glowColor} ringCount={ringCount} />

      {/* Ground glow disc */}
      <mesh position={[0, -0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3.5, 32]} />
        <meshBasicMaterial color={glowColor} transparent opacity={active ? 0.12 : 0} depthWrite={false} />
      </mesh>

      {/* Ground ring */}
      <mesh position={[0, -0.25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.8, 3.2, 48]} />
        <meshBasicMaterial color={color} transparent opacity={active ? 0.08 : 0} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Pulse ring — expands outward to help locate rift from distance */}
      <GroundPulseRing active={active} color={color} glowColor={glowColor} />

      {/* Cooldown ring */}
      <mesh ref={cooldownRingRef} position={[0, -0.7, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.4, 0.55, 24]} />
        <meshBasicMaterial color={glowColor} transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>

      {/* Main orb */}
      <mesh ref={orbRef} onClick={handleClick} userData={userData}>
        <sphereGeometry args={[0.6 * orbScale, 32, 32]} />
        <meshPhysicalMaterial
          color={active ? glowColor : '#224444'}
          emissive={active ? glowColor : '#001111'}
          emissiveIntensity={active ? 0.8 : 0}
          transparent opacity={active ? 1 : 0.2}
          roughness={0.1} metalness={0.3}
          clearcoat={0.4} clearcoatRoughness={0.3}
        />
      </mesh>

      {/* Outer glow sphere */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.9 * orbScale, 16, 16]} />
        <meshBasicMaterial color={glowColor} transparent opacity={active ? 0.2 : 0} side={THREE.BackSide} />
      </mesh>

      {/* Glow ring around orb */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.7 * orbScale, 1.0 * orbScale, 32]} />
        <meshBasicMaterial color={glowColor} transparent opacity={active ? 0.3 : 0} side={THREE.DoubleSide} />
      </mesh>

      {/* Rotating orbit ring */}
      <mesh ref={orbitRingRef} position={[0, 0, 0]}>
        <ringGeometry args={[1.3 * orbScale, 1.5 * orbScale, 32]} />
        <meshBasicMaterial color={color} transparent opacity={active ? 0.2 : 0.05} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Orbiting energy motes */}
      {active && Array.from({ length: Math.round(6 * orbScale) }, (_, i) => {
        const angle = (i / Math.round(6 * orbScale)) * Math.PI * 2
        return (
          <mesh key={`mote-${i}`} position={[Math.cos(angle) * 0.9 * orbScale, Math.sin(angle * 2) * 0.3, Math.sin(angle) * 0.9 * orbScale]}>
            <sphereGeometry args={[0.04 * orbScale, 6, 6]} />
            <meshBasicMaterial color={color} transparent opacity={0.7} />
          </mesh>
        )
      })}

      {/* Dust mote ring */}
      <mesh position={[0, 0.1, 0]} rotation={[Math.PI / 3, 0, 0]}>
        <ringGeometry args={[1.1 * orbScale, 1.2 * orbScale, 24]} />
        <meshBasicMaterial color={glowColor} transparent opacity={active ? 0.12 : 0} side={THREE.DoubleSide} />
      </mesh>

      {/* Burst VFX on harvest */}
      {burst && (
        <HarvestBurstSmall
          color={color}
          onComplete={() => setBurst(false)}
        />
      )}

      {/* Harvest stream — cinematic particle flow to player */}
      {stream && groupRef.current && (() => {
        const v = new THREE.Vector3()
        groupRef.current.getWorldPosition(v)
        return (
          <HarvestStream
            from={v}
            onComplete={() => setStream(false)}
          />
        )
      })()}

      {/* Harvest energy beam — visible energy ribbon rift → player */}
      {beam && groupRef.current && (() => {
        const v = new THREE.Vector3()
        groupRef.current.getWorldPosition(v)
        return (
          <HarvestBeam
            from={v}
            color={color}
            onComplete={() => setBeam(false)}
          />
        )
      })()}

      {/* Sequence stream — ATCG base pair particles */}
      {sequenceStream && groupRef.current && (() => {
        const v = new THREE.Vector3()
        groupRef.current.getWorldPosition(v)
        return (
          <SequenceStream
            from={v}
            onComplete={() => setSequenceStream(false)}
          />
        )
      })()}
    </group>
  )
}

// ── Small Burst Helper ─────────────────────────────────

const BURST_COUNT = 40
const HarvestBurstSmall = ({ color, onComplete }: { color: string; onComplete: () => void }) => {
  const meshRef = useRef<THREE.Points>(null)
  const particles = useRef(
    Array.from({ length: BURST_COUNT }, () => ({
      vel: new THREE.Vector3(
        (Math.random() - 0.5) * 8, Math.random() * 6 + 3, (Math.random() - 0.5) * 8,
      ),
      life: 0,
      maxLife: 0.5 + Math.random() * 0.4,
    })),
  )

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(BURST_COUNT * 3), 3))
    g.setAttribute('opacity', new THREE.BufferAttribute(new Float32Array(BURST_COUNT), 1))
    return g
  }, [])

  useFrameThrottled((_, delta) => {
    if (!meshRef.current) return
    const pos = geo.attributes.position.array as Float32Array
    const op = geo.attributes.opacity.array as Float32Array
    let allDead = true

    for (let i = 0; i < BURST_COUNT; i++) {
      const p = particles.current[i]
      p.life += delta
      if (p.life >= p.maxLife) {
        pos[i * 3] = 0; pos[i * 3 + 1] = -10; pos[i * 3 + 2] = 0
        op[i] = 0
        continue
      }
      allDead = false
      const t = p.life / p.maxLife
      pos[i * 3] = p.vel.x * t
      pos[i * 3 + 1] = p.vel.y * t - 4 * t * t
      pos[i * 3 + 2] = p.vel.z * t
      op[i] = Math.max(0, 1 - t)
    }
    geo.attributes.position.needsUpdate = true
    geo.attributes.opacity.needsUpdate = true
    if (allDead) onComplete()
  }, 3)

  return (
    <points ref={meshRef} geometry={geo} frustumCulled={false}>
      <pointsMaterial
        size={0.3}
        color={color}
        transparent
        opacity={0.9}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}

// ── Harvest Energy Beam ────────────────────────────────

const HarvestBeam = ({ from, color, onComplete }: { from: THREE.Vector3; color: string; onComplete: () => void }) => {
  const { camera } = useThree()
  const coreRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const elapsed = useRef(0)
  const upVec = useRef(new THREE.Vector3(0, 1, 0))
  const quat = useRef(new THREE.Quaternion())
  const sizeRef = useRef(0.15)

  useFrame((_, delta) => {
    elapsed.current += delta
    const t = Math.min(elapsed.current / 0.4, 1)
    const opacity = Math.max(0, 1 - t * t)

    const to = camera.position
    const dir = new THREE.Vector3().copy(to).sub(from)
    const dist = Math.max(0.1, dir.length())
    const mid = new THREE.Vector3().copy(from).add(dir.clone().multiplyScalar(0.5))
    const normDir = dir.clone().normalize()

    quat.current.setFromUnitVectors(upVec.current, normDir)

    sizeRef.current = 0.15 * (1 - t * 0.5)

    if (coreRef.current) {
      coreRef.current.position.copy(mid)
      coreRef.current.quaternion.copy(quat.current)
      coreRef.current.scale.set(sizeRef.current, dist, sizeRef.current)
      const mat = coreRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = opacity * 0.7
    }
    if (glowRef.current) {
      glowRef.current.position.copy(mid)
      glowRef.current.quaternion.copy(quat.current)
      glowRef.current.scale.set(sizeRef.current * 4, dist, sizeRef.current * 4)
      const mat = glowRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = opacity * 0.15
    }

    if (t >= 1) onComplete()
  })

  return (
    <group>
      <mesh ref={coreRef}>
        <cylinderGeometry args={[1, 1, 1, 6, 1]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={glowRef}>
        <cylinderGeometry args={[1, 1, 1, 8, 1]} />
        <meshBasicMaterial color={color} transparent opacity={0.15} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}
