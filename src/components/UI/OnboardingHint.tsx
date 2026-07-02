import { useState, useEffect } from 'react'
import { useStore } from '../../store'

export const OnboardingHint = () => {
  const [visible, setVisible] = useState(true)
  const hasRaw = useStore((s) => s.inventory.raw > 0)
  const bearing = useStore((s) => s.onboardingRiftBearing)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
    }, 10000)
    return () => clearTimeout(timer)
  }, [])

  if (!visible || hasRaw) return null

  // bearing is radians relative to camera forward: 0 = straight ahead, +/-PI = behind.
  // Rotate an arrow to point toward the rift, and fade it out the more the player
  // is already facing it (near 0) so it doesn't clutter the crosshair.
  const bearingDeg = bearing !== null ? (bearing * 180) / Math.PI : 0
  const facingRift = bearing !== null && Math.abs(bearingDeg) < 8

  return (
    <div className="fixed bottom-28 left-1/2 -translate-x-1/2 text-center pointer-events-none z-40 animate-fade-in-up">
      {bearing !== null && !facingRift && (
        <div
          className="mb-2 flex justify-center transition-transform duration-150"
          style={{ transform: `rotate(${bearingDeg}deg)` }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" className="text-teal-400 drop-shadow-glow-teal" style={{ animation: 'pulse-glow-teal 1.4s infinite' }}>
            <path d="M12 2 L19 16 L12 12.5 L5 16 Z" fill="currentColor" opacity="0.9" />
          </svg>
        </div>
      )}
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
