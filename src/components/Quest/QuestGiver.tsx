import { useState, useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { LAB_POSITION } from '../../config/constants'
import { QUESTS, PLAYER_MAX_HEALTH } from '../../config/combat'
import type { QuestId } from '../../config/combat'
import { getPlayerHealth, getKillCount } from '../Combat/HealthTracker'
import { getEquippedWeapon } from '../Combat/HostileEnemyManager'
import { getInfiniteTerrainHeight } from '../../world/chunkTerrain'
import { useStore } from '../../store'
import { cycleWeapon, grantWeapon } from '../Combat/ProjectileSystem'
import { dispatchQuestComplete } from '../UI/QuestCompleteNotification'

// ── Module-level quest state ──────────────────────────
interface QuestProgress {
  questId: QuestId
  startedAt: number
  stepProgress: number[]  // progress per objective
  completed: boolean
  claimed: boolean
}

let _activeQuests: QuestProgress[] = []
let _completedQuestIds: string[] = []
let _vehicleTravelDistance = 0
let _reputationScore = 0

export function getActiveQuests(): QuestProgress[] { return _activeQuests }
export function getCompletedQuestIds(): string[] { return _completedQuestIds }
export function addVehicleTravel(d: number) { _vehicleTravelDistance += d }
export function setReputationScore(s: number) { _reputationScore = s }

// ── Persistence ────────────────────────────────────
export function getQuestSaveData() {
  return {
    activeQuests: _activeQuests,
    completedQuestIds: _completedQuestIds,
    vehicleTravelDistance: _vehicleTravelDistance,
    reputationScore: _reputationScore,
  }
}

export function loadQuestSaveData(data: {
  activeQuests: QuestProgress[]
  completedQuestIds: string[]
  vehicleTravelDistance: number
  reputationScore: number
}) {
  _activeQuests = data.activeQuests
  _completedQuestIds = data.completedQuestIds
  _vehicleTravelDistance = data.vehicleTravelDistance
  _reputationScore = data.reputationScore
}

export function startQuest(id: QuestId): boolean {
  if (_activeQuests.find(q => q.questId === id)) return false
  if (_completedQuestIds.includes(id)) return false

  const qd = QUESTS[id]
  _activeQuests.push({
    questId: id,
    startedAt: Date.now(),
    stepProgress: qd.objectives.map(() => 0),
    completed: false,
    claimed: false,
  })
  return true
}

export function getQuestProgress(id: QuestId): number {
  const q = _activeQuests.find(p => p.questId === id)
  if (!q) return 0
  const qd = QUESTS[id]
  let total = 0, done = 0
  qd.objectives.forEach((obj, i) => {
    total += obj.targetCount
    done += Math.min(obj.targetCount, q.stepProgress[i])
  })
  return total > 0 ? done / total : 1
}

export function claimQuestReward(id: QuestId): boolean {
  const q = _activeQuests.find(p => p.questId === id)
  if (!q || !q.completed || q.claimed) return false

  const qd = QUESTS[id]
  const state = useStore.getState()

  useStore.setState((s) => ({
    inventory: {
      ...s.inventory,
      renown: s.inventory.renown + (qd.rewards.renown ?? 0),
      raw: s.inventory.raw + (qd.rewards.raw ?? 0),
      liquid: s.inventory.liquid + (qd.rewards.liquid ?? 0),
      crystal: s.inventory.crystal + (qd.rewards.crystal ?? 0),
    },
  }))

  // Handle weapon rewards
  if (qd.rewards.weapon) {
    grantWeapon(qd.rewards.weapon)
  }

  q.claimed = true
  _completedQuestIds.push(id)
  _activeQuests = _activeQuests.filter(p => p.questId !== id)
  return true
}

/** Check all active quests for progress updates */
export function tickQuests() {
  const kills = getKillCount()

  for (const q of _activeQuests) {
    if (q.completed) continue
    const qd = QUESTS[q.questId]

    qd.objectives.forEach((obj, i) => {
      switch (obj.type) {
        case 'kill':
          q.stepProgress[i] = Math.max(q.stepProgress[i], kills)
          break
        case 'reputation':
          q.stepProgress[i] = Math.max(q.stepProgress[i], _reputationScore)
          break
        case 'travel':
          q.stepProgress[i] = Math.max(q.stepProgress[i], Math.floor(_vehicleTravelDistance))
          break
        case 'build':
          q.stepProgress[i] = Math.max(q.stepProgress[i], useStore.getState().totalBlocksPlaced)
          break
        case 'harvest':
          // Check if a specific target resource is being tracked
          if (obj.targetId === 'crystal') {
            q.stepProgress[i] = Math.max(q.stepProgress[i], useStore.getState().inventory.crystal)
          } else {
            q.stepProgress[i] = Math.max(q.stepProgress[i], useStore.getState().inventory.raw)
          }
          break
      }
    })

    // Check if all objectives complete
    const allDone = qd.objectives.every((obj, i) => q.stepProgress[i] >= obj.targetCount)
    if (allDone && !q.completed) {
      q.completed = true
      dispatchQuestComplete(q.questId)
    }
  }

  // Auto-start 'firstBlood' quest on first spawn
  if (kills >= 1 && !_completedQuestIds.includes('firstBlood') && !_activeQuests.find(q => q.questId === 'firstBlood')) {
    startQuest('firstBlood')
  }
}

// ── Quest giver data ────────────────────────────────
interface QuestGiverData {
  pos: [number, number, number]
  color: string
  emissive: string
  label: string
}
const QUEST_GIVERS: QuestGiverData[] = [
  { pos: [LAB_POSITION[0] + 2, LAB_POSITION[1] + 0.9, LAB_POSITION[2]], color: '#ffd700', emissive: '#ffd700', label: '[Click] View Quests' },
  { pos: [15, 1, 35], color: '#44ff88', emissive: '#22dd66', label: '[Click] View Bounties' },
  { pos: [-30, 1, -15], color: '#ff66aa', emissive: '#dd4488', label: '[Click] View Missions' },
  { pos: [35, 1, -40], color: '#66ddff', emissive: '#44bbee', label: '[Click] View Contracts' },
]

export const QuestGivers = () => {
  return (
    <group>
      {QUEST_GIVERS.map((qg, i) => (
        <QuestGiverNPC key={i} data={qg} />
      ))}
    </group>
  )
}

const QuestGiverNPC = ({ data }: { data: QuestGiverData }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const time = useRef(0)
  const terrainY = getInfiniteTerrainHeight(data.pos[0], data.pos[2])
  const startY = terrainY + 0.9

  useFrame((_, delta) => {
    time.current += delta
    if (!meshRef.current) return
    meshRef.current.position.y = startY + Math.sin(time.current * 1.2 + data.pos[0]) * 0.1
    meshRef.current.rotation.y += delta * 0.5
  })

  return (
    <mesh
      ref={meshRef}
      position={[data.pos[0], startY, data.pos[2]]}
      userData={{ interactable: true, type: 'questGiver', prompt: data.label }}
    >
      <coneGeometry args={[0.3, 0.6, 6]} />
      <meshStandardMaterial
        color={data.color}
        emissive={data.emissive}
        emissiveIntensity={0.3}
        transparent
        opacity={0.9}
        roughness={0.3}
        metalness={0.2}
      />
    </mesh>
  )
}

// Legacy export for backward compatibility
export const QuestGiver = QuestGivers
