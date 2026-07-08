import { useRef, useMemo, useState, useCallback, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { ExtendedNPC, NPCState, NPCBodyType } from '../../npcAI'
import { giftLiquidToNPC, giftCrystalToNPC } from '../../npcAI'
import { useStore } from '../../store'
import { getNPCs } from './NPCTick'
import { getDayFactor } from '../DayNightCycle'
import { HealBurst } from './HealBurst'
import { NPCGiftBurst } from './NPCGiftBurst'
import { forceNPCRender } from './NPCSpawner'
import { useSoundEngine } from '../../hooks/useSoundEngine'
import { unlockHealAchievement } from '../UI/ToastNotifications'
import { SpeechBubble, NPC_SPEECHES, NIGHT_SPEECHES } from '../SpeechBubble'

/**
 * Generates a canvas texture with the NPC's name rendered as a subtle label.
 */
function useNameTag(name: string, color: string) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 24
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = 'rgba(0,0,0,0.6)'
    ctx.shadowBlur = 4
    ctx.font = 'bold 12px "Courier New", monospace'
    ctx.fillStyle = color
    ctx.fillText(name, canvas.width / 2, canvas.height / 2)
    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    return tex
  }, [name, color])
  return texture
}

interface NPCCharacterProps {
  npc: ExtendedNPC
}

const STATE_COLORS: Record<NPCState, string> = {
  idle: '#888888',
  wander: '#44aaff',
  seek_rift: '#ffaa44',
  harvest: '#44ff88',
  return: '#888844',
  rest: '#666688',
  tour: '#aa88ff',
  interacting: '#ff88aa',
  follow: '#44ddff',
  seek_shelter: '#88aacc',
  seek_build: '#ff8844',
  build: '#ffcc44',
}

/** Compute heal cost: 1 Liquid per 20 missing vitality, minimum 1 */
function getHealCost(vitality: number): number {
  return Math.max(1, Math.ceil((100 - vitality) / 20))
}

interface PositionSnapshot {
  pos: [number, number, number]
  rotY: number
}

const REWIND_BUFFER_SIZE = 120

/**
 * Animated 3D NPC with Phase 3 features:
 * - 3 body types (thin/stocky/average)
 * - Accessories (backpack/scarf/hat_variant/staff)
 * - Click to follow (empty hands, no block selected)
 * - Gifting resources (liquid → vitality, crystal → color change)
 * - Night-time chattiness
 */
