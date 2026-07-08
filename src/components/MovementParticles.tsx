import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'
import { getTerrainHeight } from '../terrain'
import { shouldTick } from '../utils/performance'

const PARTICLE_COUNT = 30
const SPAWN_INTERVAL = 0.1
const MOVE_THRESHOLD = 0.03 // minimum distance moved to trigger a spawn

/**
 * Renders dust particles at the player's feet when they move.
 * When haste is active (level >= 2), particles are more numerous and have a speed trail look.
 * Particles drift backward from the player's movement direction and fade quickly.
 */
export const MovementParticles = () => {
  const pointsRef = useRef<THREE.Points>(null)
  const { camera } = useThree()
  const time = useRef(0)
  const spawnTimer = useRef(0)
  const nextParticle = useRef(0)
  const prevPos = useRef({ x: 0, z: 0 })
  const initialized = useRef(false)

  const { geometry, properties } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3)
    const op = new Float32Array(PARTICLE_COUNT).fill(0)
    const vel: { vx: number; vz: number; life: number; maxLife: number }[] = []

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      vel.push({ vx: 0, vz: 0, life: 0, maxLife: 0.5 + Math.random() * 0.5 })
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('opacity', new THREE.BufferAttribute(op, 1))

    return { geometry: geo, properties: vel }
  }, [])

  // Hoisted Vector3 for forward direction (avoids per-frame allocation)
  const forwardVec = useRef(new THREE.Vector3(0, 0, -1))

  useFrame((_, delta) => {
    if (!pointsRef.current) return
    if (!shouldTick(2)) return // throttle
    time.current += delta
    spawnTimer.current += delta

    const hasteLevel = useStore.getState().upgrades.haste
    const isFast = hasteLevel >= 2
    const spawnInterval = isFast ? 0.04 : SPAWN_INTERVAL

    // Get player position (camera projected down to ground)
    const px = camera.position.x
    const pz = camera.position.z
    const py = getTerrainHeight(px, pz)

    // Initialize previous position on first frame
    if (!initialized.current) {
      prevPos.current.x = px
      prevPos.current.z = pz
      initialized.current = true
    }

    // Compute movement delta
    const dx = px - prevPos.current.x
    const dz = pz - prevPos.current.z
    const distSq = dx * dx + dz * dz
    const isMoving = distSq > MOVE_THRESHOLD

    prevPos.current.x = px
    prevPos.current.z = pz

    // Estimate movement direction (no allocation: reuse ref)
    const forward = forwardVec.current
    forward.set(0, 0, -1)
    forward.applyQuaternion(camera.quaternion)
    forward.y = 0
    forward.normalize()

    const pos = geometry.attributes.position.array as Float32Array
    const op = geometry.attributes.opacity.array as Float32Array
    let deadCount = 0

    // Update existing particles
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = properties[i]
      p.life += delta
      if (p.life >= p.maxLife) {
        deadCount++
        op[i] = 0
        pos[i * 3] = px + (Math.random() - 0.5) * 0.5
        pos[i * 3 + 1] = py
        pos[i * 3 + 2] = pz + (Math.random() - 0.5) * 0.5
        continue
      }

      const t = p.life / p.maxLife
      pos[i * 3] += p.vx * delta
      pos[i * 3 + 2] += p.vz * delta
      pos[i * 3 + 1] += delta * 0.2
      op[i] = Math.max(0, 1 - t * 2)
    }

    // Spawn new dust particle only if actually moving
    if (isMoving && spawnTimer.current >= spawnInterval && deadCount > 0) {
      spawnTimer.current = 0

      const spawnIdx = nextParticle.current % PARTICLE_COUNT
      const scatterX = (Math.random() - 0.5) * 0.4
      const scatterZ = (Math.random() - 0.5) * 0.4

      pos[spawnIdx * 3] = px - forward.x * 0.3 + scatterX
      pos[spawnIdx * 3 + 1] = py + 0.05
      pos[spawnIdx * 3 + 2] = pz - forward.z * 0.3 + scatterZ
      op[spawnIdx] = isFast ? 0.6 : 0.3

      properties[spawnIdx].life = 0
      properties[spawnIdx].maxLife = isFast ? 0.6 : 0.5
      properties[spawnIdx].vx = -forward.x * (isFast ? 1.5 : 0.5) + (Math.random() - 0.5) * 0.5
      properties[spawnIdx].vz = -forward.z * (isFast ? 1.5 : 0.5) + (Math.random() - 0.5) * 0.5

      nextParticle.current++
    }

    geometry.attributes.position.needsUpdate = true
    geometry.attributes.opacity.needsUpdate = true
  })

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <primitive object={geometry} attach="geometry" />
      <pointsMaterial
        size={0.08}
        color="#887766"
        transparent
        opacity={0.4}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}
