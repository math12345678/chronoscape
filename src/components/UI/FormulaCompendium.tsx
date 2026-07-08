import { useStore } from '../../store'
import type { FormulaId } from '../../store'

const FORMULA_META: Record<FormulaId, {
  label: string
  description: string
  hint: string
  unlockDescription: string
  icon: string
  gradient: string
  color: string
  glyphColor: string
}> = {
  crystallization: {
    label: 'Aeon Forging',
    description: 'Transform Chrono into permanent Aeon blocks that never decay.',
    hint: 'Requires precise calibration — align the needle within the target zone.',
    unlockDescription: 'Unlocks: Aeon block building (press 2). Aeon blocks are permanent and do not despawn.',
    icon: '◆',
    gradient: 'from-violet-500 to-purple-600',
    color: '#aa88ff',
    glyphColor: '#8844ff',
  },
  detonation: {
    label: 'Detonation',
    description: 'Weaponize your blocks — trigger explosive chain reactions that destroy blocks in a radius.',
    hint: 'A volatile pattern. The target zone shifts faster — stay focused.',
    unlockDescription: 'Unlocks: Right-click Chrono blocks to prime and detonate them. Chain explosions possible.',
    icon: '💥',
    gradient: 'from-red-500 to-orange-600',
    color: '#ff6644',
    glyphColor: '#ff4422',
  },
  timelineEcho: {
    label: 'Timeline Echo',
    description: 'Enhanced temporal healing — rewind time more efficiently with less Flux energy.',
    hint: 'A precise, narrow zone. Patience is key.',
    unlockDescription: 'Unlocks: More efficient healing. Rewind takes less time and effort.',
    icon: '⟳',
    gradient: 'from-cyan-500 to-teal-600',
    color: '#44ffcc',
    glyphColor: '#22ddaa',
  },
}

const FORMULA_ORDER: FormulaId[] = ['crystallization', 'detonation', 'timelineEcho']

/**
 * Formula Compendium — full-screen modal accessible via P key or the Lab.
 * Shows all formulas, their discovery status, animated progress bars,
 * and hints for locked ones.
 */
