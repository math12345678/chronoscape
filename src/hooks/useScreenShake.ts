import { create } from 'zustand'

interface ShakeState {
  intensity: number
  decay: number
  triggerShake: (intensity?: number, decay?: number) => void
}

export const useShakeStore = create<ShakeState>((set) => ({
  intensity: 0,
  decay: 4,
  triggerShake: (intensity = 0.3, decay = 4) => {
    set({ intensity, decay })
  },
}))

/**
 * Applies a sinusoidal camera offset based on shake intensity.
 * Call this from useFrame with the current delta time.
 */
export function applyShake(
  intensity: number,
  decay: number,
  delta: number,
  time: number,
): [number, number] {
  if (intensity <= 0.001) return [0, 0]

  const sx =
    Math.sin(time * 60 + Math.random() * 10) * intensity +
    Math.sin(time * 37 + Math.random() * 10) * intensity * 0.5
  const sy =
    Math.cos(time * 53 + Math.random() * 10) * intensity +
    Math.cos(time * 42 + Math.random() * 10) * intensity * 0.5

  const newIntensity = Math.max(0, intensity - decay * delta)

  if (newIntensity !== intensity) {
    useShakeStore.setState({ intensity: newIntensity })
  }

  return [sx, sy]
}
