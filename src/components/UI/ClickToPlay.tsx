import { useEffect, useState, useRef } from 'react'
import { useStore } from '../../store'
import { lockPointer } from '../../utils/pointerLock'

/**
 * Clean title screen — just the logo, a subtitle, a click prompt, and controls hint.
 * No particles, no runes, no orbital rings, no portal effects, no audio synthesis.
 */
export const ClickToPlay = () => {
  const hasEnteredGame = useStore((s) => s.hasEnteredGame)
  const setHasEnteredGame = useStore((s) => s.setHasEnteredGame)
  const [fading, setFading] = useState(false)
  const [pointerUnlocked, setPointerUnlocked] = useState(false)
  const resumeFadeRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Track pointer lock changes for resume overlay
  useEffect(() => {
    const handleLockChange = () => {
      if (!document.pointerLockElement && hasEnteredGame) {
        setPointerUnlocked(true)
        clearTimeout(resumeFadeRef.current)
        resumeFadeRef.current = setTimeout(() => setPointerUnlocked(false), 15000)
      }
    }
    document.addEventListener('pointerlockchange', handleLockChange)
    document.addEventListener('pointerlockerror', handleLockChange)
    return () => {
      document.removeEventListener('pointerlockchange', handleLockChange)
      document.removeEventListener('pointerlockerror', handleLockChange)
      clearTimeout(resumeFadeRef.current)
    }
  }, [hasEnteredGame])

  const handleResume = () => {
    lockPointer()
    setPointerUnlocked(false)
  }

  if (hasEnteredGame) {
    if (pointerUnlocked) {
      return (
        <button
          onClick={handleResume}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] cursor-pointer select-none px-4 py-2 rounded-xl transition-all duration-300 hover:bg-white/5 active:scale-95"
          style={{
            background: 'rgba(5,10,25,0.7)',
            border: '1px solid rgba(68,255,204,0.08)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          <span className="text-sm font-mono tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
            ⟐ Resume ⟐
          </span>
        </button>
      )
    }
    if (!document.pointerLockElement) {
      return (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center cursor-pointer select-none"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={handleResume}
        >
          <div className="text-center pointer-events-none">
            <p className="text-[#44ffcc] text-lg font-mono tracking-widest animate-pulse">
              ⟐ Click to enter ⟐
            </p>
            <p className="text-[#6a7a90] text-xs font-mono tracking-wider mt-2">
              WASD to move · Mouse to look · Click to interact
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  const handleEnter = () => {
    lockPointer()
    setFading(true)
    setTimeout(() => {
      setHasEnteredGame(true)
    }, 600)
  }

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center cursor-pointer transition-all duration-600 ${
        fading ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{
        background: 'radial-gradient(ellipse at 50% 40%, #0f1a2a 0%, #060a12 50%, #000000 100%)',
      }}
      onClick={handleEnter}
    >
      {/* Title */}
      <div className="relative z-[2] text-center mb-8 pointer-events-none">
        <h1
          className="text-7xl font-black tracking-tight mb-2 select-none"
          style={{
            background: 'linear-gradient(135deg, #44ffcc 0%, #22ddff 30%, #aa88ff 60%, #ff8844 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 20px rgba(68,255,204,0.1))',
          }}
        >
          CHRONOSCAPE
        </h1>

        <p className="text-sm text-gray-500 font-mono tracking-[0.3em] uppercase">
          Time as Matter
        </p>
      </div>

      {/* Click prompt */}
      <div className="relative z-[2] mb-8 pointer-events-none">
        <p className="text-gray-300 text-lg font-mono tracking-wide select-none">
          Click to enter the chronoscape
        </p>
      </div>

      {/* Controls hint — minimal, learned in-game */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center z-[2] pointer-events-none">
        <p className="text-gray-600 text-xs font-mono tracking-wider uppercase select-none">
          WASD to move · Click to interact
        </p>
      </div>
    </div>
  )
}
