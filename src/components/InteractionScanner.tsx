import { useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'
import type { InteractionTarget } from '../store'

/**
 * Sits inside the R3F Canvas and raycasts from the center of the screen each frame.
 * When the crosshair hits an object with `userData.interactable`, it writes the
 * prompt to the Zustand store for the overlay UI to read.
 *
 * This keeps R3F-specific hooks inside the Canvas where they work,
 * and keeps the InteractionPrompt overlay as a pure HTML component.
 */
export const InteractionScanner = () => {
  const { camera, scene } = useThree()
  const setInteractionTarget = useStore((s) => s.setInteractionTarget)
  const raycaster = useRef(new THREE.Raycaster())
  const lastPrompt = useRef<string | null>(null)

  useFrame(() => {
    raycaster.current.setFromCamera(new THREE.Vector2(0, 0), camera)

    // In build mode, only show block interactions (skip NPC prompts)
    const inBuildMode = useStore.getState().selectedBlockType !== null

    // Intersect the whole scene tree
    const intersects = raycaster.current.intersectObjects(scene.children, true)

    let found: InteractionTarget | null = null
    for (const hit of intersects) {
      const ud = hit.object.userData
      if (ud.interactable) {
        // Skip NPC prompts during build mode (clicking would place a block, not heal)
        if (inBuildMode && ud.type === 'npc') continue
        found = {
          prompt: (ud.prompt as string) ?? '[Click] Interact',
          type: (ud.type as InteractionTarget['type']) ?? 'rift',
        }
        break
      }
    }

    // Only update the store when the prompt actually changes (avoid re-renders)
    const newPrompt = found?.prompt ?? null
    if (lastPrompt.current !== newPrompt) {
      lastPrompt.current = newPrompt
      setInteractionTarget(found)
    }
  })

  return null
}
