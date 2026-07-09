import { useRef, useMemo, useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { useFrameThrottled } from '../hooks/useFrameThrottled'
import * as THREE from 'three'
import { getTimeScale } from './TimeManager'

const LINE_COUNT = 80
const SPREAD = 25
const LINE_LENGTH = 1.2

/**
 * Speed lines that streak past the player when moving fast
 * or during dramatic moments (formula discovery, detonation).
 *
 * Inspired by wizard-masters speed-line particle system.
 * Uses a single BufferGeometry with line segments rendered as stretched points.
 */
export const SpeedLines = () => {
  const { camera } = useThree()
  const meshRef = useRef<THREE.Points>(null)
  const time = useRef(0)
  const opacity = useRef(0)
  const targetOpacity = useRef(0)

  // Per-particle data
  const particles = useMemo(() => {
    return Array.from({ length: LINE_COUNT }, () => ({
      offsetZ: Math.random() * SPREAD,
      offsetX: (Math.random() - 0.5) * SPREAD * 0.3,
      offsetY: (Math.random() - 0.5) * SPREAD * 0.3,
      speed: 4 + Math.random() * 12,
      phase: Math.random() * Math.PI * 2,
    }))
  }, [])

  // Initialize geometry on mount
  useEffect(() => {
    if (!meshRef.current) return
    const geometry = meshRef.current.geometry as THREE.BufferGeometry
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(LINE_COUNT * 6), 3))
    geometry.setDrawRange(0, 0)
  }, [])

  /**
   * Show speed lines for a beat. Called externally.
   */
  const flash = (intensity = 0.6) => {
    targetOpacity.current = Math.max(targetOpacity.current, intensity)
  }

  // Expose via window for easy calling from any component
  ;(window as any).__triggerSpeedLines = flash

  useFrameThrottled((_, delta) => {
    time.current += delta * getTimeScale()
    if (!meshRef.current) return

    const geometry = meshRef.current.geometry as THREE.BufferGeometry
    const posAttr = geometry.attributes.position as THREE.BufferAttribute | undefined
    if (!posAttr) return

    const pos = posAttr.array as Float32Array

    // Smooth opacity toward target
    const target = targetOpacity.current
    if (opacity.current < target) {
      opacity.current += delta * 3
      if (opacity.current > target) opacity.current = target
    } else if (opacity.current > 0) {
      opacity.current -= delta * 0.8
      if (opacity.current < 0) opacity.current = 0
    }

    if (opacity.current < 0.01 && target < 0.01) {
      targetOpacity.current = 0
      geometry.setDrawRange(0, 0)
      return
    }

    // Fade target automatically over time
    targetOpacity.current *= 0.97

    // Camera forward (horizontal only)
    const forward = new THREE.Vector3(0, 0, -1)
    forward.applyQuaternion(camera.quaternion)
    forward.y = 0
    forward.normalize()

    // Camera right
    const right = new THREE.Vector3(1, 0, 0)
    right.applyQuaternion(camera.quaternion)

    // Camera up
    const up = new THREE.Vector3(0, 1, 0)
    up.applyQuaternion(camera.quaternion)

    const campos = camera.position.clone()

    let count = 0
    for (let i = 0; i < LINE_COUNT; i++) {
      const p = particles[i]
      const scroll = (time.current * p.speed) % SPREAD

      // Line start: behind camera, scrolling toward player
      const zStart = -SPREAD + scroll

      const baseX = campos.x + right.x * p.offsetX + up.x * p.offsetY + forward.x * zStart
      const baseY = campos.y + right.y * p.offsetX + up.y * p.offsetY + forward.y * zStart
      const baseZ = campos.z + right.z * p.offsetX + up.z * p.offsetY + forward.z * zStart

      // Line end
      const ex = baseX + forward.x * LINE_LENGTH * 0.1
      const ey = baseY + forward.y * LINE_LENGTH * 0.1 + Math.sin(time.current * 3 + p.phase) * 0.005
      const ez = baseZ + forward.z * LINE_LENGTH * 0.1

      pos[i * 6] = baseX
      pos[i * 6 + 1] = baseY
      pos[i * 6 + 2] = baseZ
      pos[i * 6 + 3] = ex
      pos[i * 6 + 4] = ey
      pos[i * 6 + 5] = ez
      count++
    }

    posAttr.needsUpdate = true
    geometry.setDrawRange(0, count * 2)
  })

  // Using sizeAttenuation and plain points — the material handles sizing
  return (
    <points ref={meshRef} frustumCulled={false}>
      <pointsMaterial
        size={0.5}
        color="#44ffcc"
        transparent
        opacity={1}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}
