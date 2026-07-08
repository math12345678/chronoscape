import { useRef, useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { useFrameThrottled } from '../hooks/useFrameThrottled'
import * as THREE from 'three'
import { getBiomeAt, BIOMES } from '../world/biome'
import { getTerrainHeight } from '../terrain'
import { getTimeScale } from './TimeManager'

// ── Module-level state for spawning effects from outside React ──

interface FootstepEffect {
  x: number
  z: number
  time: number           // spawn timestamp (ms)
  intensity: number      // 0-1 (walking=0.3, sprinting=0.6, landing=1.0)
  surface: SurfaceType
}

type SurfaceType = 'grass' | 'sand' | 'stone' | 'snow' | 'mud' | 'dirt' | 'gravel'

let footstepQueue: FootstepEffect[] = []

/** Call from FootstepSystem or PlayerController to schedule a ground effect */
export function spawnGroundEffect(x: number, z: number, intensity: number, surface?: SurfaceType) {
  if (!surface) {
    const biome = getBiomeAt(x, z)
    const props = BIOMES[biome]
    surface = props?.surfaceMaterial ?? 'grass'
  }
  footstepQueue.push({ x, z, time: performance.now(), intensity, surface })
  // Keep queue manageable
  if (footstepQueue.length > 50) footstepQueue.shift()
}

// ── Surface color palettes ──────────────────────────────

const SURFACE_COLORS: Record<SurfaceType, { primary: string; secondary: string; glow: string }> = {
  grass:   { primary: '#5a9a5a', secondary: '#7aba7a', glow: '#44ff88' },
  sand:    { primary: '#c2a870', secondary: '#d4c490', glow: '#ffcc66' },
  stone:   { primary: '#7a7a8a', secondary: '#9a9aaa', glow: '#88aaff' },
  snow:    { primary: '#d0d0d8', secondary: '#e8e8f0', glow: '#ffffff' },
  mud:     { primary: '#5a4a3a', secondary: '#7a6a5a', glow: '#aa7744' },
  dirt:    { primary: '#7a6a4a', secondary: '#9a8a6a', glow: '#ccaa66' },
  gravel:  { primary: '#6a6a7a', secondary: '#8a8a9a', glow: '#99aacc' },
}

// ── Particle burst for footstep ─────────────────────────

const PARTICLE_BURST_COUNT = 10

interface ParticleBurst {
  mesh: THREE.Points
  particles: { vx: number; vy: number; vz: number; life: number; maxLife: number }[]
  color: string
  spawnedAt: number
}

let activeBursts: ParticleBurst[] = []

/** Helper to safely dispose a THREE material (handles both single and array) */
function disposeMaterial(mat: THREE.Material | THREE.Material[]): void {
  if (Array.isArray(mat)) {
    for (const m of mat) m.dispose()
  } else {
    mat.dispose()
  }
}

function createBurst(effect: FootstepEffect): ParticleBurst | null {
  const colors = SURFACE_COLORS[effect.surface]
  if (!colors) return null

  const geo = new THREE.BufferGeometry()
  const pos = new Float32Array(PARTICLE_BURST_COUNT * 3)
  const op = new Float32Array(PARTICLE_BURST_COUNT)
  const col = new Float32Array(PARTICLE_BURST_COUNT * 3)

  // Set initial positions at footstep location
  for (let i = 0; i < PARTICLE_BURST_COUNT; i++) {
    pos[i * 3] = effect.x + (Math.random() - 0.5) * 0.1
    pos[i * 3 + 1] = 0.02
    pos[i * 3 + 2] = effect.z + (Math.random() - 0.5) * 0.1
    op[i] = 1
    const c = new THREE.Color(colors.primary)
    c.lerp(new THREE.Color(colors.secondary), Math.random())
    col[i * 3] = c.r
    col[i * 3 + 1] = c.g
    col[i * 3 + 2] = c.b
  }

  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('opacity', new THREE.BufferAttribute(op, 1))
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3))

  const mat = new THREE.PointsMaterial({
    size: 0.04 + effect.intensity * 0.06,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
    vertexColors: true,
  })

  const mesh = new THREE.Points(geo, mat)

  // Particle velocities
  const particles = Array.from({ length: PARTICLE_BURST_COUNT }, () => {
    const speed = 0.3 + effect.intensity * 0.8 + Math.random() * 0.5
    const theta = Math.random() * Math.PI * 2
    return {
      vx: Math.cos(theta) * speed * 0.3,
      vy: speed * 0.5 + Math.random() * 0.3,
      vz: Math.sin(theta) * speed * 0.3,
      life: 0,
      maxLife: 0.4 + Math.random() * 0.3,
    }
  })

  return { mesh, particles, color: colors.primary, spawnedAt: performance.now() }
}

