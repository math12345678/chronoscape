// ── Temporal Prophecy / Fate Cards ──
// Draw from a deck of fate cards. Each has a prophecy that must be
// fulfilled within a time limit. Rewards are substantial.

import { useStore } from '../store'

export interface ProphecyCard {
  id: string
  title: string
  icon: string
  color: string
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary' | 'mythic'
  description: string
  prophecy: string // what must happen
  condition: () => boolean // check if fulfilled
  conditionDescription: string
  progressCurrent: () => number
  progressTarget: () => number
  reward: { raw: number; liquid: number; crystal: number; renown: number; shards?: number }
  timeLimit: number // seconds to fulfill
}

function _makeProp(card: Omit<ProphecyCard, 'progressCurrent' | 'progressTarget' | 'condition'> & {
  progressCurrent: () => number
  progressTarget: () => number
  condition: () => boolean
}): ProphecyCard {
  return { ...card, progressCurrent: card.progressCurrent, progressTarget: card.progressTarget, condition: card.condition }
}

function getCards(): ProphecyCard[] {
  return [
    _makeProp({
      id: 'prophecy_harvest_1', title: 'The Bounty', icon: 'sprout', color: '#44ff88', rarity: 'common',
      description: 'Harvest enough raw energy to prove your worth.',
      prophecy: 'Accumulate 10,000 Raw resources.',
      conditionDescription: 'raw >= 10000',
      condition: () => useStore.getState().inventory.raw >= 10000,
      progressCurrent: () => Math.min(10000, useStore.getState().inventory.raw),
      progressTarget: () => 10000,
      reward: { raw: 5000, liquid: 500, crystal: 50, renown: 10 },
      timeLimit: 120,
    }),
    _makeProp({
      id: 'prophecy_kill_1', title: 'The Reaper', icon: 'sword', color: '#ff4444', rarity: 'common',
      description: 'Send 50 enemies to their doom.',
      prophecy: 'Kill 50 enemies.',
      conditionDescription: 'kills >= 50 (this prophecy)',
      condition: () => false, // tracked via ProphecyInstance.kills
      progressCurrent: () => 0,
      progressTarget: () => 50,
      reward: { raw: 3000, liquid: 300, crystal: 30, renown: 8 },
      timeLimit: 90,
    }),
    _makeProp({
      id: 'prophecy_build_1', title: 'The Architect', icon: 'wrench', color: '#ff8844', rarity: 'uncommon',
      description: 'Construct 25 buildings.',
      prophecy: 'Build 25 structures.',
      conditionDescription: 'buildings >= 25',
      condition: () => Object.keys(useStore.getState().blocks).length >= 25,
      progressCurrent: () => Math.min(25, Object.keys(useStore.getState().blocks).length),
      progressTarget: () => 25,
      reward: { raw: 10000, liquid: 1000, crystal: 100, renown: 25 },
      timeLimit: 180,
    }),
    _makeProp({
      id: 'prophecy_refine_1', title: 'The Purifier', icon: 'drop', color: '#44aaff', rarity: 'uncommon',
      description: 'Refine 100 units of Chrono Liquid.',
      prophecy: 'Have 100 Liquid in your inventory.',
      conditionDescription: 'liquid >= 100',
      condition: () => useStore.getState().inventory.liquid >= 100,
      progressCurrent: () => Math.min(100, useStore.getState().inventory.liquid),
      progressTarget: () => 100,
      reward: { raw: 15000, liquid: 2000, crystal: 150, renown: 30 },
      timeLimit: 120,
    }),
    _makeProp({
      id: 'prophecy_explore_1', title: 'The Cartographer', icon: 'compass', color: '#aa44ff', rarity: 'rare',
      description: 'Explore by traveling a great distance.',
      prophecy: 'Win 10 drag races.',
      conditionDescription: 'races won >= 10',
      condition: () => false,
      progressCurrent: () => 0,
      progressTarget: () => 10,
      reward: { raw: 30000, liquid: 5000, crystal: 500, renown: 50, shards: 5 },
      timeLimit: 300,
    }),
    _makeProp({
      id: 'prophecy_might_1', title: 'The Ascendant', icon: 'star', color: '#ffd700', rarity: 'rare',
      description: 'Reach a new height of power.',
      prophecy: 'Prestige 3 times while this prophecy is active.',
      conditionDescription: 'prestige 3x',
      condition: () => false,
      progressCurrent: () => 0,
      progressTarget: () => 3,
      reward: { raw: 50000, liquid: 10000, crystal: 1000, renown: 100, shards: 15 },
      timeLimit: 600,
    }),
    _makeProp({
      id: 'prophecy_wealth_1', title: 'The Millionaire', icon: 'money', color: '#ff8844', rarity: 'legendary',
      description: 'Amass a fortune beyond imagination.',
      prophecy: 'Accumulate 1,000,000 Raw.',
      conditionDescription: 'raw >= 1,000,000',
      condition: () => useStore.getState().inventory.raw >= 1000000,
      progressCurrent: () => Math.min(1000000, useStore.getState().inventory.raw),
      progressTarget: () => 1000000,
      reward: { raw: 200000, liquid: 50000, crystal: 5000, renown: 500, shards: 50 },
      timeLimit: 900,
    }),
    _makeProp({
      id: 'prophecy_omega', title: 'The Omega Prophecy', icon: 'zap', color: '#ff00ff', rarity: 'mythic',
      description: 'The ultimate fate. Survive the Omega Storm.',
      prophecy: 'Trigger and survive an Omega Storm anomaly event.',
      conditionDescription: 'omega storm survived',
      condition: () => false,
      progressCurrent: () => 0,
      progressTarget: () => 1,
      reward: { raw: 500000, liquid: 100000, crystal: 20000, renown: 2000, shards: 200 },
      timeLimit: 9999,
    }),
  ]
}

