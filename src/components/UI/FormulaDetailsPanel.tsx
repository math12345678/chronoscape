import { useEffect, useState } from 'react'
import { useStore } from '../../store'
import type { FormulaId } from '../../store'
import { setTimeScaleTarget } from '../TimeManager'

const FORMULA_DETAILS: Record<FormulaId, {
  label: string
  description: string
  unlockDescription: string
  icon: string
  gradient: string
  color: string
}> = {
  crystallization: {
    label: 'Aeon Forging',
    description: 'You have discovered how to forge raw time into permanent Aeon crystals. Aeon blocks never decay — they are eternal.',
    unlockDescription: 'Press 2 to select Aeon blocks. Each block costs 3 Aeon and lasts forever.',
    icon: '◆',
    gradient: 'from-violet-500 to-purple-600',
    color: '#aa88ff',
  },
  detonation: {
    label: 'Detonation',
    description: 'You have unlocked the explosive potential of Chrono blocks. Time can be weaponized — chain reactions reshape the landscape.',
    unlockDescription: 'Right-click a placed Chrono block to prime it. Click again to detonate.',
    icon: '💥',
    gradient: 'from-red-500 to-orange-600',
    color: '#ff6644',
  },
  timelineEcho: {
    label: 'Timeline Echo',
    description: 'You have attuned to the resonance of living time signatures. Healing now requires less energy and feels more responsive.',
    unlockDescription: 'Self-healing with Flux is now more efficient.',
    icon: '⟳',
    gradient: 'from-cyan-500 to-teal-600',
    color: '#44ffcc',
  },
}

/**
 * Persistent formula discovery panel.
 * Appears with a slow-mo cinematic effect when a formula is discovered.
 * Player must manually dismiss it — it doesn't auto-close.
 */
export const FormulaDetailsPanel = () => {
  const pendingFormula = useStore((s) => s.pendingFormulaPanel)
  const dismissFormulaPanel = useStore((s) => s.dismissFormulaPanel)
  const [visible, setVisible] = useState(false)
  const [entered, setEntered] = useState(false)

  // Slow-mo effect and entrance animation
  useEffect(() => {
    if (!pendingFormula) {
      setVisible(false)
      setEntered(false)
      return
    }

    // Trigger slow-mo
    setTimeScaleTarget(0.15)

    // Entrance after a brief delay
    const enterTimer = setTimeout(() => {
      setVisible(true)
      // Re-enable time after panel is shown
      setTimeout(() => {
        setEntered(true)
        setTimeScaleTarget(1.0)
      }, 500)
    }, 800)

    return () => {
      clearTimeout(enterTimer)
    }
  }, [pendingFormula])

  const handleDismiss = () => {
    dismissFormulaPanel()
    setTimeScaleTarget(1.0)
    setVisible(false)
    setEntered(false)
  }

  if (!pendingFormula) return null

  const details = FORMULA_DETAILS[pendingFormula.id as FormulaId]
  if (!details) return null

  return (
    <>
      {/* Heavy cinematic backdrop */}
      <div
        className="fixed inset-0 z-[80] transition-all duration-700"
        style={{
          background: visible
            ? 'radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.85) 100%)'
            : 'rgba(0,0,0,0)',
          backdropFilter: visible ? 'blur(4px)' : 'blur(0px)',
        }}
      />

      {/* Panel */}
      <div
        className="fixed z-[90] inset-0 flex items-center justify-center pointer-events-none"
      >
        <div
          className="pointer-events-auto transition-all duration-500"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'scale(1) translateY(0)' : 'scale(0.8) translateY(30px)',
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div
            className="bg-gray-900/95 border-2 rounded-2xl shadow-2xl overflow-hidden"
            style={{
              width: 460,
              borderColor: `${details.color}66`,
              boxShadow: visible ? `0 0 60px ${details.color}22, 0 0 120px ${details.color}11` : 'none',
            }}
          >
            {/* Celebration header with animated gradient */}
            <div
              className="px-6 py-5 text-center relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${details.color}22, transparent, ${details.color}11)`,
                borderBottom: `1px solid ${details.color}33`,
              }}
            >
              {/* Background shimmer */}
              <div
                className="absolute inset-0 opacity-20 animate-shimmer"
                style={{
                  background: `linear-gradient(90deg, transparent, ${details.color}33, transparent)`,
                  backgroundSize: '200% auto',
                }}
              />

              <div className="relative z-10">
                {/* Big icon */}
                <div
                  className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-3xl mb-3"
                  style={{
                    background: `radial-gradient(circle, ${details.color}44, transparent)`,
                    boxShadow: `0 0 30px ${details.color}44`,
                  }}
                >
                  <span style={{
                    color: details.color,
                    filter: `drop-shadow(0 0 8px ${details.color}88)`,
                    animation: 'pulse-glow 1.5s ease-in-out infinite',
                  }}>
                    {details.icon}
                  </span>
                </div>                  <h2
                    className="text-2xl font-black uppercase tracking-wider mb-1"
                    style={{ color: details.color }}
                  >
                    Hypothesis Confirmed!
                  </h2>
                <p
                  className="text-lg font-bold uppercase tracking-wide"
                  style={{ color: `${details.color}cc` }}
                >
                  {details.label}
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-4 space-y-4">
              <p className="text-gray-300 text-sm leading-relaxed">
                {details.description}
              </p>

              {/* Unlock info */}
              <div
                className="px-4 py-3 rounded-xl"
                style={{
                  background: `${details.color}11`,
                  borderLeft: `3px solid ${details.color}88`,
                }}
              >
                <p className="text-white text-xs font-bold uppercase tracking-wider mb-1">
                  ✦ Research implications
                </p>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {details.unlockDescription}
                </p>
              </div>

              {/* Next formula hint */}
              <div className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/30">
                <p className="text-gray-500 text-[11px] text-center">
                  {entered
                    ? 'Continue research to confirm more hypotheses'
                    : 'Restoring experimental conditions...'}
                </p>
              </div>
            </div>

            {/* Dismiss button */}
            <div className="px-6 py-3 border-t border-gray-800">
              <button
                onClick={handleDismiss}
                className={`
                  w-full py-2.5 rounded-xl font-bold text-sm uppercase tracking-wider
                  transition-all duration-200
                  ${entered
                    ? `hover:brightness-110 active:scale-[0.98]`
                    : 'opacity-50 cursor-not-allowed'}
                `}
                style={{
                  background: entered
                    ? `linear-gradient(135deg, ${details.color}, ${details.color}cc)`
                    : '#333',
                  color: entered ? '#000' : '#666',
                }}
                disabled={!entered}
              >
                {entered ? '✦ Continue' : 'Wait...'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
