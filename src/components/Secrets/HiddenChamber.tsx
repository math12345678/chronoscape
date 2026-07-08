import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../store'
import { HIDDEN_CHAMBER_POSITION, CHRONO_CRYSTAL_POSITION } from '../../config/constants'

/**
 * Hidden underground chamber beneath the Shrine.
 * Contains a Chrono Crystal block that pulses rainbow colors.
 * Chamber is revealed when the player places or removes blocks
 * within 3 units of the hidden chamber position at y < 2.
 * The Chrono Crystal can be claimed for 10 Renown (one-time).
 */
export const HiddenChamber = () => {
  const chamberRevealed = useStore((s) => s.hiddenChamberRevealed)
  const chronoCrystalClaimed = useStore((s) => s.chronoCrystalClaimed)
  const revealHiddenChamber = useStore((s) => s.revealHiddenChamber)
  const claimChronoCrystal = useStore((s) => s.claimChronoCrystal)
  const crystalRef = useRef<THREE.Mesh>(null)
  const time = useRef(0)

  // Poll blocks every 2s for proximity to chamber position
  useEffect(() => {
    if (chamberRevealed) return
    const cx = HIDDEN_CHAMBER_POSITION[0]
    const cz = HIDDEN_CHAMBER_POSITION[2]

    const check = () => {
      const { blocks } = useStore.getState()
      // Check if ANY blocks exist near the chamber position (player placed there)
      for (const key of Object.keys(blocks)) {
        const [x, y, z] = key.split(',').map(Number)
        const dist = Math.sqrt((x - cx) ** 2 + (z - cz) ** 2)
        if (dist < 3 && y < 2) {
          revealHiddenChamber()
          return
        }
      }
      // Also check total block count — if the player has placed > 20 blocks
      // they've done enough work to find the chamber the normal way
      if (useStore.getState().totalBlocksPlaced >= 20) {
        revealHiddenChamber()
      }
    }

    const interval = setInterval(check, 2000)
    return () => clearInterval(interval)
  }, [chamberRevealed, revealHiddenChamber])

  useFrame((_, delta) => {
    time.current += delta
    if (crystalRef.current) {
      // Rainbow color cycling
      const hue = (time.current * 0.05) % 1
      const mat = crystalRef.current.material as THREE.MeshStandardMaterial
      mat.color.setHSL(hue, 1, 0.5)
      mat.emissive.setHSL(hue, 1, 0.3)
      const pulse = 0.5 + Math.sin(time.current * 2) * 0.3
      mat.emissiveIntensity = pulse
      crystalRef.current.scale.setScalar(0.8 + Math.sin(time.current * 1.5) * 0.1)
    }
  })

  const handleCrystalClick = () => {
    if (!chronoCrystalClaimed && chamberRevealed) {
      claimChronoCrystal()
    }
  }

  const crystalUserData = useMemo(
    () => ({
      interactable: true,
      type: 'block' as const,
      prompt: chronoCrystalClaimed ? 'Chrono Crystal (claimed)' : '[Click] Claim Chrono Crystal — 10 Renown',
    }),
    [chronoCrystalClaimed],
  )

  const claimedTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 32
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.beginPath()
    ctx.roundRect(4, 4, 120, 24, 8)
    ctx.fill()
    ctx.fillStyle = '#ffdd44'
    ctx.font = 'bold 12px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('✦ Claimed', 64, 21)
    return new THREE.CanvasTexture(canvas)
  }, [])

  if (!chamberRevealed) return null

  return (
    <group>
      {/* Chamber walls */}
      <mesh position={[HIDDEN_CHAMBER_POSITION[0], HIDDEN_CHAMBER_POSITION[1] + 2, HIDDEN_CHAMBER_POSITION[2]]}>
        <boxGeometry args={[5, 4, 5]} />
        <meshStandardMaterial color="#1a1a2a" roughness={0.9} side={THREE.BackSide} />
      </mesh>

      {/* Floor */}
      <mesh position={[HIDDEN_CHAMBER_POSITION[0], HIDDEN_CHAMBER_POSITION[1] + 0.5, HIDDEN_CHAMBER_POSITION[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.8, 4.8]} />
        <meshStandardMaterial color="#2a2a3a" roughness={0.8} />
      </mesh>

      {/* Ambient glow */}
      <mesh position={[HIDDEN_CHAMBER_POSITION[0], HIDDEN_CHAMBER_POSITION[1] + 1.5, HIDDEN_CHAMBER_POSITION[2]]}>
        <sphereGeometry args={[1.5, 16, 16]} />
        <meshBasicMaterial color="#8844ff" transparent opacity={0.05} side={THREE.BackSide} />
      </mesh>

      {/* Pedestal */}
      <mesh position={[CHRONO_CRYSTAL_POSITION[0], CHRONO_CRYSTAL_POSITION[1] - 0.3, CHRONO_CRYSTAL_POSITION[2]]}>
        <cylinderGeometry args={[0.4, 0.5, 0.3, 8]} />
        <meshStandardMaterial color="#333355" roughness={0.5} metalness={0.3} />
      </mesh>

      {/* Chrono Crystal */}
      <mesh
        ref={crystalRef}
        position={CHRONO_CRYSTAL_POSITION}
        onClick={handleCrystalClick}
        userData={!chronoCrystalClaimed ? crystalUserData : undefined}
      >
        <octahedronGeometry args={[0.35, 0]} />
        <meshStandardMaterial
          color="#ff44ff"
          emissive="#ff44ff"
          emissiveIntensity={0.6}
          roughness={0.1}
          metalness={0.3}
        />
      </mesh>

      {/* Claim indicator */}
      {chronoCrystalClaimed && (
        <sprite position={[CHRONO_CRYSTAL_POSITION[0], CHRONO_CRYSTAL_POSITION[1] + 0.6, CHRONO_CRYSTAL_POSITION[2]]} scale={[1, 0.4, 1]}>
          <spriteMaterial
            map={claimedTexture}
            transparent
            depthWrite={false}
          />
        </sprite>
      )}
    </group>
  )
}
