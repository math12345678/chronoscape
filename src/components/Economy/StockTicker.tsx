import { useState, useEffect, useRef } from 'react'
import { useStore } from '../../store'
import { getStocks, getPortfolioValue, getStockHoldings, getTotalTrades } from '../../systems/ExchangeSystem'
import { WEALTH_TIERS } from '../../config/finance'

// ── Financial Dashboard Module ────────────────────────
// Tracks overall player financial health across all systems

export interface FinancialSnapshot {
  netWorth: number
  liquidHeld: number
  rawHeld: number
  vapourHeld: number
  crystalHeld: number
  stockValue: number
  portfolioValue: number
  realEstateValue: number
  industryValue: number
  savingsBalance: number
  totalRenown: number
  totalKills: number
  totalBlocksPlaced: number
  totalTrades: number
  wealthTier: string
  wealthTierColor: string
}

export function getFinancialSnapshot(): FinancialSnapshot {
  // We recalculate every call — it's cheap
  const s = useStore.getState()
  const stockVal = Object.keys(getStockHoldings()).reduce((sum, sym) => {
    const stock = getStocks().find(st => st.symbol === sym)
    return sum + (stock ? stock.price * getStockHoldings()[sym] : 0)
  }, 0)

  // Calculate net worth: liquid + raw + vapour + crystal + stock value + portfolio + real estate
  // Real estate value: sum of owned parcels' currentValue
  const estateValue = 0 // Will be filled by TimeRealEstate module
  const industryValue = 0 // Will be filled by TimeIndustry module
  const savingsBalance = 0 // Will be filled by TimeBank module

  const totalResources = s.inventory.liquid + s.inventory.raw * 0.5 + s.inventory.vapour * 0.8 + s.inventory.crystal * 2
  const netWorth = totalResources + stockVal + getPortfolioValue() + estateValue + industryValue + savingsBalance

  let tier: { name: string; color: string } = WEALTH_TIERS[0]
  for (const t of WEALTH_TIERS) {
    if (netWorth >= t.threshold) tier = t
  }

  const snapshot: FinancialSnapshot = {
    netWorth: Math.floor(netWorth),
    liquidHeld: Math.floor(s.inventory.liquid),
    rawHeld: Math.floor(s.inventory.raw),
    vapourHeld: Math.floor(s.inventory.vapour),
    crystalHeld: Math.floor(s.inventory.crystal),
    stockValue: Math.floor(stockVal),
    portfolioValue: Math.floor(getPortfolioValue()),
    realEstateValue: estateValue,
    industryValue,
    savingsBalance,
    totalRenown: Math.floor(s.inventory.renown),
    totalKills: 0, // Will be filled from HealthTracker
    totalBlocksPlaced: s.totalBlocksPlaced,
    totalTrades: getTotalTrades(),
    wealthTier: tier.name,
    wealthTierColor: tier.color,
  }
  return snapshot
}

// ── Stock Ticker Component ────────────────────────────
// Always-visible scrolling ticker at the top of the screen

