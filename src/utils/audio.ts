let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  return ctx
}

function ensureResumed() {
  const c = getCtx()
  if (c.state === 'suspended') c.resume()
}

export function playHarvestSound() {
  ensureResumed()
  const c = getCtx()
  const now = c.currentTime
  const gain = c.createGain()
  gain.connect(c.destination)
  gain.gain.setValueAtTime(0.08, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)

  const notes = [880, 1100, 1320, 1760]
  notes.forEach((freq, i) => {
    const osc = c.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, now + i * 0.06)
    const g = c.createGain()
    g.gain.setValueAtTime(0.06, now + i * 0.06)
    g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.2)
    osc.connect(g).connect(c.destination)
    osc.start(now + i * 0.06)
    osc.stop(now + i * 0.06 + 0.2)
  })

  // Noise burst
  const bufSize = c.sampleRate * 0.08
  const buf = c.createBuffer(1, bufSize, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize)
  const src = c.createBufferSource()
  src.buffer = buf
  const ng = c.createGain()
  ng.gain.setValueAtTime(0.03, now)
  ng.gain.exponentialRampToValueAtTime(0.001, now + 0.08)
  src.connect(ng).connect(c.destination)
  src.start(now)
}

export function playRefineSound() {
  ensureResumed()
  const c = getCtx()
  const now = c.currentTime

  // Whoosh up
  const osc = c.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(200, now)
  osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15)
  const g = c.createGain()
  g.gain.setValueAtTime(0.04, now)
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
  osc.connect(g).connect(c.destination)
  osc.start(now)
  osc.stop(now + 0.25)

  // Chime
  const chime = c.createOscillator()
  chime.type = 'sine'
  chime.frequency.setValueAtTime(660, now + 0.12)
  const cg = c.createGain()
  cg.gain.setValueAtTime(0.05, now + 0.12)
  cg.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
  chime.connect(cg).connect(c.destination)
  chime.start(now + 0.12)
  chime.stop(now + 0.5)
}

export function playWraithSpawnSound() {
  ensureResumed()
  const c = getCtx()
  const now = c.currentTime

  const osc = c.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(100, now)
  osc.frequency.linearRampToValueAtTime(40, now + 0.5)
  const g = c.createGain()
  g.gain.setValueAtTime(0.05, now)
  g.gain.linearRampToValueAtTime(0.02, now + 0.3)
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.6)
  osc.connect(g).connect(c.destination)
  osc.start(now)
  osc.stop(now + 0.6)

  // Sub rumble
  const sub = c.createOscillator()
  sub.type = 'sine'
  sub.frequency.setValueAtTime(30, now)
  const sg = c.createGain()
  sg.gain.setValueAtTime(0.06, now)
  sg.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
  sub.connect(sg).connect(c.destination)
  sub.start(now)
  sub.stop(now + 0.5)
}

export function playWraithBanishSound() {
  ensureResumed()
  const c = getCtx()
  const now = c.currentTime

  // Explosive burst
  const osc = c.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(200, now)
  osc.frequency.exponentialRampToValueAtTime(2000, now + 0.15)
  const g = c.createGain()
  g.gain.setValueAtTime(0.08, now)
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
  osc.connect(g).connect(c.destination)
  osc.start(now)
  osc.stop(now + 0.3)

  // Noise explosion
  const bufSize = c.sampleRate * 0.2
  const buf = c.createBuffer(1, bufSize, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize) * (1 - i / bufSize)
  const src = c.createBufferSource()
  src.buffer = buf
  const ng = c.createGain()
  ng.gain.setValueAtTime(0.06, now)
  ng.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
  src.connect(ng).connect(c.destination)
  src.start(now)

  // Reverb hit
  const reverb = c.createConvolver()
  const irSize = c.sampleRate * 0.3
  const ir = c.createBuffer(2, irSize, c.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch)
    for (let i = 0; i < irSize; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (c.sampleRate * 0.06))
  }
  reverb.buffer = ir
  const hit = c.createOscillator()
  hit.type = 'square'
  hit.frequency.setValueAtTime(100, now)
  const hg = c.createGain()
  hg.gain.setValueAtTime(0.04, now)
  hg.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
  hit.connect(hg).connect(reverb).connect(c.destination)
  hit.start(now)
  hit.stop(now + 0.3)
}

export function playBuildSound() {
  ensureResumed()
  const c = getCtx()
  const now = c.currentTime

  const osc = c.createOscillator()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(300, now)
  osc.frequency.exponentialRampToValueAtTime(600, now + 0.08)
  const g = c.createGain()
  g.gain.setValueAtTime(0.04, now)
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
  osc.connect(g).connect(c.destination)
  osc.start(now)
  osc.stop(now + 0.15)
}

