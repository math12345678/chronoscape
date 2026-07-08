import { useEffect, useRef } from 'react'
import { ISLAND_SIZE } from '../config/constants'
import { getNPCs } from './NPC/NPCTick'
import { useStore } from '../store'
import { getTerrainHeight } from '../terrain'

const BOUNDARY = ISLAND_SIZE * 0.75
const RESET_INTERVAL = 3000 // check every 3s

/**
 * Watches the player's position and detects when they go beyond the island
 * boundary and return. Triggers regeneration of NPCs, Lab state, and Shrine
 * state so the world feels persistent and responsive.
 *
 * This runs outside the R3F Canvas via the __playerPos global set by
 * PlayerController every frame.
 */
export const WorldBoundsWatcher = () => {
  const wasOutsideRef = useRef(false)
  const lastPosRef = useRef({ x: 0, z: 0 })

  useEffect(() => {
    const check = () => {
      const pos = (window as any).__playerPos as { x: number; z: number } | undefined
      if (!pos) return

      lastPosRef.current = pos
      const dist = Math.sqrt(pos.x * pos.x + pos.z * pos.z)
      const isOutside = dist > BOUNDARY

      if (isOutside && !wasOutsideRef.current) {
        // Player just left the island
        wasOutsideRef.current = true
      } else if (!isOutside && wasOutsideRef.current) {
        // Player just returned to the island — regenerate!
        wasOutsideRef.current = false
        regenerateWorldFeatures(pos.x, pos.z)
      }
    }

    const interval = setInterval(check, RESET_INTERVAL)
    return () => clearInterval(interval)
  }, [])

  return null
}

/**
 * Regenerates world features when the player returns to the island.
 * Teleports far-away NPCs back, closes stale Lab state, and resets Shrine triggers.
 */
function regenerateWorldFeatures(px: number, pz: number) {
  // ── Teleport NPCs back to the island ──
  try {
    const npcs = getNPCs()
    for (let i = 0; i < npcs.length; i++) {
      const n = npcs[i]
      // Skip followers — they should stay with the player
      if (n.following) continue
      const dist = Math.sqrt(
        (n.position[0] - px) ** 2 + (n.position[2] - pz) ** 2,
      )
      if (dist > 60) {
        // Teleport to a random position near the player on the island
        const theta = Math.random() * Math.PI * 2
        const r = 8 + Math.random() * 25
        const nx = px + Math.cos(theta) * r
        const nz = pz + Math.sin(theta) * r
        const ny = getTerrainHeight(nx, nz)
        npcs[i] = {
          ...n,
          position: [nx, ny, nz] as [number, number, number],
          state: 'idle' as const,
          stateTimer: 1,
          target: null,
          following: false,
          followingSince: null,
        }
      }
    }
  } catch {
    // NPC regeneration is best-effort
  }

  // ── Reset Lab state (close if stale) ──
  const state = useStore.getState()
  if (state.labOpen) {
    state.closeLab()
  }

  // ── Show welcome-back toast ──
  try {
    window.dispatchEvent(
      new CustomEvent('toast-event', {
        detail: {
          title: '⟡ Welcome Back',
          description: 'The island has regenerated. NPCs returned to their posts.',
          color: '#44ffcc',
          icon: '⟐',
        },
      }),
    )
  } catch {
    // Toast is best-effort
  }
}
