import { useEffect } from 'react'
import {
  tickMarket,
} from '../../systems/ExchangeSystem'
import {
  tickIndustries,
} from '../../systems/IndustrySystem'
import {
  tickAuctions,
} from '../../systems/AuctionSystem'
import { getActiveBoosts } from '../../systems/CEOSystem'
import { applySavingsInterest, tickLoans } from '../../systems/BankingSystem'
import { tickRent, tickPropertyValues, findTenants } from '../../systems/RealEstateSystem'
import { tickBounties } from '../../systems/BountySystem'

/**
 * Central economy tick manager.
 * Every 5 seconds, ticks all economic subsystems.
 *
 * This runs inside the Scene (3D canvas) via a null component.
 */

// Module-level hooks that get called by the tick function below.
// Set at component init; clean separation of concerns.
type TickFn = () => void
let _tickCallbacks: TickFn[] = []

/** Register a callback to run every economy tick (~5s) */
export function registerTickCallback(fn: TickFn) {
  _tickCallbacks.push(fn)
}

export function unregisterTickCallback(fn: TickFn) {
  _tickCallbacks = _tickCallbacks.filter(f => f !== fn)
}

/** The actual tick — called by the EconomyManager component */
let _tickInterval = 5000 // ms between economy ticks

export function setTickInterval(ms: number) { _tickInterval = ms }

/**
 * Economy Manager — runs all economy ticks.
 * Must be placed inside the Scene's Canvas.
 */
export const EconomyManager = () => {
  useEffect(() => {
    const interval = setInterval(() => {
      // Run all registered tick callbacks
      for (const fn of _tickCallbacks) {
        try { fn() } catch { /* per-callback resilience */ }
      }
    }, _tickInterval)

    return () => clearInterval(interval)
  }, [])

  return null
}

/**
 * Register all economy system ticks.
 * Call this at app init or from App.tsx.
 *
 * Uses static imports — modules are already part of the main bundle
 * since they're imported by other components.
 */
export function registerAllEconomyTicks() {
  // Stock market tick
  registerTickCallback(() => {
    tickMarket()
  })

  // Savings interest
  registerTickCallback(() => {
    applySavingsInterest(1)
  })

  // Loan default checks
  registerTickCallback(() => {
    tickLoans()
  })

  // Industry production — with CEO boost
  registerTickCallback(() => {
    const boosts = getActiveBoosts()
    tickIndustries(boosts.industryBoost)
  })

  // Rent + property values + tenants — with CEO boost
  registerTickCallback(() => {
    const boosts = getActiveBoosts()
    tickRent(boosts.rentBoost)
    tickPropertyValues()
    findTenants()
  })

  // Auction ticks
  registerTickCallback(() => {
    tickAuctions()
  })

  // Bounty ticks
  registerTickCallback(() => {
    tickBounties()
  })
}
