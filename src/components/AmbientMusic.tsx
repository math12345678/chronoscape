import { useEffect } from 'react'
import { useStore } from '../store'

/**
 * Procedural generative ambient music engine.
 *
 * Creates a living, breathing soundscape that reacts to:
 * - Time of day (via DayNightCycle's sun angle)
 * - Resource abundance (more drones when rich)
 * - Anomaly events (dissonant tones during squalls, bright harmonics during surges)
 *
 * Uses Web Audio API with multiple oscillator layers, LFO modulation,
 * and filtered noise to create an evolving ambient bed.
 * Starts muted and fades in gradually.
 */

let audioCtx: AudioContext | null = null
let masterGain: GainNode | null = null
let activeOscillators: OscillatorNode[] = []
let activeGains: GainNode[] = []
let activeLFOs: OscillatorNode[] = []
let activeNoise: AudioBufferSourceNode | null = null
let isPlaying = false
const BASE_VOLUME = 0.3
let userVolume = (() => {
  try {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('chronoscape:musicVolume') : null
    const parsed = stored !== null ? Number(stored) : 0.7
    return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : 0.7
  } catch {
    return 0.7
  }
})()

/** Reads the user's current ambient music volume (0–1). */
export function getAmbientVolume(): number {
  return userVolume
}

/** Sets the user's ambient music volume (0–1), fading smoothly, and persists it. */
export function setAmbientVolume(v: number) {
  userVolume = Math.min(1, Math.max(0, v))
  if (typeof localStorage !== 'undefined') {
    try { localStorage.setItem('chronoscape:musicVolume', String(userVolume)) } catch {}
  }
  if (masterGain && audioCtx && isPlaying) {
    masterGain.gain.linearRampToValueAtTime(BASE_VOLUME * userVolume, audioCtx.currentTime + 0.15)
  }
}

function getContext() {
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext()
      masterGain = audioCtx.createGain()
      masterGain.gain.setValueAtTime(0, audioCtx.currentTime)
      masterGain.connect(audioCtx.destination)
    } catch {
      return null
    }
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

function stopAll() {
  for (const osc of activeOscillators) {
    try { osc.stop() } catch {}
  }
  for (const lfo of activeLFOs) {
    try { lfo.stop() } catch {}
  }
  if (activeNoise) {
    try { activeNoise.stop() } catch {}
  }
  activeOscillators = []
  activeGains = []
  activeLFOs = []
  activeNoise = null
  isPlaying = false
}

function createDrone(freq: number, detune: number = 0, type: OscillatorType = 'sine', volume: number = 0.02) {
  const ctx = getContext()
  if (!ctx || !masterGain) return null

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  const lfo = ctx.createOscillator()
  const lfoGain = ctx.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(freq, ctx.currentTime)
  osc.detune.setValueAtTime(detune, ctx.currentTime)

  gain.gain.setValueAtTime(0, ctx.currentTime)
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 2)

  // Slow amplitude modulation
  lfo.type = 'sine'
  lfo.frequency.setValueAtTime(0.1 + Math.random() * 0.3, ctx.currentTime)
  lfoGain.gain.setValueAtTime(volume * 0.5, ctx.currentTime)

  lfo.connect(lfoGain)
  lfoGain.connect(gain.gain)
  osc.connect(gain)
  gain.connect(masterGain)

  osc.start()
  lfo.start()

  activeOscillators.push(osc)
  activeGains.push(gain)
  activeLFOs.push(lfo)

  return { osc, gain, lfo, lfoGain }
}

function createPad(freq: number, volume: number = 0.015) {
  createDrone(freq, 0, 'sine', volume)
  createDrone(freq * 1.01, 0, 'sine', volume * 0.7) // slight detune for warmth
  createDrone(freq * 0.5, 0, 'triangle', volume * 0.5) // sub
}

function createNoiseBed(volume: number = 0.008) {
  const ctx = getContext()
  if (!ctx || !masterGain) return

  const bufferSize = ctx.sampleRate * 4
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.3
  }

  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.loop = true

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(200, ctx.currentTime)
  // Slow filter sweep
  const filterLfo = ctx.createOscillator()
  const filterLfoGain = ctx.createGain()
  filterLfo.type = 'sine'
  filterLfo.frequency.setValueAtTime(0.05, ctx.currentTime)
  filterLfoGain.gain.setValueAtTime(100, ctx.currentTime)
  filterLfo.connect(filterLfoGain)
  filterLfoGain.connect(filter.frequency)
  filterLfo.start()

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0, ctx.currentTime)
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 3)

  source.connect(filter)
  filter.connect(gain)
  gain.connect(masterGain)
  source.start()

  activeNoise = source
  activeLFOs.push(filterLfo)
}