export const FormulaCompendium = () => {
  const formulas = useStore((s) => s.formulas)
  const compendiumOpen = useStore((s) => s.compendiumOpen)
  const setCompendiumOpen = useStore((s) => s.setCompendiumOpen)
  const totalProgress = formulas.length > 0
    ? Math.round((formulas.filter((f) => f.discovered).length / formulas.length) * 100)
    : 0

  if (!compendiumOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-150"
        onClick={() => setCompendiumOpen(false)}
      />

      {/* Panel */}
      <div className="fixed z-50 inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="bg-gray-900/95 border border-gray-700/50 rounded-xl shadow-2xl overflow-hidden pointer-events-auto"
          style={{
            width: 500,
            maxHeight: '90vh',
            animation: 'modal-pop-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
            <div>
              <h2 className="text-white font-bold text-lg tracking-wide flex items-center gap-2">
                <span className="text-cyan-400">⟐</span> Research Compendium
              </h2>
              <p className="text-gray-500 text-xs mt-0.5">
                Confirm all hypotheses to unlock the full research program
              </p>
            </div>
            <button
              onClick={() => setCompendiumOpen(false)}
              className="text-gray-500 hover:text-white transition-colors p-1 rounded hover:bg-gray-800"
              title="Close (Esc / P)"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4l10 10M14 4l-10 10" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-4 overflow-y-auto space-y-4" style={{ maxHeight: 'calc(90vh - 64px)' }}>

            {/* Overall progress */}
            <div className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/70 text-xs uppercase tracking-wider font-bold">                    Hypotheses Confirmed
                  </span>
                  <span className="text-white font-mono text-sm tabular-nums">
                  {formulas.filter((f) => f.discovered).length}/{formulas.length}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-400 transition-all duration-700 ease-out"
                  style={{ width: `${totalProgress}%` }}
                />
              </div>
              <p className="text-gray-600 text-[10px] text-center mt-2 font-mono">
                {totalProgress === 100
                  ? '✦ All chrono-discoveries complete! The timeline is yours.'
                  : 'Enter the Lab to discover new chrono-formulas'
                }
              </p>
            </div>

            {/* Formula cards */}
            {FORMULA_ORDER.map((id) => {
              const formula = formulas.find((f) => f.id === id)
              const meta = FORMULA_META[id]
              if (!formula || !meta) return null

              const progress = formula.hitsRequired > 0
                ? (formula.hitsLanded / formula.hitsRequired) * 100
                : 0

              return (
                <div
                  key={id}
                  className={`
                    relative rounded-xl border overflow-hidden transition-all duration-300
                    ${formula.discovered
                      ? 'bg-gray-800/60 border-green-700/40'
                      : 'bg-gray-800/30 border-gray-700/40'
                    }
                  `}
                >
                  {/* Formula header */}
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                        style={{
                          background: formula.discovered
                            ? 'linear-gradient(135deg, #22c55e33, #16a34a22)'
                            : `linear-gradient(135deg, ${meta.glyphColor}22, ${meta.glyphColor}11)`,
                          border: `1px solid ${formula.discovered ? '#22c55e44' : `${meta.glyphColor}33`}`,
                        }}
                      >
                        <span style={{
                          color: formula.discovered ? '#22c55e' : meta.color,
                          filter: formula.discovered ? 'none' : `drop-shadow(0 0 4px ${meta.glyphColor}88)`,
                        }}>
                          {meta.icon}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="text-white font-bold text-sm uppercase tracking-wider">
                            {meta.label}
                          </h3>
                          {formula.discovered && (
                            <span className="text-[10px] text-green-400 bg-green-900/30 px-1.5 py-0.5 rounded-full border border-green-700/30">
                              ✓ Confirmed
                            </span>
                          )}
                          {!formula.discovered && formula.hitsLanded > 0 && (
                            <span className="text-[10px] text-amber-400 bg-amber-900/30 px-1.5 py-0.5 rounded-full border border-amber-700/30">
                              In progress
                            </span>
                          )}
                        </div>
                        <p className="text-gray-400 text-[11px] leading-relaxed">
                          {meta.description}
                        </p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    {!formula.discovered && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-500 text-[10px] font-mono">
                            Calibration hits: {formula.hitsLanded}/{formula.hitsRequired}
                          </span>
                          <span className="text-gray-500 text-[10px] font-mono">
                            {Math.round(progress)}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${meta.gradient}`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                        {/* Target marks on progress bar */}
                        <div className="relative w-full h-0 mt-1">
                          {Array.from({ length: formula.hitsRequired }, (_, i) => {
                            const pos = ((i + 1) / formula.hitsRequired) * 100
                            const hit = i < formula.hitsLanded
                            return (
                              <div
                                key={i}
                                className="absolute top-0 w-1.5 h-1.5 rounded-full -translate-x-1/2"
                                style={{
                                  left: `${pos}%`,
                                  backgroundColor: hit ? meta.color : '#444',
                                  boxShadow: hit ? `0 0 4px ${meta.color}88` : 'none',
                                }}
                              />
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Hint for locked */}
                    {!formula.discovered && (
                      <div
                        className="mt-3 px-3 py-2 rounded-lg text-[11px] leading-relaxed"
                        style={{
                          background: `${meta.glyphColor}11`,
                          borderLeft: `2px solid ${meta.glyphColor}44`,
                          color: meta.color,
                        }}
                      >
                        <span className="font-bold">💡 Hint:</span>{' '}
                        {meta.hint}
                      </div>
                    )}

                    {/* Unlock description for discovered */}
                    {formula.discovered && (
                      <div
                        className="mt-3 px-3 py-2 rounded-lg text-[11px] leading-relaxed"
                        style={{
                          background: '#22c55e11',
                          borderLeft: `2px solid #22c55e44`,
                          color: '#86efac',
                        }}
                      >
                        {meta.unlockDescription}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="px-6 py-2.5 border-t border-gray-800 flex items-center justify-between">                <p className="text-gray-600 text-[10px] font-mono">
              Press <kbd className="px-1 py-0.5 bg-gray-800 border border-gray-700 rounded text-gray-400">P</kbd> to toggle
            </p>
            <p className="text-gray-600 text-[10px] font-mono">
              Confirm all 3 hypotheses to complete the research program
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
