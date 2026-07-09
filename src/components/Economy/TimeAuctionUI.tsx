import { useState, useEffect } from 'react'
import { useStore } from '../../store'
import {
  placeBid,
  _auctionItems, _auctionHistory, _totalBidsPlaced,
} from '../../systems/AuctionSystem'

// ── Auction UI Component ──────────────────────────────
interface TimeAuctionUIProps {
  open: boolean
  onClose: () => void
}

export const TimeAuctionUI = ({ open, onClose }: TimeAuctionUIProps) => {
  const [tab, setTab] = useState<'live' | 'history'>('live')
  const [bidAmounts, setBidAmounts] = useState<Record<string, number>>({})
  const [, forceUpdate] = useState(0)
  const liquid = useStore((s) => Math.floor(s.inventory.liquid))

  useEffect(() => {
    if (!open) return
    const interval = setInterval(() => forceUpdate(n => n + 1), 3000)
    return () => clearInterval(interval)
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-auto">
      <div className="bg-gray-950/95 border border-purple-700/40 rounded-xl shadow-2xl shadow-purple-500/10 w-full max-w-lg mx-4 max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-purple-800/30 flex items-center justify-between bg-gradient-to-r from-purple-950/30 to-gray-950">
          <div>
            <h2 className="text-white font-bold text-lg tracking-wide flex items-center gap-2">
              <span className="text-purple-400">🔨</span> Time Auction House
            </h2>
            <p className="text-purple-500/50 text-xs mt-0.5 font-mono">Bid. Win. Profit.</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1 rounded hover:bg-gray-800">✕</button>
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 120px)' }}>
          {/* Balance */}
          <div className="bg-gray-800/40 rounded-lg p-2 border border-gray-700/30 text-center">
            <span className="text-gray-400 text-[10px] font-mono">Liquid: </span>
            <span className="text-cyan-300 font-mono text-sm">{liquid} ≈</span>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-800">
            {(['live', 'history'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                  tab === t ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-950/20' : 'text-gray-500 hover:text-gray-300'
                }`}>
                {t === 'live' ? `Live (${_auctionItems.length})` : 'History'}
              </button>
            ))}
          </div>

          {tab === 'live' && (
            <div className="space-y-3">
              {_auctionItems.length === 0 ? (
                <p className="text-gray-500 text-xs text-center py-8 font-mono">No active auctions. Check back soon.</p>
              ) : (
                _auctionItems.map((item, i) => {
                  const myBid = bidAmounts[item.id] ?? Math.ceil(item.currentBid * 1.1)
                  const isMine = item.bidder === 'player'
                  const isExpired = item.timeLeft <= 0

                  return (
                    <div key={item.id}
                      className={`bg-gray-800/40 rounded-lg p-4 border transition-all ${
                        isExpired ? 'border-gray-700/20 opacity-50' :
                        isMine ? 'border-green-700/50' : 'border-gray-700/30 hover:border-purple-700/40'
                      }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span style={{ color: item.color }}>{item.icon}</span>
                          <div>
                            <p className="text-white text-sm font-bold" style={{ color: item.color }}>{item.name}</p>
                            <p className="text-gray-500 text-[10px]">{item.description}</p>
                          </div>
                        </div>
                        {!isExpired && (
                          <span className="text-purple-400 text-[10px] font-mono">
                            {Math.ceil(item.timeLeft / 1000)}s
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between mb-2">
                        <div className="text-lg font-mono font-bold tabular-nums" style={{ color: isMine ? '#44ff88' : '#ff8844' }}>
                          {item.currentBid} ≈
                        </div>
                        <div className="text-[10px] font-mono text-gray-500">
                          {isMine ? 'You are winning!' : item.bidderNpc ? `Highest: ${item.bidderNpc}` : 'No bids'}
                        </div>
                      </div>

                      {!isExpired && (
                        <div className="flex items-center gap-2">
                          <button onClick={() => setBidAmounts(p => ({ ...p, [item.id]: Math.max(item.currentBid + 1, myBid - 5) }))}
                            className="w-6 h-6 rounded bg-gray-800 text-white hover:bg-gray-700 text-xs">−</button>
                          <span className="text-white font-mono text-sm w-14 text-center">{myBid}</span>
                          <button onClick={() => setBidAmounts(p => ({ ...p, [item.id]: myBid + 5 }))}
                            className="w-6 h-6 rounded bg-gray-800 text-white hover:bg-gray-700 text-xs">+</button>
                          <button onClick={() => { placeBid(i, myBid); forceUpdate(n => n + 1) }}
                            disabled={liquid < myBid || myBid <= item.currentBid}
                            className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 ${
                              liquid >= myBid && myBid > item.currentBid
                                ? 'bg-purple-700/50 hover:bg-purple-600 text-purple-300'
                                : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                            }`}>
                            Bid {myBid} ≈
                          </button>
                        </div>
                      )}

                      {isExpired && isMine && (
                        <p className="text-green-400 text-[10px] font-mono">✓ Won! Award delivered.</p>
                      )}
                      {isExpired && !isMine && (
                        <p className="text-gray-500 text-[10px] font-mono">Auction ended. {item.bidderNpc ?? 'Nobody'} won.</p>
                      )}

                      {/* Time bar */}
                      {!isExpired && (
                        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden mt-1">
                          <div className="h-full rounded-full bg-purple-500 transition-all duration-1000"
                            style={{ width: `${(item.timeLeft / item.totalDuration) * 100}%` }} />
                        </div>
                      )}
                    </div>
                  )
                })
              )}

              <div className="text-center text-[9px] text-gray-600 font-mono">
                Total bids: {_totalBidsPlaced}
              </div>
            </div>
          )}

          {tab === 'history' && (
            <div className="space-y-2">
              {_auctionHistory.length === 0 ? (
                <p className="text-gray-500 text-xs text-center py-8 font-mono">No auction history yet.</p>
              ) : (
                _auctionHistory.slice(-10).reverse().map((item, i) => (
                  <div key={`hist-${item.id}-${i}`} className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/30">
                    <div className="flex items-center justify-between">
                      <span className="text-white text-sm font-medium" style={{ color: item.color }}>
                        {item.icon} {item.name}
                      </span>
                      <span className="font-mono text-sm" style={{ color: item.bidder === 'player' ? '#44ff88' : '#ff6644' }}>
                        {item.currentBid} ≈ {item.bidder === 'player' ? '(You)' : item.bidderNpc ?? ''}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-2.5 border-t border-gray-800 text-center">
          <p className="text-gray-600 text-[9px] font-mono">
            <kbd className="bg-gray-800 text-gray-400 px-1 rounded text-[8px]">L</kbd> Auctions
            {' · '}NPCs bid against you · Items refresh automatically
          </p>
        </div>
      </div>
    </div>
  )
}
