/**
 * Premium camera shake system inspired by wizard-masters.
 *
 * Features:
 * - Multi-axis shake (x, y, z) with independent frequencies
 * - Exponential decay curves per axis
 * - Rotation shake (pitch, yaw, roll)
 * - Smooth intensity ramps (attack / sustain / release)
 * - Global intensity multiplier for aggregated shakes
 * - Zustand-free for per-frame performance; only triggers update the store
 */

// ── State ───────────────────────────────────────────────

interface ShakeParams {
  intensity: number       // 0–1 overall intensity
  decay: number           // exponential decay rate (higher = faster)
  duration: number        // seconds until auto-stop
  freqX: number           // oscillation frequency X
  freqY: number           // oscillation frequency Y
  freqZ: number           // oscillation frequency Z
  rotAmplitude: number    // rotation shake amplitude (radians)
  rotFreq: number         // rotation shake frequency
}

interface ShakeState {
  active: boolean
  params: ShakeParams
  elapsed: number
}

const DEFAULT_PARAMS: ShakeParams = {
  intensity: 0,
  decay: 6,
  duration: 0.5,
  freqX: 53,
  freqY: 41,
  freqZ: 37,
  rotAmplitude: 0.002,
  rotFreq: 30,
}

let state: ShakeState = {
  active: false,
  params: { ...DEFAULT_PARAMS },
  elapsed: 0,
}

// ── Public API ──────────────────────────────────────────

/**
 * Trigger a camera shake with customizable parameters.
 * Multiple shakes stack by taking the max intensity.
 */
export function triggerShake(
  intensity: number = 0.3,
  decay: number = 6,
  duration: number = 0.5,
  overrides?: Partial<Pick<ShakeParams, 'freqX' | 'freqY' | 'freqZ' | 'rotAmplitude' | 'rotFreq'>>,
  heavy?: boolean,
) {
  const params: ShakeParams = {
    ...DEFAULT_PARAMS,
    intensity: heavy ? intensity * 1.5 : intensity,
    decay: heavy ? decay * 0.6 : decay,
    duration: heavy ? duration * 1.5 : duration,
    rotAmplitude: heavy ? 0.008 : (overrides?.rotAmplitude ?? DEFAULT_PARAMS.rotAmplitude),
    rotFreq: heavy ? 20 : (overrides?.rotFreq ?? DEFAULT_PARAMS.rotFreq),
    ...(overrides ?? {}),
  }

  if (state.active) {
    // Stack by taking the higher intensity, resetting elapsed
    state.params = params.intensity > state.params.intensity ? params : state.params
    state.elapsed = 0
  } else {
    state.active = true
    state.params = params
    state.elapsed = 0
  }
}

/**
 * Call each frame with delta time.
 * Returns [offsetX, offsetY, offsetZ, rotX, rotY, rotZ] — add these to camera position/rotation.
 * All values decay to 0 when the shake is over.
 */
export function tickShake(delta: number): [number, number, number, number, number, number] {
  if (!state.active) return [0, 0, 0, 0, 0, 0]

  state.elapsed += delta
  const t = state.elapsed
  const p = state.params

  // Stop if past duration
  if (t > p.duration) {
    state.active = false
    return [0, 0, 0, 0, 0, 0]
  }

  // Exponential decay — rapid at first, then smooth
  const damping = Math.exp(-p.decay * t)

  // Attack phase: ramp up in first 50ms
  const attack = Math.min(1, t / 0.05)

  // Combined envelope: attack → exponential decay
  const envelope = attack * damping * p.intensity

  // Position shake — each axis gets its own frequency
  const phaseOffset = p.intensity * 0.3 // deterministic offset based on intensity
  const sx = Math.sin(t * p.freqX + phaseOffset) * envelope
  const sy = Math.sin(t * p.freqY + 1.7) * envelope * 0.8
  const sz = Math.sin(t * p.freqZ + 3.1) * envelope * 0.4

  // Rotation shake — subtle wobble
  const rotEnvelope = envelope * p.rotAmplitude * 15
  const rx = Math.sin(t * p.rotFreq) * rotEnvelope
  const ry = Math.cos(t * p.rotFreq * 0.7) * rotEnvelope * 0.6
  const rz = Math.sin(t * p.rotFreq * 1.3 + 1.2) * rotEnvelope * 0.4

  return [sx, sy, sz, rx, ry, rz]
}

/**
 * Check if a shake is currently active.
 */
export function isShaking(): boolean {
  return state.active
}
