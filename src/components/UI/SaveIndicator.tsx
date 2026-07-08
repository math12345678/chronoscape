/**
 * Tiny save-status indicator with satisfying save animation.
 * Shows when the game was last persisted and whether cloud sync is active.
 * Features a flash + checkmark animation on save, and a pulsing dot.
 */
import { useState, useEffect, useRef } from 'react'

export const SaveIndicator = ({ lastSaved, cloudStatus }: { lastSaved: string; cloudStatus?: string }) => {
  const isNew = lastSaved === 'Just now' || lastSaved === '0s ago'
  const [flash, setFlash] = useState(false)
  const [showCheck, setShowCheck] = useState(false)
  const prevSavedRef = useRef(lastSaved)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Trigger flash animation when lastSaved changes (a save just happened)
  useEffect(() => {
    if (lastSaved !== prevSavedRef.current) {
      prevSavedRef.current = lastSaved
      setFlash(true)
      setShowCheck(true)
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
      flashTimerRef.current = setTimeout(() => {
        setFlash(false)
        setTimeout(() => setShowCheck(false), 300)
      }, 600)
    }
  }, [lastSaved])

  return (
    <div className="fixed bottom-3 right-3 z-50 select-none pointer-events-none">
      <div
        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg backdrop-blur-sm transition-all duration-500 ${
          flash
            ? 'bg-teal-800/50 border border-teal-500/50'
            : isNew
              ? 'bg-teal-900/40 border border-teal-700/40'
              : 'bg-gray-900/30 border border-gray-800/20'
        }`}
      >
        {/* Save flash ring */}
        <div
          className="absolute inset-0 rounded-lg pointer-events-none"
          style={{
            background: flash
              ? 'radial-gradient(ellipse at 50% 50%, rgba(45,212,191,0.15) 0%, transparent 70%)'
              : 'transparent',
            transition: 'background 0.3s ease-out',
          }}
        />

        {/* Animated dot - pulses on new save, dim otherwise */}
        <span
          className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
            flash
              ? 'bg-teal-300 scale-150 shadow-[0_0_8px_rgba(45,212,191,0.8)]'
              : isNew
                ? 'bg-teal-400 animate-pulse shadow-[0_0_4px_rgba(45,212,191,0.6)]'
                : 'bg-gray-600'
          }`}
        />

        {/* Checkmark icon (appears briefly on save) */}
        {showCheck && (
          <span
            className="text-[9px] font-bold transition-all duration-300"
            style={{
              color: '#5eead4',
              opacity: flash ? 1 : 0,
              transform: flash ? 'scale(1)' : 'scale(0.5)',
              transition: 'opacity 0.2s, transform 0.2s',
            }}
          >
            ✓
          </span>
        )}

        <span className="text-[9px] font-mono text-gray-500/80 tracking-wide">
          {lastSaved ? `Saved ${lastSaved}` : '—'}
        </span>

        {/* Cloud status icons */}
        {cloudStatus === 'synced' && (
          <span className="text-[8px] font-mono text-teal-500/60">☁</span>
        )}
        {cloudStatus === 'syncing' && (
          <span className="text-[8px] font-mono text-blue-400/60 animate-spin">↻</span>
        )}
        {cloudStatus === 'offline' && (
          <span className="text-[8px] font-mono text-gray-500/40">○</span>
        )}
      </div>
    </div>
  )
}
