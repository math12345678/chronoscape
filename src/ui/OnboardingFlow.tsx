import { useState, useEffect, useRef } from 'react'
import { useStore } from '../store'

const STEPS = [
  {
    title: 'Harvest Time',
    icon: '⟐',
    instruction: 'Find a glowing Time Rift and click to harvest Raw Epoch.',
    detail: 'Crosshair turns teal when targeting a rift.',
    action: 'harvest',
    checkDone: () => useStore.getState().inventory.raw >= 1,
  },
  {
    title: 'Refine',
    icon: '⟡',
    instruction: 'Press R to open the Refine panel. Convert Epoch into Chrono blocks.',
    detail: 'You need Chrono blocks to build. Press R again to close.',
    action: 'refine',
    checkDone: () => useStore.getState().inventory.vapour >= 1,
  },
  {
    title: 'Build & Explore',
    icon: '⬡',
    instruction: 'Press 1 to select Chrono block. Click the ground to place it. Visit the Lab to discover permanent upgrades.',
    detail: 'Chrono blocks decay in 5 minutes. Crystal blocks (press 2) last forever!',
    action: 'build',
    checkDone: () => Object.keys(useStore.getState().blocks).length >= 1,
  },
  {
    title: 'Game Menu',
    icon: '≡',
    instruction: 'Press Tab to open the Game Menu. All systems unlock as you progress — check back often!',
    detail: 'New toasts appear when features unlock. Explore the world — there are secrets to find.',
    action: 'menu',
    checkDone: () => useStore.getState().inventory.raw >= 1 && useStore.getState().inventory.vapour >= 1 && Object.keys(useStore.getState().blocks).length >= 1,
  },
]

export const OnboardingFlow = () => {
  const [step, setStep] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const [dismissing, setDismissing] = useState(false)
  const hasEnteredGame = useStore((s) => s.hasEnteredGame)
  const tutorialStep = useStore((s) => s.tutorialStep)
  const setTutorialStep = useStore((s) => s.setTutorialStep)
  const dismissTutorial = useStore((s) => s.dismissTutorial)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!hasEnteredGame || dismissed) return

    // Check if current step is done every 500ms
    intervalRef.current = setInterval(() => {
      if (step < STEPS.length && STEPS[step].checkDone()) {
        if (step < STEPS.length - 1) {
          setStep((s) => s + 1)
        } else {
          // All steps complete — dismiss after a short delay
          setDismissing(true)
          setTimeout(() => {
            setDismissed(true)
            dismissTutorial()
          }, 1500)
        }
      }
    }, 500)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [hasEnteredGame, step, dismissed, dismissTutorial])

  // Sync with store tutorial step
  useEffect(() => {
    if (hasEnteredGame && !dismissed && step >= 0) {
      setTutorialStep(step)
    }
  }, [step, hasEnteredGame, dismissed, setTutorialStep])

  // If tutorial was dismissed elsewhere, respect it
  useEffect(() => {
    if (tutorialStep === -1 && !dismissed) {
      setDismissed(true)
    }
  }, [tutorialStep, dismissed])

  const handleDismiss = () => {
    setDismissing(true)
    setTimeout(() => {
      setDismissed(true)
      dismissTutorial()
    }, 300)
  }

  if (!hasEnteredGame || dismissed) return null

  const currentStep = STEPS[step]
  if (!currentStep) return null

  return (
    <div className={`fixed inset-0 z-[75] pointer-events-none transition-all duration-300 ${dismissing ? 'opacity-0' : 'opacity-100'}`}>
      {/* Bottom-right card */}
      <div
        className="absolute bottom-6 right-6 pointer-events-auto max-w-sm w-full transition-all duration-300"
        style={{
          transform: dismissing ? 'translateY(20px) scale(0.95)' : 'translateY(0) scale(1)',
        }}
      >
        <div
          className="relative bg-gray-950/85 backdrop-blur-lg border border-gray-800/50 rounded-xl overflow-hidden shadow-2xl"
          style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}
        >
          {/* Top accent */}
          <div
            className="h-0.5 w-full transition-all duration-700"
            style={{
              background: `linear-gradient(90deg, #44ffcc, #aa88ff, #facc15)`,
              width: `${((step + 1) / STEPS.length) * 100}%`,
            }}
          />

          <div className="px-5 py-4">
            {/* Header */}
            <div className="flex items-start gap-3 mb-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-base"
                style={{
                  backgroundColor: 'rgba(68,255,204,0.1)',
                  border: '1px solid rgba(68,255,204,0.2)',
                  color: '#44ffcc',
                }}
              >
                {currentStep.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-teal-400 font-bold text-sm tracking-wide">
                  {currentStep.title}
                </h3>
                <p className="text-gray-400 text-xs leading-relaxed mt-1">
                  {currentStep.instruction}
                </p>
                <div className="mt-2 bg-gray-800/40 rounded-lg px-3 py-1.5">
                  <p className="text-gray-500 text-[10px] font-mono">
                    💡 {currentStep.detail}
                  </p>
                </div>
              </div>
            </div>

            {/* Progress dots + dismiss */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-800/30">
              <div className="flex items-center gap-2">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className="h-1.5 rounded-full transition-all duration-300"
                    style={{
                      width: i === step ? 16 : 6,
                      backgroundColor: i === step ? '#44ffcc' : i < step ? '#22c55e' : 'rgba(255,255,255,0.08)',
                      boxShadow: i === step ? '0 0 6px rgba(68,255,204,0.4)' : 'none',
                    }}
                  />
                ))}
              </div>
              <button
                onClick={handleDismiss}
                className="text-[10px] text-gray-500 hover:text-gray-400 transition-colors font-mono"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
