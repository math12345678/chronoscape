import { useState, useEffect, useCallback } from 'react'
import { useStore } from '../../store'
import { INITIAL_STOCKS, FUNDS } from '../../config/economy'
import type { StockSymbol, FundId, PortfolioEntry } from '../../config/economy'
import { useSoundEngine } from '../../hooks/useSoundEngine'
import {
  getStocks, getPortfolio, getTotalTrades, getStockHoldings, getStockValue,
  tickMarket, buyStock, sellStock, investInFund, withdrawFromFund,
  getPortfolioValue, getPortfolioPnL,
  _stocks, _portfolio, _totalTrades, _stockHoldings,
} from '../../systems/ExchangeSystem'

// ── React Component ────────────────────────────────────
interface TimeExchangeUIProps {
  open: boolean
  onClose: () => void
}

export const TimeExchangeUI = ({ open, onClose }: TimeExchangeUIProps) => {
  const [tab, setTab] = useState<'market' | 'portfolio' | 'funds'>('market')
  const [tradeSymbol, setTradeSymbol] = useState<StockSymbol>('RAW')
  const [tradeAmount, setTradeAmount] = useState(1)
  const [message, setMessage] = useState('')
  const [, forceUpdate] = useState(0)
  const liquid = useStore((s) => Math.floor(s.inventory.liquid))
  const raw = useStore((s) => Math.floor(s.inventory.raw))
  const sounds = useSoundEngine()

  // Re-render every 3s for market updates
  useEffect(() => {
    if (!open) return
    const interval = setInterval(() => forceUpdate(n => n + 1), 3000)
    return () => clearInterval(interval)
  }, [open])

  const showMessage = useCallback((text: string) => {
    setMessage(text)
    setTimeout(() => setMessage(''), 2000)
  }, [])

  const selectedStock = _stocks.find(s => s.symbol === tradeSymbol)
  const portfolioValue = getPortfolioValue()
  const pnl = getPortfolioPnL()

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-auto">
      <div className="bg-gray-950/95 border border-cyan-700/40 rounded-xl shadow-2xl shadow-cyan-500/10 w-full max-w-lg mx-4 max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-cyan-800/30 flex items-center justify-between bg-gradient-to-r from-cyan-950/30 to-gray-950">
          <div>
            <h2 className="text-white font-bold text-lg tracking-wide flex items-center gap-2">
              <span className="text-cyan-400">⟐</span> Time Exchange
            </h2>
            <p className="text-cyan-500/50 text-xs mt-0.5 font-mono">Time is money. Trade wisely.</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1 rounded hover:bg-gray-800">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4l10 10M14 4l-10 10" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          {(['market', 'portfolio', 'funds'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                tab === t ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-950/20' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t === 'market' ? 'Market' : t === 'portfolio' ? 'Portfolio' : 'Funds'}
            </button>
          ))}
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 140px)' }}>
          {/* Balance indicators */}
          <div className="flex gap-2 text-[10px] font-mono">
            <div className="flex-1 bg-gray-800/40 rounded p-2 border border-gray-700/30">
              <span className="text-gray-500">Liquid </span>
              <span className="text-cyan-300">{liquid}</span>
            </div>
            <div className="flex-1 bg-gray-800/40 rounded p-2 border border-gray-700/30">
              <span className="text-gray-500">Raw </span>
              <span className="text-orange-300">{raw}</span>
            </div>
            <div className="flex-1 bg-gray-800/40 rounded p-2 border border-gray-700/30">
              <span className="text-gray-500">Portfolio </span>
              <span className={pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                {Math.floor(portfolioValue)}
              </span>
            </div>
          </div>

          {tab === 'market' && (
            <>
              {/* Stock ticker table */}
              <div className="space-y-1.5">
                {_stocks.map((stock) => (
                  <div key={stock.symbol}
                    className={`bg-gray-800/40 rounded-lg p-3 border transition-all cursor-pointer hover:bg-gray-700/40 ${
                      tradeSymbol === stock.symbol ? 'border-cyan-700/50' : 'border-gray-700/30'
                    }`}
                    onClick={() => setTradeSymbol(stock.symbol)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span style={{ color: stock.color }}>{stock.icon}</span>
                        <div>
                          <p className="text-white text-sm font-bold">{stock.symbol}</p>
                          <p className="text-gray-500 text-[10px]">{stock.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-mono text-sm tabular-nums">
                          {stock.price.toFixed(2)}
                        </p>
                        <p className={`text-[10px] font-mono ${stock.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {stock.change24h >= 0 ? '+' : ''}{(stock.change24h * 100).toFixed(2)}%
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[9px] text-gray-600 font-mono">
                      <span>Vol: {stock.volume.toFixed(0)}</span>
                      <span>Volatility: {(stock.volatility * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Trade controls */}
              {selectedStock && (
                <div className="bg-gray-800/50 border border-gray-700/40 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white text-sm font-bold" style={{ color: selectedStock.color }}>
                      {selectedStock.icon} {selectedStock.symbol} @ {selectedStock.price.toFixed(2)}
                    </span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setTradeAmount(Math.max(1, tradeAmount - 1))}
                        className="w-6 h-6 rounded bg-gray-800 text-white hover:bg-gray-700 text-xs">−</button>
                      <span className="text-white font-mono text-sm w-10 text-center">{tradeAmount}</span>
                      <button onClick={() => setTradeAmount(Math.min(100, tradeAmount + 1))}
                        className="w-6 h-6 rounded bg-gray-800 text-white hover:bg-gray-700 text-xs">+</button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { buyStock(tradeSymbol, tradeAmount) ? showMessage(`Bought ${tradeAmount} ${tradeSymbol}`) : showMessage('Not enough Liquid!') }}
                      className="flex-1 px-3 py-2 bg-green-700/50 hover:bg-green-600/60 text-green-300 rounded-lg text-xs font-bold uppercase tracking-wider transition-all active:scale-95">
                      Buy ({(selectedStock.price * tradeAmount).toFixed(0)}≈)
                    </button>
                    <button onClick={() => { sellStock(tradeSymbol, tradeAmount) ? showMessage(`Sold ${tradeAmount} ${tradeSymbol}`) : showMessage('No position to sell!') }}
                      className="flex-1 px-3 py-2 bg-red-700/50 hover:bg-red-600/60 text-red-300 rounded-lg text-xs font-bold uppercase tracking-wider transition-all active:scale-95">
                      Sell (+{(selectedStock.price * tradeAmount).toFixed(0)}≈)
                    </button>
                  </div>
                  <p className="text-gray-600 text-[10px] text-center mt-1">
                    {tradeAmount} shares × {selectedStock.price.toFixed(2)} = {(selectedStock.price * tradeAmount).toFixed(1)} Liquid
                  </p>
                </div>
              )}

              {/* Trades counter */}
              <p className="text-center text-[10px] text-gray-600 font-mono">
                Total trades made: {_totalTrades}
              </p>
            </>
          )}

          {tab === 'portfolio' && (
            <>
              {/* Portfolio summary */}
              <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-700/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-xs uppercase tracking-wider">Total Value</span>
                  <span className="text-white text-lg font-mono tabular-nums">{Math.floor(portfolioValue)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-xs">P&amp;L</span>
                  <span className={`font-mono text-sm tabular-nums ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {pnl >= 0 ? '+' : ''}{Math.floor(pnl)} ({pnl !== 0 && portfolioValue > 0 ? ((pnl / (portfolioValue - pnl)) * 100).toFixed(1) : '0.0'}%)
                  </span>
                </div>
              </div>

              {/* Portfolio entries */}
              {_portfolio.length === 0 ? (
                <p className="text-gray-500 text-xs text-center py-8 font-mono">
                  No investments yet. Trade on the Market or invest in Funds.
                </p>
              ) : (
                _portfolio.map((entry) => {
                  const fund = FUNDS[entry.fundId]
                  const returnPct = entry.principal > 0 ? ((entry.currentValue - entry.principal) / entry.principal) * 100 : 0
                  return (
                    <div key={entry.fundId} className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/30">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white text-sm font-medium" style={{ color: fund.color }}>
                          {fund.icon} {fund.name}
                        </span>
                        <span className={`text-xs font-mono ${returnPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {returnPct >= 0 ? '+' : ''}{returnPct.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-500 font-mono">
                        <span>In: {entry.principal} ⟐</span>
                        <span>Now: {Math.floor(entry.currentValue)} ⟐</span>
                      </div>
                      <div className="mt-1 flex gap-1">
                        <button onClick={() => { const w = withdrawFromFund(entry.fundId); if (w > 0) showMessage(`Withdrew ${w} Raw from ${fund.name}`) }}
                          className="text-[9px] uppercase tracking-wider px-2 py-1 bg-gray-700/50 hover:bg-gray-600 text-gray-400 rounded transition-all">
                          Withdraw {entry.currentValue < entry.principal ? '(locked)' : '-10% fee'}
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </>
          )}

          {tab === 'funds' && (
            <>
              <p className="text-gray-500 text-[10px] font-mono mb-3">
                Invest Raw time into managed funds. Returns fluctuate daily.
              </p>
              {(Object.values(FUNDS) as Array<{ id: FundId; name: string; description: string; dailyReturn: number; risk: number; minDeposit: number; maxDeposit: number; color: string; icon: string }>).map((fund) => {
                const existing = _portfolio.find(e => e.fundId === fund.id)
                return (
                  <div key={fund.id} className="bg-gray-800/40 rounded-lg p-4 border border-gray-700/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span>{fund.icon}</span>
                        <div>
                          <p className="text-white text-sm font-bold" style={{ color: fund.color }}>{fund.name}</p>
                          <p className="text-gray-500 text-[10px]">{fund.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 text-xs font-mono">+{(fund.dailyReturn * 100).toFixed(1)}%/d</p>
                        <p className="text-gray-500 text-[9px] font-mono">Risk: {(fund.risk * 100).toFixed(0)}%</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono mb-2">
                      <span>Min: {fund.minDeposit} ⟐</span>
                      <span>Max: {fund.maxDeposit} ⟐</span>
                      {existing && <span className="text-cyan-400">Invested: {existing.principal} ⟐</span>}
                    </div>

                    {!existing && (
                      <button onClick={() => {
                        const amt = Math.min(fund.maxDeposit, Math.max(fund.minDeposit, 50))
                        investInFund(fund.id, amt) ? showMessage(`Invested ${amt} Raw in ${fund.name}!`) : showMessage('Not enough Raw or below minimum!')
                      }}
                        className="w-full py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95"
                        style={{ backgroundColor: fund.color + '30', color: fund.color }}
                      >
                        Invest {fund.minDeposit}-{fund.maxDeposit} ⟐
                      </button>
                    )}
                  </div>
                )
              })}
            </>
          )}

          {/* Message */}
          {message && (
            <div className="text-center text-xs text-cyan-400 animate-pulse font-mono">
              {message}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-gray-800 text-center">
          <p className="text-gray-600 text-[9px] font-mono">
            <kbd className="bg-gray-800 text-gray-400 px-1 rounded text-[8px]">E</kbd> Exchange
            {' · '}Market refreshes every 3s · Prices move with supply &amp; demand
          </p>
        </div>
      </div>
    </div>
  )
}
