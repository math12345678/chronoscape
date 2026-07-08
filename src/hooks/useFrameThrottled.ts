import { useRef, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import { getFrameSkip, getQualityLevel } from '../utils/performance'
import type { QualityLevel } from '../utils/performance'

type FrameCallback = (state: any, delta: number) => void

/**
 * Quality-aware throttled useFrame hook.
 *
 * Automatically skips frames based on the auto-quality system:
 * - High quality (60fps): updates every other frame (30fps for this callback)
 * - Medium quality (30-45fps): updates every 3rd frame (10-15fps)
 * - Low quality (<25fps): updates every 5th frame (5fps)
 *
 * For critical components (player controller, raycasting), use
 * regular `useFrame` instead. This hook is for ambient particles,
 * decorative animations, and non-critical visual effects.
 *
 * @param callback - The frame callback to throttle
 * @param baseRate - Base frame rate divisor (default 2 = half rate)
 *   Higher values = less frequent updates for less important effects
 *
 * Usage: `useFrameThrottled((state, delta) => { ... }, 2)`
 * replaces `useFrame((state, delta) => { ... })`
 */
export function useFrameThrottled(
  callback: FrameCallback,
  baseRate: number = 2,
) {
  const frameCounter = useRef(0)
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useFrame((state, delta) => {
    frameCounter.current++

    // Compute effective rate based on quality and baseRate
    const skip = getFrameSkip()
    const effectiveRate = Math.max(1, Math.round(baseRate * (skip / 2 + 0.5)))

    if (frameCounter.current % effectiveRate === 0) {
      callbackRef.current(state, delta * effectiveRate)
    }
  })
}

/**
 * Creates a stable callback ref that can be used with regular useFrame
 * for components that need more control over throttling.
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
): React.MutableRefObject<T> {
  const ref = useRef(callback)
  ref.current = callback
  return ref as React.MutableRefObject<T>
}

/**
 * Quality-adaptive timer that returns delta only when it should tick.
 * Useful for non-React animation loops.
 */
export function createAdaptiveTimer() {
  let counter = 0
  let lastQuality: QualityLevel = 2

  return {
    shouldTick(baseRate: number = 2): boolean {
      counter++
      const quality = getQualityLevel()
      if (quality !== lastQuality) {
        lastQuality = quality
        counter = 0
      }
      const skip = getFrameSkip()
      const effectiveRate = Math.max(1, Math.round(baseRate * (skip / 2 + 0.5)))
      return counter % effectiveRate === 0
    },
    reset() {
      counter = 0
    },
  }
}
