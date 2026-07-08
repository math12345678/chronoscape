import { useStore } from '../store'
import { EXECUTIVE_DECISIONS, BOARD_MEMBERS } from '../config/finance'
import { getFinancialSnapshot } from '../components/Economy/StockTicker'
import { setBoardMultiplier } from './IndustrySystem'
import { setRentMultiplier } from './RealEstateSystem'

// ── Module-level CEO state ─────────────────────────────
interface ActiveEffect {
  decisionId: string
  expiresAt: number
}

export let _activeEffects: ActiveEffect[] = []
export let _totalDividendsPaid = 0

export function getActiveEffects(): ActiveEffect[] { return [..._activeEffects] }
export function getTotalDividendsPaid(): number { return _totalDividendsPaid }
export function getHiredBoardMemberCount(): number { return BOARD_MEMBERS.filter(m => m.hired).length }

/** Check if a CEO decision is on cooldown */
export function isOnCooldown(decisionId: string): boolean {
  const decision = EXECUTIVE_DECISIONS.find(d => d.id === decisionId)
  if (!decision) return true
  const activated = _activeEffects.find(e => e.decisionId === decisionId)
  if (!activated) return false
  return Date.now() - (activated.expiresAt - decision.cooldown) < decision.cooldown
}

/** Execute a CEO decision */
export function executeDecision(decisionId: string): boolean {
  const decision = EXECUTIVE_DECISIONS.find(d => d.id === decisionId)
  if (!decision || isOnCooldown(decisionId)) return false

  const state = useStore.getState()
  if (decision.cost.raw && state.inventory.raw < decision.cost.raw) return false
  if (decision.cost.liquid && state.inventory.liquid < decision.cost.liquid) return false
  if (decision.cost.crystal && state.inventory.crystal < decision.cost.crystal) return false
  if (decision.cost.renown && state.inventory.renown < decision.cost.renown) return false

  useStore.setState((s) => ({
    inventory: {
      ...s.inventory,
      raw: decision.cost.raw ? s.inventory.raw - decision.cost.raw : s.inventory.raw,
      liquid: decision.cost.liquid ? s.inventory.liquid - decision.cost.liquid : s.inventory.liquid,
      crystal: decision.cost.crystal ? s.inventory.crystal - decision.cost.crystal : s.inventory.crystal,
      renown: decision.cost.renown ? s.inventory.renown - decision.cost.renown : s.inventory.renown,
    },
  }))

  if (decision.effect.type === 'dividend') {
    const snapshot = getFinancialSnapshot()
    const payout = Math.floor(snapshot.netWorth * decision.effect.value)
    useStore.setState((s) => ({
      inventory: { ...s.inventory, liquid: s.inventory.liquid + payout },
    }))
    _totalDividendsPaid += payout
  } else {
    _activeEffects.push({
      decisionId,
      expiresAt: Date.now() + decision.effect.duration,
    })
  }
  return true
}

/** Hire a board member */
export function hireBoardMember(memberId: string): boolean {
  const member = BOARD_MEMBERS.find(m => m.id === memberId)
  if (!member || member.hired) return false

  const state = useStore.getState()
  if (state.inventory.renown < member.hireCost.renown) return false
  if (member.hireCost.liquid && state.inventory.liquid < member.hireCost.liquid) return false
  if (member.hireCost.crystal && state.inventory.crystal < member.hireCost.crystal) return false

  useStore.setState((s) => ({
    inventory: {
      ...s.inventory,
      renown: s.inventory.renown - member.hireCost.renown,
      liquid: member.hireCost.liquid ? s.inventory.liquid - member.hireCost.liquid : s.inventory.liquid,
      crystal: member.hireCost.crystal ? s.inventory.crystal - member.hireCost.crystal : s.inventory.crystal,
    },
  }))

  member.hired = true

  switch (member.bonus.type) {
    case 'industrySpeed': setBoardMultiplier('industrySpeed', member.bonus.value); break
    case 'tradeDiscount': setBoardMultiplier('tradeDiscount', member.bonus.value); break
    case 'rentYield': setRentMultiplier('rentYield', member.bonus.value); break
  }
  return true
}

/** Get active boost multipliers from CEO effects */
export function getActiveBoosts(): Record<string, number> {
  const now = Date.now()
  const boosts: Record<string, number> = { marketBoost: 1, industryBoost: 1, rentBoost: 1, interestBoost: 1, taxCut: 1 }

  _activeEffects = _activeEffects.filter(e => e.expiresAt > now)
  for (const effect of _activeEffects) {
    const decision = EXECUTIVE_DECISIONS.find(d => d.id === effect.decisionId)
    if (decision) {
      boosts[decision.effect.type] = decision.effect.value
    }
  }
  return boosts
}
