import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { getTimeScale } from './TimeManager'

const STREAM_PARTICLE_COUNT = 60
const BASES = ['A', 'T', 'C', 'G'] as const

const BASE_COLORS: Record<string, THREE.Color> = {
  A: new THREE.Color('#44ff88'),
  T: new THREE.Color('#ff4488'),
  C: new THREE.Color('#4488ff'),
  G: new THREE.Color('#ffaa44'),
}

interface SequenceParticle {
  pos: THREE.Vector3
  vel: THREE.Vector3
  life: number
  maxLife: number
  base: string
}

function createSequenceParticle(from: THREE.Vector3, to: THREE.Vector3): SequenceParticle {
  const dir = new THREE.Vector3().copy(to).sub(from).normalize()
  const speed = 6 + Math.random() * 8
  const base = BASES[Math.floor(Math.random() * BASES.length)]

  return {
    pos: from.clone().add(new THREE.Vector3(
      (Math.random() - 0.5) * 0.5,
      (Math.random() - 0.5) * 0.5,
      (Math.random() - 0.5) * 0.5,
    )),
    vel: new THREE.Vector3(
      dir.x * speed + (Math.random() - 0.5) * 1.5,
      dir.y * speed + (Math.random() - 0.5) * 1.5,
      dir.z * speed + (Math.random() - 0.5) * 1.5,
    ),
    life: 0,
    maxLife: 0.6 + Math.random() * 0.6,
    base,
  }
}

interface SequenceStreamProps {
  from: THREE.Vector3
  onComplete?: () => void
}

/**
 * DNA base pair sequence stream — ATCG particles flowing from a rift
 * to the player on harvest, representing genetic data being sequenced.
 *
 * Each particle is colored by its base: A=green, T=magenta, C=blue, G=orange.
 * Particles have a small wobble and fade out as they reach the player.
 */
export const SequenceStream = ({ from, onComplete }: SequenceStreamProps) => {
  const { camera } = useThree()
  const pointsRef = useRef<THREE.Points>(null)
  const particles = useRef<SequenceParticle[]>([])
  const elapsed = useRef(0)
  const spawned = useRef(false)

  // Pre-allocate buffer geometry
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(STREAM_PARTICLE_COUNT * 3), 3))
    g.setAttribute('opacity', new THREE.BufferAttribute(new Float32Array(STREAM_PARTICLE_COUNT), 1))
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(STREAM_PARTICLE_COUNT * 3), 3))
    g.setDrawRange(0, 0)
    return g
  }, [])

  // Staggered spawn on mount
  useFrame((_, delta) => {
    elapsed.current += delta * getTimeScale()

    // Spawn particles in staggered waves on first frame(s)
    if (!spawned.current && elapsed.current > 0.05) {
      spawned.current = true
      const target = new THREE.Vector3()
      target.copy(camera.position)
      target.y -= 0.8

      for (let i = 0; i < STREAM_PARTICLE_COUNT; i++) {
        const stagger = (i / STREAM_PARTICLE_COUNT) * 0.4
        setTimeout(() => {
          particles.current.push(createSequenceParticle(from, target))
        }, stagger * 1000)
      }
    }

    if (!pointsRef.current) return

    const posAttr = geo.attributes.position as THREE.BufferAttribute
    const opAttr = geo.attributes.opacity as THREE.BufferAttribute
    const colAttr = geo.attributes.color as THREE.BufferAttribute
    const pos = posAttr.array as Float32Array
    const op = opAttr.array as Float32Array
    const col = colAttr.array as Float32Array
    let alive = 0

    for (let i = particles.current.length - 1; i >= 0; i--) {
      const p = particles.current[i]
      p.life += delta
      if (p.life >= p.maxLife) {
        particles.current.splice(i, 1)
        continue
      }

      const t = p.life / p.maxLife
      p.vel.multiplyScalar(0.98)
      p.pos.addScaledVector(p.vel, delta)

      // Wobble effect for organic feel
      const wobble = Math.sin(p.life * 15 + p.pos.x) * 0.05
      pos[alive * 3] = p.pos.x + wobble
      pos[alive * 3 + 1] = p.pos.y + Math.sin(p.life * 12 + p.pos.z) * 0.05
      pos[alive * 3 + 2] = p.pos.z + Math.cos(p.life * 10) * 0.05

      op[alive] = Math.max(0, 1 - t * t) * 0.9

      // Base color
      const baseColor = BASE_COLORS[p.base] ?? BASE_COLORS.A
      col[alive * 3] = baseColor.r
      col[alive * 3 + 1] = baseColor.g
      col[alive * 3 + 2] = baseColor.b

      alive++
    }

    posAttr.needsUpdate = true
    opAttr.needsUpdate = true
    colAttr.needsUpdate = true
    geo.setDrawRange(0, alive)

    if (particles.current.length === 0 && elapsed.current > 0.3) {
      onComplete?.()
    }
  })

  return (
    <points ref={pointsRef} geometry={geo} frustumCulled={false}>
      <pointsMaterial
        size={0.2}
        vertexColors
        transparent
        opacity={0.9}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}
