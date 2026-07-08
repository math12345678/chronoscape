import { useStore } from '../store'
import { generateAuctionItem, NPC_BIDDERS } from '../config/finance'
import type { AuctionItem } from '../config/finance'
import { unlockGear } from '../components/Economy/TimeGear'
import type { GearId } from '../config/economy'

// ── Module-level auction state ─────────────────────────
// NOTE: These are exported so the UI component can reference them in JSX.
// Consumers should use the getter functions for proper encapsulation.
export let _auctionItems: AuctionItem[] = []
export let _auctionHistory: AuctionItem[] = []
export let _totalBidsPlaced = 0

export function getAuctionItems(): AuctionItem[] { return [..._auctionItems] }
export function getAuctionHistory(): AuctionItem[] { return [..._auctionHistory] }
export function getTotalBids(): number { return _totalBidsPlaced }

/** Generate initial auction items */
export function initAuction(count: number = 2) {
  for (let i = 0; i < count; i++) {
    _auctionItems.push(generateAuctionItem())
  }
}

/** Place a bid on an auction item */
export function placeBid(itemIndex: number, bidAmount: number): boolean {
  const item = _auctionItems[itemIndex]
  if (!item) return false
  if (item.timeLeft <= 0) return false
  if (bidAmount <= item.currentBid) return false

  const state = useStore.getState()
  if (state.inventory.liquid < bidAmount) return false

  // If player was already winning, only charge the difference
  const actualCost = item.bidder === 'player' ? bidAmount - item.currentBid : bidAmount

  useStore.setState((s) => ({
    inventory: { ...s.inventory, liquid: s.inventory.liquid - actualCost },
  }))

  _auctionItems[itemIndex] = { ...item, currentBid: bidAmount, bidder: 'player', bidderNpc: null }
  _totalBidsPlaced++
  return true
}

/** Let NPCs bid — call from economy tick */
export function tickAuctions() {
  for (let i = _auctionItems.length - 1; i >= 0; i--) {
    const item = _auctionItems[i]
    item.timeLeft = Math.max(0, item.timeLeft - 2000) // 2s per tick

    // NPC bidding
    if (item.timeLeft > 0 && item.bidder !== 'player' && Math.random() < 0.3) {
      // NPC outbids by 10-30%
      const increase = Math.ceil(item.currentBid * (0.1 + Math.random() * 0.2))
      _auctionItems[i] = {
        ...item,
        currentBid: item.currentBid + increase,
        bidderNpc: NPC_BIDDERS[Math.floor(Math.random() * NPC_BIDDERS.length)],
      }
    }

    // Item expired
    if (item.timeLeft <= 0) {
      if (item.bidder === 'player') {
        // Player won! Award the item
        awardAuctionItem(item)
      }
      _auctionHistory.push({ ...item, timeLeft: 0 })
      _auctionItems.splice(i, 1)
    }
  }

  // Generate new items periodically
  if (_auctionItems.length < 2 && Math.random() < 0.2) {
    _auctionItems.push(generateAuctionItem())
  }
}

function awardAuctionItem(item: AuctionItem) {
  const reward = item.reward
  switch (reward.type) {
    case 'gear':
      if (reward.gearId && (['jetpack', 'energyShield', 'speedBoots'] as GearId[]).includes(reward.gearId as GearId)) {
        unlockGear(reward.gearId as GearId)
      }
      break
    case 'resources':
      if (reward.resources) {
        useStore.setState((s) => ({
          inventory: {
            ...s.inventory,
            liquid: s.inventory.liquid + (reward.resources?.liquid ?? 0),
            crystal: s.inventory.crystal + (reward.resources?.crystal ?? 0),
          },
        }))
      }
      break
    case 'renown':
      useStore.setState((s) => ({
        inventory: { ...s.inventory, renown: s.inventory.renown + 5 },
      }))
      break
    case 'blueprint':
      useStore.setState((s) => ({
        inventory: { ...s.inventory, raw: s.inventory.raw + 25 },
      }))
      break
    case 'boost':
      useStore.setState((s) => ({
        inventory: { ...s.inventory, renown: s.inventory.renown + 10 },
      }))
      break
  }
}
