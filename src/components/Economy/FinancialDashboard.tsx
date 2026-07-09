import { useState, useEffect, useRef } from 'react'
import { useStore } from '../../store'
import { getStocks, getPortfolioValue, getStockHoldings, getTotalTrades } from '../../systems/ExchangeSystem'
import { WEALTH_TIERS } from '../../config/finance'
import { getPrestigeInterestBonus } from '../PrestigeSystem' // eslint-disable-line

// ── Compound Interest Engine (Time is Money) ─────────
// Every second, your net worth generates interest proportional to time played
const INTEREST_RATE_PER_SECOND = 0.0001 // 0.01% per second = 36%/hour
let _lastInterestTime = Date.now()
let _compoundInterestEarned = 0
export function getCompoundInterestEarned() { return _compoundInterestEarned }

export function tickCompoundInterest(currentNetWorth: number) {
  const now = Date.now()
  const elapsed = (now - _lastInterestTime) / 1000
  if (elapsed < 1) return
  _lastInterestTime = now
  if (currentNetWorth <= 0) return
  const prestigeBonus = 1.0 + getPrestigeInterestBonus()
  const rate = INTEREST_RATE_PER_SECOND * prestigeBonus
  const interest = Math.max(0, Math.floor(currentNetWorth * rate * elapsed))
  if (interest > 0) {
    _compoundInterestEarned += interest
    const s = useStore.getState()
    useStore.setState({ inventory: { ...s.inventory, raw: Math.min(9999, s.inventory.raw + Math.max(1, Math.floor(interest / 10))) } })
  }
}

// ── Financial health snapshot ─────────────────────────
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
  compoundInterest: number
  timePlayed: number
}

export function getFinancialSnapshot(): FinancialSnapshot {
  const s = useStore.getState()
  const stocks = getStocks()
  const holdings = getStockHoldings()
  let stockVal = 0
  for (const sym of Object.keys(holdings)) {
    const stock = stocks.find(st => st.symbol === sym)
    if (stock) stockVal += stock.price * holdings[sym]
  }
  const totalResources = s.inventory.liquid + s.inventory.raw * 0.5 + s.inventory.vapour * 0.8 + s.inventory.crystal * 2
  const netWorth = totalResources + stockVal + getPortfolioValue()
  let tier: { name: string; color: string; threshold: number } = WEALTH_TIERS[0]
  for (const t of WEALTH_TIERS) if (netWorth >= t.threshold) tier = t
  return {
    netWorth: Math.floor(netWorth),
    liquidHeld: Math.floor(s.inventory.liquid),
    rawHeld: Math.floor(s.inventory.raw),
    vapourHeld: Math.floor(s.inventory.vapour),
    crystalHeld: Math.floor(s.inventory.crystal),
    stockValue: Math.floor(stockVal),
    portfolioValue: Math.floor(getPortfolioValue()),
    realEstateValue: 0, industryValue: 0, savingsBalance: 0,
    totalRenown: Math.floor(s.inventory.renown),
    totalKills: 0, totalBlocksPlaced: s.totalBlocksPlaced,
    totalTrades: getTotalTrades(),
    wealthTier: tier.name, wealthTierColor: tier.color,
    compoundInterest: _compoundInterestEarned,
    timePlayed: Math.floor((Date.now() - _lastInterestTime) / 1000),
  }
}

