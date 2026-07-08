import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getInfiniteTerrainHeight } from '../../world/chunkTerrain'
import { activateBoostPickup, isVehicleActive, getVehiclePosition } from './HoverVehicle'
import { queueBurst } from '../HarvestVFX'
import { setBoostPickupBonus } from './DragRace'

const PICKUP_POSITIONS: [number, number][] = [
  [25, 35], [-30, 40], [42, -20], [-40, -30], [15, 45],
  [-20, -40], [50, 25], [-50, -15], [30, -35], [-35, -50],
]
const PICKUP_DIST = 1.2
const RESPAWN_MS = 12_000

interface PickupState {
  collected: boolean
  respawnAt: number
}

const pickups: PickupState[] = PICKUP_POSITIONS.map(() => ({ collected: false, respawnAt: 0 }))

export const BoostPickup = () => {
  const groupRef = useRef<THREE.Group>(null)

  return (
    <group ref={groupRef}>
      {PICKUP_POSITIONS.map((pos, i) => (
        <BoostPickupOrb key={i} index={i} px={pos[0]} pz={pos[1]} />
      ))}
    </group>
  )
}

const BoostPickupOrb = ({ index, px, pz }: { index: number; px: number; pz: number }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const time = useRef(Math.random() * 100)
  const state = pickups[index]
  const terrainY = getInfiniteTerrainHeight(px, pz)
  const baseY = terrainY + 1.5

  useFrame((_, delta) => {
    time.current += delta
    if (!meshRef.current || !glowRef.current) return

    // Respawn check
    if (state.collected && performance.now() > state.respawnAt) {
      state.collected = false
    }

    // Collection check
    if (!state.collected && isVehicleActive()) {
      const vp = getVehiclePosition()
      const dx = vp.x - px
      const dz = vp.z - pz
      const dist = Math.sqrt(dx * dx + dz * dz)
      if (dist < PICKUP_DIST) {
        state.collected = true
        state.respawnAt = performance.now() + RESPAWN_MS
        activateBoostPickup(4000)
        setBoostPickupBonus(1.0)
        setTimeout(() => setBoostPickupBonus(0), 4000)
        queueBurst(new THREE.Vector3(px, baseY + 0.5, pz), 12, '#ff8844', 4)
      }
    }

    const visible = !state.collected
    meshRef.current.visible = visible
    glowRef.current.visible = visible

    if (!visible) return

    // Bob and spin
    const bob = Math.sin(time.current * 1.5) * 0.3
    meshRef.current.position.y = baseY + bob
    meshRef.current.rotation.y += delta * 2
    meshRef.current.rotation.x = Math.sin(time.current * 0.5) * 0.1

    // Pulse
    const pulse = 0.8 + Math.sin(time.current * 3) * 0.3
    meshRef.current.scale.setScalar(pulse)
    ;(meshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse * 0.8

    glowRef.current.position.y = baseY + bob
    const gpulse = 0.3 + Math.sin(time.current * 2.5) * 0.2
    ;(glowRef.current.material as THREE.MeshBasicMaterial).opacity = gpulse
  })

  return (
    <group>
      <mesh ref={meshRef} position={[px, baseY, pz]}>
        <octahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial
          color="#ff8844"
          emissive="#ff6600"
          emissiveIntensity={0.6}
          roughness={0.2}
          metalness={0.6}
        />
      </mesh>
      <mesh ref={glowRef} position={[px, baseY, pz]}>
        <sphereGeometry args={[0.5, 8, 8]} />
        <meshBasicMaterial color="#ff8844" transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {/* Ground ring */}
      <mesh position={[px, baseY - 0.8, pz]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.4, 0.7, 16]} />
        <meshBasicMaterial color="#ff8844" transparent opacity={0.15} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  )
}
