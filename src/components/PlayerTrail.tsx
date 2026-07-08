import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const TRAIL_LENGTH = 40
const TRAIL_SPACING = 0.08

interface TrailPoint {
  x: number
  y: number
  z: number
  time: number
}

/**
 * Fading glow ribbon that trails behind the player when sprinting.
 * Pre-allocated buffer — zero GC pressure.
 */
export const PlayerTrail = () => {
  const { camera } = useThree()
  const pointsRef = useRef<THREE.Points>(null)
  const trail = useRef<TrailPoint[]>([])
  const timer = useRef(0)
  const speedRef = useRef(0)

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL_LENGTH * 3), 3))
    g.setAttribute('opacity', new THREE.BufferAttribute(new Float32Array(TRAIL_LENGTH), 1))
    g.setDrawRange(0, 0)
    return g
  }, [])

  useFrame((_, delta) => {
    const pos = camera.position
    const dir = new THREE.Vector3()
    camera.getWorldDirection(dir)
    dir.y = 0
    const isSprinting = (window as any).__isSprinting === true
    const speed = dir.length()
    speedRef.current += (speed - speedRef.current) * Math.min(1, delta * 5)

    // Determine trail intensity — sprinting or fast movement
    const shouldTrail = isSprinting || speedRef.current > 0.3
    if (!shouldTrail) {
      timer.current = 0
      return
    }

    timer.current += delta
    if (timer.current < TRAIL_SPACING) return
    timer.current = 0

    // Add current position to trail (offset behind player by half a unit)
    const behind = new THREE.Vector3().copy(pos).addScaledVector(dir, -0.5)
    trail.current.push({ x: behind.x, y: behind.y - 1.2, z: behind.z, time: performance.now() })
    if (trail.current.length > TRAIL_LENGTH) {
      trail.current.shift()
    }

    // Update geometry
    const posArr = geometry.attributes.position.array as Float32Array
    const opArr = geometry.attributes.opacity.array as Float32Array
    const now = performance.now()
    const DURATION = 600
    let count = 0

    for (const p of trail.current) {
      const age = now - p.time
      if (age > DURATION) continue
      const t = age / DURATION
      const i3 = count * 3
      posArr[i3] = p.x
      posArr[i3 + 1] = p.y + Math.sin(age * 0.005) * 0.03
      posArr[i3 + 2] = p.z
      opArr[count] = Math.max(0, 1 - t * t) * (isSprinting ? 0.5 : 0.25)
      count++
    }

    geometry.setDrawRange(0, count)
    geometry.attributes.position.needsUpdate = true
    geometry.attributes.opacity.needsUpdate = true
  })

  return (
      <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        size={0.2}
        color="#88ddff"
        transparent
        opacity={0.5}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}