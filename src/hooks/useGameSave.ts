import { useEffect, useRef, useCallback, useState } from 'react'
import { useStore } from '../store'
import type { GameState } from '../store'

// ── Types ──────────────────────────────────────────────

interface SaveData {
  version: number
  timestamp: number
  inventory: GameState['inventory']
  blocks: GameState['blocks']
  formulas: GameState['formulas']
  upgrades: GameState['upgrades']
  shopPurchases: GameState['shopPurchases']
  marketState: GameState['marketState']
  timeBonds: GameState['timeBonds']
  selectedBlockColor: GameState['selectedBlockColor']
}

const SAVE_KEY = 'chronoscape-save'
const SAVE_VERSION = 1
const AUTO_SAVE_INTERVAL = 30_000 // 30 seconds

// ── Save / Load ────────────────────────────────────────

/**
 * Serializes only the serializable parts of the game store to localStorage.
 * Functions and computed properties are excluded — they're recreated on load.
 */
function saveToDisk() {
  try {
    const state = useStore.getState()
    const data: SaveData = {
      version: SAVE_VERSION,
      timestamp: Date.now(),
      inventory: state.inventory,
      blocks: state.blocks,
      formulas: state.formulas,
      upgrades: state.upgrades,
      shopPurchases: state.shopPurchases,
      marketState: state.marketState,
      timeBonds: state.timeBonds,
      selectedBlockColor: state.selectedBlockColor,
    }
    localStorage.setItem(SAVE_KEY, JSON.stringify(data))
    return true
  } catch (err) {
    console.warn('[Save] Failed to persist:', err)
    return false
  }
}

/**
 * Loads a saved game from localStorage and applies it to the store.
 * Returns true if a valid save was found and loaded.
 */
function loadFromDisk(): boolean {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return false

    const data: SaveData = JSON.parse(raw)
    if (!data || data.version !== SAVE_VERSION) return false

    const state = useStore.getState()
    useStore.setState({
      inventory: data.inventory,
      blocks: data.blocks,
      formulas: data.formulas,
      upgrades: data.upgrades,
      shopPurchases: data.shopPurchases,
      marketState: data.marketState,
      timeBonds: data.timeBonds,
      selectedBlockColor: data.selectedBlockColor,
    })

    return true
  } catch (err) {
    console.warn('[Save] Failed to load:', err)
    return false
  }
}

/**
 * Returns a human-readable string of when the last save was made.
 */
function getLastSaveTime(): string {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return 'Never'
    const data: SaveData = JSON.parse(raw)
    if (!data?.timestamp) return 'Never'
    const diff = Date.now() - data.timestamp
    const seconds = Math.floor(diff / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    return `${Math.floor(minutes / 60)}h ago`
  } catch {
    return 'Never'
  }
}

/**
 * Hook that auto-loads on mount and auto-saves on an interval + key events.
 *
 * Usage: call once in App.tsx. It handles everything internally.
 *
 * Returns save indicator state for optional UI display.
 */
export function useGameSave() {
  const [lastSaved, setLastSaved] = useState<string>('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasLoadedRef = useRef(false)

  // Load existing save on mount
  useEffect(() => {
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true

    const loaded = loadFromDisk()
    if (loaded) {
      setLastSaved(getLastSaveTime())
    } else {
      // Fresh game — save immediately so there's a baseline
      saveToDisk()
      setLastSaved('Just now')
    }
  }, [])

  // Auto-save on interval
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      saveToDisk()
      setLastSaved(getLastSaveTime())
    }, AUTO_SAVE_INTERVAL)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  // Save on window close / tab hide
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        saveToDisk()
        setLastSaved(getLastSaveTime())
      }
    }
    const handleBeforeUnload = () => {
      saveToDisk()
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  return { lastSaved }
}

// ── Manual save trigger for important events ───────────

/**
 * Call this after important events (purchases, upgrades, etc.) for instant saves.
 */
export function triggerSave() {
  saveToDisk()
}

// ── Delete save (for testing / reset) ──────────────────

/**
 * Clears the saved game. Needs a page refresh to take effect.
 */
export function deleteSave() {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch { /* ignore */ }
}
