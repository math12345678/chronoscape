import { useState, useEffect, useCallback } from 'react'

// ── Panel key mappings ─────────────────────────────────
// Each panel has: a human-readable id, a keyboard key binding,
// an optional toggle-event name, and how its dependency array
// is constructed internally.

export interface PanelState {
  /** Unique panel identifier */
  id: string
  /** Keyboard key(s) to toggle — lowercased. '' = no shortcut */
  key: string
  /** Custom event name to listen for, or '' */
  toggleEvent?: string
}

const PANEL_DEFINITIONS: (PanelState & { initial?: boolean })[] = [
  // Core interaction panels
  { id: 'refinePanel', key: '' },
  { id: 'hirePanel', key: '' },
  { id: 'tradePanel', key: '' },
  { id: 'shrinePanel', key: '' },

  // Economy panels
  { id: 'exchange', key: 'e', toggleEvent: 'toggle-exchange' },
  { id: 'alchemy', key: 'x', toggleEvent: 'toggle-alchemy' },
  { id: 'bounty', key: '', toggleEvent: 'toggle-bounty' },
  { id: 'insurance', key: 'n', toggleEvent: 'toggle-insurance' },
  { id: 'bank', key: 'k', toggleEvent: 'toggle-bank' },
  { id: 'industry', key: 'i', toggleEvent: 'toggle-industry' },
  { id: 'estate', key: 'u', toggleEvent: 'toggle-estate' },
  { id: 'ceo', key: 'o', toggleEvent: 'toggle-ceo' },
  { id: 'auction', key: 'l', toggleEvent: 'toggle-auction' },

  // Feature panels
  { id: 'talents', key: 't' },
  { id: 'expedition', key: 'g' },
  { id: 'building', key: 'h' },
  { id: 'craftingOverhaul', key: 'b' },
  { id: 'bestiary', key: 'y' },
  { id: 'research', key: 'r' },
  { id: 'casino', key: 'j' },
  { id: 'arena', key: '' },
  { id: 'calendar', key: '' },
  { id: 'mounts', key: 'm' },
  { id: 'rift', key: ';' },
  { id: 'lore', key: 'p' },
  { id: 'invOverhaul', key: '' },
  { id: 'ascension', key: '[' },
  { id: 'autoPrestige', key: '=' },
  { id: 'library', key: '\\' },
  { id: 'territories', key: ']' },
  { id: 'raids', key: '9' },
  { id: 'enchanting', key: '0' },
  { id: 'relicForge', key: '7' },
  { id: 'parallelSelves', key: '8' },
  { id: 'dimensionalGates', key: '-' },
  { id: 'megaStructures', key: "'" },
  { id: 'chronoGenetics', key: ',' },
  { id: 'temporalProphecy', key: '.' },
  { id: 'companionFusion', key: '/' },
  { id: 'evolutionDashboard', key: '`' },
  { id: 'infiniteProgression', key: '4' },
  { id: 'llmConfig', key: '5' },
  { id: 'chronoForge', key: '6' },
  { id: 'chronovate', key: 'F3' },
  { id: 'construct', key: 'F4' },
  { id: 'outpost', key: 'F5' },
  { id: 'passiveTree', key: 'F6' },
  { id: 'gangHideout', key: '' },
  { id: 'dragRace', key: 'F7' },
]

export type PanelId = (typeof PANEL_DEFINITIONS)[number]['id']

export interface PanelManager {
  /** All panel states keyed by panel id */
  panelStates: Record<PanelId, boolean>
  /** Set a panel's open/closed state */
  setPanelOpen: (id: PanelId, open: boolean) => void
  /** Toggle a panel's open/closed state */
  togglePanel: (id: PanelId) => void
  /** Close all panels */
  closeAll: () => void
}

/**
 * Central panel state manager hook.
 *
 * Replaces ~50 individual `useState(false)` calls, ~40 keyboard
 * shortcut bindings, and ~10 window event listeners in App.tsx
 * with a single hook. Reduces App.tsx by ~250 lines.
 */
export function usePanelManager(): PanelManager {
  // Build initial state from all panel definitions
  const initialStates = PANEL_DEFINITIONS.reduce<Record<string, boolean>>((acc, p) => {
    acc[p.id] = p.initial ?? false
    return acc
  }, {})

  const [panelStates, setPanelStates] = useState<Record<string, boolean>>(initialStates)

  // ── Individual panel helpers ─────────────────────────
  const setPanelOpen = useCallback((id: string, open: boolean) => {
    setPanelStates(prev => ({ ...prev, [id]: open }))
  }, [])

  const togglePanel = useCallback((id: string) => {
    setPanelStates(prev => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const closeAll = useCallback(() => {
    setPanelStates(prev => {
      const next = { ...prev }
      for (const key of Object.keys(next)) {
        next[key] = false
      }
      return next
    })
  }, [])

  // ── Economy panel toggle events from 3D world clicks ──
  useEffect(() => {
    const handlers: Array<{ event: string; id: string }> = []
    for (const def of PANEL_DEFINITIONS) {
      if (def.toggleEvent) {
        handlers.push({ event: def.toggleEvent, id: def.id })
      }
    }

    const eventHandler = (e: Event) => {
      const custom = e as CustomEvent
      const id = handlers.find(h => h.event === custom.type)?.id
      if (id) togglePanel(id)
    }

    for (const h of handlers) {
      window.addEventListener(h.event, eventHandler)
    }
    return () => {
      for (const h of handlers) {
        window.removeEventListener(h.event, eventHandler)
      }
    }
  }, [togglePanel])    // ── Keyboard shortcuts ───────────────────────────────
  // All panel keyboard shortcuts removed — use Tab menu (ControlsHub) instead.
  // Individual letter keys (E, K, I, N, C, G, M, V, etc.) are no longer bound.
  // The ControlsHub component handles Tab key and dispatches 'toggle-panel' events.
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent
      const panelId = custom.detail?.id
      if (panelId) togglePanel(panelId)
    }
    window.addEventListener('toggle-panel', handler)
    return () => window.removeEventListener('toggle-panel', handler)
  }, [togglePanel])

  return {
    panelStates: panelStates as Record<PanelId, boolean>,
    setPanelOpen,
    togglePanel,
    closeAll,
  }
}
