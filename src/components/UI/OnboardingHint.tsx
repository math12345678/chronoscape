import { useState, useEffect } from 'react'
import { useStore } from '../../store'

export const OnboardingHint = () => {
  const [visible, setVisible] = useState(true)
  const hasRaw = useStore((s) => s.inventory.raw > 0)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
    }, 10000)
    return () => clearTimeout(timer)
  }, [])

  if (!visible || hasRaw) return null

  return (
    <div className="fixed bottom-28 left-1/2 -translate-x-1/2 text-center pointer-events-none z-40 animate-fade-in-up">
      <div className="bg-gray-900/80 backdrop-blur-sm border border-teal-500/30 px-6 py-3 rounded-xl shadow-lg shadow-teal-900/20" style={{ animation: 'pulse-glow-teal 2s infinite' }}>
        <p className="text-teal-400 font-bold text-sm tracking-wide mb-1 flex items-center justify-center gap-2">
          <span>⟐</span> Find a Time Rift
        </p>
        <p className="text-gray-400 text-[11px] font-mono">
          Use W A S D to move. Look at the rift to interact.
        </p>
      </div>
    </div>
  )
}
