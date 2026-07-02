/**
 * Procedural sound engine using the Web Audio API.
 * All sounds are generated mathematically — zero audio files needed.
 * 
 * Usage:
 *   const sounds = useSoundEngine()
 *   sounds.harvest()  // play harvest chime
 *   sounds.explosion() // play explosion boom
 * 
 * The AudioContext is created lazily and resumed on first user interaction.
 * Returns stable function references via useMemo so components can safely
 * include `sounds` in dependency arrays.
 */

import { useMemo } from 'react'

let audioCtx: AudioContext | null = null

function getContext(): AudioContext | null {
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext()
    } catch {
      return null
    }
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

function playTone(
  freq: number,
  endFreq: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.15,
  delay: number = 0,
) {
  const ctx = getContext()
  if (!ctx) return

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(freq, ctx.currentTime + delay)
  osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + delay + duration)

  gain.gain.setValueAtTime(0, ctx.currentTime + delay)
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration)

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.start(ctx.currentTime + delay)
  osc.stop(ctx.currentTime + delay + duration + 0.05)
}

function playNoise(duration: number, lowpassFreq: number, volume: number = 0.2) {
  const ctx = getContext()
  if (!ctx) return

  const bufferSize = ctx.sampleRate * duration
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
  }

  const source = ctx.createBufferSource()
  source.buffer = buffer

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(lowpassFreq, ctx.currentTime)
  filter.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + duration)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(volume, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

  source.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)

  source.start()
}

function playClick(volume: number = 0.05) {
  playTone(800, 1200, 0.03, 'sine', volume)
}

function playDing(freq: number = 880, volume: number = 0.1) {
  playTone(freq, freq * 1.5, 0.15, 'sine', volume)
  playTone(freq * 1.25, freq * 1.8, 0.1, 'sine', volume * 0.5, 0.05)
}

export interface SoundEngine {
  harvest: () => void
  explosion: () => void
  heal: () => void
  uiClick: () => void
  refine: (type?: 'vapour' | 'liquid' | 'crystal') => void
  anomaly: () => void
  bondMature: () => void
  purchase: () => void
  placeBlock: () => void
  removeBlock: () => void
  blockDecay: () => void
  formulaDiscovered: () => void
  calibrateHit: () => void
  calibrateMiss: () => void
  footstep: () => void
  ambientWind: () => void
  waterSplash: () => void
  npcChatter: () => void
  buttonClick: () => void
  menuOpen: () => void
  menuClose: () => void
}

/**
 * Hook that returns playable sound functions with stable references.
 * Safe to call from any component — AudioContext is shared globally.
 */
