import { useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { useFrameThrottled } from '../hooks/useFrameThrottled'
import * as THREE from 'three'
import { triggerShake } from '../hooks/useScreenShake'
import { useStore } from '../store'
import { setTimeScaleTarget } from './TimeManager'
import { getTimeCreditBalance, spendTimeCredit } from '../config/timeCredit'

// ── Storm types ────────────────────────────────────
export type StormType = 'hurricane' | 'acidRain' | 'temporalStorm'

interface StormState {
  active: boolean
  type: StormType | null
  endTime: number
  intensity: number
  color: string
}

const STORM_CONFIG: Record<StormType, { duration: number; color: string; description: string }> = {
  hurricane: { duration: 20000, color: '#4488cc', description: 'Winds tear through the island! Buildings take damage!' },
  acidRain: { duration: 15000, color: '#88ff44', description: 'Corrosive rain eats away resources! 2x decay!' },
  temporalStorm: { duration: 18000, color: '#ff44ff', description: 'Time fractures! Random time-scale fluctuations!' },
}

let _stormState: StormState = { active: false, type: null, endTime: 0, intensity: 0, color: '#4488cc' }
let _stormTimer = 180 + Math.random() * 120 // 3-5 minutes between storms
let _stormShieldActive = false
let _windAngle = 0

export function getStormState(): StormState { return { ..._stormState } }
export function isStormActive() { return _stormState.active }
export function getStormColor() { return _stormState.color }
export function getStormIntensity() { return _stormState.intensity }
export function getWindAngle() { return _windAngle }

export function activateStormShield() {
  _stormShieldActive = true
}

export function buyStormShield(): boolean {
  if (!spendTimeCredit(400)) return false
  _stormShieldActive = true
  return true
}

function triggerStorm(type: StormType) {
  const cfg = STORM_CONFIG[type]
  _stormState = { active: true, type, endTime: performance.now() + cfg.duration, intensity: 0, color: cfg.color }
  _windAngle = Math.random() * Math.PI * 2

  triggerShake(0.3, 5, 0.5)

  if (!_stormShieldActive) {
    switch (type) {
      case 'hurricane':
        // Destroy 10-20% of blocks
        useStore.setState((s) => {
          const keys = Object.keys(s.blocks)
          const toRemove = Math.floor(keys.length * (0.1 + Math.random() * 0.1))
          const newBlocks = { ...s.blocks }
          for (let i = 0; i < toRemove; i++) {
            delete newBlocks[keys[Math.floor(Math.random() * keys.length)]]
          }
          return { blocks: newBlocks }
        })
        break
      case 'acidRain':
        // Drain resources
        useStore.setState((s) => ({
          inventory: {
            ...s.inventory,
            vapour: Math.floor(s.inventory.vapour * 0.7),
            liquid: Math.floor(s.inventory.liquid * 0.8),
          },
        }))
        break
      case 'temporalStorm':
        setTimeScaleTarget(0.3 + Math.random() * 0.4)
        setTimeout(() => setTimeScaleTarget(1.5 + Math.random()), 3000)
        setTimeout(() => setTimeScaleTarget(0.5), 7000)
        setTimeout(() => setTimeScaleTarget(2.0), 11000)
        setTimeout(() => setTimeScaleTarget(1.0), 15000)
        // Random resource bonuses
        useStore.setState((s) => ({
          inventory: { ...s.inventory, raw: s.inventory.raw + 100, renown: s.inventory.renown + 5 },
        }))
        break
    }
  }

  window.dispatchEvent(new CustomEvent('storm-event', {
    detail: { type, label: type.toUpperCase(), description: cfg.description, color: cfg.color },
  }))
}

export function tickStorms(delta: number) {
  if (_stormState.active) {
    _stormState.intensity = Math.min(1, _stormState.intensity + delta * 0.5)

    if (performance.now() > _stormState.endTime) {
      _stormState.active = false
      _stormState.intensity = 0
      setTimeScaleTarget(1.0)
      _stormTimer = 180 + Math.random() * 120
      _stormShieldActive = false
      window.dispatchEvent(new CustomEvent('storm-event', { detail: { active: false } }))
      return
    }

    _windAngle += delta * 0.5
    return
  }

  _stormTimer -= delta
  if (_stormTimer <= 0) {
    const types: StormType[] = ['hurricane', 'acidRain', 'temporalStorm']
    triggerStorm(types[Math.floor(Math.random() * types.length)])
  }
}

// ── 3D Storm Visuals ──────────────────────────────
export const StormVFX = () => {
  const { camera } = useThree()
  const particlesRef = useRef<THREE.Points>(null)
  const time = useRef(0)

  useFrameThrottled((_, delta) => {
    time.current += delta
    if (!_stormState.active || !particlesRef.current) {
      if (particlesRef.current) particlesRef.current.visible = false
      return
    }

    particlesRef.current.visible = true
    const intensity = _stormState.intensity

    // Rotate particles around player
    const pos = particlesRef.current.geometry.attributes.position.array as Float32Array
    const count = pos.length / 3

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const speed = 5 + intensity * 15
      pos[i3] += Math.sin(_windAngle + i) * speed * delta * intensity
      pos[i3 + 1] -= speed * 0.3 * delta * intensity
      pos[i3 + 2] += Math.cos(_windAngle + i * 0.5) * speed * delta * intensity

      // Reset if too far
      if (Math.abs(pos[i3]) > 30 || pos[i3 + 1] < -5) {
        const angle = Math.random() * Math.PI * 2
        const dist = Math.random() * 25
        pos[i3] = camera.position.x + Math.cos(angle) * dist
        pos[i3 + 1] = 5 + Math.random() * 20
        pos[i3 + 2] = camera.position.z + Math.sin(angle) * dist
      }
    }
    particlesRef.current.geometry.attributes.position.needsUpdate = true

    // Color change based on storm type
    const mat = particlesRef.current.material as THREE.PointsMaterial
    mat.color.set(_stormState.color)
    mat.opacity = intensity * 0.3
    mat.size = _stormState.type === 'hurricane' ? 0.3 : _stormState.type === 'acidRain' ? 0.1 : 0.2
  }, 2)

  // Initialize particle geometry
  const geo = new THREE.BufferGeometry()
  const count = 500
  const pos = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 50
    pos[i * 3 + 1] = Math.random() * 25
    pos[i * 3 + 2] = (Math.random() - 0.5) * 50
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))

  return (
    <points ref={particlesRef} geometry={geo} frustumCulled={false} visible={false}>
      <pointsMaterial
        color="#4488cc"
        size={0.2}
        transparent
        opacity={0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}
