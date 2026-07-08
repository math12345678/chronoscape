// ── Automation Hub — configure auto-harvest, auto-refine, auto-build, auto-sell ──

import { useStore } from '../store'

export type AutomationMode = 'idle' | 'balanced' | 'aggressive' | 'stockpile'

export interface AutomationConfig {
  enabled: boolean
  mode: AutomationMode
  // Auto-Harvest
  autoHarvest: boolean
  harvestInterval: number // seconds between harvests
  harvestTarget: 'nearest' | 'richest' | 'random'
  // Auto-Refine
  autoRefine: boolean
  refineTarget: 'vapour' | 'liquid' | 'crystal'
  refineThreshold: number // keep this much raw before refining
  // Auto-Build
  autoBuild: boolean
  buildBlueprint: string | null
  buildInterval: number // seconds between build actions
  // Auto-Sell
  autoSell: boolean
  sellResources: ('raw' | 'vapour' | 'liquid' | 'crystal')[]
  sellAboveThreshold: number // sell when above this amount
  keepMinimum: number // always keep at least this much
  // Auto-Repair
  autoRepairBlocks: boolean
  repairThreshold: number // decay % to trigger repair
}

let _config: AutomationConfig = {
  enabled: false,
  mode: 'balanced',
  autoHarvest: true,
  harvestInterval: 5,
  harvestTarget: 'nearest',
  autoRefine: false,
  refineTarget: 'vapour',
  refineThreshold: 100,
  autoBuild: false,
  buildBlueprint: null,
  buildInterval: 10,
  autoSell: false,
  sellResources: ['raw'],
  sellAboveThreshold: 500,
  keepMinimum: 50,
  autoRepairBlocks: false,
  repairThreshold: 0.5,
}

let _totalAutoHarvested = 0
let _totalAutoRefined = 0
let _totalAutoSold = 0
let _totalAutoActions = 0

export function getAutomationConfig(): AutomationConfig {
  return { ..._config }
}

export function getAutomationStats(): { harvested: number; refined: number; sold: number; total: number } {
  return {
    harvested: _totalAutoHarvested,
    refined: _totalAutoRefined,
    sold: _totalAutoSold,
    total: _totalAutoActions,
  }
}

export function updateAutomationConfig(partial: Partial<AutomationConfig>): void {
  _config = { ..._config, ...partial }
}

export function setAutomationEnabled(enabled: boolean): void {
  _config.enabled = enabled
}

// ── Ticks ──────────────────────────────────────────────────

let _harvestTimer = 0
let _refineTimer = 0
let _buildTimer = 0
let _sellTimer = 0
let _repairTimer = 0

const MODE_MULTIPLIERS: Record<AutomationMode, number> = {
  idle: 0,
  balanced: 1,
  aggressive: 0.6,
  stockpile: 1.5,
}

export function tickAutomation(dt: number): void {
  if (!_config.enabled) return

  const mult = MODE_MULTIPLIERS[_config.mode]
  if (mult <= 0) return

  const state = useStore.getState()

  // Auto-Harvest
  if (_config.autoHarvest) {
    _harvestTimer += dt
    const interval = _config.harvestInterval * mult
    if (_harvestTimer >= interval) {
      _harvestTimer = 0
      const amount = Math.max(1, Math.floor(state.getEffectiveHarvestAmount() * 0.5))
      state.addRaw(amount)
      _totalAutoHarvested += amount
      _totalAutoActions++
    }
  }

  // Auto-Refine
  if (_config.autoRefine) {
    _refineTimer += dt
    if (_refineTimer >= 3 * mult) {
      _refineTimer = 0
      if (state.inventory.raw >= _config.refineThreshold) {
        const success = state.refine(_config.refineTarget, 1)
        if (success) {
          _totalAutoRefined++
          _totalAutoActions++
        }
      }
    }
  }

  // Auto-Sell
  if (_config.autoSell) {
    _sellTimer += dt
    if (_sellTimer >= 5 * mult) {
      _sellTimer = 0
      for (const resource of _config.sellResources) {
        const have = state.inventory[resource]
        if (have > _config.sellAboveThreshold) {
          const sellAmount = have - _config.keepMinimum
          if (sellAmount > 0) {
            // Sell for renown at a rate
            const rates: Record<string, number> = { raw: 0.01, vapour: 0.05, liquid: 0.1, crystal: 0.25 }
            const renownGain = Math.floor(sellAmount * rates[resource])
            if (renownGain > 0) {
              useStore.setState((s) => ({
                inventory: {
                  ...s.inventory,
                  [resource]: s.inventory[resource] - sellAmount,
                  renown: s.inventory.renown + renownGain,
                },
              }))
              _totalAutoSold += sellAmount
              _totalAutoActions++
            }
          }
        }
      }
    }
  }

  // Auto-Build (conceptual — requires a blueprint to be selected)
  if (_config.autoBuild && _config.buildBlueprint) {
    _buildTimer += dt
    if (_buildTimer >= _config.buildInterval * mult) {
      _buildTimer = 0
      // Auto-place blocks from a simple pattern (just place vapour blocks near origin)
      if (state.inventory.vapour >= 5) {
        // Find nearest empty position
        for (let y = 0; y < 3; y++) {
          for (let x = -2; x <= 2; x++) {
            for (let z = -2; z <= 2; z++) {
              const key = `${x},${y},${z}`
              if (!state.blocks[key]) {
                if (state.placeBlock(x, y, z, 'vapour')) {
                  _totalAutoActions++
                  return
                }
              }
            }
          }
        }
      }
    }
  }
}

export function serializeAutomation(): AutomationConfig {
  return { ..._config }
}

export function loadAutomation(data: AutomationConfig): void {
  _config = { ...data }
}
