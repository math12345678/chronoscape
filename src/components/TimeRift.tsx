import { useRef, useState, useMemo, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'
import { HARVEST_AMOUNT, RIFT_RESPAWN_MS } from '../config/constants'
import { getTerrainHeight } from '../terrain'
import { HarvestBurst } from './HarvestBurst'
import { useSoundEngine } from '../hooks/useSoundEngine'

interface TimeRiftProps {
  position: [number, number, number]
}

const BEAM_PARTICLE_COUNT = 12

/**
 * A harvest beam: stream of particles from the rift toward the player's camera.
 * Played once when the rift is harvested.
 */
const HarvestBeam = ({ from, onComplete }: { from: THREE.Vector3; onComplete: () => void }) => {
  const { camera } = useThree()
  const meshRef = useRef<THREE.Points>(null)
  const elapsed = useRef(0)
  const done = useRef(false)

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(BEAM_PARTICLE_COUNT * 3)
    const vel: { v: THREE.Vector3; delay: number }[] = []

    const target = new THREE.Vector3()
    target.copy(camera.position)
    target.y -= 0.5 // approximate player chest height

    for (let i = 0; i < BEAM_PARTICLE_COUNT; i++) {
      const t = i / BEAM_PARTICLE_COUNT
      // Initial position is at the rift with slight scatter
      pos[i * 3] = from.x + (Math.random() - 0.5) * 0.2
      pos[i * 3 + 1] = from.y + (Math.random() - 0.5) * 0.2
      pos[i * 3 + 2] = from.z + (Math.random() - 0.5) * 0.2

      const dir = new THREE.Vector3().copy(target).sub(from).normalize()
      const speed = 6 + Math.random() * 4
      vel.push({
        v: new THREE.Vector3(
          dir.x * speed + (Math.random() - 0.5),
          dir.y * speed + (Math.random() - 0.5),
          dir.z * speed + (Math.random() - 0.5),
        ),
        delay: t * 0.2, // stagger particle starts
      })
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return { positions: pos, velocities: vel }
  }, [from, camera.position])

  useFrame((_, delta) => {
    elapsed.current += delta
    if (elapsed.current > 1.2 && !done.current) {
      done.current = true
      onComplete()
      return
    }

    if (!meshRef.current) return
    const pos = meshRef.current.geometry.attributes.position.array as Float32Array
    const op = meshRef.current.geometry.attributes.opacity?.array as Float32Array | null

    for (let i = 0; i < BEAM_PARTICLE_COUNT; i++) {
      const v = velocities[i]
      const localT = Math.max(0, elapsed.current - v.delay)
      const p = Math.min(localT, 1)

      const target = new THREE.Vector3()
      target.copy(camera.position)
      target.y -= 0.5

      const mid = new THREE.Vector3().addVectors(from, target).multiplyScalar(0.5)
      mid.y += 2 // arc up
      
      const q1 = new THREE.Vector3().lerpVectors(from, mid, p)
      const q2 = new THREE.Vector3().lerpVectors(mid, target, p)
      
      const finalPos = new THREE.Vector3().lerpVectors(q1, q2, p)
      pos[i * 3] = finalPos.x + v.v.x * localT * (1 - p) // decay random velocity
      pos[i * 3 + 1] = finalPos.y + v.v.y * localT * (1 - p)
      pos[i * 3 + 2] = finalPos.z + v.v.z * localT * (1 - p)
    }

    meshRef.current.geometry.attributes.position.needsUpdate = true
    if (op) meshRef.current.geometry.attributes.opacity.needsUpdate = true
  })

  return (
    <points ref={meshRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.2}
        color="#22ddaa"
        transparent
        opacity={0.7}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}

export const TimeRift = ({ position }: TimeRiftProps) => {
  const [active, setActive] = useState(true)
  const [burst, setBurst] = useState<boolean>(false)
  const [beam, setBeam] = useState<boolean>(false)
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const cooldownRingRef = useRef<THREE.Mesh>(null)
  const cooldownStartRef = useRef(0)
  const addRaw = useStore((s) => s.addRaw)
  const bobPhase = useRef(Math.random() * Math.PI * 2)
  const sounds = useSoundEngine()
  const riftPos = useMemo(() => new THREE.Vector3(position[0], 0, position[2]), [position])

  // Sit above terrain surface
  const terrainY = getTerrainHeight(position[0], position[2])
  const floatY = terrainY + 1.2

  const userData = useMemo(
    () => ({ interactable: true, type: 'rift' as const, prompt: '[Click] Harvest' }),
    [],
  )

  const handleClick = useCallback(() => {
    if (!active) return
    addRaw(HARVEST_AMOUNT)
    setActive(false)
    cooldownStartRef.current = performance.now()
    setBurst(true)
    setBeam(true)
    sounds.harvest()
    window.setTimeout(() => {
      setActive(true)
    }, RIFT_RESPAWN_MS)
  }, [active, addRaw, sounds])

  useFrame((_, baseDelta) => {
    const delta = baseDelta * useStore.getState().timeScale
    if (!groupRef.current) return
    bobPhase.current += delta * 1.2

    if (active) {
      const bob = Math.sin(bobPhase.current) * 0.15
      groupRef.current.position.y = floatY + bob
      groupRef.current.rotation.y += delta * 0.3

      if (meshRef.current) {
        const pulse = 0.6 + Math.sin(bobPhase.current * 2) * 0.25
        ;(meshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse
      }
      if (glowRef.current) {
        const glowPulse = 0.3 + Math.sin(bobPhase.current * 1.5) * 0.2
        ;(glowRef.current.material as THREE.MeshBasicMaterial).opacity = glowPulse
      }
    } else {
      // Dormant — update cooldown ring opacity to show progress
      const elapsed = performance.now() - cooldownStartRef.current
      const progress = Math.min(elapsed / RIFT_RESPAWN_MS, 1)

      if (cooldownRingRef.current) {
        const ringOpacity = 0.15 + progress * 0.25
        ;(cooldownRingRef.current.material as THREE.MeshBasicMaterial).opacity = ringOpacity
      }

      groupRef.current.rotation.y += delta * 0.08
    }
  })

  return (
    <group ref={groupRef} position={[position[0], floatY, position[2]]}>
      {/* Main orb */}
      <mesh ref={meshRef} onClick={handleClick} userData={userData}>
        <sphereGeometry args={[0.6, 24, 24]} />
        <meshStandardMaterial
          color={active ? '#22ddaa' : '#224444'}
          emissive={active ? '#22ddaa' : '#000000'}
          emissiveIntensity={active ? 0.8 : 0}
          transparent
          opacity={active ? 1 : 0.25}
          roughness={0.2}
          metalness={0.1}
        />
      </mesh>

      {/* Outer glow sphere */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.85, 16, 16]} />
        <meshBasicMaterial
          color="#22ddaa"
          transparent
          opacity={active ? 0.25 : 0}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Cooldown ring */}
      <mesh
        ref={cooldownRingRef}
        position={[0, -0.65, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.4, 0.55, 24]} />
        <meshBasicMaterial
          color="#22ddaa"
          transparent
          opacity={active ? 0 : 0.15}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Glow ring */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.7, 1.0, 32]} />
        <meshBasicMaterial
          color="#22ddaa"
          transparent
          opacity={active ? 0.35 : 0}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Orbiting particles */}
      {active && (
        <>
          <mesh position={[0.85, 0.1, 0]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshBasicMaterial color="#44ffcc" transparent opacity={0.6} />
          </mesh>
          <mesh position={[-0.75, -0.1, 0.4]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshBasicMaterial color="#44ffcc" transparent opacity={0.4} />
          </mesh>
          <mesh position={[0.2, 0.15, -0.8]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshBasicMaterial color="#44ffcc" transparent opacity={0.35} />
          </mesh>
        </>
      )}

      {/* Dust mote ring */}
      <mesh position={[0, 0.1, 0]} rotation={[Math.PI / 3, 0, 0]}>
        <ringGeometry args={[1.1, 1.2, 24]} />
        <meshBasicMaterial
          color="#22ddaa"
          transparent
          opacity={active ? 0.15 : 0}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Particle burst on harvest */}
      {burst && (
        <HarvestBurst
          position={[0, 0, 0]}
          onComplete={() => setBurst(false)}
        />
      )}

      {/* Harvest beam — particles stream toward player */}
      {beam && (
        <HarvestBeam
          from={new THREE.Vector3(0, 0, 0)}
          onComplete={() => setBeam(false)}
        />
      )}
    </group>
  )
}
