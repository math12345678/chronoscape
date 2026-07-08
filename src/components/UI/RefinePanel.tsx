import { useCallback } from 'react'
import { useStore } from '../../store'
import { CAPACITY, REFINE_RATIOS } from '../../config/constants'
import type { TimeState } from '../../store'
import { AnimatedPanel } from './AnimatedPanel'

const PANEL_WIDTH = 340

type RefineOption = {
  key: TimeState
  label: string
  color: string
  icon: string
  shortDesc: string
}

const ALL_OPTIONS: RefineOption[] = [
  {
    key: 'vapour',
    label: 'Chrono',
    color: '#ffaa00',
    icon: '⟡',
    shortDesc: 'For building',
  },
  {
    key: 'liquid',
    label: 'Flux',
    color: '#4488ff',
    icon: '≈',
    shortDesc: 'For healing',
  },
  {
    key: 'crystal',
    label: 'Aeon',
    color: '#aa88ff',
    icon: '◆',
    shortDesc: 'Permanent blocks',
  },
]

interface RefinePanelProps {
  open: boolean
  onClose: () => void
}

export const RefinePanel = ({ open, onClose }: RefinePanelProps) => {
  const inventory = useStore((s) => s.inventory)
  const refine = useStore((s) => s.refine)
  const formulaDiscovered = useStore((s) => s.formulaDiscovered)

  const options = ALL_OPTIONS.filter(
    (opt) => opt.key !== 'crystal' || formulaDiscovered('crystallization'),
  )

  const handleRefine = useCallback(
    (to: TimeState) => {
      const ratio = REFINE_RATIOS[to]
      const maxAfford = Math.floor(inventory.raw / ratio)
      if (maxAfford > 0) refine(to, maxAfford)
    },
    [refine, inventory.raw],
  )

  return (
    <AnimatedPanel open={open} onClose={onClose} className="z-50" slideFrom="up">
      <div
        style={{ width: PANEL_WIDTH }}
        className="bg-gray-950/90 border border-gray-800/40 rounded-xl overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="px-5 pt-4 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-sm tracking-wide uppercase">
              Refine
            </h2>
            <p className="text-gray-600 text-[10px] mt-0.5 font-mono">
              Convert Epoch into usable resources
            </p>
          </div>
          <span className="text-gray-600 text-[10px] font-mono">
            <kbd className="bg-gray-800 text-gray-500 px-1 rounded text-[9px]">R</kbd> close
          </span>
        </div>

        {/* Raw gauge */}
        <div className="mx-4 px-4 py-2.5 rounded-lg bg-gray-900/60 border border-gray-800/30 mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-gray-400 font-mono uppercase tracking-wider">
              Epoch Available
            </span>
            <span className="text-white font-mono text-sm tabular-nums">
              {Math.floor(inventory.raw)}
              <span className="text-gray-700 text-[10px]">/{CAPACITY.raw}</span>
            </span>
          </div>
          <div className="w-full h-1.5 bg-gray-800/60 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${Math.min(100, (inventory.raw / CAPACITY.raw) * 100)}%`,
                background: 'linear-gradient(90deg, #ff8844, #ffaa44)',
              }}
            />
          </div>
        </div>

        {/* Refine options */}
        <div className="px-4 pb-4 space-y-2">
          {options.map((opt) => {
            const ratio = REFINE_RATIOS[opt.key]
            const maxAfford = Math.floor(inventory.raw / ratio)
            const canAfford = maxAfford > 0
            const currentAmount = Math.floor(
              inventory[opt.key as keyof typeof inventory] as number,
            )
            const capacity = CAPACITY[opt.key as keyof typeof CAPACITY] ?? 100
            const isPrimary = opt.key === 'vapour'

            return (
              <div
                key={opt.key}
                className={`rounded-lg border transition-colors overflow-hidden
                  ${canAfford
                    ? isPrimary
                      ? 'border-teal-700/30 bg-teal-900/15'
                      : 'border-gray-800/40 bg-gray-900/50'
                    : 'border-gray-800/20 bg-gray-900/30 opacity-60'
                  }
                `}
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Icon */}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm"
                    style={{
                      backgroundColor: `${opt.color}15`,
                      border: `1px solid ${opt.color}25`,
                      color: opt.color,
                    }}
                  >
                    {opt.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-xs font-bold uppercase tracking-wider">
                        {opt.label}
                      </span>
                      <span className="text-gray-600 text-[10px] font-mono">
                        {currentAmount}/{capacity}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-gray-500 text-[10px]">{opt.shortDesc}</span>
                      <span className="text-gray-700 text-[9px] font-mono">
                        {ratio} Epoch → 1
                      </span>
                    </div>
                  </div>

                  {/* Refine button */}
                  <button
                    onClick={() => handleRefine(opt.key)}
                    disabled={!canAfford || inventory.raw === 0}
                    className={`
                      shrink-0 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider
                      transition-all duration-150
                      ${canAfford && inventory.raw > 0
                        ? isPrimary
                          ? 'bg-teal-600/80 text-white hover:bg-teal-500/80 active:scale-95 shadow-sm'
                          : 'bg-gray-700/60 text-gray-300 hover:bg-gray-600/60 active:scale-95'
                        : 'bg-gray-800/40 text-gray-600 cursor-not-allowed'
                      }
                    `}
                  >
                    {canAfford && inventory.raw > 0
                      ? `Refine${maxAfford > 1 ? ` x${maxAfford}` : ''}`
                      : 'Need Epoch'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </AnimatedPanel>
  )
}