export function useSoundEngine(): SoundEngine {
  return useMemo(() => ({
    /** Bright ascending chime for rift harvesting */
    harvest: () => {
      playTone(600, 1400, 0.25, 'sine', 0.12)
      playTone(800, 1600, 0.15, 'sine', 0.06, 0.05)
    },

    /** Low boom + crackle for explosions */
    explosion: () => {
      playNoise(0.4, 400, 0.25)
      playTone(60, 20, 0.5, 'sine', 0.2)
    },

    /** Ascending arpeggio for healing (C5 → E5 → G5) */
    heal: () => {
      playTone(523, 523, 0.2, 'sine', 0.1)
      playTone(659, 659, 0.2, 'sine', 0.08, 0.1)
      playTone(784, 784, 0.3, 'sine', 0.06, 0.2)
    },

    /** Short tick for UI interactions */
    uiClick: () => {
      playClick()
    },

    /** Distinct ping per refine target: Vapour (airy/high), Liquid (watery/mid), Crystal (resonant/low-high combo) */
    refine: (type) => {
      if (type === 'liquid') {
        playTone(500, 900, 0.22, 'sine', 0.09)
        playTone(750, 1350, 0.16, 'sine', 0.05, 0.07)
      } else if (type === 'crystal') {
        playTone(660, 1320, 0.3, 'triangle', 0.1)
        playTone(990, 1980, 0.22, 'triangle', 0.06, 0.08)
        playTone(1320, 2640, 0.18, 'sine', 0.04, 0.16)
      } else {
        playTone(880, 1760, 0.2, 'triangle', 0.08)
        playTone(1320, 2640, 0.15, 'triangle', 0.04, 0.06)
      }
    },

    /** Low alarm for time anomalies */
    anomaly: () => {
      playTone(220, 110, 0.3, 'square', 0.08)
      setTimeout(() => playTone(220, 110, 0.3, 'square', 0.06), 200)
      setTimeout(() => playTone(330, 165, 0.3, 'square', 0.06), 400)
    },

    /** Pleasant chime for bond maturation */
    bondMature: () => {
      playDing(660, 0.12)
      setTimeout(() => playDing(880, 0.08), 150)
      setTimeout(() => playDing(1047, 0.06), 300)
    },

    /** Coin drop for shop purchases */
    purchase: () => {
      playTone(600, 1200, 0.15, 'sine', 0.1)
      playTone(800, 1600, 0.1, 'sine', 0.06, 0.08)
      playTone(1000, 2000, 0.08, 'sine', 0.04, 0.16)
    },

    /** Satisfying thud for block placement (low thump + click) */
    placeBlock: () => {
      playTone(120, 80, 0.15, 'sine', 0.15)
      playTone(400, 600, 0.04, 'triangle', 0.05)
    },

    /** Sharp reverse-thud + crack for manual block removal */
    removeBlock: () => {
      playTone(300, 500, 0.05, 'triangle', 0.06)
      playNoise(0.08, 500, 0.08)
    },

    /** Soft puff sound for block decay */
    blockDecay: () => {
      playNoise(0.2, 600, 0.06)
      playTone(300, 100, 0.1, 'sine', 0.04)
    },

    /** Triumphant ascending fanfare for discovering a formula — the biggest reward moment */
    formulaDiscovered: () => {
      playTone(523, 523, 0.18, 'sine', 0.12)
      setTimeout(() => playTone(659, 659, 0.18, 'sine', 0.12), 110)
      setTimeout(() => playTone(784, 784, 0.18, 'sine', 0.12), 220)
      setTimeout(() => playTone(1047, 1047, 0.4, 'sine', 0.14), 330)
      setTimeout(() => playTone(1319, 2000, 0.5, 'triangle', 0.08), 340)
    },

    /** Calibration success ping */
    calibrateHit: () => {
      playTone(880, 1760, 0.12, 'triangle', 0.1)
      playTone(1320, 2640, 0.08, 'triangle', 0.05, 0.06)
    },

    /** Calibration miss noise */
    calibrateMiss: () => {
      playNoise(0.1, 300, 0.04)
    },

    /** Soft footstep on grass */
    footstep: () => {
      playNoise(0.06, 200, 0.015)
      playTone(80, 60, 0.04, 'sine', 0.02)
    },

    /** Distant wind howl */
    ambientWind: () => {
      playNoise(1.5, 400, 0.02)
    },

    /** Gentle water ripple */
    waterSplash: () => {
      playTone(300, 600, 0.15, 'triangle', 0.04)
      playNoise(0.2, 800, 0.02)
    },

    /** Muffled NPC chatter murmur */
    npcChatter: () => {
      playNoise(0.3, 300, 0.01)
      playTone(200, 300, 0.15, 'square', 0.01)
    },

    /** UI button click */
    buttonClick: () => {
      playTone(600, 900, 0.04, 'square', 0.03)
    },

    /** Panel open swoosh */
    menuOpen: () => {
      playTone(400, 800, 0.15, 'sine', 0.04)
      playTone(500, 1000, 0.1, 'triangle', 0.02, 0.05)
    },

    /** Panel close */
    menuClose: () => {
      playTone(600, 300, 0.1, 'sine', 0.03)
    },
  }), [])
}
