// ── Procedural Music System ──
// Generative ambient/combat/boss music using Web Audio API.
// All sounds are synthesized in real-time — zero audio files.

let ctx: AudioContext | null = null

// ── State ──
let _masterGain: GainNode | null = null
let _ambientGain: GainNode | null = null
let _combatGain: GainNode | null = null
let _bassGain: GainNode | null = null

let _activeOscillators: OscillatorNode[] = []
let _activeLfos: OscillatorNode[] = []

let _isPlaying = false
let _combatIntensity = 0        // 0-1, lerped
let _targetCombatIntensity = 0
let _bossActive = false

const CHORD = [261.63, 329.63, 392.00, 523.25]  // Cmaj7
const MINOR_CHORD = [220.00, 277.18, 329.63, 440.00] // Am
const BASS_NOTE = 65.41 // C2

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function ensureResumed() {
  const c = getCtx()
  if (c.state === 'suspended') c.resume()
}

/** Initialize the music system — call once on first user interaction. */
export function initMusic(): void {
  if (_isPlaying) return
  const ac = getCtx()
  ensureResumed()

  _masterGain = ac.createGain()
  _masterGain.gain.value = 0.15
  _masterGain.connect(ac.destination)

  _ambientGain = ac.createGain()
  _ambientGain.gain.value = 1
  _ambientGain.connect(_masterGain)

  _combatGain = ac.createGain()
  _combatGain.gain.value = 0
  _combatGain.connect(_masterGain)

  _bassGain = ac.createGain()
  _bassGain.gain.value = 0.3
  _bassGain.connect(_masterGain)

  startAmbientPad()
  startBassDrone()

  _isPlaying = true
}

function startAmbientPad(): void {
  const ac = getCtx()
  const chord = Math.random() > 0.5 ? CHORD : MINOR_CHORD

  for (const freq of chord) {
    const osc = ac.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freq * 0.5 // sub-octave for pad texture

    const gain = ac.createGain()
    gain.gain.value = 0.08 + Math.random() * 0.04

    // Slow LFO for movement
    const lfo = ac.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = 0.05 + Math.random() * 0.1
    const lfoGain = ac.createGain()
    lfoGain.gain.value = 0.02
    lfo.connect(lfoGain)
    lfoGain.connect(gain.gain)
    lfo.start()

    osc.connect(gain)
    gain.connect(_ambientGain!)
    osc.start()

    _activeOscillators.push(osc)
    _activeLfos.push(lfo)
  }

  // Noise bed for texture
  const bufferSize = ac.sampleRate * 2
  const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.5
  }
  const noise = ac.createBufferSource()
  noise.buffer = buffer
  noise.loop = true

  const noiseFilter = ac.createBiquadFilter()
  noiseFilter.type = 'lowpass'
  noiseFilter.frequency.value = 200
  noiseFilter.Q.value = 1

  const noiseGain = ac.createGain()
  noiseGain.gain.value = 0.03

  const noiseLfo = ac.createOscillator()
  noiseLfo.type = 'sine'
  noiseLfo.frequency.value = 0.03
  const noiseLfoGain = ac.createGain()
  noiseLfoGain.gain.value = 0.02
  noiseLfo.connect(noiseLfoGain)
  noiseLfoGain.connect(noiseGain.gain)
  noiseLfo.start()

  noise.connect(noiseFilter)
  noiseFilter.connect(noiseGain)
  noiseGain.connect(_ambientGain!)
  noise.start()

  _activeOscillators.push(noise as any)
  _activeLfos.push(noiseLfo)
}

function startBassDrone(): void {
  const ac = getCtx()

  const osc = ac.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.value = BASS_NOTE

  const filter = ac.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 120
  filter.Q.value = 2

  // Slow pulse
  const lfo = ac.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.value = 0.08
  const lfoGain = ac.createGain()
  lfoGain.gain.value = 0.15
  lfo.connect(lfoGain)
  lfoGain.connect(_bassGain!.gain)

  osc.connect(filter)
  filter.connect(_bassGain!)
  osc.start()
  lfo.start()

  _activeOscillators.push(osc)
  _activeLfos.push(lfo)
}

/** Set combat intensity (0-1). Called from enemy manager. */
export function setCombatIntensity(v: number): void {
  _targetCombatIntensity = Math.max(0, Math.min(1, v))
}

/** Set boss active state. */
export function setBossActive(active: boolean): void {
  _bossActive = active
  if (active) _targetCombatIntensity = Math.max(_targetCombatIntensity, 0.8)
}

/** Update music system. Call each frame. */
export function tickMusic(dt: number): void {
  if (!_isPlaying || !_combatGain || !_masterGain) return

  // Lerp combat intensity
  _combatIntensity += (_targetCombatIntensity - _combatIntensity) * dt * 2

  // Combat gain follows intensity
  _combatGain.gain.value = _combatIntensity * 0.5

  // Boss active → subtle master gain boost
  if (_bossActive) {
    _masterGain.gain.value += (0.25 - _masterGain.gain.value) * dt
  } else {
    _masterGain.gain.value += (0.15 - _masterGain.gain.value) * dt
  }

  // Trigger combat percussion layers based on intensity
  if (_combatIntensity > 0.1 && Math.random() < dt * _combatIntensity * 2) {
    spawnCombatHit()
  }
}

function spawnCombatHit(): void {
  const ac = getCtx()

  // Percussive hit
  const osc = ac.createOscillator()
  osc.type = 'triangle'
  osc.frequency.value = 80 + Math.random() * 120

  const gain = ac.createGain()
  gain.gain.setValueAtTime(0.15 * _combatIntensity, ac.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.08)

  osc.connect(gain)
  gain.connect(_combatGain!)
  osc.start()
  osc.stop(ac.currentTime + 0.1)

  // High percussive ping at higher intensity
  if (_combatIntensity > 0.4) {
    const ping = ac.createOscillator()
    ping.type = 'sine'
    ping.frequency.value = 800 + Math.random() * 400

    const pingGain = ac.createGain()
    pingGain.gain.setValueAtTime(0.06 * _combatIntensity, ac.currentTime)
    pingGain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.05)

    ping.connect(pingGain)
    pingGain.connect(_combatGain!)
    ping.start()
    ping.stop(ac.currentTime + 0.06)
  }

  // Noise burst at high intensity
  if (_combatIntensity > 0.7) {
    const bufferSize = ac.sampleRate * 0.05
    const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3
    }
    const noise = ac.createBufferSource()
    noise.buffer = buffer

    const noiseGain = ac.createGain()
    noiseGain.gain.setValueAtTime(0.1, ac.currentTime)
    noiseGain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.04)

    noise.connect(noiseGain)
    noiseGain.connect(_combatGain!)
    noise.start()
  }
}

/** Stop all music and clean up. */
export function stopMusic(): void {
  for (const osc of _activeOscillators) {
    try { osc.stop() } catch {}
  }
  for (const lfo of _activeLfos) {
    try { lfo.stop() } catch {}
  }
  _activeOscillators = []
  _activeLfos = []
  _isPlaying = false
  _combatIntensity = 0
  _targetCombatIntensity = 0
}

export function isMusicPlaying(): boolean { return _isPlaying }
