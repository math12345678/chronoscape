import { useStore } from '../store'
import { INITIAL_STOCKS, FUNDS } from '../config/economy'
import type { StockSymbol, FundId, PortfolioEntry } from '../config/economy'

// ── Module-level stock market state ────────────────────
// NOTE: Internal variables are exported so the UI component can reference them in JSX.
// Consumers should use the getter functions for proper encapsulation.
export let _stocks = [...INITIAL_STOCKS]
export let _portfolio: PortfolioEntry[] = []
export let _lastTick = Date.now()
export let _totalTrades = 0
export let _stockHoldings: Record<string, number> = {} // symbol -> shares owned

export function getStocks() { return _stocks }
export function getPortfolio() { return _portfolio }
export function getTotalTrades() { return _totalTrades }
export function getStockHoldings() { return { ..._stockHoldings } }
export function getStockValue(symbol: string): number {
  const stock = _stocks.find(s => s.symbol === symbol)
  if (!stock) return 0
  return (_stockHoldings[symbol] ?? 0) * stock.price
}

/** Tick the stock market — call every 5 seconds from a component */
export function tickMarket(dt: number) {
  _stocks = _stocks.map((stock) => {
    const drift = (Math.random() - 0.5) * stock.volatility * 0.1
    const meanReversion = (INITIAL_STOCKS.find(s => s.symbol === stock.symbol)!.price - stock.price) * 0.01
    const change = drift + meanReversion
    return {
      ...stock,
      price: Math.max(1, stock.price + change),
      change24h: change / stock.price,
      volume: Math.max(100, stock.volume + (Math.random() - 0.5) * 200),
    }
  })

  // Portfolio value fluctuations
  _portfolio = _portfolio.map((entry) => {
    const fund = FUNDS[entry.fundId]
    const volatility = fund.risk * 0.05
    const fluctuation = (Math.random() - 0.5) * volatility * entry.currentValue
    return {
      ...entry,
      currentValue: Math.max(entry.principal * 0.5, entry.currentValue + fluctuation),
    }
  })
}

/** Buy stock — the player speculates on market prices */
export function buyStock(symbol: StockSymbol, amount: number): boolean {
  const state = useStore.getState()
  const stock = _stocks.find(s => s.symbol === symbol)
  if (!stock) return false

  const cost = stock.price * amount
  if (state.inventory.liquid < cost) return false

  useStore.setState((s) => ({
    inventory: { ...s.inventory, liquid: s.inventory.liquid - cost },
  }))
  _stockHoldings[symbol] = (_stockHoldings[symbol] ?? 0) + amount
  _totalTrades++
  return true
}

/** Sell stock — convert market gains back to liquid */
export function sellStock(symbol: StockSymbol, amount: number): boolean {
  const stock = _stocks.find(s => s.symbol === symbol)
  if (!stock) return false

  const owned = _stockHoldings[symbol] ?? 0
  if (owned < amount) return false // Can't sell more than you own

  const value = stock.price * amount
  useStore.setState((s) => ({
    inventory: { ...s.inventory, liquid: s.inventory.liquid + value },
  }))
  _stockHoldings[symbol] = owned - amount
  if (_stockHoldings[symbol] <= 0) delete _stockHoldings[symbol]
  _totalTrades++
  return true
}

/** Invest in a fund */
export function investInFund(fundId: FundId, amount: number): boolean {
  const state = useStore.getState()
  const fund = FUNDS[fundId]
  if (!fund) return false
  if (amount < fund.minDeposit || amount > fund.maxDeposit) return false
  if (state.inventory.raw < amount) return false

  // Check existing investment
  const existing = _portfolio.find(e => e.fundId === fundId)
  if (existing && existing.principal + amount > fund.maxDeposit) return false

  useStore.setState((s) => ({
    inventory: { ...s.inventory, raw: s.inventory.raw - amount },
  }))

  if (existing) {
    existing.principal += amount
    existing.currentValue += amount
  } else {
    _portfolio.push({
      fundId,
      principal: amount,
      currentValue: amount,
      investedAt: Date.now(),
      returns: 0,
    })
  }
  _totalTrades++
  return true
}

/** Withdraw from a fund (with early withdrawal penalty) */
export function withdrawFromFund(fundId: FundId): number {
  const idx = _portfolio.findIndex(e => e.fundId === fundId)
  if (idx < 0) return 0

  const entry = _portfolio[idx]
  const penalty = entry.currentValue < entry.principal ? 0 : 0.1
  const withdrawAmount = Math.floor(entry.currentValue * (1 - penalty))

  useStore.setState((s) => ({
    inventory: { ...s.inventory, raw: s.inventory.raw + withdrawAmount },
  }))

  _portfolio.splice(idx, 1)
  return withdrawAmount
}

/** Get portfolio total value */
export function getPortfolioValue(): number {
  return _portfolio.reduce((sum, e) => sum + e.currentValue, 0)
}

/** Get portfolio total P&L */
export function getPortfolioPnL(): number {
  return _portfolio.reduce((sum, e) => sum + (e.currentValue - e.principal), 0)
}
