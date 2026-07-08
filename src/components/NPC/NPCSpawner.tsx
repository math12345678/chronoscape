import { useState, useEffect, useRef } from 'react'
import { NPCCharacter } from './NPCCharacter'
import { getNPCs } from './NPCTick'

/**
 * Renders all active NPCs as animated 3D characters in the world.
 * Re-renders every 1s to pick up new/removed NPCs (avoids per-frame polling).
 */
// Expose force-render for immediate updates after heal events
export let forceNPCRender: (() => void) | null = null

export const NPCSpawner = () => {
  const [, forceRender] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Expose force render so NPCCharacter can trigger immediate update after healing
  forceNPCRender = () => forceRender((t) => t + 1)

  // Re-render every 1 second to catch new/removed NPCs (no per-frame random polling)
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      forceRender((t) => t + 1)
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const npcs = getNPCs()

  return (
    <group>
      {npcs.map((npc) => (
        <NPCCharacter key={npc.id} npc={npc} />
      ))}
    </group>
  )
}
