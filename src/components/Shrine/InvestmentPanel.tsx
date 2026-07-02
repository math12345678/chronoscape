import { useCallback, useState } from 'react'
import { useStore } from '../../store'
import type { UpgradeId } from '../../store'
import { useSoundEngine } from '../../hooks/useSoundEngine'

const UPGRADE_INFO: Record<UpgradeId, {
  label: string
  description: string
  icon: string
  color: string
  gradient: string
  resourceIcon: string
}> = {
  capacityBoost: {
    label: 'Time Vault',
    description: '+25 max capacity per level',
    icon: '⬡',
    color: '#ff8844',
    gradient: 'from-orange-500 to-amber-600',
    resourceIcon: '⟐',
  },
  haste: {
    label: 'Haste',
    description: '+10% move speed per level',
    icon: '⚡',
    color: '#ffaa00',
    gradient: 'from-amber-400 to-yellow-500',
    resourceIcon: '⟡',
  },
  magnitude: {
    label: 'Magnitude',
    description: '+5 harvest per level',
    icon: '◎',
    color: '#4488ff',
    gradient: 'from-blue-500 to-cyan-600',
    resourceIcon: '≈',
  },
  endurance: {
    label: 'Endurance',
    description: '-10% decay rate per level',
    icon: '◈',
    color: '#aa88ff',
    gradient: 'from-violet-500 to-purple-600',
    resourceIcon: '◆',
  },
}

interface InvestmentPanelProps {
  onClose: () => void
}

