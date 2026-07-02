import { useEffect } from 'react'
import { useStore } from '../store'

interface KeyboardShortcutsProps {
  refinePanelOpen: boolean
  setRefinePanelOpen: React.Dispatch<React.SetStateAction<boolean>>
  hirePanelOpen?: boolean
  setHirePanelOpen?: React.Dispatch<React.SetStateAction<boolean>>
  tradePanelOpen?: boolean
  setTradePanelOpen?: React.Dispatch<React.SetStateAction<boolean>>
  shrinePanelOpen?: boolean
  setShrinePanelOpen?: React.Dispatch<React.SetStateAction<boolean>>
}

/**
 * Global keyboard shortcuts for the game.
 *
 * - `R` toggles the Refine Panel
 * - `H` toggles the Hire Panel
 * - `T` toggles the Trade Panel
 * - `I` toggles the Investment Panel (Time Shrine)
 * - `1` selects Vapour block in hotbar
 * - `2` selects Crystal block in hotbar (if discovered)
 * - `Escape` closes panels or deselects hotbar
 */
export function useKeyboardShortcuts({
  refinePanelOpen,
  setRefinePanelOpen,
  hirePanelOpen,
  setHirePanelOpen,
  tradePanelOpen,
  setTradePanelOpen,
  shrinePanelOpen,
  setShrinePanelOpen,
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
          if (setHirePanelOpen) {
            setHirePanelOpen((prev) => !prev)
          }
          break
        }
        case 't': {
          e.preventDefault()
          if (setTradePanelOpen) {
            setTradePanelOpen((prev) => !prev)
          }
          break
        }
        case 'i': {
          e.preventDefault()
          if (setShrinePanelOpen) {
            setShrinePanelOpen((prev) => !prev)
          }
          break
        }
        case 'escape': {
          if (refinePanelOpen) {
            e.preventDefault()
            setRefinePanelOpen(false)
          } else if (hirePanelOpen) {
            e.preventDefault()
            setHirePanelOpen?.(false)
          } else if (tradePanelOpen) {
            e.preventDefault()
            setTradePanelOpen?.(false)
          } else if (shrinePanelOpen) {
            e.preventDefault()
            setShrinePanelOpen?.(false)
          } else if (state.selectedBlockType) {
            e.preventDefault()
            state.setSelectedBlockType(null)
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
  }, [refinePanelOpen, setRefinePanelOpen, hirePanelOpen, setHirePanelOpen, tradePanelOpen, setTradePanelOpen, shrinePanelOpen, setShrinePanelOpen])
}
