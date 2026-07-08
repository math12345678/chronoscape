// ── Challenge Arena — wave-based survival mode ───────────────

import { useStore } from '../store'

export interface ArenaWave {
  wave: number
  enemies: Array<{ type: string; count: number }>
  spawnDelay: number // seconds between spawns
  reward: { raw: number; renown: number }
  timeLimit: number // seconds to clear wave
}

export interface ArenaState {
  active: boolean
  currentWave: number
  maxWave: number
  enemiesRemaining: number
  enemiesKilled: number
  waveActive: boolean
  waveStartTime: number
  bestWave: number
  totalRuns: number
  totalKills: number
  rewardsCollected: number
  entryCost: number
}

let _arenaState: ArenaState = {
  active: false,
  currentWave: 0,
  maxWave: 30,
  enemiesRemaining: 0,
  enemiesKilled: 0,
  waveActive: false,
  waveStartTime: 0,
  bestWave: loadBestWave(),
  totalRuns: loadTotalRuns(),
  totalKills: loadTotalKills(),
  rewardsCollected: 0,
  entryCost: 50,
}

function loadBestWave(): number {
  try { return Number(localStorage.getItem('chronoscape_arena_best_wave') ?? '0') } catch { return 0 }
}

function loadTotalRuns(): number {
  try { return Number(localStorage.getItem('chronoscape_arena_runs') ?? '0') } catch { return 0 }
}

function loadTotalKills(): number {
  try { return Number(localStorage.getItem('chronoscape_arena_kills') ?? '0') } catch { return 0 }
}

function persistArena(): void {
  try {
    localStorage.setItem('chronoscape_arena_best_wave', String(_arenaState.bestWave))
    localStorage.setItem('chronoscape_arena_runs', String(_arenaState.totalRuns))
    localStorage.setItem('chronoscape_arena_kills', String(_arenaState.totalKills))
  } catch { /* ignore */ }
}

export function getArenaState(): ArenaState {
  return { ..._arenaState }
}

export function isArenaActive(): boolean {
  return _arenaState.active
}

function generateWave(wave: number): ArenaWave {
  const baseEnemies = 2 + wave
  const maxEnemies = Math.min(baseEnemies, 30)

  // Determine enemy types based on wave
  const types: Array<{ type: string; count: number }> = []
  if (wave <= 3) {
    types.push({ type: 'wraith', count: maxEnemies })
  } else if (wave <= 6) {
    const wraiths = Math.ceil(maxEnemies * 0.6)
    const voids = maxEnemies - wraiths
    types.push({ type: 'wraith', count: wraiths })
    types.push({ type: 'voidWraith', count: voids })
  } else if (wave <= 12) {
    const wraiths = Math.ceil(maxEnemies * 0.3)
    const voids = Math.ceil(maxEnemies * 0.4)
    const golems = maxEnemies - wraiths - voids
    types.push({ type: 'wraith', count: wraiths })
    types.push({ type: 'voidWraith', count: voids })
    types.push({ type: 'timeCrystalGolem', count: golems })
  } else if (wave <= 20) {
    const voids = Math.ceil(maxEnemies * 0.3)
    const golems = Math.ceil(maxEnemies * 0.3)
    const shifters = Math.ceil(maxEnemies * 0.2)
    const sentinels = maxEnemies - voids - golems - shifters
    types.push({ type: 'voidWraith', count: voids })
    types.push({ type: 'timeCrystalGolem', count: golems })
    types.push({ type: 'phaseShifter', count: shifters })
    types.push({ type: 'temporalSentinel', count: sentinels })
  } else {
    const golems = Math.ceil(maxEnemies * 0.2)
    const shifters = Math.ceil(maxEnemies * 0.2)
    const sentinels = Math.ceil(maxEnemies * 0.3)
    const behemoths = maxEnemies - golems - shifters - sentinels
    types.push({ type: 'timeCrystalGolem', count: golems })
    types.push({ type: 'phaseShifter', count: shifters })
    types.push({ type: 'temporalSentinel', count: sentinels })
    types.push({ type: 'chronoBehemoth', count: behemoths })
  }

  const rawReward = 10 * wave
  const renownReward = Math.ceil(wave / 2)

  return {
    wave,
    enemies: types.filter((t) => t.count > 0),
    spawnDelay: Math.max(0.5, 2 - wave * 0.05),
    reward: { raw: rawReward, renown: renownReward },
    timeLimit: 30 + wave * 2,
  }
}

/** Start the arena */
export function startArena(): boolean {
  if (_arenaState.active) return false

  const state = useStore.getState()
  if (state.inventory.raw < _arenaState.entryCost) return false

  useStore.setState((s) => ({
    inventory: { ...s.inventory, raw: s.inventory.raw - _arenaState.entryCost },
  }))

  _arenaState.active = true
  _arenaState.currentWave = 0
  _arenaState.enemiesKilled = 0
  _arenaState.waveActive = false
  _arenaState.totalRuns++
  persistArena()

  return true
}

/** Start the next wave */
export function startNextWave(): ArenaWave | null {
  if (!_arenaState.active) return null

  _arenaState.currentWave++
  const wave = generateWave(_arenaState.currentWave)
  _arenaState.enemiesRemaining = wave.enemies.reduce((s, e) => s + e.count, 0)
  _arenaState.waveActive = true
  _arenaState.waveStartTime = Date.now()

  return wave
}

/** Record an enemy kill in arena */
export function recordArenaKill(): void {
  if (!_arenaState.active || !_arenaState.waveActive) return
  _arenaState.enemiesRemaining = Math.max(0, _arenaState.enemiesRemaining - 1)
  _arenaState.enemiesKilled++
  _arenaState.totalKills++

  // Check wave completion
  if (_arenaState.enemiesRemaining <= 0) {
    completeWave()
  }
}

function completeWave(): void {
  if (!_arenaState.active) return
  _arenaState.waveActive = false

  // Award rewards
  const wave = generateWave(_arenaState.currentWave)
  const state = useStore.getState()
  state.addRaw(wave.reward.raw)
  state.addRenown(wave.reward.renown)
  _arenaState.rewardsCollected += wave.reward.raw

  // Check if best wave
  if (_arenaState.currentWave > _arenaState.bestWave) {
    _arenaState.bestWave = _arenaState.currentWave
    persistArena()
  }

  // Check if max waves reached
  if (_arenaState.currentWave >= _arenaState.maxWave) {
    endArena()
  }
}

/** End the arena */
export function endArena(): void {
  if (_arenaState.currentWave > _arenaState.bestWave) {
    _arenaState.bestWave = _arenaState.currentWave
  }
  _arenaState.active = false
  _arenaState.waveActive = false
  persistArena()
}

/** Check if current wave timed out */
export function checkWaveTimeout(): boolean {
  if (!_arenaState.waveActive) return false
  const elapsed = (Date.now() - _arenaState.waveStartTime) / 1000
  const wave = generateWave(_arenaState.currentWave)
  return elapsed > wave.timeLimit
}

/** Get current wave info */
export function getCurrentWaveInfo(): { wave: number; enemiesRemaining: number; maxEnemies: number; timeLimit: number } | null {
  if (!_arenaState.active) return null
  const wave = generateWave(_arenaState.currentWave)
  return {
    wave: _arenaState.currentWave,
    enemiesRemaining: _arenaState.enemiesRemaining,
    maxEnemies: wave.enemies.reduce((s, e) => s + e.count, 0),
    timeLimit: wave.timeLimit,
  }
}
