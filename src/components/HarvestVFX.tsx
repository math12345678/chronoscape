import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { triggerShake } from '../hooks/useScreenShake'
import type { EmitterConfig } from '../config/emitters'
import { DEFAULT_EMITTER, EXPLOSION_EMITTER } from '../config/emitters'

const MAX_PARTICLES = 400
const _pos = new Float32Array(MAX_PARTICLES * 3)
const _sizes = new Float32Array(MAX_PARTICLES)
const _colors = new Float32Array(MAX_PARTICLES * 3)

interface Particle {
  position: THREE.Vector3
  velocity: THREE.Vector3
  life: number
  maxLife: number
  size: number
  color: THREE.Color
  spark: boolean
}

const pool: Particle[] = []
const active: Particle[] = []

function getParticle(): Particle {
  return pool.pop() || { position: new THREE.Vector3(), velocity: new THREE.Vector3(), life: 0, maxLife: 1, size: 0.1, color: new THREE.Color('#44ffcc'), spark: false }
}

let _pendingPos: THREE.Vector3 | null = null
let _pendingCount = 0
let _pendingColor = '#44ffcc'
let _pendingSpeed = 3
let _pendingShake = false
let _pendingConfig: EmitterConfig | null = null

export function queueBurst(
  pos: THREE.Vector3,
  count: number,
  color: string = '#44ffcc',
  speed: number = 3,
  shake: boolean = false,
  config?: EmitterConfig,
) {
  _pendingPos = pos
  _pendingCount = count
  _pendingColor = color
  _pendingSpeed = speed
  _pendingShake = shake
  _pendingConfig = config ?? null
}

export function queueExplosion(pos: THREE.Vector3, color: string, size: 'small' | 'big' = 'big') {
  const count = size === 'big' ? 80 : 30
  const cfg = size === 'big' ? EXPLOSION_EMITTER : DEFAULT_EMITTER
  queueBurst(pos, count, color, cfg.props.speed[1], true, cfg)
  queueBurst(pos, Math.floor(count / 2), '#ffffff', cfg.props.speed[1] * 1.5, false, { ...cfg, shape: { type: 'sphere', radius: 0.3 } })
  const flashPos = pos.clone()
  flashPos.y -= 0.3
  queueBurst(flashPos, Math.floor(count / 3), color, cfg.props.speed[1] * 0.5, false, { ...cfg, shape: { type: 'sphere', radius: 0.1 } })
}