// ── Glow ring on ground ─────────────────────────────────

interface GlowRing {
  mesh: THREE.Mesh
  spawnedAt: number
}

let activeRings: GlowRing[] = []

function createGlowRing(effect: FootstepEffect): GlowRing | null {
  const colors = SURFACE_COLORS[effect.surface]
  if (!colors) return null

  const geo = new THREE.RingGeometry(0.1, 0.15, 12)
  const mat = new THREE.MeshBasicMaterial({
    color: colors.glow,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })

  const terrainY = getTerrainHeight(effect.x, effect.z)
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(effect.x, terrainY + 0.03, effect.z)
  mesh.rotation.x = -Math.PI / 2

  return { mesh, spawnedAt: performance.now() }
}

// ── Main component ─────────────────────────────────────

export const GroundReactivity = () => {
  const { scene } = useThree()
  const groupRef = useRef<THREE.Group>(new THREE.Group())
  const lastCleanup = useRef(0)

  // Attach group to scene once (useEffect ensures proper cleanup on unmount)
  useEffect(() => {
    const g = groupRef.current
    g.name = 'ground-reactivity'
    scene.add(g)
    return () => { scene.remove(g) }
  }, [scene])

  useFrameThrottled((_, delta) => {
    const now = performance.now()
    const group = groupRef.current
    const timeScale = getTimeScale()

    // ── Process queue ──
    while (footstepQueue.length > 0) {
      const effect = footstepQueue.shift()!
      const burst = createBurst(effect)
      if (burst) {
        group.add(burst.mesh)
        activeBursts.push(burst)
      }
      const ring = createGlowRing(effect)
      if (ring) {
        group.add(ring.mesh)
        activeRings.push(ring)
      }
    }

    // ── Update bursts ──
    for (let i = activeBursts.length - 1; i >= 0; i--) {
      const b = activeBursts[i]
      const age = (now - b.spawnedAt) / 1000
      const dt = delta * timeScale

      if (age > 1.2) {
        group.remove(b.mesh)
        b.mesh.geometry.dispose()
        disposeMaterial(b.mesh.material)
        activeBursts.splice(i, 1)
        continue
      }

      const pos = b.mesh.geometry.attributes.position.array as Float32Array
      const op = b.mesh.geometry.attributes.opacity.array as Float32Array

      for (let j = 0; j < b.particles.length; j++) {
        const p = b.particles[j]
        p.life += dt
        if (p.life >= p.maxLife) {
          op[j] = 0
          continue
        }
        const t = p.life / p.maxLife
        pos[j * 3] += p.vx * dt
        pos[j * 3 + 1] += (p.vy - 2 * t) * dt
        pos[j * 3 + 2] += p.vz * dt
        op[j] = Math.max(0, 1 - t * t) * 0.7
      }
      b.mesh.geometry.attributes.position.needsUpdate = true
      b.mesh.geometry.attributes.opacity.needsUpdate = true
    }

    // ── Update glow rings ──
    for (let i = activeRings.length - 1; i >= 0; i--) {
      const r = activeRings[i]
      const age = (now - r.spawnedAt) / 1000

      if (age > 2.0) {
        group.remove(r.mesh)
        r.mesh.geometry.dispose()
        disposeMaterial(r.mesh.material)
        activeRings.splice(i, 1)
        continue
      }

      const mat = r.mesh.material as THREE.MeshBasicMaterial
      const progress = age / 2.0
      mat.opacity = Math.max(0, 1 - progress) * 0.25 * (1 - progress * 0.5)

      // Expand ring
      const scale = 1 + progress * 8
      r.mesh.scale.setScalar(scale)
    }

    // Cleanup check every 5s
    if (now - lastCleanup.current > 5000) {
      lastCleanup.current = now
      if (activeBursts.length > 100 || activeRings.length > 100) {
        while (activeBursts.length > 80) {
          const b = activeBursts.shift()!
          group.remove(b.mesh)
          b.mesh.geometry.dispose()
          disposeMaterial(b.mesh.material)
        }
        while (activeRings.length > 80) {
          const r = activeRings.shift()!
          group.remove(r.mesh)
          r.mesh.geometry.dispose()
          disposeMaterial(r.mesh.material)
        }
      }
    }
  }, 2)

  return null
}