export function playClickSound() {
  ensureResumed()
  const c = getCtx()
  const now = c.currentTime
  const osc = c.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(800, now)
  const g = c.createGain()
  g.gain.setValueAtTime(0.02, now)
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.04)
  osc.connect(g).connect(c.destination)
  osc.start(now)
  osc.stop(now + 0.04)
}

export function playShootSound() {
  ensureResumed()
  const c = getCtx()
  const now = c.currentTime
  const osc = c.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(600, now)
  osc.frequency.exponentialRampToValueAtTime(100, now + 0.08)
  const g = c.createGain()
  g.gain.setValueAtTime(0.06, now)
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.12)
  osc.connect(g).connect(c.destination)
  osc.start(now)
  osc.stop(now + 0.12)
  // Noise burst for impact feel
  const bufSize = c.sampleRate * 0.06
  const buf = c.createBuffer(1, bufSize, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (c.sampleRate * 0.015))
  const noise = c.createBufferSource()
  noise.buffer = buf
  const ng = c.createGain()
  ng.gain.setValueAtTime(0.04, now)
  ng.gain.exponentialRampToValueAtTime(0.001, now + 0.06)
  noise.connect(ng).connect(c.destination)
  noise.start(now)
}

export function playHitSound() {
  ensureResumed()
  const c = getCtx()
  const now = c.currentTime
  const osc = c.createOscillator()
  osc.type = 'square'
  osc.frequency.setValueAtTime(200, now)
  osc.frequency.exponentialRampToValueAtTime(50, now + 0.06)
  const g = c.createGain()
  g.gain.setValueAtTime(0.03, now)
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.08)
  osc.connect(g).connect(c.destination)
  osc.start(now)
  osc.stop(now + 0.08)
}

export function playKillSound() {
  ensureResumed()
  const c = getCtx()
  const now = c.currentTime
  const osc = c.createOscillator()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(220, now)
  osc.frequency.exponentialRampToValueAtTime(880, now + 0.2)
  const g = c.createGain()
  g.gain.setValueAtTime(0.05, now)
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
  osc.connect(g).connect(c.destination)
  osc.start(now)
  osc.stop(now + 0.3)
}

export function playDamageSound() {
  ensureResumed()
  const c = getCtx()
  const now = c.currentTime
  const osc = c.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(150, now)
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.15)
  const g = c.createGain()
  g.gain.setValueAtTime(0.04, now)
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
  osc.connect(g).connect(c.destination)
  osc.start(now)
  osc.stop(now + 0.2)
}

export function playTimeZoneEnterSound() {
  ensureResumed()
  const c = getCtx()
  const now = c.currentTime
  // Rising arpeggio
  const notes = [440, 660, 880]
  notes.forEach((freq, i) => {
    const osc = c.createOscillator()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(freq, now + i * 0.08)
    const g = c.createGain()
    g.gain.setValueAtTime(0.04, now + i * 0.08)
    g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3)
    osc.connect(g).connect(c.destination)
    osc.start(now + i * 0.08)
    osc.stop(now + i * 0.08 + 0.3)
  })
}

export function playTimeZoneExitSound() {
  ensureResumed()
  const c = getCtx()
  const now = c.currentTime
  // Descending whoosh
  const osc = c.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(600, now)
  osc.frequency.exponentialRampToValueAtTime(200, now + 0.3)
  const g = c.createGain()
  g.gain.setValueAtTime(0.03, now)
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
  osc.connect(g).connect(c.destination)
  osc.start(now)
  osc.stop(now + 0.35)
}

export function playEmptyClickSound() {
  ensureResumed()
  const c = getCtx()
  const now = c.currentTime
  // Short dry click
  const osc = c.createOscillator()
  osc.type = 'square'
  osc.frequency.setValueAtTime(300, now)
  osc.frequency.setValueAtTime(200, now + 0.02)
  const g = c.createGain()
  g.gain.setValueAtTime(0.03, now)
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.06)
  osc.connect(g).connect(c.destination)
  osc.start(now)
  osc.stop(now + 0.06)
}

export function playHealSound() {
  ensureResumed()
  const c = getCtx()
  const now = c.currentTime
  // Rising chime
  const notes = [523, 659, 784]
  notes.forEach((freq, i) => {
    const osc = c.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, now + i * 0.1)
    const g = c.createGain()
    g.gain.setValueAtTime(0.04, now + i * 0.1)
    g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.3)
    osc.connect(g).connect(c.destination)
    osc.start(now + i * 0.1)
    osc.stop(now + i * 0.1 + 0.3)
  })
}

export function playGiftSound() {
  ensureResumed()
  const c = getCtx()
  const now = c.currentTime
  // Pleasant chime
  const osc = c.createOscillator()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(880, now)
  osc.frequency.setValueAtTime(1100, now + 0.1)
  const g = c.createGain()
  g.gain.setValueAtTime(0.05, now)
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.4)
  osc.connect(g).connect(c.destination)
  osc.start(now)
  osc.stop(now + 0.4)
}
