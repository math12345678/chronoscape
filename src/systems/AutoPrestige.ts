// ── Auto-Prestige System — configurable automatic prestige ──
// Automatically prestiges when conditions are met. Also tracks auto-ascension.

import { getPrestigeRank, PRESETIGE_REQUIREMENTS } from '../components/PrestigeSystem'
import { canAscend } from './ChronoAscension'
import { useStore } from '../store'

export interface AutoPrestigeConfig {
  enabled: boolean
  mode: 'rankTarget' | 'resourceTarget' | 'timeInterval'
  targetRank: number // prestige rank to stop at (0 = max possible)
  minRank: number // minimum rank before auto-prestige activates
  resourceThreshold: number // raw resource threshold for resourceTarget mode
  intervalMinutes: number // minutes between auto-prestiges
  autoAscend: boolean // also auto-ascend when at max prestige
  preserveResources: boolean // keep some resources after auto-prestige?
  preserveRaw: number
  preserveLiquid: number
}

let _config: AutoPrestigeConfig = {
  enabled: false,
  mode: 'rankTarget',
  targetRank: 0,
  minRank: 5,
  resourceThreshold: 100000,
  intervalMinutes: 60,
  autoAscend: false,
  preserveResources: false,
  preserveRaw: 1000,
  preserveLiquid: 100,
}

let _lastAutoPrestigeTime = 0
let _autoPrestigeCount = 0
let _autoAscensionCount = 0

export function getAutoPrestigeConfig(): AutoPrestigeConfig {
  return { ..._config }
}

export function updateAutoPrestigeConfig(updates: Partial<AutoPrestigeConfig>): void {
  _config = { ..._config, ...updates }
}

export function getAutoPrestigeCount(): number { return _autoPrestigeCount }

export function getAutoAscensionCount(): number { return _autoAscensionCount }

/** Perform the prestige operation (simplified — calls the actual prestige) */
export function executeAutoPrestige(): boolean {
  // Check if we can prestige
  const rank = getPrestigeRank()
  if (rank <= 0) return false

  // Check minimum rank
  if (rank < _config.minRank) return false

  // Check target
  if (_config.mode === 'rankTarget' && _config.targetRank > 0 && rank >= _config.targetRank) return false

  // Check if resources are sufficient for next rank
  const nextIdx = rank // 0-indexed, so rank=5 means we've cleared 5, next is index 5
  if (nextIdx >= PRESETIGE_REQUIREMENTS.length) return false

  const req = PRESETIGE_REQUIREMENTS[nextIdx]
  const inv = useStore.getState().inventory
  const canPrestige = inv.raw >= req.raw && inv.liquid >= req.liquid &&
    inv.vapour >= req.vapour && inv.crystal >= req.crystal && inv.renown >= req.renown

  if (!canPrestige) return false

  // Perform prestige by triggering the event
  // The actual prestige logic is in PrestigeSystem, but it's auto-calculated
  // We just dispatch a custom event that the game handles
  window.dispatchEvent(new CustomEvent('auto-prestige', { detail: { rank: nextIdx + 1 } }))
  _lastAutoPrestigeTime = Date.now()
  _autoPrestigeCount++
  return true
}

/** Check and execute auto-ascension */
export function executeAutoAscension(): boolean {
  if (!_config.autoAscend) return false
  if (!canAscend()) return false

  window.dispatchEvent(new CustomEvent('auto-ascend'))
  _autoAscensionCount++
  return true
}

/** Tick — called from TimeManager to check auto-prestige conditions */
export function tickAutoPrestige(dt: number): void {
  if (!_config.enabled) return

  // Check interval
  const elapsed = (Date.now() - _lastAutoPrestigeTime) / 1000 / 60
  if (elapsed < _config.intervalMinutes) return

  // Check mode
  if (_config.mode === 'timeInterval') {
    executeAutoPrestige()
    return
  }

  if (_config.mode === 'rankTarget') {
    executeAutoPrestige()
    return
  }

  if (_config.mode === 'resourceTarget') {
    const inv = useStore.getState().inventory
    if (inv.raw >= _config.resourceThreshold) {
      executeAutoPrestige()
    }
  }

  // Auto-ascend check
  if (Math.random() < dt * 0.01) { // check occasionally
    executeAutoAscension()
  }
}

export function serializeAutoPrestige(): {
  config: AutoPrestigeConfig
  lastTime: number
  autoCount: number
  ascCount: number
} {
  return {
    config: { ..._config },
    lastTime: _lastAutoPrestigeTime,
    autoCount: _autoPrestigeCount,
    ascCount: _autoAscensionCount,
  }
}

export function loadAutoPrestige(data: {
  config: AutoPrestigeConfig
  lastTime: number
  autoCount: number
  ascCount: number
}): void {
  if (data.config) _config = { ...data.config }
  _lastAutoPrestigeTime = data.lastTime ?? 0
  _autoPrestigeCount = data.autoCount ?? 0
  _autoAscensionCount = data.ascCount ?? 0
}
