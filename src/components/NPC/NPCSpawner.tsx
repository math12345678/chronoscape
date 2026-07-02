import { useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { NPCCharacter } from './NPCCharacter'
import { getNPCs } from './NPCTick'

/**
 * Renders all active NPCs as animated 3D characters in the world.
 * Re-renders periodically to pick up new/removed NPCs.
 */
// Expose force-render for immediate updates after heal events
export let forceNPCRender: (() => void) | null = null

export const NPCSpawner = () => {
  const [, forceRender] = useState(0)

  // Expose force render so NPCCharacter can trigger immediate update after healing
  forceNPCRender = () => forceRender((t) => t + 1)

  // Force re-render every few frames to catch new NPCs
  useFrame(() => {
    if (Math.random() < 0.03) {
      forceRender((t) => t + 1)
    }
  })

  const npcs = getNPCs()

  return (
    <group>
      {npcs.map((npc) => (
        <NPCCharacter key={npc.id} npc={npc} />
      ))}
    </group>
  )
}
