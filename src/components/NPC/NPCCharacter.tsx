import { useRef, useMemo, useState, useCallback, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { ExtendedNPC, NPCState } from '../../npcAI'
import { useStore } from '../../store'
import { HealBurst } from './HealBurst'
import { forceNPCRender } from './NPCSpawner'
import { useSoundEngine } from '../../hooks/useSoundEngine'
import { unlockHealAchievement } from '../UI/ToastNotifications'
import { SpeechBubble, NPC_SPEECHES } from '../SpeechBubble'

interface NPCCharacterProps {
  npc: ExtendedNPC
}

const STATE_COLORS: Record<NPCState, string> = {
  idle: '#888888',
  wander: '#44aaff',
  seek_rift: '#ffaa44',
  harvest: '#44ff88',
  return: '#ff8844',
  rest: '#aa88ff',
  tour: '#44ffcc',
}

/** Compute heal cost: 1 Liquid per 20 missing vitality, minimum 1 */
function getHealCost(vitality: number): number {
  return Math.max(1, Math.ceil((100 - vitality) / 20))
}

// ── Rewind buffer types ─────────────────────────────────

interface PositionSnapshot {
  pos: [number, number, number]
  rotY: number
}

const REWIND_BUFFER_SIZE = 120  // ~2 seconds at 60fps

/**
 * An animated 3D NPC character with:
 * - Colored robe/body (based on NPC's color property)
 * - Head with hat
 * - Arms that swing while walking
 * - Legs that alternate while walking
 * - Gentle idle breathing bob
 * - State indicator ring below feet
 * - Vitality bar above head
 * - Interactive: click to heal
 * - Health-state body color (drains toward grey when low)
 * - Rewind heal animation: records last 2s of position and plays it backward
 */
export const NPCCharacter = ({ npc }: NPCCharacterProps) => {
  const [showHealBurst, setShowHealBurst] = useState(false)
  const [rewinding, setRewinding] = useState(false)
  const groupRef = useRef<THREE.Group>(null)
  const armLeftRef = useRef<THREE.Group>(null)
  const armRightRef = useRef<THREE.Group>(null)
  const legLeftRef = useRef<THREE.Group>(null)
  const legRightRef = useRef<THREE.Group>(null)
  const bobPhase = useRef(Math.random() * Math.PI * 2)
  const prevPos = useRef(npc.position)

  // Rewind history buffer
  const rewindBuffer = useRef<PositionSnapshot[]>([])
  const rewindIndex = useRef(0)
  const rewindTimer = useRef(0)

  const sounds = useSoundEngine()
  const bodyColor = npc.color
  const vitality = npc.vitality
  const needHeal = vitality < 100
  const healCost = getHealCost(vitality)

  // Compute health-scaled body color (desaturate when low)
  const healthColor = useMemo(() => {
    const c = new THREE.Color(bodyColor)
    const healthFactor = vitality / 100
    const grey = new THREE.Color('#666666')
    c.lerp(grey, 1 - healthFactor)
    return c
  }, [bodyColor, vitality])

  const darkBody = useMemo(() => {
    const c = healthColor.clone()
    c.multiplyScalar(0.6)
    return c
  }, [healthColor])

  const rewindTint = useMemo(() => {
    const c = healthColor.clone()
    c.lerp(new THREE.Color('#44ffcc'), 0.3)
    return c
  }, [healthColor])

  const s = npc.scale

  // Speech bubble state
  const [speech, setSpeech] = useState<string | null>(null)
  const speechTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Random speech every 4-8 seconds
  useEffect(() => {
    const speak = () => {
      const speeches = NPC_SPEECHES[npc.state] ?? NPC_SPEECHES.idle
      const msg = speeches[Math.floor(Math.random() * speeches.length)]
      setSpeech(msg)
      if (speechTimer.current) clearTimeout(speechTimer.current)
      speechTimer.current = setTimeout(() => setSpeech(null), 2500)
    }

    const interval = setInterval(speak, 4000 + Math.random() * 4000)
    // First speech sooner
    const first = setTimeout(speak, 1000 + Math.random() * 2000)

    return () => {
      clearInterval(interval)
      clearTimeout(first)
      if (speechTimer.current) clearTimeout(speechTimer.current)
    }
  }, [npc.state])

  // Interactable data for raycasting
  const userData = useMemo(
    () => ({
      interactable: true,
      type: 'npc' as const,
      npcId: npc.id,
      vitality: npc.vitality,
      healCost,
      prompt: needHeal
        ? `[Click] Reverse Timeline — ${healCost} Liquid`
        : `${npc.name} — Healthy`,
    }),
    [npc.id, npc.name, needHeal, healCost, npc.vitality],
  )

  const handleClick = useCallback(() => {
    if (useStore.getState().selectedBlockType) return
    if (!needHeal || rewinding) return

    const state = useStore.getState()
    if (state.inventory.liquid < healCost) return

    useStore.setState((s) => ({
      inventory: {
        ...s.inventory,
        liquid: s.inventory.liquid - healCost,
      },
    }))

    // Start rewind animation
    setRewinding(true)
    rewindIndex.current = rewindBuffer.current.length - 1
    rewindTimer.current = 0
    sounds.heal()

    // Restore vitality immediately
    npc.vitality = 100
    if (forceNPCRender) forceNPCRender()
  }, [needHeal, healCost, npc, sounds, rewinding])

  useFrame((_, delta) => {
    if (!groupRef.current) return
    bobPhase.current += delta * 4

    const dx = npc.position[0] - prevPos.current[0]
    const dz = npc.position[2] - prevPos.current[2]
    const moving = Math.sqrt(dx * dx + dz * dz) > 0.01
    prevPos.current = npc.position

    if (rewinding) {
      // ── Rewind animation: play back the position buffer ──
      rewindTimer.current += delta * 60
      const step = Math.floor(rewindTimer.current)
      const idx = Math.max(0, rewindIndex.current - step)

      if (step >= rewindIndex.current || idx <= 0) {
        // Rewind complete
        setRewinding(false)
        setShowHealBurst(true)
        unlockHealAchievement()
        // Final position = current NPC position (already restored)
        groupRef.current.position.set(npc.position[0], npc.position[1], npc.position[2])
        return
      }

      const snap = rewindBuffer.current[idx]
      if (snap) {
        groupRef.current.position.set(snap.pos[0], snap.pos[1], snap.pos[2])
        groupRef.current.rotation.y = snap.rotY
      }

      // Add rewind glow to state ring
      const ring = groupRef.current.children[0] as THREE.Mesh | undefined
      if (ring) {
        const mat = ring.material as THREE.MeshBasicMaterial
        mat.color.setHex(0x44ffcc)
        mat.opacity = 0.6 + Math.sin(rewindTimer.current * 0.5) * 0.3
      }

      return
    }

    // ── Normal animation ──

    // Record position snapshot for rewind buffer
    rewindBuffer.current.push({
      pos: [npc.position[0], npc.position[1], npc.position[2]],
      rotY: groupRef.current.rotation.y,
    })
    if (rewindBuffer.current.length > REWIND_BUFFER_SIZE) {
      rewindBuffer.current.shift()
    }

    groupRef.current.position.set(npc.position[0], npc.position[1], npc.position[2])

    if (moving) {
      const angle = Math.atan2(dx, dz)
      groupRef.current.rotation.y = angle
    }

    const bobAmount = moving ? 0 : Math.sin(bobPhase.current) * 0.03 * s
    const walkBob = moving ? Math.abs(Math.sin(bobPhase.current * 2)) * 0.08 * s : 0
    groupRef.current.position.y = npc.position[1] + bobAmount + walkBob

    if (armLeftRef.current && armRightRef.current) {
      const swing = moving ? Math.sin(bobPhase.current * 2) * 0.4 : 0
      armLeftRef.current.rotation.x = swing
      armRightRef.current.rotation.x = -swing
    }

    if (legLeftRef.current && legRightRef.current) {
      const swing = moving ? Math.sin(bobPhase.current * 2 + Math.PI) * 0.3 : 0
      legLeftRef.current.rotation.x = swing
      legRightRef.current.rotation.x = -swing
    }

    if (!moving) {
      groupRef.current.position.y += Math.sin(bobPhase.current * 0.5) * 0.01 * s
    }
  })

  const vitPct = vitality / 100
  const bodyMatColor = rewinding ? rewindTint : healthColor

  return (
    <group ref={groupRef}>
      {/* Speech bubble */}
      {speech && (
        <SpeechBubble
          text={speech}
          color={STATE_COLORS[npc.state]}
          position={[0, 0, 0]}
          bubbleHeight={1.8}
        />
      )}

      {/* State indicator ring */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3 * s, 0.45 * s, 12]} />
        <meshBasicMaterial
          color={rewinding ? '#44ffcc' : STATE_COLORS[npc.state]}
          transparent
          opacity={rewinding ? 0.8 : 0.5}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Shadow blob */}
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.25 * s, 12]} />
        <meshBasicMaterial color="#000" transparent opacity={0.2} depthWrite={false} />
      </mesh>

      {/* Vitality bar above head */}
      <group position={[0, 1.3 * s, 0]}>
        {/* Background bar */}
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[0.8 * s, 0.06 * s]} />
          <meshBasicMaterial color="#333" transparent opacity={0.6} depthWrite={false} />
        </mesh>
        {/* Health fill */}
        <mesh position={[-(0.4 * s) * (1 - vitPct), 0, 0.001]}>
          <planeGeometry args={[0.8 * s * vitPct, 0.06 * s]} />
          <meshBasicMaterial
            color={vitPct > 0.7 ? '#44cc66' : vitPct > 0.4 ? '#ccaa44' : '#cc4444'}
            transparent
            opacity={0.85}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* Legs */}
      <group ref={legLeftRef} position={[-0.12 * s, 0.15 * s, 0]}>
        <mesh position={[0, -0.15 * s, 0]} castShadow>
          <boxGeometry args={[0.08 * s, 0.3 * s, 0.08 * s]} />
          <meshStandardMaterial color={rewinding ? rewindTint : darkBody} roughness={0.8} />
        </mesh>
      </group>
      <group ref={legRightRef} position={[0.12 * s, 0.15 * s, 0]}>
        <mesh position={[0, -0.15 * s, 0]} castShadow>
          <boxGeometry args={[0.08 * s, 0.3 * s, 0.08 * s]} />
          <meshStandardMaterial color={rewinding ? rewindTint : darkBody} roughness={0.8} />
        </mesh>
      </group>

      {/* Body / Torso (robe) — interactive for healing */}
      <mesh
        position={[0, 0.55 * s, 0]}
        castShadow
        onClick={rewinding ? undefined : handleClick}
        userData={rewinding ? undefined : userData}
      >
        <boxGeometry args={[0.35 * s, 0.5 * s, 0.2 * s]} />
        <meshStandardMaterial color={bodyMatColor} roughness={0.7} />
      </mesh>

      {/* Belt accent */}
      <mesh position={[0, 0.35 * s, 0]}>
        <boxGeometry args={[0.38 * s, 0.04 * s, 0.22 * s]} />
        <meshStandardMaterial color={rewinding ? '#44ffcc' : '#c8a060'} roughness={0.5} metalness={0.3} />
      </mesh>

      {/* Arms */}
      <group ref={armLeftRef} position={[-0.25 * s, 0.55 * s, 0]}>
        <mesh position={[0, -0.2 * s, 0]} castShadow>
          <boxGeometry args={[0.07 * s, 0.4 * s, 0.07 * s]} />
          <meshStandardMaterial color={rewinding ? rewindTint : darkBody} roughness={0.8} />
        </mesh>
      </group>
      <group ref={armRightRef} position={[0.25 * s, 0.55 * s, 0]}>
        <mesh position={[0, -0.2 * s, 0]} castShadow>
          <boxGeometry args={[0.07 * s, 0.4 * s, 0.07 * s]} />
          <meshStandardMaterial color={rewinding ? rewindTint : darkBody} roughness={0.8} />
        </mesh>
      </group>

      {/* Head */}
      <mesh position={[0, 0.85 * s, 0]} castShadow>
        <sphereGeometry args={[0.15 * s, 10, 10]} />
        <meshStandardMaterial color={rewinding ? rewindTint : '#d4a574'} roughness={0.6} />
      </mesh>

      {/* Hat / Hair */}
      <mesh position={[0, 0.95 * s, -0.02 * s]} castShadow>
        <coneGeometry args={[0.18 * s, 0.15 * s, 8]} />
        <meshStandardMaterial color={rewinding ? rewindTint : darkBody} roughness={0.8} />
      </mesh>

      {/* Eyes */}
      <mesh position={[-0.06 * s, 0.86 * s, -0.16 * s]}>
        <sphereGeometry args={[0.025 * s, 6, 6]} />
        <meshBasicMaterial color="#222" />
      </mesh>
      <mesh position={[0.06 * s, 0.86 * s, -0.16 * s]}>
        <sphereGeometry args={[0.025 * s, 6, 6]} />
        <meshBasicMaterial color="#222" />
      </mesh>

      {/* Heal burst effect (plays after rewind completes) */}
      {showHealBurst && (
        <HealBurst
          position={[0, 0.8 * s, 0]}
          onComplete={() => setShowHealBurst(false)}
        />
      )}

      {/* Rewind glow ring (visible during rewind) */}
      {rewinding && (
        <mesh position={[0, 0.5 * s, 0]}>
          <sphereGeometry args={[0.6 * s, 12, 12]} />
          <meshBasicMaterial
            color="#44ffcc"
            transparent
            opacity={0.08}
            side={THREE.BackSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  )
}