export const StockTicker = () => {
  const [, forceUpdate] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showDashboard, setShowDashboard] = useState(false)
  const scrollPos = useRef(0)

  // Re-render every 2s for price updates + animate scroll
  useEffect(() => {
    const interval = setInterval(() => forceUpdate(n => n + 1), 2000)
    return () => clearInterval(interval)
  }, [])

  // Auto-scroll the ticker
  const rafRef = useRef(0)
  useEffect(() => {
    if (!scrollRef.current) return
    const animate = () => {
      if (!scrollRef.current) return
      scrollPos.current -= 0.5
      scrollRef.current.style.transform = `translateX(${scrollPos.current}px)`
      if (scrollPos.current < -scrollRef.current.scrollWidth / 2) {
        scrollPos.current = 0
      }
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  const stocks = getStocks()
  const snapshot = getFinancialSnapshot()
  const totalStocks = snapshot.stockValue

  // Market sentiment based on net change
  const totalChange = stocks.reduce((sum, s) => sum + s.change24h, 0)
  const sentiment = totalChange > 0 ? 'bullish' : totalChange < 0 ? 'bearish' : 'neutral'
  const sentimentColor = sentiment === 'bullish' ? '#44ff88' : sentiment === 'bearish' ? '#ff4466' : '#888888'
  const sentimentIcon = sentiment === 'bullish' ? '↑' : sentiment === 'bearish' ? '↓' : '→'

  return (
    <div className="fixed top-0 left-0 right-0 z-[90] pointer-events-none">
      {/* Main ticker bar */}
      <div
        className="relative w-full h-7 bg-gray-950/80 backdrop-blur-md border-b border-cyan-900/30 overflow-hidden cursor-pointer pointer-events-auto"
        onClick={() => setShowDashboard(o => !o)}
        title="Click for Financial Dashboard"
      >
        {/* Left: Market sentiment */}
        <div className="absolute left-0 top-0 bottom-0 flex items-center px-2 bg-gray-950/90 z-10 border-r border-gray-800/50">
          <span className="text-[10px] font-mono font-bold" style={{ color: sentimentColor }}>
            {sentimentIcon} {sentiment.toUpperCase()}
          </span>
        </div>

        {/* Right: Net Worth */}
        <div className="absolute right-0 top-0 bottom-0 flex items-center px-2 bg-gray-950/90 z-10 border-l border-gray-800/50 gap-2">
          <span className="text-[9px] font-mono text-gray-500">WORTH</span>
          <span className="text-xs font-mono font-bold tabular-nums" style={{ color: snapshot.wealthTierColor }}>
            {snapshot.netWorth.toLocaleString()}
          </span>
          <span className="text-[9px] font-mono text-gray-600" style={{ color: snapshot.wealthTierColor }}>
            {snapshot.wealthTier}
          </span>
        </div>

        {/* Scrolling ticker */}
        <div ref={scrollRef} className="flex items-center h-full whitespace-nowrap" style={{ willChange: 'transform' }}>
          {/* Duplicate for seamless scroll */}
          {[...stocks, ...stocks].map((stock, i) => (
            <span key={`${stock.symbol}-${i}`}
              className="inline-flex items-center mx-3 text-[11px] font-mono tabular-nums"
            >
              <span className="font-bold mr-1" style={{ color: stock.color }}>{stock.symbol}</span>
              <span className="text-white">{stock.price.toFixed(2)}</span>
              <span className={`ml-1 ${stock.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {stock.change24h >= 0 ? '+' : ''}{(stock.change24h * 100).toFixed(2)}%
              </span>
              <span className="text-gray-600 ml-1">· Vol: {Math.floor(stock.volume).toLocaleString()}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Financial Dashboard (expanded on click) */}
      {showDashboard && (
        <div className="absolute top-7 left-0 right-0 bg-gray-950/90 backdrop-blur-md border-b border-cyan-900/30 p-3 pointer-events-auto max-h-[60vh] overflow-y-auto">
          <div className="max-w-2xl mx-auto space-y-3">
            {/* Net Worth Card */}
            <div className="bg-gray-900/60 rounded-lg p-3 border border-gray-800/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-mono">Total Net Worth</p>
                  <p className="text-2xl font-bold font-mono tabular-nums" style={{ color: snapshot.wealthTierColor }}>
                    {snapshot.netWorth.toLocaleString()} <span className="text-sm">≈</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-500 font-mono">Wealth Tier</p>
                  <p className="text-sm font-bold" style={{ color: snapshot.wealthTierColor }}>{snapshot.wealthTier}</p>
                </div>
              </div>
            </div>

            {/* Asset Breakdown */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gray-900/40 rounded-lg p-2 border border-gray-800/30">
                <p className="text-[9px] text-gray-500 font-mono">Liquid</p>
                <p className="text-sm font-mono text-cyan-300 tabular-nums">{snapshot.liquidHeld.toLocaleString()}</p>
              </div>
              <div className="bg-gray-900/40 rounded-lg p-2 border border-gray-800/30">
                <p className="text-[9px] text-gray-500 font-mono">Raw</p>
                <p className="text-sm font-mono text-orange-300 tabular-nums">{snapshot.rawHeld.toLocaleString()}</p>
              </div>
              <div className="bg-gray-900/40 rounded-lg p-2 border border-gray-800/30">
                <p className="text-[9px] text-gray-500 font-mono">Vapour</p>
                <p className="text-sm font-mono text-yellow-300 tabular-nums">{snapshot.vapourHeld.toLocaleString()}</p>
              </div>
              <div className="bg-gray-900/40 rounded-lg p-2 border border-gray-800/30">
                <p className="text-[9px] text-gray-500 font-mono">Crystal</p>
                <p className="text-sm font-mono text-purple-300 tabular-nums">{snapshot.crystalHeld.toLocaleString()}</p>
              </div>
              <div className="bg-gray-900/40 rounded-lg p-2 border border-gray-800/30">
                <p className="text-[9px] text-gray-500 font-mono">Stocks</p>
                <p className="text-sm font-mono text-green-300 tabular-nums">{totalStocks.toLocaleString()}</p>
              </div>
              <div className="bg-gray-900/40 rounded-lg p-2 border border-gray-800/30">
                <p className="text-[9px] text-gray-500 font-mono">Portfolio</p>
                <p className="text-sm font-mono text-amber-300 tabular-nums">{snapshot.portfolioValue.toLocaleString()}</p>
              </div>
            </div>

            {/* Stats row */}
            <div className="flex gap-2 text-[9px] text-gray-600 font-mono justify-center">
              <span>Renown: {snapshot.totalRenown}</span>
              <span>·</span>
              <span>Blocks: {snapshot.totalBlocksPlaced}</span>
              <span>·</span>
              <span>Trades: {snapshot.totalTrades}</span>
            </div>

            {/* Market news / sentiment */}
            <div className="text-center">
              <p className="text-[10px] text-gray-500 font-mono">
                Market: <span style={{ color: sentimentColor }}>{sentiment.toUpperCase()}</span>
                {' · '}
                {sentiment === 'bullish' ? 'Prices trending up — good time to sell' :
                 sentiment === 'bearish' ? 'Prices dropping — good time to buy' :
                 'Market stable — wait for movement'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
