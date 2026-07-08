import { useRef, useMemo, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getTerrainHeight } from '../../terrain'
import { useStore } from '../../store'

export const SHRINE_POSITION: [number, number, number] = [35, 0, -15]

/**
 * The Time Investment Altar — a sacred structure where players
 * permanently invest resources for account-wide upgrades.
 * Features a glowing central crystal, floating investment tokens,
 * and a golden aura that pulses.
 */
export const TimeShrine = () => {
  const groupRef = useRef<THREE.Group>(null)
  const crystalRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const bobPhase = useRef(Math.random() * Math.PI * 2)

  const terrainY = getTerrainHeight(SHRINE_POSITION[0], SHRINE_POSITION[2])
  const shrinePos: [number, number, number] = [SHRINE_POSITION[0], terrainY, SHRINE_POSITION[2]]

  const requestOpenPanel = useStore((s) => s.requestOpenPanel)
  const inventory = useStore((s) => s.inventory)
  const upgrades = useStore((s) => s.upgrades)
  // Check if player can afford any upgrade
  const canAffordAny = upgrades.capacityBoost < 5 && inventory.raw >= 25 * (upgrades.capacityBoost + 1)
    || upgrades.haste < 5 && inventory.vapour >= 15 * (upgrades.haste + 1)
    || upgrades.magnitude < 5 && inventory.liquid >= 10 * (upgrades.magnitude + 1)
    || upgrades.endurance < 5 && inventory.crystal >= 5 * (upgrades.endurance + 1)

  const userData = useMemo(
    () => ({ interactable: true, type: 'shrine' as const, prompt: '[I] Invest at the Time Shrine' }),
    [],
  )

  const handleClick = useCallback(() => {
    requestOpenPanel('shrine')
  }, [requestOpenPanel])

  useFrame((_, delta) => {
    bobPhase.current += delta

    if (groupRef.current) {
      // Gentle floating
      groupRef.current.position.y = shrinePos[1] + Math.sin(bobPhase.current * 0.5) * 0.05
    }

    if (crystalRef.current) {
      const mat = crystalRef.current.material as THREE.MeshStandardMaterial
      const wealthBoost = canAffordAny ? 0.6 : 0
      mat.emissiveIntensity = 0.5 + Math.sin(bobPhase.current * 1.5) * (0.3 + wealthBoost)
      // Shift color toward gold when you can afford something
      if (canAffordAny) {
        mat.emissive.setHex(0xffcc00)
      } else {
        mat.emissive.setHex(0xffaa00)
      }
      crystalRef.current.rotation.y += delta * 0.4
    }

    if (ringRef.current) {
      ringRef.current.rotation.y += delta * 0.6
      ringRef.current.rotation.x = Math.PI / 2 + Math.sin(bobPhase.current * 0.3) * 0.1
    }

    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial
      const wealthBoost = canAffordAny ? 0.3 : 0
      mat.opacity = 0.2 + Math.sin(bobPhase.current) * (0.1 + wealthBoost)
    }
  })

  return (
    <group ref={groupRef} position={shrinePos}>
      {/* Stone base — tiered platform */}
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <cylinderGeometry args={[1.4, 1.6, 0.2, 8]} />
        <meshStandardMaterial color="#4a4a5a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.3, 0]} receiveShadow>
        <cylinderGeometry args={[1.0, 1.2, 0.2, 8]} />
        <meshStandardMaterial color="#5a5a6a" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.5, 0]} receiveShadow>
        <cylinderGeometry args={[0.7, 0.8, 0.2, 8]} />
        <meshStandardMaterial color="#6a6a7a" roughness={0.7} />
      </mesh>

      {/* Pedestal */}
      <mesh position={[0, 0.75, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.4, 0.5, 0.3, 8]} />
        <meshStandardMaterial color="#7a6a5a" roughness={0.6} metalness={0.2} />
      </mesh>

      {/* Central crystal — the heart of the shrine */}
      <mesh ref={crystalRef} position={[0, 1.1, 0]} castShadow onClick={handleClick} userData={userData}>
        <octahedronGeometry args={[0.35, 0]} />
        <meshStandardMaterial
          color="#ffdd44"
          emissive="#ffaa00"
          emissiveIntensity={0.6}
          roughness={0.1}
          metalness={0.1}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Orbiting ring */}
      <mesh ref={ringRef} position={[0, 1.0, 0]}>
        <torusGeometry args={[0.55, 0.03, 8, 24]} />
        <meshBasicMaterial
          color="#ffdd44"
          transparent
          opacity={0.4}
        />
      </mesh>

      {/* Outer glow ring */}
      <mesh ref={glowRef} position={[0, 1.0, 0]}>
        <ringGeometry args={[0.65, 0.85, 32]} />
        <meshBasicMaterial
          color="#ffaa44"
          transparent
          opacity={0.25}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Floating coin tokens around the shrine */}
      {[0, 1, 2].map((i) => {
        const angle = (i / 3) * Math.PI * 2
        return (
          <mesh
            key={i}
            position={[Math.cos(angle) * 0.8, 0.5 + Math.sin(angle + i) * 0.15, Math.sin(angle) * 0.8]}
            rotation={[Math.PI / 2, 0, angle]}
          >
            <torusGeometry args={[0.08, 0.025, 6, 10]} />
            <meshStandardMaterial color="#ffcc44" emissive="#ffaa00" emissiveIntensity={0.2} metalness={0.4} roughness={0.3} />
          </mesh>
        )
      })}

      {/* Ground glow decal */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.2, 24]} />
        <meshBasicMaterial
          color="#ffaa44"
          transparent
          opacity={0.08}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
