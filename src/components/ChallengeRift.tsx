import { useRef, useState, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'
import type { BlockData } from '../store'
import { HARVEST_AMOUNT, VAPOUR_BLOCK_DECAY_MS } from '../config/constants'
import { getTerrainHeight } from '../terrain'
import { useSoundEngine } from '../hooks/useSoundEngine'
import type { ChallengeType } from '../config/constants'

interface ChallengeRiftProps {
  position: [number, number, number]
  challengeType: ChallengeType
  index: number
}

const CHALLENGE_COOLDOWN_MS = 120_000 // 2 min between challenges
const CHALLENGE_DURATIONS: Record<ChallengeType, number> = {
  harvest: 30000,
  build: 15000,
  detonate: 30000,
}

const CHALLENGE_LABELS: Record<ChallengeType, { title: string; desc: string; goal: string }> = {
  harvest: { title: 'Time Surge', desc: 'Harvest 50 Raw in 30s', goal: 'Click the golden rifts that appear!' },
  build: { title: 'Rapid Construction', desc: 'Place 5 blocks in 15s', goal: 'Build fast with given blocks!' },
  detonate: { title: 'Chain Reaction', desc: 'Destroy 3 blocks in one explosion', goal: 'Blow up the pre-built tower!' },
}

export const ChallengeRift = ({ position, challengeType }: ChallengeRiftProps) => {
  const [cooldown, setCooldown] = useState(false)
  const [showUI, setShowUI] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const prePlacedIds = useRef<string[]>([])
  const challengeState = useStore((s) => s.challengeState)
  const updateChallengeProgress = useStore((s) => s.updateChallengeProgress)
  const endChallenge = useStore((s) => s.endChallenge)
  const addRaw = useStore((s) => s.addRaw)
  const addHitToFormula = useStore((s) => s.addHitToFormula)
  const sounds = useSoundEngine()

  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const bobPhase = useRef(Math.random() * Math.PI * 2)
  const isActive = challengeState.active && challengeState.type === challengeType
  const canInteract = !cooldown && !challengeState.active

  const terrainY = getTerrainHeight(position[0], position[2])
  const floatY = terrainY + 1.2

  const userData = useMemo(
    () => ({ interactable: true, type: 'challenge' as const, challengeType, prompt: `[Click] ${CHALLENGE_LABELS[challengeType].title} — ${CHALLENGE_LABELS[challengeType].desc}` }),
    [challengeType],
  )

  // ── Challenge setup and cleanup ──

  // Cleanup: remove pre-placed blocks from store
  const cleanupPrePlaced = () => {
    if (prePlacedIds.current.length === 0) return
    const ids = [...prePlacedIds.current]
    prePlacedIds.current = []
    useStore.setState((s) => {
      const newBlocks = { ...s.blocks }
      for (const id of ids) {
        delete newBlocks[id]
      }
      return { blocks: newBlocks }
    })
  }

  // Run challenge-specific setup when challenge starts
  useEffect(() => {
    if (!isActive) return

    const duration = CHALLENGE_DURATIONS[challengeType]
    setShowUI(true)
    setTimeLeft(duration / 1000)
    sounds.harvest()

    if (challengeType === 'harvest') {
      // Spawn 5 temp rifts in store for InteractionHandler to handle
      const rifts: [number, number, number][] = []
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 + Math.random() * 0.5
        const dist = 4 + Math.random() * 4
        rifts.push([
          position[0] + Math.cos(angle) * dist,
          terrainY + 1,
          position[2] + Math.sin(angle) * dist,
        ])
      }
      useStore.setState((s) => ({
        challengeState: {
          ...s.challengeState,
          tempRiftPositions: rifts,
          tempRiftCollected: rifts.map(() => false),
        },
      }))
    } else if (challengeType === 'build') {
      // Give player 50 free vapour
      useStore.setState((s) => ({
        inventory: { ...s.inventory, vapour: s.inventory.vapour + 50 },
      }))
    } else if (challengeType === 'detonate') {
      // Pre-build 5 vapour blocks directly (no cost)
      const ids: string[] = []
      const now = Date.now()
      const newBlocks: Record<string, BlockData> = {}
      for (let i = 0; i < 5; i++) {
        const bx = Math.floor(position[0]) + i
        const by = Math.floor(terrainY) + 1
        const bz = Math.floor(position[2])
        const key = `${bx},${by},${bz}`
        const state = useStore.getState()
        if (!state.blocks[key]) {
          newBlocks[key] = {
            id: key,
            type: 'vapour',
            placedAt: now,
            decayDeadline: now + VAPOUR_BLOCK_DECAY_MS,
            ownerId: 'challenge',
          }
          ids.push(key)
        }
      }
      if (ids.length > 0) {
        const state = useStore.getState()
        useStore.setState({ blocks: { ...state.blocks, ...newBlocks } })
        prePlacedIds.current = ids
      }
    }

    // Auto-end timeout
    const timeout = setTimeout(() => {
      const cs = useStore.getState().challengeState
      if (cs.active && cs.type === challengeType && !cs.completed) {
        cleanupPrePlaced()
        endChallenge()
        setShowUI(false)
        setCooldown(true)
        setTimeout(() => setCooldown(false), CHALLENGE_COOLDOWN_MS)
      }
    }, duration)

    return () => {
      clearTimeout(timeout)
      cleanupPrePlaced()
      useStore.setState((s) => ({
        challengeState: { ...s.challengeState, tempRiftPositions: [], tempRiftCollected: [] },
      }))
    }
  }, [isActive]) // eslint-disable-line react-hooks/exhaustive-deps

  // Play sound when a temp rift is collected
  const prevCollected = useRef(0)
  useEffect(() => {
    if (!isActive || challengeType !== 'harvest') return
    const collectedCount = challengeState.tempRiftCollected.filter(Boolean).length
    if (collectedCount > prevCollected.current) {
      sounds.harvest()
    }
    prevCollected.current = collectedCount
  }, [challengeState.tempRiftCollected, isActive, challengeType, sounds])

  // Poll progress while active
  useEffect(() => {
    if (!isActive) return
    const lastRaw = { current: useStore.getState().inventory.raw }
    const lastBlocks = { current: useStore.getState().totalBlocksPlaced }
    const lastExplosions = { current: useStore.getState().totalExplosions }

    const interval = setInterval(() => {
      const state = useStore.getState()
      if (challengeType === 'harvest') {
        const current = state.inventory.raw
        const inc = current - lastRaw.current
        if (inc > 0) {
          lastRaw.current = current
          updateChallengeProgress(inc)
        }
      } else if (challengeType === 'build') {
        const current = state.totalBlocksPlaced
        const inc = current - lastBlocks.current
        if (inc > 0) {
          lastBlocks.current = current
          updateChallengeProgress(inc)
        }
      } else if (challengeType === 'detonate') {
        const current = state.totalExplosions
        const inc = current - lastExplosions.current
        if (inc > 0 && state.lastExplosionSize >= 3) {
          lastExplosions.current = current
          updateChallengeProgress(3)
        }
      }
    }, 500)

    return () => clearInterval(interval)
  }, [isActive, challengeType, updateChallengeProgress])

  // Handle completion
  useEffect(() => {
    if (!(isActive && challengeState.completed)) return
    addRaw(HARVEST_AMOUNT * 2)
    addHitToFormula('crystallization')
    addHitToFormula('detonation')
    addHitToFormula('timelineEcho')
    sounds.formulaDiscovered()
    cleanupPrePlaced()
    setCooldown(true)
    setShowUI(false)
    setTimeout(() => {
      setCooldown(false)
      endChallenge()
    }, 4000)
  }, [isActive, challengeState.completed, addRaw, addHitToFormula, sounds, endChallenge]) // eslint-disable-line react-hooks/exhaustive-deps

  // Timer countdown
  useEffect(() => {
    if (!isActive) return
    const interval = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 0.1))
    }, 100)
    return () => clearInterval(interval)
  }, [isActive])

  useFrame((_, delta) => {
    if (!groupRef.current) return
    bobPhase.current += delta * 1.5
    const pulse = 0.5 + Math.sin(bobPhase.current * 2) * 0.3
    groupRef.current.position.y = floatY + Math.sin(bobPhase.current) * 0.15
    groupRef.current.rotation.y += delta * 0.5

    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = canInteract ? pulse : 0.1
      if (isActive && challengeState.completed) {
        const hue = (bobPhase.current * 2) % 1
        mat.color.setHSL(hue, 1, 0.5)
        mat.emissive.setHSL(hue, 1, 0.5)
      }
    }
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = canInteract ? 0.2 + Math.sin(bobPhase.current * 1.5) * 0.15 : 0.05
    }
  })

  const tempRiftPositions = challengeState.tempRiftPositions
  const tempRiftCollected = challengeState.tempRiftCollected

  return (
    <>
      <group ref={groupRef} position={[position[0], floatY, position[2]]}>
        <mesh ref={meshRef} userData={canInteract ? userData : undefined}>
          <octahedronGeometry args={[0.7, 0]} />
          <meshStandardMaterial
            color={canInteract ? '#8844ff' : '#332244'}
            emissive={canInteract ? '#6622cc' : '#221133'}
            emissiveIntensity={canInteract ? 0.6 : 0.1}
            transparent opacity={canInteract ? 1 : 0.3}
            roughness={0.3} metalness={0.3}
          />
        </mesh>
        <mesh ref={glowRef}>
          <octahedronGeometry args={[0.95, 0]} />
          <meshBasicMaterial color="#8844ff" transparent opacity={0.2} side={THREE.BackSide} />
        </mesh>
        <mesh position={[0, -0.7, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.4, 0.6, 6]} />
          <meshBasicMaterial color={canInteract ? '#ff44ff' : '#442244'} transparent opacity={canInteract ? 0.5 : 0.15} side={THREE.DoubleSide} />
        </mesh>
        {canInteract && (
          <>
            <mesh position={[0.9, 0.1, 0]}><sphereGeometry args={[0.05, 6, 6]} /><meshBasicMaterial color="#ff44ff" transparent opacity={0.6} /></mesh>
            <mesh position={[-0.8, -0.1, 0.4]}><sphereGeometry args={[0.04, 6, 6]} /><meshBasicMaterial color="#8844ff" transparent opacity={0.4} /></mesh>
          </>
        )}
        {isActive && (
          <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.8, 1.0, 32]} />
            <meshBasicMaterial color="#ff44ff" transparent opacity={0.4} side={THREE.DoubleSide} />
          </mesh>
        )}
      </group>

      {/* Temp rifts for harvest — rendered from store, handled via InteractionHandler DOM fallback */}
      {isActive && challengeType === 'harvest' && tempRiftPositions.map((pos, i) => {
        if (tempRiftCollected[i]) return null
        const riftY = getTerrainHeight(pos[0], pos[2]) + 0.8
        return (
          <mesh
            key={`temp-rift-${i}`}
            position={[pos[0], riftY, pos[2]]}
            userData={{
              interactable: true,
              type: 'challenge' as const,
              challengeType: 'harvest' as const,
              prompt: '[Click] Harvest challenge rift',
            }}
          >
            <octahedronGeometry args={[0.3, 0]} />
            <meshBasicMaterial color="#ffd700" transparent opacity={0.8} />
          </mesh>
        )
      })}

      {/* Challenge UI overlay */}
      {showUI && isActive && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none select-none">
          <div className="bg-purple-900/60 backdrop-blur-sm border border-purple-500/40 rounded-lg px-5 py-3 text-center">
            <p className="text-purple-300 text-sm font-bold uppercase tracking-wider">
              {CHALLENGE_LABELS[challengeType].title}
            </p>
            <p className="text-white/80 text-xs mt-1">{CHALLENGE_LABELS[challengeType].goal}</p>
            <div className="mt-2 flex items-center justify-center gap-3">
              <div className="flex-1 h-1.5 bg-purple-900/50 rounded-full overflow-hidden w-48">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${(challengeState.progress / challengeState.target) * 100}%`,
                    background: 'linear-gradient(90deg, #8844ff, #ff44ff)',
                  }}
                />
              </div>
              <span className="text-purple-300 text-sm font-mono font-bold tabular-nums">
                {timeLeft.toFixed(1)}s
              </span>
            </div>
            <p className="text-purple-400/60 text-[10px] mt-1">
              {challengeState.progress}/{challengeState.target}
            </p>
          </div>
        </div>
      )}

      {/* Cooldown indicator */}
      {cooldown && !isActive && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none select-none">
          <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-700/40 rounded-lg px-4 py-2 text-center">
            <p className="text-gray-500 text-xs font-mono">Challenge on cooldown</p>
          </div>
        </div>
      )}
    </>
  )
}
