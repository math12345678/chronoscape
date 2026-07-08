import { useRef, useCallback, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../store'
import { LAB_POSITION } from '../../config/constants'
import { getTerrainHeight } from '../../terrain'

/** Sky beam for the lab — visible from spawn to guide the player */
const LabSkyBeam = () => {
  const beamRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const time = useRef(0)

  useFrame((_, delta) => {
    time.current += delta
    const t = time.current
    if (beamRef.current) {
      const pulse = 0.15 + Math.sin(t * 1.5) * 0.08
      ;(beamRef.current.material as THREE.MeshBasicMaterial).opacity = pulse
      const scale = 0.8 + Math.sin(t * 1.2) * 0.15
      beamRef.current.scale.x = scale
      beamRef.current.scale.z = scale
    }
    if (glowRef.current) {
      const pulse = 0.06 + Math.sin(t * 0.8) * 0.03
      ;(glowRef.current.material as THREE.MeshBasicMaterial).opacity = pulse
      const scale = 2 + Math.sin(t * 0.6) * 0.5
      glowRef.current.scale.x = scale
      glowRef.current.scale.z = scale
    }
  })

  return (
    <group>
      <mesh ref={beamRef} position={[0, 20, 0]}>
        <cylinderGeometry args={[0.3, 2.0, 40, 8, 1]} />
        <meshBasicMaterial color="#aa88ff" transparent opacity={0.15} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={glowRef} position={[0, 20, 0]}>
        <cylinderGeometry args={[1.5, 5.0, 40, 12, 1]} />
        <meshBasicMaterial color="#8844ff" transparent opacity={0.06} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

/**
 * The Lab — a fixed stone structure where players discover formulas.
 * Has a pulsing beacon on top that reacts to undiscovered formulas:
 * - All formulas discovered: calm violet pulse
 * - Any undiscovered: intense pulsing with faster rate and brighter glow
 */
export const LabStructure = () => {
  const time = useRef(0)
  const beaconRef = useRef<THREE.Mesh>(null)
  const beaconGlowRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const ringRef2 = useRef<THREE.Mesh>(null)

  const formulas = useStore((s) => s.formulas)
  const labOpen = useStore((s) => s.labOpen)
  const openLab = useStore((s) => s.openLab)
  const hasUndiscovered = formulas.some((f) => !f.discovered)

  const terrainY = getTerrainHeight(LAB_POSITION[0], LAB_POSITION[2])
  const labPos: [number, number, number] = [LAB_POSITION[0], terrainY, LAB_POSITION[2]]

  const handleClick = useCallback(() => {
    if (!labOpen) {
      openLab()
    }
  }, [labOpen, openLab])

  const userData = useMemo(
    () => ({ interactable: true, type: 'lab' as const, prompt: 'Enter the Lab' }),
    [],
  )

  useFrame((_, delta) => {
    time.current += delta
    const t = time.current

    // Beacon pulsing — faster when undiscovered formulas exist
    if (beaconRef.current) {
      const speed = hasUndiscovered ? 3 : 1.2
      const intensity = hasUndiscovered ? 0.6 + Math.sin(t * speed) * 0.4 : 0.4 + Math.sin(t * speed) * 0.2
      const mat = beaconRef.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = intensity
    }

    // Beacon glow ring
    if (beaconGlowRef.current) {
      const speed = hasUndiscovered ? 2.5 : 1
      const glowOpacity = hasUndiscovered
        ? 0.2 + Math.sin(t * speed) * 0.15
        : 0.15 + Math.sin(t * speed) * 0.1
      ;(beaconGlowRef.current.material as THREE.MeshBasicMaterial).opacity = glowOpacity

      // Scale pulse
      const scale = 1 + Math.sin(t * speed * 1.5) * 0.15
      beaconGlowRef.current.scale.set(scale, scale, scale)
    }

    // Orbiting rings
    if (ringRef.current) {
      ringRef.current.rotation.x += delta * (hasUndiscovered ? 1.2 : 0.5)
      ringRef.current.rotation.z += delta * (hasUndiscovered ? 0.8 : 0.3)
      const opacity = hasUndiscovered ? 0.3 + Math.sin(t * 2) * 0.15 : 0.15
      ;(ringRef.current.material as THREE.MeshBasicMaterial).opacity = opacity
    }

    if (ringRef2.current) {
      ringRef2.current.rotation.y += delta * (hasUndiscovered ? -0.8 : -0.3)
      ringRef2.current.rotation.x += delta * (hasUndiscovered ? 0.6 : 0.2)
      const opacity = hasUndiscovered ? 0.2 + Math.sin(t * 1.5 + 1) * 0.1 : 0.1
      ;(ringRef2.current.material as THREE.MeshBasicMaterial).opacity = opacity
    }
  })

  return (
    <group position={labPos}>
      {/* Sky beam — visible from spawn so players know where to go */}
      <LabSkyBeam />
      {/* Floor */}
      <mesh receiveShadow position={[0, -0.3, 0]}>
        <boxGeometry args={[6, 0.4, 6]} />
        <meshStandardMaterial color="#3a3a4a" roughness={0.9} />
      </mesh>

      {/* Back wall */}
      <mesh receiveShadow castShadow position={[0, 1.5, -2.5]}>
        <boxGeometry args={[5.5, 3, 0.4]} />
        <meshStandardMaterial color="#5a5a6a" roughness={0.85} />
      </mesh>

      {/* Left wall */}
      <mesh receiveShadow castShadow position={[-2.6, 1.5, 0]}>
        <boxGeometry args={[0.4, 3, 5]} />
        <meshStandardMaterial color="#5a5a6a" roughness={0.85} />
      </mesh>

      {/* Right wall */}
      <mesh receiveShadow castShadow position={[2.6, 1.5, 0]}>
        <boxGeometry args={[0.4, 3, 5]} />
        <meshStandardMaterial color="#5a5a6a" roughness={0.85} />
      </mesh>

      {/* Roof */}
      <mesh receiveShadow castShadow position={[0, 3.2, 0]}>
        <boxGeometry args={[6, 0.3, 6]} />
        <meshStandardMaterial color="#3a3a4a" roughness={0.9} />
      </mesh>

      {/* Arch pillars */}
      <mesh receiveShadow castShadow position={[-1.2, 1.2, 2.5]}>
        <boxGeometry args={[0.5, 2.4, 0.5]} />
        <meshStandardMaterial color="#5a5a6a" roughness={0.85} />
      </mesh>
      <mesh receiveShadow castShadow position={[1.2, 1.2, 2.5]}>
        <boxGeometry args={[0.5, 2.4, 0.5]} />
        <meshStandardMaterial color="#5a5a6a" roughness={0.85} />
      </mesh>
      <mesh receiveShadow castShadow position={[0, 2.6, 2.5]}>
        <boxGeometry args={[3, 0.4, 0.5]} />
        <meshStandardMaterial color="#5a5a6a" roughness={0.85} />
      </mesh>

      {/* Beacon crystal on roof */}
      <mesh ref={beaconRef} position={[0, 3.8, 0]}>
        <octahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial
          color="#aa88ff"
          emissive="#8844ff"
          emissiveIntensity={0.6}
          roughness={0.1}
          metalness={0.3}
        />
      </mesh>

      {/* Beacon glow ring */}
      <mesh ref={beaconGlowRef} position={[0, 3.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.6, 1.0, 32]} />
        <meshBasicMaterial
          color="#aa88ff"
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Orbiting ring 1 */}
      <mesh ref={ringRef} position={[0, 3.8, 0]}>
        <ringGeometry args={[0.9, 1.0, 32]} />
        <meshBasicMaterial
          color="#8844ff"
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Orbiting ring 2 */}
      <mesh ref={ringRef2} position={[0, 3.8, 0]}>
        <ringGeometry args={[1.2, 1.3, 32]} />
        <meshBasicMaterial
          color="#aa88ff"
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Beacon beam (faint light pillar) */}
      <mesh position={[0, 6, 0]}>
        <cylinderGeometry args={[0.3, 1.5, 5, 8, 1, true]} />
        <meshBasicMaterial
          color="#8844ff"
          transparent
          opacity={0.04}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Interactive pedestal — click to open Lab */}
      <mesh receiveShadow position={[0, 0.3, -1]} onClick={handleClick} userData={userData}>
        <cylinderGeometry args={[0.8, 1, 0.6, 8]} />
        <meshStandardMaterial color="#7a6a9a" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.7, -1]}>
        <sphereGeometry args={[0.3, 12, 12]} />
        <meshStandardMaterial
          color="#bb99ff"
          emissive="#8844ff"
          emissiveIntensity={0.4}
          transparent
          opacity={0.8}
        />
      </mesh>
    </group>
  )
}
