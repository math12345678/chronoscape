import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { tickNPC, generateNPC, spawnInitialNPCs } from '../../npcAI'
import type { ExtendedNPC, NPCMutation } from '../../npcAI'
import { useStore } from '../../store'
import { getTerrainHeight } from '../../terrain'
import { getDayFactor } from '../DayNightCycle'

let npcs: ExtendedNPC[] = []
let initialized = false
let storeSyncCounter = 0

export function getNPCs(): ExtendedNPC[] {
  return npcs
}

export function addNPC(hired: boolean = false, px = 0, pz = 0): ExtendedNPC {
  const npc = generateNPC(hired, px, pz)
  npcs.push(npc)
  return npc
}

function syncNPCsToStore() {
  useStore.setState({
    npcs: npcs.map((n) => ({
      id: n.id,
      position: n.position,
      vitality: n.vitality,
      lastHealedAt: null,
    })),
  })
}

let lastPlayerPos: [number, number, number] = [0, 1.6, 0]
let playerStillTime = 0

export function getPlayerPosition(): [number, number, number] {
  return lastPlayerPos
}

const NPC_COUNT = 25
const DESPAWN_DIST = 150
const RESPAWN_INTERVAL = 15
let respawnTimer = 0

export const NPCTick = () => {
  const lastTime = useRef(performance.now())
  const camera = useThree((s) => s.camera)
  const frameSkip = useRef(0)

  useEffect(() => {
    if (!initialized) {
      const px = camera.position.x
      const pz = camera.position.z
      npcs = spawnInitialNPCs(NPC_COUNT, px, pz)
      initialized = true
      syncNPCsToStore()
    }
  }, [camera])

  useFrame(() => {
    const now = performance.now()
    const dt = Math.min((now - lastTime.current) / 1000, 0.1)
    lastTime.current = now

    const dayFactor = getDayFactor()

    const px = camera.position.x
    const pz = camera.position.z
    const playerPos: [number, number, number] = [px, 1.6, pz]

    const dx = px - lastPlayerPos[0]
    const dz = pz - lastPlayerPos[2]
    if (Math.sqrt(dx * dx + dz * dz) < 0.05) {
      playerStillTime += dt
    } else {
      playerStillTime = 0
    }
    lastPlayerPos = playerPos

    if (playerStillTime > 10) {
      for (const n of npcs) {
        if (n.following) {
          n.following = false
          n.followingSince = null
          n.state = 'idle'
          n.stateTimer = 1
        }
      }
    }

    // Teleport far-away NPCs to player vicinity
    respawnTimer += dt
    if (respawnTimer > RESPAWN_INTERVAL) {
      respawnTimer = 0
      for (let i = 0; i < npcs.length; i++) {
        const n = npcs[i]
        if (n.following) continue
        const dist = Math.sqrt((n.position[0] - px) ** 2 + (n.position[2] - pz) ** 2)
        if (dist > DESPAWN_DIST) {
          // Teleport to a random position near the player
          const theta = Math.random() * Math.PI * 2
          const r = 10 + Math.random() * 30
          const nx = px + Math.cos(theta) * r
          const nz = pz + Math.sin(theta) * r
          const ny = getTerrainHeight(nx, nz)
          npcs[i] = { ...n, position: [nx, ny, nz], state: 'idle', stateTimer: 1, target: null }
        }
      }
    }

    // Performance: tick every other frame
    frameSkip.current++
    if (frameSkip.current % 2 === 0) {
      const pendingMutations: NPCMutation[] = []
      for (let i = 0; i < npcs.length; i++) {
        const result = tickNPC(npcs[i], dt * 2, dayFactor, playerPos, npcs)
        npcs[i] = result.npc
        pendingMutations.push(...result.mutations)
      }
      // Apply deferred NPC-to-NPC mutations (safe: all NPCs are now cloned)
      for (const mut of pendingMutations) {
        const idx = npcs.findIndex((n) => n.id === mut.npcId)
        if (idx >= 0) {
          npcs[idx] = { ...npcs[idx], state: mut.state, interactingWith: mut.interactingWith, interactionTimer: mut.interactionTimer }
        }
      }
    }

    storeSyncCounter++
    if (storeSyncCounter % 60 === 0) {
      syncNPCsToStore()
    }
  })

  return null
}
