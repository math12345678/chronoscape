/**
 * Performance utility for auto-quality detection, frame-skipping, and
 * persistent graphics quality presets.
 *
 * Quality levels (0=low, 1=medium, 2=high, 3=ultra):
 * - Low:    aggressive frame skip, minimal effects, no bloom
 * - Medium: moderate frame skip, bloom + noise, no chromatic aberration
 * - High:   light frame skip, full post-processing
 * - Ultra:  full effects, heavy bloom, FXAA anti-aliasing (manual only, not auto-detect)
 *
 * The auto-quality system watches FPS and adjusts dynamically.
 * The manual quality preset (set via GraphicsQuality component) overrides auto.
 */

// ── Quality levels ─────────────────────────────────────
import { useEffect, useState } from 'react'

export type QualityLevel = 0 | 1 | 2 | 3 // 0=low, 1=med, 2=high, 3=ultra

const STORAGE_KEY = 'chronoscape_graphics_quality'

let _manualQuality: QualityLevel | null = null
let _autoQuality: QualityLevel = 1
let _fps = 60
let _frameCount = 0
let _lastFrameTime = performance.now()
let _fpsSamples: number[] = []

/** Load saved quality preset from localStorage */
function loadSavedQuality(): QualityLevel | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw !== null) {
      const v = Number(raw) as QualityLevel
      if ([0, 1, 2, 3].includes(v)) return v
    }
  } catch { /* ignore */ }
  return null
}

// Load on module init
_manualQuality = loadSavedQuality()

/** Returns the effective quality level (manual override takes precedence) */
export function getQualityLevel(): QualityLevel {
  return _manualQuality ?? _autoQuality
}

/** Set a manual quality override (null = auto) */
export function setQualityLevel(level: QualityLevel | null): void {
  _manualQuality = level
  try {
    if (level !== null) {
      localStorage.setItem(STORAGE_KEY, String(level))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch { /* ignore */ }
}

/** Reset to auto-quality */ 
export function resetQualityToAuto(): void {
  setQualityLevel(null)
}

/**
 * Call this at the start of each frame loop to track FPS.
 * Auto-quality adjusts based on 60-frame rolling average.
 */
export function tickFrame(): QualityLevel {
  if (_manualQuality !== null) return _manualQuality

  const now = performance.now()
  const dt = now - _lastFrameTime
  _lastFrameTime = now
  _frameCount++

  if (dt > 0) {
    _fpsSamples.push(1000 / dt)
    if (_fpsSamples.length > 30) _fpsSamples.shift()
  }

  // Re-evaluate quality every 60 frames
  if (_frameCount % 60 === 0 && _fpsSamples.length > 0) {
    const avgFps = _fpsSamples.reduce((a, b) => a + b, 0) / _fpsSamples.length
    _fps = Math.round(avgFps)

    if (_fps < 20) {
      _autoQuality = 0 // Low
    } else if (_fps < 35) {
      _autoQuality = 1 // Medium
    } else {
      _autoQuality = 2 // High (Ultra is manual-only — too expensive for auto)
    }

    _fpsSamples = []
  }

  return _autoQuality
}

/** Get the current FPS estimate */
export function getFPS(): number {
  return _fps
}

/** Get the number of frames to skip between updates at current quality */
export function getFrameSkip(): number {
  switch (getQualityLevel()) {
    case 0: return 5  // Every 6th frame
    case 1: return 3  // Every 4th frame
    case 2: return 2  // Every 3rd frame
    case 3: return 1  // Every 2nd frame
  }
}

/**
 * Returns true every `rate` frames for throttling.
 * Works with auto-quality: actual rate = rate * quality multiplier
 */
export function shouldTick(rate: number = 2): boolean {
  const skip = getFrameSkip()
  const effectiveRate = Math.max(1, Math.round(rate * (skip / 3 + 0.5)))
  return _frameCount % effectiveRate === 0
}

/** Get the particle multiplier for current quality */
export function getParticleMultiplier(): number {
  switch (getQualityLevel()) {
    case 0: return 0.2
    case 1: return 0.5
    case 2: return 0.8
    case 3: return 1.0
  }
}

/** Get the shadow map size multiplier */
export function getShadowMultiplier(): number {
  switch (getQualityLevel()) {
    case 0: return 0.125
    case 1: return 0.25
    case 2: return 0.5
    case 3: return 1.0
  }
}

/** Whether expensive visual effects should be disabled entirely */
export function shouldDisableEffects(): boolean {
  return getQualityLevel() === 0
}

/** Bloom intensity based on quality */
export function getBloomIntensity(): number {
  switch (getQualityLevel()) {
    case 0: return 0
    case 1: return 0.8
    case 2: return 1.2
    case 3: return 1.6
  }
}

/** Chromatic aberration offset based on quality (0 = disabled) */
export function getChromaticAberrationOffset(): number {
  switch (getQualityLevel()) {
    case 0: return 0
    case 1: return 0
    case 2: return 0.002
    case 3: return 0.004
  }
}

/** Quality preset display labels */
export const QUALITY_LABELS: Record<QualityLevel, string> = {
  0: 'Low',
  1: 'Medium',
  2: 'High',
  3: 'Ultra',
}

/**
 * React hook that returns the current quality level and re-renders
 * when quality changes. Used by UI components that display quality info.
 */
export function useQualityLevel(): QualityLevel {
  const [level, setLevel] = useState<QualityLevel>(getQualityLevel())

  useEffect(() => {
    // Poll quality every 1s — cheap enough and catches auto-quality changes
    const interval = setInterval(() => {
      const current = getQualityLevel()
      setLevel((prev) => prev !== current ? current : prev)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return level
}

/**
 * Creates a frame-throttled callback.
 */
export function createFrameThrottle(baseRate: number = 2) {
  let frameCounter = 0
  return {
    tick(): boolean {
      frameCounter++
      const skip = getFrameSkip()
      const rate = Math.max(1, Math.round(baseRate * (skip / 3 + 0.5)))
      if (frameCounter % rate === 0) return true
      return false
    },
    reset() { frameCounter = 0 }
  }
}