// ── Financial Dashboard Component ─────────────────────
export const FinancialDashboard = () => {
  const [open, setOpen] = useState(false)
  const [snap, setSnap] = useState(getFinancialSnapshot())
  const [stocks, setStocks] = useState(getStocks())
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollPos = useRef(0)
  const animRef = useRef(0)

  useEffect(() => {
    const interval = setInterval(() => {
      const s = getFinancialSnapshot()
      setSnap(s)
      setStocks([...getStocks()])
      tickCompoundInterest(s.netWorth)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Scrolling animation
  useEffect(() => {
    if (!scrollRef.current || !open) return
    const animate = () => {
      if (!scrollRef.current) return
      scrollPos.current -= 0.6
      scrollRef.current.style.transform = `translateX(${scrollPos.current}px)`
      if (scrollPos.current < -scrollRef.current.scrollWidth / 2) scrollPos.current = 0
      animRef.current = requestAnimationFrame(animate)
    }
    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [open])

  const totalChange = stocks.reduce((sum, s) => sum + s.change24h, 0)
  const sentiment = totalChange > 0 ? 'BULLISH' : totalChange < 0 ? 'BEARISH' : 'NEUTRAL'
  const sentimentColor = sentiment === 'BULLISH' ? '#44ff88' : sentiment === 'BEARISH' ? '#ff4466' : '#888'

  return (
    <>
      {/* Always-visible ticker bar */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 90, cursor: 'pointer',
          height: 30, background: 'rgba(5,10,25,0.85)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(68,255,204,0.1)', overflow: 'hidden',
          display: 'flex', alignItems: 'center', fontFamily: 'monospace', fontSize: 11,
        }}
      >
        {/* Sentiment */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4, padding: '0 10px',
          height: '100%', background: 'rgba(5,10,25,0.95)', borderRight: '1px solid rgba(68,255,204,0.08)',
          minWidth: 90, fontWeight: 'bold', letterSpacing: 1, color: sentimentColor,
        }}>
          <span>{sentiment === 'BULLISH' ? '↑' : sentiment === 'BEARISH' ? '↓' : '→'}</span>
          <span style={{ fontSize: 9 }}>{sentiment}</span>
        </div>

        {/* Ticker */}
        <div ref={scrollRef} style={{ display: 'flex', alignItems: 'center', height: '100%', willChange: 'transform' }}>
          {[...stocks, ...stocks].map((stock, i) => (
            <span key={`${stock.symbol}-${i}`} style={{ display: 'inline-flex', alignItems: 'center', margin: '0 8px', whiteSpace: 'nowrap' }}>
              <span style={{ fontWeight: 'bold', color: stock.color, marginRight: 4 }}>{stock.symbol}</span>
              <span style={{ color: '#ccd', marginRight: 4 }}>{stock.price.toFixed(2)}</span>
              <span style={{ color: stock.change24h >= 0 ? '#44ff88' : '#ff4466' }}>
                {stock.change24h >= 0 ? '+' : ''}{(stock.change24h * 100).toFixed(2)}%
              </span>
            </span>
          ))}
        </div>

        {/* Net worth */}
        <div style={{
          marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8,
          padding: '0 10px', height: '100%',
          background: 'rgba(5,10,25,0.95)', borderLeft: '1px solid rgba(68,255,204,0.08)',
          fontWeight: 'bold', fontSize: 12,
        }}>
          <span style={{ color: '#556', fontSize: 9 }}>WORTH</span>
          <span style={{ color: snap.wealthTierColor }}>{snap.netWorth.toLocaleString()}</span>
          <span style={{ color: snap.wealthTierColor, fontSize: 9, opacity: 0.7 }}>{snap.wealthTier}</span>
          <span style={{ color: '#44ff88', fontSize: 9, opacity: 0.5 }}>
            +{snap.compoundInterest.toLocaleString()} interest
          </span>
        </div>
      </div>

      {/* Full dashboard panel */}
      {open && (
        <div style={{
          position: 'fixed', top: 30, left: 0, right: 0, zIndex: 90, maxHeight: 'calc(100vh - 30px)',
          background: 'rgba(5,10,25,0.92)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(68,255,204,0.1)',
          overflow: 'auto', fontFamily: 'monospace', color: '#ccd',
        }}>
          <div style={{ maxWidth: 800, margin: '0 auto', padding: 16 }}>
            {/* ── Net Worth Hero ── */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(68,255,204,0.05), rgba(68,204,255,0.02))',
              borderRadius: 12, border: '1px solid rgba(68,255,204,0.1)', padding: 20, marginBottom: 12,
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: 0, right: 0, width: 200, height: 200,
                background: `radial-gradient(circle, ${snap.wealthTierColor}11, transparent 70%)`,
                pointerEvents: 'none',
              }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                <div>
                  <div style={{ fontSize: 9, color: '#667', letterSpacing: 2, marginBottom: 4 }}>NET WORTH</div>
                  <div style={{ fontSize: 28, fontWeight: 'bold', color: snap.wealthTierColor, letterSpacing: 1 }}>
                    {snap.netWorth.toLocaleString()}
                    <span style={{ fontSize: 12, color: '#556', marginLeft: 6 }}>≈</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 10, color: '#667' }}>
                    <span>Wealth Tier: <span style={{ color: snap.wealthTierColor, fontWeight: 'bold' }}>{snap.wealthTier}</span></span>
                    <span>Compound Interest: <span style={{ color: '#44ff88' }}>+{snap.compoundInterest.toLocaleString()}</span></span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 9, color: '#667', letterSpacing: 1 }}>TIME IS MONEY</div>
                  <div style={{ fontSize: 11, color: '#44ff88', marginTop: 2 }}>
                    Earning {(INTEREST_RATE_PER_SECOND * 100).toFixed(3)}%/s
                  </div>
                </div>
              </div>
            </div>

            {/* ── Assets Grid ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
              {[
                { label: 'Liquid', value: snap.liquidHeld, color: '#44ccff', icon: '≈' },
                { label: 'Raw', value: snap.rawHeld, color: '#ff8844', icon: '⬡' },
                { label: 'Vapour', value: snap.vapourHeld, color: '#ffdd44', icon: '~' },
                { label: 'Crystal', value: snap.crystalHeld, color: '#aa88ff', icon: '◇' },
              ].map(asset => (
                <div key={asset.label} style={{
                  background: 'rgba(255,255,255,0.02)', borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.04)', padding: 10,
                }}>
                  <div style={{ fontSize: 9, color: '#556', marginBottom: 2 }}>{asset.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 'bold', color: asset.color }}>
                    {asset.value.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Investment Holdings ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <div style={{
                background: 'rgba(255,255,255,0.02)', borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.04)', padding: 10,
              }}>
                <div style={{ fontSize: 9, color: '#556', marginBottom: 6 }}>STOCK HOLDINGS</div>
                {stocks.length === 0 ? (
                  <div style={{ fontSize: 10, color: '#445' }}>No stocks held</div>
                ) : stocks.slice(0, 5).map(s => (
                  <div key={s.symbol} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, padding: '2px 0' }}>
                    <span style={{ color: s.color }}>{s.symbol}</span>
                    <span>${s.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.02)', borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.04)', padding: 10,
              }}>
                <div style={{ fontSize: 9, color: '#556', marginBottom: 6 }}>PORTFOLIO</div>
                <div style={{ fontSize: 16, fontWeight: 'bold', color: '#ffd700' }}>
                  {snap.portfolioValue.toLocaleString()}
                </div>
                <div style={{ fontSize: 9, color: '#556', marginTop: 4 }}>
                  Trades: {snap.totalTrades} · Renown: {snap.totalRenown}
                </div>
              </div>
            </div>

            {/* ── Stats & Market ── */}
            <div style={{
              background: 'rgba(255,255,255,0.02)', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.04)', padding: 10,
            }}>
              <div style={{ fontSize: 9, color: '#556', marginBottom: 6 }}>ECONOMY OVERVIEW</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 10 }}>
                <div>Blocks Placed: <span style={{ color: '#aac' }}>{snap.totalBlocksPlaced.toLocaleString()}</span></div>
                <div>Market Sentiment: <span style={{ color: sentimentColor }}>{sentiment}</span></div>
                <div>Active Interest: <span style={{ color: '#44ff88' }}>{(INTEREST_RATE_PER_SECOND * 3600 * 100).toFixed(1)}%/hr</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
