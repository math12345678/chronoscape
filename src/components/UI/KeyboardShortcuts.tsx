import { useEffect, useState } from 'react'

const SECTIONS = [
  {
    title: 'Movement',
    color: '#44ffcc',
    shortcuts: [
      { keys: ['W', 'A', 'S', 'D'], desc: 'Move' },
      { keys: ['Mouse'], desc: 'Look around' },
      { keys: ['Shift'], desc: 'Sprint' },
      { keys: ['Esc'], desc: 'Release / Lock cursor' },
    ],
  },
  {
    title: 'Core Game Loop',
    color: '#ffaa44',
    shortcuts: [
      { keys: ['LMB'], desc: 'Harvest rifts / Interact' },
      { keys: ['R'], desc: 'Open Refine panel' },
      { keys: ['H'], desc: 'Heal (costs 1 Liquid)' },
      { keys: ['1'], desc: 'Select Vapour block' },
      { keys: ['2'], desc: 'Select Crystal block (unlocks later)' },
    ],
  },
  {
    title: 'Game Menu',
    color: '#aa88ff',
    shortcuts: [
      { keys: ['Tab'], desc: 'Open Game Menu — access all panels' },
      { keys: ['F1'], desc: 'Show / hide this guide' },
    ],
  },
]

/**
 * Simplified keyboard reference — press F1 to toggle.
 * All panel-specific shortcuts removed; access them via Tab menu.
 */
export const KeyboardShortcuts = () => {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-[90]"
        onClick={() => setOpen(false)}
      />

      {/* Panel */}
      <div className="fixed z-[91] inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="pointer-events-auto bg-gray-900/95 border border-gray-700/50 rounded-xl shadow-2xl overflow-hidden max-w-md w-full mx-4"
          style={{ animation: 'ks-open 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">⌨</span>
              <h2 className="text-white font-bold text-sm tracking-wide uppercase">
                Controls
              </h2>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-500 hover:text-white transition-colors p-1 rounded hover:bg-gray-800"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3l10 10M13 3l-10 10" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4 space-y-4">
            <p className="text-gray-600 text-[10px] font-mono text-center mb-1">
              All other panels accessible via <kbd className="bg-gray-800 text-gray-400 px-1 rounded text-[9px]">Tab</kbd> Menu
            </p>
            {SECTIONS.map((section) => (
              <div key={section.title}>
                <h3
                  className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2"
                  style={{ color: section.color }}
                >
                  {section.title}
                </h3>
                <div className="space-y-1.5">
                  {section.shortcuts.map((sc, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-gray-800/30 rounded-lg px-3 py-2 border border-gray-800/50"
                    >
                      <span className="text-xs text-gray-400">{sc.desc}</span>
                      <div className="flex items-center gap-1 ml-4 shrink-0">
                        {sc.keys.map((key, j) => (
                          <span key={j}>
                            {j > 0 && (
                              <span className="text-gray-600 text-[10px] mx-0.5">+</span>
                            )}
                            <kbd className="bg-gray-800 text-gray-300 text-[10px] font-mono px-1.5 py-0.5 rounded border border-gray-700/50">
                              {key}
                            </kbd>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-gray-800 text-center">
            <p className="text-gray-600 text-[10px] font-mono">
              Press <kbd className="bg-gray-800 text-gray-400 px-1 rounded text-[9px]">F1</kbd> to toggle ·
              <kbd className="bg-gray-800 text-gray-400 px-1 rounded text-[9px] ml-1">Esc</kbd> to close
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ks-open {
          0% { opacity: 0; transform: scale(0.92) translateY(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </>
  )
}
