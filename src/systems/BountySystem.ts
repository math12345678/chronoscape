import { useStore } from '../store'
import { generateBounties } from '../config/economy'
import type { Bounty } from '../config/economy'
import { getKillCount } from '../components/Combat/HealthTracker'

// ── Module-level bounty state ──────────────────────────
export let _bounties: Bounty[] = generateBounties()
export let _activeBountyId: string | null = null
export let _bountyProgress: Record<string, number> = {}
export let _bountyStartTime: Record<string, number> = {}
export let _bountyCompleted: string[] = []

export function getBounties() { return _bounties }
export function getActiveBounty() { return _activeBountyId }
export function getBountyProgress(id: string) { return _bountyProgress[id] ?? 0 }

/** Accept a bounty */
export function acceptBounty(id: string): boolean {
  const bounty = _bounties.find(b => b.id === id)
  if (!bounty || _activeBountyId) return false
  _activeBountyId = id
  _bountyProgress[id] = 0
  _bountyStartTime[id] = Date.now()
  return true
}

/** Check bounty progress against kill count */
export function tickBounties() {
  if (!_activeBountyId) return
  const bounty = _bounties.find(b => b.id === _activeBountyId)
  if (!bounty) { _activeBountyId = null; return }

  if (bounty.timeLimit > 0) {
    const elapsed = Date.now() - (_bountyStartTime[_activeBountyId] ?? Date.now())
    if (elapsed > bounty.timeLimit) {
      _activeBountyId = null
      return
    }
  }

  const kills = getKillCount()
  _bountyProgress[_activeBountyId] = Math.min(bounty.targetCount, kills)

  if (_bountyProgress[_activeBountyId] >= bounty.targetCount) {
    const state = useStore.getState()
    useStore.setState((s) => ({
      inventory: {
        ...s.inventory,
        renown: s.inventory.renown + (bounty.reward.renown ?? 0),
        liquid: s.inventory.liquid + (bounty.reward.liquid ?? 0),
        crystal: s.inventory.crystal + (bounty.reward.crystal ?? 0),
      },
    }))
    _bountyCompleted.push(_activeBountyId)
    _activeBountyId = null
    _bounties = generateBounties()
  }
}