export const InvestmentPanel = ({ onClose }: InvestmentPanelProps) => {
  const inventory = useStore((s) => s.inventory)
  const upgrades = useStore((s) => s.upgrades)
  const purchaseUpgrade = useStore((s) => s.purchaseUpgrade)
  const getUpgradeCost = useStore((s) => s.getUpgradeCost)
  const [message, setMessage] = useState<string | null>(null)

  const showMessage = useCallback((text: string) => {
    setMessage(text)
    setTimeout(() => setMessage(null), 2000)
  }, [])

  const handlePurchase = useCallback((id: UpgradeId) => {
    const level = upgrades[id]
    if (level >= 5) {
      showMessage('Maximum level reached!')
      return
    }
    const success = purchaseUpgrade(id)
    if (success) {
      showMessage(`${UPGRADE_INFO[id].label} upgraded to level ${level + 1}!`)
    } else {
      showMessage('Not enough resources!')
    }
  }, [upgrades, purchaseUpgrade, showMessage])

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="bg-gray-900/95 border border-amber-700/40 rounded-xl shadow-2xl shadow-amber-500/10 overflow-hidden" style={{ width: 420, maxHeight: '85vh' }}>
          {/* Header */}
          <div className="px-5 py-4 border-b border-amber-800/30 flex items-center justify-between bg-gradient-to-r from-amber-950/40 to-gray-900">
            <div>
              <h2 className="text-white font-bold text-lg tracking-wide flex items-center gap-2">
                <span className="text-amber-400">⬡</span> Time Shrine
              </h2>
              <p className="text-amber-400/60 text-xs mt-0.5 font-mono">
                Invest time. Earn eternity.
              </p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1 rounded hover:bg-gray-800">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4l10 10M14 4l-10 10" />
              </svg>
            </button>
          </div>

          {/* Resources display */}
          <div className="px-5 py-3 bg-gray-950/50 border-b border-gray-800/30">
            <div className="grid grid-cols-4 gap-2 text-center">
              {(['raw', 'vapour', 'liquid', 'crystal'] as const).map((key) => (
                <div key={key} className="bg-gray-800/40 rounded p-1.5">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">{key}</p>
                  <p className="text-white font-mono text-sm tabular-nums">
                    {Math.floor(inventory[key])}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Upgrade cards */}
          <div className="px-5 py-4 space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 180px)' }}>
            {(Object.keys(UPGRADE_INFO) as UpgradeId[]).map((id) => {
              const info = UPGRADE_INFO[id]
              const level = upgrades[id]
              const isMax = level >= 5
              const cost = getUpgradeCost(id, level + 1)
              const canAfford = !isMax && (
                (!cost.raw || inventory.raw >= cost.raw) &&
                (!cost.vapour || inventory.vapour >= cost.vapour) &&
                (!cost.liquid || inventory.liquid >= cost.liquid) &&
                (!cost.crystal || inventory.crystal >= cost.crystal)
              )

              return (
                <div
                  key={id}
                  className={`
                    relative rounded-lg border transition-all duration-200 overflow-hidden
                    ${isMax
                      ? 'border-green-700/30 bg-green-900/15'
                      : canAfford
                        ? 'border-gray-700/50 bg-gray-800/50 hover:border-amber-700/50 hover:bg-gray-800/70'
                        : 'border-gray-700/30 bg-gray-800/30 opacity-60'
                    }
                  `}
                >
                  {/* Colored accent */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${info.gradient}`} />

                  <div className="pl-4 pr-4 py-3">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg" style={{ color: info.color }}>{info.icon}</span>
                        <span className="text-white font-bold text-sm uppercase tracking-wider">
                          {info.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Level dots */}
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((l) => (
                            <div
                              key={l}
                              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                l <= level
                                  ? 'bg-amber-400 shadow-sm shadow-amber-400/30'
                                  : 'bg-gray-700'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-mono text-gray-400">
                          {level}/5
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-gray-500 text-[11px] mb-2">{info.description}</p>

                    {/* Cost + Buy button */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[11px]">
                        {isMax ? (
                          <span className="text-green-400 font-bold">✓ MAXED</span>
                        ) : (
                          <>
                            {cost.raw && (
                              <span className="text-orange-400 font-mono">
                                <span className="text-gray-500">⟐</span> {cost.raw}
                              </span>
                            )}
                            {cost.vapour && (
                              <span className="text-amber-400 font-mono">
                                <span className="text-gray-500">⟡</span> {cost.vapour}
                              </span>
                            )}
                            {cost.liquid && (
                              <span className="text-blue-400 font-mono">
                                <span className="text-gray-500">≈</span> {cost.liquid}
                              </span>
                            )}
                            {cost.crystal && (
                              <span className="text-violet-400 font-mono">
                                <span className="text-gray-500">◆</span> {cost.crystal}
                              </span>
                            )}
                          </>
                        )}
                      </div>

                      <button
                        onClick={() => handlePurchase(id)}
                        disabled={!canAfford || isMax}
                        className={`
                          px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider
                          transition-all duration-150
                          ${isMax
                            ? 'bg-green-900/30 text-green-400 cursor-default'
                            : canAfford
                              ? `bg-gradient-to-r ${info.gradient} text-white shadow-lg hover:brightness-110 active:scale-95`
                              : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                          }
                        `}
                      >
                        {isMax ? 'Owned' : canAfford ? 'Invest' : 'Need More'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Time Bonds section */}
            <TimeBondsSection />
          </div>

          {/* Message */}
          {message && (
            <div className="px-5 py-2 text-center">
              <p className="text-amber-400 text-xs font-mono animate-pulse">{message}</p>
            </div>
          )}

          {/* Footer */}
          <div className="px-5 py-2.5 border-t border-gray-800 text-center">
            <p className="text-gray-600 text-[10px] font-mono">
              <kbd className="bg-gray-800 text-gray-400 px-1 rounded text-[9px]">I</kbd> Toggle Shrine
              {' · '}Investments persist forever
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

/** Time Bonds — stake raw for a duration and earn returns */
const TimeBondsSection = () => {
  const inventory = useStore((s) => s.inventory)
  const timeBonds = useStore((s) => s.timeBonds)
  const createBond = useStore((s) => s.createBond)
  const claimBond = useStore((s) => s.claimBond)
  const getPendingBondReturns = useStore((s) => s.getPendingBondReturns)
  const sounds = useSoundEngine()
  const [bondAmount, setBondAmount] = useState(10)
  const [bondDuration, setBondDuration] = useState<'short' | 'medium' | 'long'>('short')
  const [message, setMessage] = useState<string | null>(null)

  const durationMs = bondDuration === 'short' ? 30_000 : bondDuration === 'medium' ? 120_000 : 300_000
  const durationLabel = bondDuration === 'short' ? '30s' : bondDuration === 'medium' ? '2m' : '5m'
  const interestRate = bondDuration === 'short' ? 0.15 : bondDuration === 'medium' ? 0.30 : 0.50
  const returns = Math.floor(bondAmount * interestRate)
  const canBond = inventory.raw >= bondAmount

  return (
    <div className="border-t border-amber-800/20 pt-3 mt-4">
      <h3 className="text-amber-400/80 text-xs uppercase tracking-wider font-bold mb-3 flex items-center gap-1.5">
        <span>⏳</span> Time Bonds
        <span className="text-gray-600 text-[9px] font-mono font-normal normal-case">Stake raw, earn interest</span>
      </h3>

      {/* Create bond */}
      <div className="bg-gray-800/30 border border-gray-700/40 rounded-lg p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBondAmount(Math.max(5, bondAmount - 5))}
              className="w-6 h-6 rounded bg-gray-800 text-white hover:bg-gray-700 text-xs"
            >−</button>
            <span className="text-white font-mono text-sm w-12 text-center">{bondAmount}</span>
            <button
              onClick={() => setBondAmount(Math.min(200, bondAmount + 5))}
              className="w-6 h-6 rounded bg-gray-800 text-white hover:bg-gray-700 text-xs"
            >+</button>
            <span className="text-gray-500 text-xs">⟐ Raw</span>
          </div>
          <div className="flex gap-1">
            {(['short', 'medium', 'long'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setBondDuration(d)}
                className={`text-[10px] px-2 py-1 rounded transition-all ${
                  bondDuration === d
                    ? 'bg-amber-900/40 text-amber-300 border border-amber-700/50'
                    : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/60 border border-gray-700/30'
                }`}
              >
                {d === 'short' ? '30s' : d === 'medium' ? '2m' : '5m'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] mb-2">
          <span className="text-gray-500">
            Interest: <span className="text-green-400 font-mono">{(interestRate * 100).toFixed(0)}%</span>
            {' → '}
            <span className="text-green-300 font-mono">+{returns} ⟐</span>
          </span>
          <button
            onClick={() => {
              const success = createBond(bondAmount, durationMs)
              if (success) {
                setMessage(`Bond created! +${returns} Raw in ${durationLabel}`)
              } else {
                setMessage('Not enough Raw!')
              }
              setTimeout(() => setMessage(null), 2000)
            }}
            disabled={!canBond}
            className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all ${
              canBond
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white hover:brightness-110 active:scale-95'
                : 'bg-gray-800 text-gray-600 cursor-not-allowed'
            }`}
          >
            Create Bond
          </button>
        </div>

        {message && (
          <p className="text-amber-400/70 text-[10px] text-center font-mono">{message}</p>
        )}
      </div>

      {/* Active bonds */}
      {timeBonds.length > 0 && (
        <div className="space-y-1.5">
          {timeBonds.map((bond, i) => {
            const elapsed = Date.now() - bond.createdAt
            const progress = Math.min(1, elapsed / bond.duration)
            const matured = elapsed >= bond.duration
            const pendingReturns = getPendingBondReturns(i)

            return (
              <div key={bond.id} className={`flex items-center gap-2 bg-gray-800/20 rounded px-3 py-2 border ${bond.claimed ? 'border-green-900/30' : 'border-gray-700/30'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-xs font-mono">
                      {bond.amount} ⟐
                    </span>
                    <span className={`text-[10px] font-mono ${matured ? 'text-green-400' : bond.claimed ? 'text-gray-600' : 'text-gray-500'}`}>
                      {bond.claimed ? 'Claimed' : matured ? 'Matured!' : `${(progress * 100).toFixed(0)}%`}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden mt-1">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        bond.claimed ? 'bg-green-800' : matured ? 'bg-green-400' : 'bg-amber-500'
                      }`}
                      style={{ width: `${progress * 100}%` }}
                    />
                  </div>
                  <p className="text-gray-600 text-[9px] font-mono mt-0.5">
                    +{Math.floor(bond.amount * bond.interestRate)} ⟐ at {durationLabel}
                  </p>
                </div>
                {matured && !bond.claimed && (
                  <button
                    onClick={() => {
                      claimBond(i)
                      sounds.bondMature()
                    }}
                    className="px-2 py-1 bg-green-700/40 text-green-300 text-[10px] rounded hover:bg-green-700/60 transition-all"
                  >
                    Claim
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