function createBells(freq: number, volume: number = 0.01) {
  const ctx = getContext()
  if (!ctx || !masterGain) return

  for (let i = 0; i < 3; i++) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(freq * (1 + i * 1.5), ctx.currentTime)

    const delay = i * 0.3
    gain.gain.setValueAtTime(0, ctx.currentTime + delay)
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 1.5)

    osc.connect(gain)
    gain.connect(masterGain)
    osc.start(ctx.currentTime + delay)
    osc.stop(ctx.currentTime + delay + 1.5)

    activeOscillators.push(osc)
    activeGains.push(gain)
  }
}

// Schedule random bell chimes
let bellInterval: ReturnType<typeof setInterval> | null = null
function scheduleBells() {
  if (bellInterval) clearInterval(bellInterval)
  const scheduleNext = () => {
    const delay = 4000 + Math.random() * 8000
    bellInterval = setTimeout(() => {
      if (isPlaying && audioCtx && masterGain) {
        createBells(220 + Math.random() * 440, 0.008 + Math.random() * 0.006)
      }
      scheduleNext()
    }, delay)
  }
  scheduleNext()
}

/**
 * AmbientMusic — call once at app root (outside Canvas).
 * Manages its own AudioContext and lifecycle.
 */
export function AmbientMusic() {
  useEffect(() => {
    // Module-level cleanup references (captured in outer scope)
    let shiftInterval: ReturnType<typeof setInterval> | null = null
    let unsub: (() => void) | null = null

    const startMusic = () => {
      if (!getContext()) return
      if (isPlaying) return
      isPlaying = true

      // Fade in master volume
      if (masterGain) {
        masterGain.gain.linearRampToValueAtTime(BASE_VOLUME * userVolume, (audioCtx?.currentTime ?? 0) + 5)
      }

      // Build ambient layers
      createPad(55, 0.025)   // B0 sub drone
      createPad(110, 0.02)   // B1 warm pad
      createDrone(165, 0, 'sine', 0.015) // E2 shimmer
      createNoiseBed(0.012)
      scheduleBells()

      // Periodic re-harmonization to keep it evolving
      shiftInterval = setInterval(() => {
        if (!isPlaying) { if (shiftInterval) clearInterval(shiftInterval); return }
        const freqs = [55, 65, 73, 82, 98, 110, 130, 146]
        const f = freqs[Math.floor(Math.random() * freqs.length)]
        createPad(f, 0.015)
        if (activeGains.length > 10) {
          const oldGain = activeGains.shift()
          if (oldGain) {
            oldGain.gain.linearRampToValueAtTime(0, (audioCtx?.currentTime ?? 0) + 3)
          }
        }
      }, 12000)

      // React to anomalies
      unsub = useStore.subscribe((state, prev) => {
        if (state.anomalyActive !== prev.anomalyActive) {
          if (state.anomalyActive === 'squall') {
            createDrone(30, 20, 'sawtooth', 0.03)
            createDrone(45, -15, 'square', 0.02)
          } else if (state.anomalyActive === 'surge') {
            createBells(440, 0.02)
            createBells(660, 0.015)
            setTimeout(() => createBells(880, 0.01), 500)
          } else {
            stopAll()
            setTimeout(() => {
              if (isPlaying) {
                createPad(55, 0.025)
                createPad(110, 0.02)
                createNoiseBed(0.012)
              }
            }, 1000)
          }
        }

        const totalPrev = prev.inventory.raw + prev.inventory.vapour + prev.inventory.liquid + prev.inventory.crystal
        const totalNow = state.inventory.raw + state.inventory.vapour + state.inventory.liquid + state.inventory.crystal
        if (totalNow > totalPrev && totalNow % 50 < 10) {
          createBells(330 + Math.random() * 440, 0.01)
        }
      })
    }

    // Start on first user interaction
    const handler = () => {
      document.removeEventListener('click', handler)
      document.removeEventListener('keydown', handler)
      startMusic()
    }
    document.addEventListener('click', handler)
    document.addEventListener('keydown', handler)

    return () => {
      document.removeEventListener('click', handler)
      document.removeEventListener('keydown', handler)
      if (shiftInterval) clearInterval(shiftInterval)
      if (unsub) unsub()
      if (bellInterval) clearInterval(bellInterval)
      stopAll()
      if (masterGain && audioCtx) {
        masterGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 2)
      }
    }
  }, [])

  return null
}