export const HarvestVFX = () => {
  const { scene } = useThree()
  const geomRef = useRef<THREE.BufferGeometry>(new THREE.BufferGeometry())
  const posAttr = useRef<THREE.BufferAttribute | null>(null)
  const sizeAttr = useRef<THREE.BufferAttribute | null>(null)
  const colAttr = useRef<THREE.BufferAttribute | null>(null)

  useEffect(() => {
    const g = new THREE.BufferGeometry()
    const pa = new THREE.BufferAttribute(_pos, 3)
    const sa = new THREE.BufferAttribute(_sizes, 1)
    const ca = new THREE.BufferAttribute(_colors, 3)
    posAttr.current = pa
    sizeAttr.current = sa
    colAttr.current = ca
    g.setAttribute('position', pa)
    g.setAttribute('size', sa)
    g.setAttribute('color', ca)
    g.setDrawRange(0, 0)
    geomRef.current = g

    const mat = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })
    const pts = new THREE.Points(g, mat)
    pts.frustumCulled = false
    scene.add(pts)

    return () => {
      scene.remove(pts)
      g.dispose()
      mat.dispose()
    }
  }, [scene])

  useFrame((_, delta) => {
    if (_pendingPos) {
      const baseColor = new THREE.Color(_pendingColor)
      const cfg = _pendingConfig ?? DEFAULT_EMITTER
      const isExplosion = _pendingCount > 40
      for (let i = 0; i < _pendingCount; i++) {
        const p = getParticle()
        // Spawn shape
        const shapeOffset = (() => {
          switch (cfg.shape.type) {
            case 'point': return new THREE.Vector3(0, 0, 0)
            case 'sphere': {
              const theta = Math.random() * Math.PI * 2
              const phi = Math.random() * Math.PI
              const r = cfg.shape.radius * Math.cbrt(Math.random())
              return new THREE.Vector3(
                Math.sin(phi) * Math.cos(theta) * r,
                Math.sin(phi) * Math.sin(theta) * r,
                Math.cos(phi) * r,
              )
            }
            case 'cube': {
              const h = cfg.shape.size / 2
              return new THREE.Vector3(
                (Math.random() - 0.5) * h,
                (Math.random() - 0.5) * h,
                (Math.random() - 0.5) * h,
              )
            }
          }
        })()
        p.position.copy(_pendingPos).add(shapeOffset)

        // Direction mode
        const spd = _pendingSpeed * (0.5 + Math.random() * 1.5)
        switch (cfg.mode.type) {
          case 'spread': {
            const theta = Math.random() * Math.PI * 2
            const phi = Math.random() * Math.PI
            p.velocity.set(
              Math.sin(phi) * Math.cos(theta) * spd,
              Math.sin(phi) * Math.sin(theta) * spd * 0.5 + 1,
              Math.cos(phi) * spd,
            )
            break
          }
          case 'scatter': {
            p.velocity.set(
              (Math.random() - 0.5) * _pendingSpeed * 2,
              (Math.random() - 0.5) * _pendingSpeed * 2,
              (Math.random() - 0.5) * _pendingSpeed * 2,
            )
            break
          }
          case 'direction': {
            const d = cfg.mode.dir
            const dir = new THREE.Vector3(d[0], d[1], d[2]).normalize()
            p.velocity.copy(dir).multiplyScalar(spd)
            break
          }
        }

        p.maxLife = cfg.props.lifetime[0] + Math.random() * (cfg.props.lifetime[1] - cfg.props.lifetime[0])
        p.life = 0
        p.size = isExplosion ? (0.1 + Math.random() * 0.2) : (0.06 + Math.random() * 0.1)
        p.color.copy(baseColor).multiplyScalar(0.5 + Math.random() * 0.5)
        p.spark = Math.random() < 0.15 && isExplosion
        active.push(p)
      }
      if (_pendingShake) triggerShake(_pendingCount > 60 ? 0.4 : 0.2, 8)
      _pendingPos = null
      _pendingShake = false
      _pendingConfig = null
    }

    let count = 0

    for (let i = active.length - 1; i >= 0; i--) {
      const p = active[i]
      p.life += delta
      if (p.life >= p.maxLife) {
        pool.push(p)
        active.splice(i, 1)
        continue
      }
      const t = p.life / p.maxLife

      p.position.addScaledVector(p.velocity, delta)
      p.velocity.y -= delta * (p.spark ? 2 : 4)
      p.velocity.multiplyScalar(p.spark ? 0.98 : 0.96)

      const idx = count * 3
      _pos[idx] = p.position.x
      _pos[idx + 1] = p.position.y
      _pos[idx + 2] = p.position.z
      _sizes[count] = p.spark ? p.size * (0.5 + t * 0.5) : p.size * (1 - t * 0.5)
      // Spark is white, fading to color
      if (p.spark) {
        _colors[idx] = 1 * (1 - t * 0.5)
        _colors[idx + 1] = 1 * (1 - t * 0.5)
        _colors[idx + 2] = 1 * (1 - t * 0.5)
      } else {
        _colors[idx] = p.color.r * (1 - t)
        _colors[idx + 1] = p.color.g * (1 - t)
        _colors[idx + 2] = p.color.b * (1 - t)
      }
      count++
    }

    const g = geomRef.current
    if (!g.attributes || !g.attributes.position) return
    g.attributes.position.needsUpdate = true
    g.attributes.size.needsUpdate = true
    g.attributes.color.needsUpdate = true
    g.setDrawRange(0, count)
  })

  return null
}