// ── State ─────────────────────────────────────────────────

export interface ProphecyInstance {
  cardId: string
  active: boolean
  startedAt: number
  completed: boolean
  failed: boolean
  rewardClaimed: boolean
  progress: number // custom tracking
  target: number
}

let _activeProphecies: ProphecyInstance[] = []
let _completedCount = 0
let _maxActiveProphecies = 1

export function getActiveProphecies(): ProphecyInstance[] {
  return _activeProphecies.filter((p) => p.active && !p.completed && !p.failed)
}

export function getAllProphecies(): ProphecyInstance[] {
  return _activeProphecies.map((p) => ({ ...p }))
}

export function getCompletedCount(): number { return _completedCount }
export function getMaxActiveProphecies(): number { return _maxActiveProphecies }

/** Draw a random prophecy card */
export function drawProphecy(): ProphecyCard | null {
  if (_activeProphecies.filter((p) => p.active && !p.completed && !p.failed).length >= _maxActiveProphecies) return null

  const allCards = getCards()
  const activeIds = new Set(_activeProphecies.map((p) => p.cardId))
  const available = allCards.filter((c) => !activeIds.has(c.id))
  if (available.length === 0) return null

  const card = available[Math.floor(Math.random() * available.length)]
  _activeProphecies.push({
    cardId: card.id,
    active: true,
    startedAt: Date.now(),
    completed: false,
    failed: false,
    rewardClaimed: false,
    progress: 0,
    target: card.progressTarget(),
  })

  return card
}

/** Check and fulfill prophecies */
export function checkProphecies(dt: number): ProphecyCard[] {
  const fulfilled: ProphecyCard[] = []
  const allCards = getCards()

  for (const inst of _activeProphecies) {
    if (!inst.active || inst.completed || inst.failed) continue

    const card = allCards.find((c) => c.id === inst.cardId)
    if (!card) continue

    // Check time limit
    const elapsed = (Date.now() - inst.startedAt) / 1000
    if (elapsed >= card.timeLimit) {
      inst.failed = true
      continue
    }

    // Check condition
    if (card.condition()) {
      inst.completed = true
      inst.active = false
      _completedCount++

      // Award rewards
      useStore.setState((s) => ({
        inventory: {
          ...s.inventory,
          raw: s.inventory.raw + card.reward.raw,
          liquid: s.inventory.liquid + card.reward.liquid,
          crystal: s.inventory.crystal + card.reward.crystal,
          renown: s.inventory.renown + card.reward.renown,
        },
      }))
      fulfilled.push(card)
    }
  }

  return fulfilled
}

/** Get progress for a prophecy */
export function getProphecyProgress(cardId: string): { current: number; target: number; elapsed: number; timeLimit: number } | null {
  const inst = _activeProphecies.find((p) => p.cardId === cardId)
  if (!inst) return null
  const card = getCards().find((c) => c.id === cardId)
  if (!card) return null
  return {
    current: card.progressCurrent(),
    target: card.progressTarget(),
    elapsed: (Date.now() - inst.startedAt) / 1000,
    timeLimit: card.timeLimit,
  }
}

export function increaseMaxProphecies(): void {
  _maxActiveProphecies++
}

export function serializeProphecies(): { instances: ProphecyInstance[]; completed: number; max: number } {
  return {
    instances: _activeProphecies.map((p) => ({ ...p })),
    completed: _completedCount,
    max: _maxActiveProphecies,
  }
}

export function loadProphecies(data: { instances: ProphecyInstance[]; completed: number; max: number }): void {
  _activeProphecies = (data.instances ?? []).map((p) => ({ ...p }))
  _completedCount = data.completed ?? 0
  _maxActiveProphecies = data.max ?? 1
}
