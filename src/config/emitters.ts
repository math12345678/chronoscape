// ── Particle Emitter Config (ported from Cubyz) ─────────
// Describes how particles spawn: shape, direction, properties.

export interface EmitterConfig {
  shape: SpawnShape
  mode: DirectionMode
  props: EmitterProperties
}

export type SpawnShape =
  | { type: 'point' }
  | { type: 'sphere'; radius: number }
  | { type: 'cube'; size: number }

export type DirectionMode =
  | { type: 'spread' }
  | { type: 'scatter' }
  | { type: 'direction'; dir: [number, number, number] }

export interface EmitterProperties {
  speed: [min: number, max: number]
  lifetime: [min: number, max: number]
  randomizeRotation: boolean
}

/** Default emitter config — matches current queueBurst behavior. */
export const DEFAULT_EMITTER: EmitterConfig = {
  shape: { type: 'sphere', radius: 0.5 },
  mode: { type: 'spread' },
  props: { speed: [2, 6], lifetime: [0.3, 0.9], randomizeRotation: false },
}

/** Explosion emitter — big sphere burst. */
export const EXPLOSION_EMITTER: EmitterConfig = {
  shape: { type: 'sphere', radius: 1.0 },
  mode: { type: 'spread' },
  props: { speed: [5, 15], lifetime: [0.4, 1.0], randomizeRotation: true },
}

/** Directional emitter — particles go in a specific direction. */
export function directionalEmitter(dir: [number, number, number], spread = 0.3): EmitterConfig {
  return {
    shape: { type: 'point' },
    mode: { type: 'direction', dir },
    props: { speed: [2, 5], lifetime: [0.3, 0.8], randomizeRotation: false },
  }
}

/** Scatter emitter — particles fly in random directions. */
export const SCATTER_EMITTER: EmitterConfig = {
  shape: { type: 'sphere', radius: 0.3 },
  mode: { type: 'scatter' },
  props: { speed: [1, 4], lifetime: [0.5, 1.2], randomizeRotation: false },
}

/** Point spread emitter — all particles originate from exact center. */
export const POINT_SPREAD_EMITTER: EmitterConfig = {
  shape: { type: 'point' },
  mode: { type: 'spread' },
  props: { speed: [2, 5], lifetime: [0.2, 0.6], randomizeRotation: false },
}
