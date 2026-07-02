import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { tickNPC, generateNPC, spawnInitialNPCs } from '../../npcAI'
import type { ExtendedNPC } from '../../npcAI'

/**
 * Lives inside the R3F Canvas.
 * On mount, populates the store with initial NPCs.
 * Each frame, ticks all NPC AI behaviors.
 *
 * NPC state is stored in a module-level array to avoid store overhead.
 */
let npcs: ExtendedNPC[] = []
let initialized = false

export function getNPCs(): ExtendedNPC[] {
  return npcs
}

export function addNPC(hired: boolean = false): ExtendedNPC {
  const npc = generateNPC(hired)
  npcs.push(npc)
  return npc
}

export const NPCTick = () => {
  const lastTime = useRef(performance.now())

  // Initialize NPCs once
  useEffect(() => {
    if (!initialized) {
      npcs = spawnInitialNPCs(5)
      initialized = true
    }
  }, [])

  // Tick all NPCs each frame
  useFrame(() => {
    const now = performance.now()
    const dt = Math.min((now - lastTime.current) / 1000, 0.1)
    lastTime.current = now

    for (let i = 0; i < npcs.length; i++) {
      npcs[i] = tickNPC(npcs[i], dt)
    }
  })

  return null
}
