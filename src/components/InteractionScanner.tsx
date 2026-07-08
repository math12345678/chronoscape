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
 * Updated for Phase 3: Shows follow/gift prompts on follower NPCs,
 * hides healing prompt when in build mode or when following.
 */
export const InteractionScanner = () => {
  const frameCount = useRef(0)
  const { camera, scene } = useThree()
  const setInteractionTarget = useStore((s) => s.setInteractionTarget)
  const raycaster = useRef(new THREE.Raycaster())
  const lastPrompt = useRef<string | null>(null)

  useFrame(() => {
    // Throttle raycast to every other frame — 30fps is plenty for interaction detection
    frameCount.current++
    if (frameCount.current % 2 !== 0) return

    raycaster.current.setFromCamera(new THREE.Vector2(0, 0), camera)

    // In build mode, only show block interactions (skip NPC prompts)
    const inBuildMode = useStore.getState().selectedBlockType !== null

    // Intersect the whole scene tree
    const intersects = raycaster.current.intersectObjects(scene.children, true)

    let found: InteractionTarget | null = null
    for (const hit of intersects) {
      const ud = hit.object.userData
      if (ud.interactable) {
        // Skip NPC prompts during build mode
        if (inBuildMode && ud.type === 'npc') continue
        found = {
          prompt: (ud.prompt as string) ?? '[Click] Interact',
          type: (ud.type as InteractionTarget['type']) ?? 'rift',
          npcId: ud.npcId as string | undefined,
          riftId: ud.riftId as string | undefined,
          wraithId: ud.wraithId as string | undefined,
          healCost: ud.healCost as number | undefined,
          isFollower: ud.isFollower as boolean | undefined,
          canGiftLiquid: ud.canGiftLiquid as boolean | undefined,
          canGiftCrystal: ud.canGiftCrystal as boolean | undefined,
          challengeType: ud.challengeType as 'harvest' | 'build' | 'detonate' | undefined,
          enemyId: ud.enemyId as string | undefined,
          questId: ud.questId as string | undefined,
        }
        // Append gift instructions for follower NPCs
        if (found.isFollower) {
          found.prompt += '  [Right-click] Gift Liquid (10) or Crystal (5)'
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
