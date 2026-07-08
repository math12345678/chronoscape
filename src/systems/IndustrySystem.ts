import { useStore } from '../store'
import { INDUSTRIES } from '../config/finance'
import type { IndustryType, IndustryInstance } from '../config/finance'

// ── Module-level industry state ────────────────────────
// NOTE: _industries is exported so the UI component can reference it in JSX.
// Consumers should use the getter functions for proper encapsulation.
export let _industries: IndustryInstance[] = []
export let _totalProduced = 0
export const BOARD_MULTIPLIERS = { industrySpeed: 1, tradeDiscount: 1 }

export function setBoardMultiplier(key: 'industrySpeed' | 'tradeDiscount', value: number) {
  BOARD_MULTIPLIERS[key] = value
}

export function getIndustries(): IndustryInstance[] { return [..._industries] }
export function getTotalProduced(): number { return _totalProduced }

/** Build a new industry */
export function buildIndustry(type: IndustryType, position: [number, number, number]): boolean {
  const config = INDUSTRIES[type]
  if (!config) return false

  const state = useStore.getState()
  const cost = config.buildCost
  if (cost.raw && state.inventory.raw < cost.raw) return false
  if (cost.vapour && state.inventory.vapour < cost.vapour) return false
  if (cost.liquid && state.inventory.liquid < cost.liquid) return false
  if (cost.crystal && state.inventory.crystal < cost.crystal) return false
  if (cost.renown && state.inventory.renown < cost.renown) return false

  useStore.setState((s) => ({
    inventory: {
      ...s.inventory,
      raw: cost.raw ? s.inventory.raw - cost.raw : s.inventory.raw,
      vapour: cost.vapour ? s.inventory.vapour - cost.vapour : s.inventory.vapour,
      liquid: cost.liquid ? s.inventory.liquid - cost.liquid : s.inventory.liquid,
      crystal: cost.crystal ? s.inventory.crystal - cost.crystal : s.inventory.crystal,
      renown: cost.renown ? s.inventory.renown - cost.renown : s.inventory.renown,
    },
  }))

  _industries.push({
    id: `industry_${type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    level: 1,
    builtAt: Date.now(),
    lastProducedAt: Date.now(),
    position,
  })
  return true
}

/** Upgrade an industry */
export function upgradeIndustry(index: number): boolean {
  const industry = _industries[index]
  if (!industry) return false
  const config = INDUSTRIES[industry.type]
  if (!config || industry.level >= config.maxLevel) return false

  const cost = config.upgradeCost
  const state = useStore.getState()
  if (cost.raw && state.inventory.raw < cost.raw * industry.level) return false
  if (cost.renown && state.inventory.renown < cost.renown * industry.level) return false

  useStore.setState((s) => ({
    inventory: {
      ...s.inventory,
      raw: cost.raw ? s.inventory.raw - cost.raw * industry.level : s.inventory.raw,
      renown: cost.renown ? s.inventory.renown - cost.renown * industry.level : s.inventory.renown,
    },
  }))

  _industries[index] = { ...industry, level: industry.level + 1 }
  return true
}

/** Tick all industries — produce resources. Call from economy tick. */
export function tickIndustries(boostMultiplier: number = 1): { type: IndustryType; amount: number }[] {
  const now = Date.now()
  const produced: { type: IndustryType; amount: number }[] = []

  for (let i = 0; i < _industries.length; i++) {
    const ind = _industries[i]
    const config = INDUSTRIES[ind.type]
    if (!config) continue

    const effectiveInterval = config.production.tickInterval / (ind.level * BOARD_MULTIPLIERS.industrySpeed)
    const elapsed = now - ind.lastProducedAt

    if (elapsed >= effectiveInterval) {
      const amount = Math.floor(config.production.amountPerTick * ind.level * boostMultiplier)
      const resource = config.production.resource

      useStore.setState((s) => ({
        inventory: {
          ...s.inventory,
          [resource]: s.inventory[resource] + amount,
        },
      }))

      _totalProduced += amount
      _industries[i] = { ...ind, lastProducedAt: now }
      produced.push({ type: ind.type, amount })
    }
  }

  return produced
}
