import { useState, useEffect } from 'react'
import { useStore } from '../../store'
import { EXECUTIVE_DECISIONS, BOARD_MEMBERS } from '../../config/finance'
import type { ExecutiveDecision, BoardMember } from '../../config/finance'
import { getFinancialSnapshot } from './StockTicker'
import {
  isOnCooldown, executeDecision, hireBoardMember, getActiveBoosts,
  getActiveEffects, getTotalDividendsPaid, getHiredBoardMemberCount,
  _activeEffects, _totalDividendsPaid,
} from '../../systems/CEOSystem'

// ── CEO UI Component ──────────────────────────────────
interface CEOOfficeUIProps {
  open: boolean
  onClose: () => void
}

export const CEOOfficeUI = ({ open, onClose }: CEOOfficeUIProps) => {
  const [tab, setTab] = useState<'decisions' | 'board'>('decisions')
  const [, forceUpdate] = useState(0)
  const inventory = useStore((s) => s.inventory)

  useEffect(() => {
    if (!open) return
    const interval = setInterval(() => forceUpdate(n => n + 1), 2000)
    return () => clearInterval(interval)
  }, [open])

  const snapshot = getFinancialSnapshot()
  const now = Date.now()

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-auto">
      <div className="bg-gray-950/95 border border-yellow-700/40 rounded-xl shadow-2xl shadow-yellow-500/10 w-full max-w-lg mx-4 max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-yellow-800/30 flex items-center justify-between bg-gradient-to-r from-yellow-950/30 to-gray-950">
          <div>
            <h2 className="text-white font-bold text-lg tracking-wide flex items-center gap-2">
              <span className="text-yellow-400">🏢</span> CEO Office
            </h2>
            <p className="text-yellow-500/50 text-xs mt-0.5 font-mono">Lead your empire.</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1 rounded hover:bg-gray-800">✕</button>
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 120px)' }}>
          {/* Net worth */}
          <div className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/30 text-center">
            <p className="text-[10px] text-gray-500 font-mono">Net Worth</p>
            <p className="text-2xl font-bold font-mono tabular-nums" style={{ color: snapshot.wealthTierColor }}>
              {snapshot.netWorth.toLocaleString()}
            </p>
            <p className="text-[9px] font-mono" style={{ color: snapshot.wealthTierColor }}>{snapshot.wealthTier}</p>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-800">
            {(['decisions', 'board'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                  tab === t ? 'text-yellow-400 border-b-2 border-yellow-400 bg-yellow-950/20' : 'text-gray-500 hover:text-gray-300'
                }`}>
                {t === 'decisions' ? 'Executive Decisions' : 'Board of Directors'}
              </button>
            ))}
          </div>

          {tab === 'decisions' && (
            <div className="space-y-2">
              {EXECUTIVE_DECISIONS.map((decision) => {
                const onCooldown = isOnCooldown(decision.id)
                const active = _activeEffects.find(e => e.decisionId === decision.id)
                const remaining = active ? Math.max(0, Math.ceil((active.expiresAt - now) / 1000)) : 0
                const canAfford = (
                  (!decision.cost.raw || inventory.raw >= decision.cost.raw) &&
                  (!decision.cost.liquid || inventory.liquid >= decision.cost.liquid) &&
                  (!decision.cost.crystal || inventory.crystal >= decision.cost.crystal) &&
                  (!decision.cost.renown || inventory.renown >= decision.cost.renown)
                )

                return (
                  <div key={decision.id}
                    className={`bg-gray-800/40 rounded-lg p-3 border transition-all ${
                      onCooldown ? 'border-gray-700/20 opacity-50' :
                      canAfford ? 'border-gray-700/40 hover:border-yellow-700/50' : 'border-gray-700/20 opacity-60'
                    }`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span>{decision.icon}</span>
                        <div>
                          <p className="text-white text-sm font-bold" style={{ color: decision.color }}>{decision.name}</p>
                          <p className="text-gray-500 text-[10px]">{decision.description}</p>
                        </div>
                      </div>
                      <button onClick={() => { executeDecision(decision.id); forceUpdate(n => n + 1) }}
                        disabled={!canAfford || onCooldown}
                        className={`px-2 py-1 text-[9px] font-bold uppercase rounded-lg transition-all ${
                          onCooldown ? 'bg-gray-800 text-gray-600 cursor-not-allowed' :
                          canAfford ? 'bg-yellow-700/50 hover:bg-yellow-600 text-yellow-300' :
                          'bg-gray-800 text-gray-600 cursor-not-allowed'
                        }`}>
                        {onCooldown ? `${Math.ceil((active ? (active.expiresAt - now + decision.cooldown - decision.effect.duration) : 0) / 1000)}s` : 'Execute'}
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-gray-600 font-mono">
                      <span>
                        Cost: {decision.cost.liquid ? `${decision.cost.liquid}≈ ` : ''}{decision.cost.crystal ? `${decision.cost.crystal}◆ ` : ''}
                        {decision.cost.renown ? `${decision.cost.renown}✦` : ''}
                      </span>
                      {active && <span className="text-green-400">{remaining}s remaining</span>}
                    </div>
                  </div>
                )
              })}

              {_activeEffects.length > 0 && (
                <div className="text-center text-[9px] text-green-400 font-mono">
                  {_activeEffects.length} active boost(s)
                </div>
              )}

              <div className="text-center text-[9px] text-gray-600 font-mono">
                Total dividends paid: {_totalDividendsPaid} ≈
              </div>
            </div>
          )}

          {tab === 'board' && (
            <div className="space-y-2">
              <p className="text-gray-500 text-[10px] font-mono mb-2">
                Hire executives to unlock permanent bonuses.
              </p>
              {BOARD_MEMBERS.map((member) => (
                <div key={member.id}
                  className={`bg-gray-800/40 rounded-lg p-3 border transition-all ${
                    member.hired ? 'border-green-700/30' : 'border-gray-700/30 hover:border-yellow-700/40'
                  }`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span>{member.icon}</span>
                      <div>
                        <p className="text-white text-sm font-medium">
                          {member.name} <span className="text-gray-500 text-[10px]">({member.title})</span>
                        </p>
                        <p className="text-gray-500 text-[10px]">{member.description}</p>
                      </div>
                    </div>
                    {member.hired ? (
                      <span className="text-green-400 text-[10px] font-bold">✓ Hired</span>
                    ) : (
                      <button onClick={() => { hireBoardMember(member.id); forceUpdate(n => n + 1) }}
                        disabled={inventory.renown < member.hireCost.renown}
                        className={`px-2 py-1 text-[9px] font-bold uppercase rounded-lg transition-all ${
                          inventory.renown >= member.hireCost.renown
                            ? 'bg-yellow-700/50 hover:bg-yellow-600 text-yellow-300'
                            : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                        }`}>
                        Hire ({member.hireCost.renown}✦{member.hireCost.liquid ? `+${member.hireCost.liquid}≈` : ''}{member.hireCost.crystal ? `+${member.hireCost.crystal}◆` : ''})
                      </button>
                    )}
                  </div>
                  <div className="text-[9px] text-gray-600 font-mono">
                    Bonus: +{((member.bonus.value - 1) * 100).toFixed(0)}% {member.bonus.type.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-2.5 border-t border-gray-800 text-center">
          <p className="text-gray-600 text-[9px] font-mono">
            <kbd className="bg-gray-800 text-gray-400 px-1 rounded text-[8px]">O</kbd> CEO Office
            {' · '}Decisions have cooldowns · Board members are permanent
          </p>
        </div>
      </div>
    </div>
  )
}
