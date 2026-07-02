import { useCallback } from 'react'
import { useStore } from '../../store'
import { CAPACITY, REFINE_RATIOS } from '../../config/constants'
import type { TimeState } from '../../store'

const PANEL_WIDTH = 360

const REFINE_OPTIONS: {
  key: TimeState
  label: string
  color: string
  gradient: string
  icon: string
  description: string
}[] = [
  {
    key: 'vapour',
    label: 'Vapour',
    color: '#ffaa00',
    gradient: 'from-amber-500 to-amber-600',
    icon: '⟡',
    description: 'Volatile · builds temporary structures · decays over time',
  },
  {
    key: 'liquid',
    label: 'Liquid',
    color: '#4488ff',
    gradient: 'from-blue-500 to-blue-600',
    icon: '≈',
    description: 'Stable · heals NPCs · trading currency',
  },
  {
    key: 'crystal',
    label: 'Crystal',
    color: '#aa88ff',
    gradient: 'from-violet-500 to-violet-600',
    icon: '◆',
    description: 'Permanent · Lab discovery required',
  },
]

interface RefinePanelProps {
  onClose: () => void
}

export const RefinePanel = ({ onClose }: RefinePanelProps) => {
  const inventory = useStore((s) => s.inventory)
  const refine = useStore((s) => s.refine)
  const formulaDiscovered = useStore((s) => s.formulaDiscovered)

  const canRefineTo = useCallback(
    (to: TimeState) => {
      if (to === 'crystal' && !formulaDiscovered('crystallization')) return false
      const cost = REFINE_RATIOS[to]
      return inventory.raw >= cost
    },
    [inventory.raw, formulaDiscovered],
  )

  const handleRefine = useCallback(
    (to: TimeState) => {
      const ratio = REFINE_RATIOS[to]
      const maxAfford = Math.floor(inventory.raw / ratio)
      if (maxAfford > 0) {
        // Sound plays from RefineVFXManager, in sync with the particle puff
        refine(to, maxAfford)
      }
    },
    [refine, inventory.raw],
  )

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: PANEL_WIDTH }}
      >
        <div className="bg-gray-900/95 border border-gray-700/50 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <div>
              <h2 className="text-white font-bold text-lg tracking-wide">Refine</h2>
              <p className="text-gray-500 text-xs mt-0.5">
                Convert Raw Time into usable states
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white transition-colors p-1 rounded hover:bg-gray-800"
              title="Close (Esc)"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4l10 10M14 4l-10 10" />
              </svg>
            </button>
          </div>

          {/* Raw gauge */}
          <div className="px-5 py-3 bg-gray-900/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-orange-400 text-xs font-bold uppercase tracking-wider">Raw Available</span>
              <span className="text-white font-mono text-sm tabular-nums">
                {Math.floor(inventory.raw)}
                <span className="text-gray-600"> / {CAPACITY.raw}</span>
              </span>
            </div>
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${(inventory.raw / CAPACITY.raw) * 100}%`,
                  background: 'linear-gradient(90deg, #ff8844, #ffaa44)',
                }}
              />
            </div>
          </div>

          {/* Refine options */}
          <div className="px-5 py-4 space-y-3">
            {REFINE_OPTIONS.map((opt) => {
              const locked = opt.key === 'crystal' && !formulaDiscovered('crystallization')
              const canAfford = canRefineTo(opt.key)
              const isDisabled = locked || !canAfford || inventory.raw === 0
              const ratio = REFINE_RATIOS[opt.key]
              const maxProduce = Math.floor(inventory.raw / ratio)
              const currentAmount = Math.floor(
                inventory[opt.key as keyof typeof inventory] as number,
              )
              const capacity = CAPACITY[opt.key as keyof typeof CAPACITY] ?? 100

              return (
                <div
                  key={opt.key}
                  className={`
                    relative rounded-lg border transition-all duration-200 overflow-hidden
                    ${locked
                      ? 'border-gray-700/50 bg-gray-800/30 opacity-50'
                      : canAfford
                        ? 'border-gray-700/60 bg-gray-800/60 hover:border-gray-600 hover:bg-gray-800/80'
                        : 'border-gray-700/30 bg-gray-800/30 opacity-60'
                    }
                  `}
                >
                  {/* Colored left accent */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${opt.gradient}`}
                  />

                  <div className="pl-4 pr-4 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-lg" style={{ color: opt.color }}>
                          {opt.icon}
                        </span>
                        <span className="text-white font-bold text-sm uppercase tracking-wider">
                          {opt.label}
                          {locked && (
                            <span className="ml-2 text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
                              LOCKED
                            </span>
                          )}
                        </span>
                      </div>
                      <span className="text-white/70 font-mono text-xs tabular-nums">
                        {currentAmount}
                        <span className="text-gray-600">/{capacity}</span>
                      </span>
                    </div>

                    <p className="text-gray-500 text-[11px] mb-2.5 leading-relaxed">
                      {locked ? 'Discover Crystallization in the Lab to unlock' : opt.description}
                    </p>

                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs text-gray-400 font-mono">
                        <span className="text-orange-400">{ratio}</span>
                        <span className="text-gray-600"> Raw → 1 </span>
                        <span style={{ color: opt.color }}>{opt.label}</span>
                      </div>

                      <button
                        onClick={() => handleRefine(opt.key)}
                        disabled={isDisabled}
                        className={`
                          px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider
                          transition-all duration-150
                          ${locked
                            ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                            : canAfford
                              ? `bg-gradient-to-r ${opt.gradient} text-white shadow-lg hover:brightness-110 active:scale-95`
                              : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                          }
                        `}
                      >
                        {locked
                          ? '🔒'
                          : canAfford
                            ? `Refine${maxProduce > 1 ? ` x${maxProduce}` : ''}`
                            : 'Need Raw'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer with keyboard hints */}
          <div className="px-5 py-3 border-t border-gray-800 flex items-center justify-center gap-4 text-gray-600 text-[11px] font-mono">
            <span>
              <kbd className="bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded text-[10px]">R</kbd> Toggle
            </span>
            <span>
              <kbd className="bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded text-[10px]">1</kbd> Vapour
            </span>
            <span>
              <kbd className="bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded text-[10px]">2</kbd> Liquid
            </span>
            <span>
              <kbd className="bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded text-[10px]">3</kbd> Crystal
            </span>
            <span>
              <kbd className="bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded text-[10px]">Esc</kbd> Close
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
