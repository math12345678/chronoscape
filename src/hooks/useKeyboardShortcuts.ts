import { useEffect } from 'react'
import { useStore } from '../store'
import { lockPointer, unlockPointer } from '../utils/pointerLock'
import { healPlayer } from '../components/Combat/HealthTracker'

interface KeyboardShortcutsProps {
  refinePanelOpen: boolean
  setRefinePanelOpen: React.Dispatch<React.SetStateAction<boolean>>
  closeAllPanels?: () => void
  hasOpenPanels?: boolean
}

/**
 * Simplified keyboard shortcuts — only the essentials.
 *
 * - `R` toggles the Refine Panel
 * - `H` heals the player (costs 1 Liquid)
 * - `1` toggles Vapour block
 * - `2` toggles Crystal block (if discovered)
 * - `Escape` releases/locks pointer
 * - `Tab` opens the Game Menu Hub (handled in ControlsHub component)
 */
export function useKeyboardShortcuts({
  refinePanelOpen,
  setRefinePanelOpen,
  closeAllPanels,
  hasOpenPanels,
}: KeyboardShortcutsProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      const key = e.key.toLowerCase()

      // Read latest state directly from store to avoid reactive re-registration
      const state = useStore.getState()

      switch (key) {
        case 'r': {
          e.preventDefault()
          setRefinePanelOpen((prev) => !prev)
          break
        }
        case 'h': {
          e.preventDefault()
          healPlayer()
          break
        }
        case 'escape': {
          e.preventDefault()
          if (hasOpenPanels && closeAllPanels) {
            closeAllPanels()
          } else if (document.pointerLockElement) {
            unlockPointer()
          } else {
            lockPointer()
          }
          break
        }
        case '1': {
          e.preventDefault()
          const current = state.selectedBlockType
          state.setSelectedBlockType(current === 'vapour' ? null : 'vapour')
          break
        }
        case '2': {
          e.preventDefault()
          if (!state.formulaDiscovered('crystallization')) break
          const current = state.selectedBlockType
          state.setSelectedBlockType(current === 'crystal' ? null : 'crystal')
          break
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [refinePanelOpen, setRefinePanelOpen, closeAllPanels, hasOpenPanels])
}