export const NPCCharacter = ({ npc }: NPCCharacterProps) => {
  const [showHealBurst, setShowHealBurst] = useState(false)
  const [showGiftBurst, setShowGiftBurst] = useState(false)
  const [rewinding, setRewinding] = useState(false)
  const groupRef = useRef<THREE.Group>(null)
  const armLeftRef = useRef<THREE.Group>(null)
  const armRightRef = useRef<THREE.Group>(null)
  const legLeftRef = useRef<THREE.Group>(null)
  const legRightRef = useRef<THREE.Group>(null)
  const staffRef = useRef<THREE.Mesh>(null)
  const bodyRef = useRef<THREE.Mesh>(null)
  const headRef = useRef<THREE.Mesh>(null)
  const bobPhase = useRef(Math.random() * Math.PI * 2)
  const prevPos = useRef(npc.position)
  const isNightRef = useRef(false)
  const [isNight, setIsNight] = useState(false)

  // Rewind buffer
  const rewindBuffer = useRef<PositionSnapshot[]>([])
  const rewindIndex = useRef(0)
  const rewindTimer = useRef(0)

  // ── Idle animation state ──
  const idlePhase = useRef(Math.random() * Math.PI * 2)
  const idleLookTarget = useRef(0)
  const idleLookTimer = useRef(0)

  const sounds = useSoundEngine()

  // Compute display color (gift override or default)
  const bodyColor = npc.giftColor ?? npc.color
  const vitality = npc.vitality
  const needHeal = vitality < 100 && !npc.following
  const healCost = getHealCost(vitality)

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

  // ── Speech bubble ──
  const [speech, setSpeech] = useState<string | null>(null)
  const speechTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const speak = () => {
      // Use night speeches at night
      const speeches = isNight && NIGHT_SPEECHES[npc.state]
        ? NIGHT_SPEECHES[npc.state]
        : (npc.interactingWith
          ? NPC_SPEECHES.interacting
          : (NPC_SPEECHES[npc.state] ?? NPC_SPEECHES.idle))
      const msg = speeches[Math.floor(Math.random() * speeches.length)]
      setSpeech(msg)
      if (speechTimer.current) clearTimeout(speechTimer.current)
      speechTimer.current = setTimeout(() => setSpeech(null), 2500)
    }

    // Night: more frequent speech
    const interval = setInterval(speak, isNight ? 2000 + Math.random() * 3000 : 4000 + Math.random() * 4000)
    const first = setTimeout(speak, 1000 + Math.random() * 2000)

    return () => {
      clearInterval(interval)
      clearTimeout(first)
      if (speechTimer.current) clearTimeout(speechTimer.current)
    }
  }, [npc.state, npc.interactingWith, isNight])

  // ── Name tag texture ──
  const nameTagTexture = useNameTag(npc.name, `#${healthColor.getHexString()}`)

  // ── Interactable data ──
  const userData = useMemo(() => {
    const data: any = {
      interactable: true,
      type: 'npc',
      npcId: npc.id,
      vitality: npc.vitality,
      healCost,
    }

    if (needHeal) {
      data.prompt = `[Click] Heal ${npc.name} — ${healCost} Liquid`
    } else if (npc.following) {
      data.prompt = `[Click] Dismiss ${npc.name}`
    } else {
      data.prompt = `[Click] ${npc.name}`
    }
    data.isFollower = npc.following || false
    data.canGiftLiquid = npc.following
    data.canGiftCrystal = npc.following

    return data
  }, [npc.id, npc.name, needHeal, healCost, npc.vitality, npc.following])

  // ── Click handler ──
  const handleClick = useCallback(() => {
    if (useStore.getState().selectedBlockType) return

    const state = useStore.getState()
    const allNPCs = getNPCs()
    const idx = allNPCs.findIndex((n) => n.id === npc.id)
    if (idx < 0) return

    // If already following → dismiss
    if (npc.following) {
      allNPCs[idx] = { ...allNPCs[idx], following: false, followingSince: null, state: 'idle', stateTimer: 1 }
      return
    }

    // Check if need heal
    if (needHeal && state.inventory.liquid >= healCost) {
      useStore.setState((s) => ({
        inventory: { ...s.inventory, liquid: s.inventory.liquid - healCost },
      }))
      setRewinding(true)
      rewindIndex.current = rewindBuffer.current.length - 1
      rewindTimer.current = 0
      sounds.heal()
      allNPCs[idx] = { ...allNPCs[idx], vitality: 100 }
      if (forceNPCRender) forceNPCRender()
      return
    }

      // Check max followers via module-level NPC array
    const followerCount = allNPCs.filter((n) => n.following).length

    if (followerCount >= 2) {
      setSpeech('Too many followers...')
      return
    }

    // Start following
    allNPCs[idx] = { ...allNPCs[idx], following: true, followingSince: Date.now(), state: 'follow' }
    if (forceNPCRender) forceNPCRender()

  }, [needHeal, healCost, npc.id, npc.following, sounds])

  // ── Right-click gift handler ──
  const _handleGift = useCallback((type: 'liquid' | 'crystal') => {
    if (type === 'liquid') {
      const success = giftLiquidToNPC(npc, 10)
      if (success) {
        setShowGiftBurst(true)
        setSpeech('Thank you! 💚')
        sounds.purchase()
      }
    } else {
      const success = giftCrystalToNPC(npc, 5)
      if (success) {
        setShowGiftBurst(true)
        setSpeech('Beautiful! ✨')
        sounds.purchase()
      }
    }
  }, [npc, sounds])

  useFrame((_, delta) => {
    const currentIsNight = getDayFactor() < 0.3
    if (currentIsNight !== isNightRef.current) {
      isNightRef.current = currentIsNight
      setIsNight(currentIsNight)
    }

    if (!groupRef.current) return
    bobPhase.current += delta * 4

    const dx = npc.position[0] - prevPos.current[0]
    const dz = npc.position[2] - prevPos.current[2]
    const moving = Math.sqrt(dx * dx + dz * dz) > 0.01
    prevPos.current = npc.position

    if (rewinding) {
      rewindTimer.current += delta * 60
      const step = Math.floor(rewindTimer.current)
      const idx = Math.max(0, rewindIndex.current - step)

      if (step >= rewindIndex.current || idx <= 0) {
        setRewinding(false)
        setShowHealBurst(true)
        unlockHealAchievement()
        groupRef.current.position.set(npc.position[0], npc.position[1], npc.position[2])
        return
      }

      const snap = rewindBuffer.current[idx]
      if (snap) {
        groupRef.current.position.set(snap.pos[0], snap.pos[1], snap.pos[2])
        groupRef.current.rotation.y = snap.rotY
      }

      const ring = groupRef.current.children[0] as THREE.Mesh | undefined
      if (ring) {
        const mat = ring.material as THREE.MeshBasicMaterial
        mat.color.setHex(0x44ffcc)
        mat.opacity = 0.6 + Math.sin(rewindTimer.current * 0.5) * 0.3
      }
      return
    }

    // Record position snapshot for rewind
    rewindBuffer.current.push({
      pos: [npc.position[0], npc.position[1], npc.position[2]],
      rotY: groupRef.current.rotation.y,
    })
    if (rewindBuffer.current.length > REWIND_BUFFER_SIZE) {
      rewindBuffer.current.shift()
    }

    groupRef.current.position.set(npc.position[0], npc.position[1], npc.position[2])

    const isIdle = !moving && (npc.state === 'idle' || npc.state === 'rest' || npc.state === 'interacting')

    // ── Idle animations: breathing, head-turning, arm sway ──
    idlePhase.current += delta * (isIdle ? 1.5 : 3.0)

    // Breathing: subtle body scale oscillation on Y axis
    if (bodyRef.current) {
      const breathe = isIdle ? 0.015 : moving ? 0 : 0.008
      const breathCycle = Math.sin(bobPhase.current * 0.5 + idlePhase.current * 0.3) * breathe * s
      bodyRef.current.scale.y = 1 + breathCycle
      // Slight width expansion when breathing in
      bodyRef.current.scale.x = 1 - breathCycle * 0.3
    }

    // Head-turning: periodically look around when idle (~every 3-7 seconds)
    if (headRef.current) {
      idleLookTimer.current += delta
      if (idleLookTimer.current > 3 + Math.random() * 4) {
        idleLookTarget.current = (Math.random() - 0.5) * 0.5
        idleLookTimer.current = 0
      }
      // Smoothly look toward target when idle, snap to center when moving
      const targetRot = isIdle ? idleLookTarget.current : 0
      headRef.current.rotation.y = THREE.MathUtils.lerp(
        headRef.current.rotation.y,
        targetRot,
        delta * 2.5
      )

      // Subtle head tilt when idle
      headRef.current.rotation.z = isIdle ? Math.sin(idlePhase.current * 0.4) * 0.02 : 0
    }

    // Subtle arm drift when idle (arms gently sway instead of being frozen)
    if (armLeftRef.current && armRightRef.current && !moving) {
      const drift = Math.sin(idlePhase.current * 0.5) * 0.06
      armLeftRef.current.rotation.x = drift
      armRightRef.current.rotation.x = -drift
      // Slight arm rotation on Z axis for natural hang
      armLeftRef.current.rotation.z = Math.sin(idlePhase.current * 0.3 + 1) * 0.03
      armRightRef.current.rotation.z = Math.cos(idlePhase.current * 0.3 + 2) * 0.03
    }

    if (moving) {
      const angle = Math.atan2(dx, dz)
      groupRef.current.rotation.y = angle

      // Walk swing overrides idle drift
      if (armLeftRef.current && armRightRef.current) {
        const swing = Math.sin(bobPhase.current * 2) * 0.4
        armLeftRef.current.rotation.x = swing
        armRightRef.current.rotation.x = -swing
        // Clear idle Z drift
        armLeftRef.current.rotation.z = 0
        armRightRef.current.rotation.z = 0
      }

      if (legLeftRef.current && legRightRef.current) {
        const swing = Math.sin(bobPhase.current * 2 + Math.PI) * 0.3
        legLeftRef.current.rotation.x = swing
        legRightRef.current.rotation.x = -swing
      }
    } else {
      // Reset legs to neutral when stopped
      if (legLeftRef.current && legRightRef.current) {
        legLeftRef.current.rotation.x = 0
        legRightRef.current.rotation.x = 0
      }
    }

    const bobAmount = moving ? 0 : Math.sin(bobPhase.current) * 0.03 * s
    const walkBob = moving ? Math.abs(Math.sin(bobPhase.current * 2)) * 0.08 * s : 0
    groupRef.current.position.y = npc.position[1] + bobAmount + walkBob

    if (legLeftRef.current && legRightRef.current) {
      const swing = moving ? Math.sin(bobPhase.current * 2 + Math.PI) * 0.3 : 0
      legLeftRef.current.rotation.x = swing
      legRightRef.current.rotation.x = -swing
    }

    // Staff bob
    if (staffRef.current && npc.accessory === 'staff') {
      staffRef.current.rotation.z = Math.sin(bobPhase.current * 0.5) * 0.05
    }

    if (!moving) {
      groupRef.current.position.y += Math.sin(bobPhase.current * 0.5) * 0.01 * s
    }
  })

  const vitPct = vitality / 100
  const bodyMatColor = rewinding ? rewindTint : healthColor

  // ── Body dimensions per type ──
  const bodyDims: Record<NPCBodyType, { w: number; h: number; head: number; hatH: number }> = {
    thin: { w: 0.28, h: 0.55, head: 0.13, hatH: 0.12 },
    stocky: { w: 0.42, h: 0.45, head: 0.17, hatH: 0.18 },
    average: { w: 0.35, h: 0.5, head: 0.15, hatH: 0.15 },
  }
  const dims = bodyDims[npc.bodyType] ?? bodyDims.average

  return (
    <group ref={groupRef}>
      {/* Speech bubble */}
      {speech && (
        <SpeechBubble
          text={speech}
          color={npc.interactingWith ? '#ff88ff' : STATE_COLORS[npc.state]}
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

      {/* Vitality bar */}
      <group position={[0, 1.3 * s, 0]}>
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[0.8 * s, 0.06 * s]} />
          <meshBasicMaterial color="#333" transparent opacity={0.6} depthWrite={false} />
        </mesh>
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

      {/* Name tag — always visible above NPC */}
      <sprite position={[0, 1.7 * s, 0]} scale={[1.6, 0.35, 1]}>
        <spriteMaterial map={nameTagTexture} transparent depthWrite={false} opacity={0.85} sizeAttenuation />
      </sprite>

      {/* Following indicator (small diamond above head) */}
      {npc.following && (
        <mesh position={[0, 1.5 * s, 0]}>
          <coneGeometry args={[0.05 * s, 0.08 * s, 4]} />
          <meshBasicMaterial color="#44ffcc" transparent opacity={0.7} />
        </mesh>
      )}

      {/* ── LEGS ── */}
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

      {/* ── BODY (proportions vary by bodyType) ── */}
      <mesh
        ref={bodyRef}
        position={[0, 0.55 * s, 0]}
        castShadow
        onClick={rewinding ? undefined : handleClick}
        userData={rewinding ? undefined : userData}
      >
        <boxGeometry args={[dims.w * s, dims.h * s, 0.2 * s]} />
        <meshStandardMaterial color={bodyMatColor} roughness={0.7} />
      </mesh>

      {/* Belt accent */}
      <mesh position={[0, 0.35 * s, 0]}>
        <boxGeometry args={[dims.w * s + 0.03, 0.04 * s, 0.22 * s]} />
        <meshStandardMaterial color={rewinding ? '#44ffcc' : '#c8a060'} roughness={0.5} metalness={0.3} />
      </mesh>

      {/* ── ARMS ── */}
      <group ref={armLeftRef} position={[-dims.w * 0.7 * s, 0.55 * s, 0]}>
        <mesh position={[0, -0.2 * s, 0]} castShadow>
          <boxGeometry args={[0.07 * s, 0.4 * s, 0.07 * s]} />
          <meshStandardMaterial color={rewinding ? rewindTint : darkBody} roughness={0.8} />
        </mesh>
      </group>
      <group ref={armRightRef} position={[dims.w * 0.7 * s, 0.55 * s, 0]}>
        <mesh position={[0, -0.2 * s, 0]} castShadow>
          <boxGeometry args={[0.07 * s, 0.4 * s, 0.07 * s]} />
          <meshStandardMaterial color={rewinding ? rewindTint : darkBody} roughness={0.8} />
        </mesh>
      </group>

      {/* ── HEAD ── */}
      <mesh ref={headRef} position={[0, 0.85 * s, 0]} castShadow>
        <sphereGeometry args={[dims.head * s, 10, 10]} />
        <meshStandardMaterial color={rewinding ? rewindTint : '#d4a574'} roughness={0.6} />
      </mesh>

      {/* Hat / Hair (varies by body type) */}
      <mesh position={[0, 0.95 * s, -0.02 * s]} castShadow>
        <coneGeometry args={[dims.hatH * 1.2 * s, dims.hatH * s, 8]} />
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

      {/* ── ACCESSORIES ── */}

      {/* Backpack */}
      {npc.accessory === 'backpack' && (
        <group position={[0, 0.5 * s, -0.15 * s]}>
          <mesh>
            <boxGeometry args={[0.2 * s, 0.25 * s, 0.08 * s]} />
            <meshStandardMaterial color={darkBody} roughness={0.9} />
          </mesh>
          {/* Strap */}
          <mesh position={[0.1 * s, 0, 0.06 * s]}>
            <boxGeometry args={[0.02 * s, 0.3 * s, 0.01 * s]} />
            <meshBasicMaterial color="#664422" />
          </mesh>
          <mesh position={[-0.1 * s, 0, 0.06 * s]}>
            <boxGeometry args={[0.02 * s, 0.3 * s, 0.01 * s]} />
            <meshBasicMaterial color="#664422" />
          </mesh>
        </group>
      )}

      {/* Scarf */}
      {npc.accessory === 'scarf' && (
        <group position={[0, 0.72 * s, -0.05 * s]}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.3 * s, 0.04 * s, 0.15 * s]} />
            <meshStandardMaterial
              color={rewinding ? '#44ffcc' : '#cc6644'}
              roughness={0.5}
            />
          </mesh>
          {/* Dangling end */}
          <mesh position={[0.12 * s, -0.1 * s, 0]} rotation={[0, 0, 0.3]}>
            <boxGeometry args={[0.04 * s, 0.15 * s, 0.02 * s]} />
            <meshStandardMaterial
              color={rewinding ? '#44ffcc' : '#cc6644'}
              roughness={0.5}
            />
          </mesh>
        </group>
      )}

      {/* Cape — flowing back garment, inspired by wizard-masters cape system */}
      {npc.accessory === 'cape' && (
        <group position={[0, 0.55 * s, -0.12 * s]}>
          {/* Upper cape panel */}
          <mesh position={[0, 0, 0]} castShadow>
            <boxGeometry args={[dims.w * s * 0.9, 0.5 * s, 0.02 * s]} />
            <meshStandardMaterial
              color={rewinding ? rewindTint : healthColor}
              roughness={0.8}
              metalness={0.1}
              emissive={rewinding ? '#44ffcc' : healthColor}
              emissiveIntensity={0.1}
            />
          </mesh>
          {/* Lower cape tail */}
          <mesh position={[0, -0.25 * s, 0.01 * s]}>
            <boxGeometry args={[dims.w * s * 0.8, 0.25 * s, 0.02 * s]} />
            <meshStandardMaterial
              color={rewinding ? rewindTint : darkBody}
              roughness={0.8}
            />
          </mesh>
          {/* Cape trim */}
          <mesh position={[0, 0.26 * s, 0]}>
            <boxGeometry args={[dims.w * s * 0.85, 0.02 * s, 0.03 * s]} />
            <meshBasicMaterial color="#c8a060" transparent opacity={0.6} />
          </mesh>
        </group>
      )}

      {/* Staff (held in right hand) */}
      {npc.accessory === 'staff' && (
        <mesh
          ref={staffRef}
          position={[dims.w * 0.7 * s, 0.35 * s, 0]}
          rotation={[0, 0, 0.15]}
        >
          <cylinderGeometry args={[0.02 * s, 0.03 * s, 0.8 * s, 6]} />
          <meshStandardMaterial color="#8a7a5a" roughness={0.7} />
          {/* Staff crystal top */}
          <mesh position={[0, 0.45 * s, 0]}>
            <sphereGeometry args={[0.04 * s, 6, 6]} />
            <meshStandardMaterial
              color={bodyColor}
              emissive={bodyColor}
              emissiveIntensity={0.4}
            />
          </mesh>
        </mesh>
      )}

      {/* Heal burst */}
      {showHealBurst && (
        <HealBurst position={[0, 0.8 * s, 0]} onComplete={() => setShowHealBurst(false)} />
      )}

      {/* Gift burst */}
      {showGiftBurst && (
        <NPCGiftBurst position={[0, 0.8 * s, 0]} onComplete={() => setShowGiftBurst(false)} />
      )}

      {/* Rewind glow */}
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
