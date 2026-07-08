import { useEffect, useRef } from 'react'
import { useStore } from '../store'

/**
 * Automatically refines raw → vapour on every store change where raw ≥ 5.
 * Uses setTimeout to avoid synchronous re-entrant subscriber calls that
 * can cause infinite recursion (Zustand calls subscribers synchronously
 * inside setState, and refine() calls setState).
 */
export const AutoRefine = () => {
  const lastBatchRef = useRef(0)
  const pendingRef = useRef(false)

  useEffect(() => {
    const unsub = useStore.subscribe((state) => {
      if (pendingRef.current) return
      const raw = state.inventory.raw
      const vapour = state.inventory.vapour
      if (raw < 5) return
      const cap = state.getCurrentCapacity('vapour')
      if (vapour >= cap) return
      const batchSize = Math.min(raw - (raw % 5), cap - vapour)
      if (batchSize < 5) return
      pendingRef.current = true
      // Defer refine to break synchronous subscriber → setState recursion
      setTimeout(() => {
        pendingRef.current = false
        useStore.getState().refine('vapour', batchSize)
        // Only dispatch event on first batch (avoid spam when store updates cascade)
        if (batchSize !== lastBatchRef.current) {
          lastBatchRef.current = batchSize
          window.dispatchEvent(new CustomEvent('auto-refine', {
            detail: { amount: batchSize },
          }))
        }
      }, 0)
    })
    return unsub
  }, [])

  return null
}
