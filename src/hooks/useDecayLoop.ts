import { useEffect, useRef } from 'react'
import { useStore } from '../store'

/**
 * Delta-time decay loop (Section 12.1 of design doc).
 *
 * Uses `performance.now()` and `requestAnimationFrame` so that decay runs
 * on real elapsed time, not `setInterval`. This is critical because browsers
 * throttle `setInterval` in background tabs — delta-time math keeps the
 * decay accurate regardless of tab focus state.
 *
 * Also cleans up expired vapour blocks and ticks the market pricing every frame.
 * NPC vitality decay is handled inside the NPCTick loop.
 *
 * During a Time Squall anomaly, all decay rates are multiplied by 3.
 */
export function useDecayLoop() {
  const lastTick = useRef(performance.now())
  const decayVapour = useStore((s) => s.decayVapour)
  const decayRaw = useStore((s) => s.decayRaw)
  const cleanupExpiredBlocks = useStore((s) => s.cleanupExpiredBlocks)
  const tickMarket = useStore((s) => s.tickMarket)

  useEffect(() => {
    let rafId: number
    let anomalyTickCounter = 0

    const tick = () => {
      try {
        const now = performance.now()
        const dt = (now - lastTick.current) / 1000 // seconds elapsed
        lastTick.current = now

        if (dt > 0 && dt < 1) {
          // Check for Time Squall anomaly multiplier (from store type)
          const anomalyMultiplier = useStore.getState().anomalyDecayMultiplier

          // Apply anomaly multiplier to decay
          decayVapour(dt * anomalyMultiplier)
          decayRaw(dt * anomalyMultiplier)
          tickMarket(dt)
        }

        // Clean up expired blocks (every ~60 frames)
        anomalyTickCounter++
        if (anomalyTickCounter % 60 === 0) {
          cleanupExpiredBlocks()
        }
      } catch (err) {
        console.error('[DecayLoop] tick error:', err)
      }

      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [decayVapour, decayRaw, cleanupExpiredBlocks, tickMarket])
}
