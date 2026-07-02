import { useState, useEffect } from 'react'

/**
 * Full-screen overlay shown before the player clicks to lock the pointer.
 * Displays the game title and a "Click to play" prompt with a subtle pulsing animation.
 * Fades out once the pointer is locked.
 */
export const ClickToPlay = () => {
  const [locked, setLocked] = useState(document.pointerLockElement !== null)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const onLockChange = () => {
      if (document.pointerLockElement) {
        setFading(true)
        setTimeout(() => setLocked(true), 400)
      } else {
        setLocked(false)
        setFading(false)
      }
    }

    document.addEventListener('pointerlockchange', onLockChange)
    document.addEventListener('pointerlockerror', onLockChange)
    return () => {
      document.removeEventListener('pointerlockchange', onLockChange)
      document.removeEventListener('pointerlockerror', onLockChange)
    }
  }, [])

  if (locked) return null

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/85 backdrop-blur-md transition-opacity duration-500 ${
        fading ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
      }`}
      style={{ background: 'radial-gradient(ellipse at center, #0a1520 0%, #000000 100%)' }}
    >
      {/* Animated particles in background */}
      <div className="absolute inset-0 overflow-hidden opacity-30">
        {Array.from({ length: 30 }, (_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-teal-400/40 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `particle-drift ${8 + Math.random() * 12}s linear infinite`,
              animationDelay: `${Math.random() * 10}s`,
              transform: `scale(${0.5 + Math.random()})`,
            }}
          />
        ))}
      </div>

      {/* Decorative ring */}
      <div className="absolute w-64 h-64 rounded-full border border-teal-500/10 animate-[spin_20s_linear_infinite]" />
      <div className="absolute w-48 h-48 rounded-full border border-violet-500/10 animate-[spin_15s_linear_infinite_reverse]" />

      {/* Title */}
      <h1 className="text-7xl font-bold tracking-tight text-white mb-2 select-none relative">
        <span className="bg-gradient-to-r from-teal-300 via-cyan-400 to-violet-400 bg-clip-text text-transparent">
          CHRONOSCAPE
        </span>
      </h1>
      <p className="text-sm text-gray-500 font-mono tracking-[0.2em] uppercase mb-16 select-none relative">
        Time as Matter
      </p>

      {/* Click prompt with animated glow */}
      <div className="relative">
        <div className="absolute inset-0 bg-teal-500/20 blur-xl rounded-full animate-pulse" />
        <p className="relative text-gray-300 text-lg font-mono tracking-wide select-none cursor-pointer">
          Click to enter the chronoscape
        </p>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-center space-y-2">
        <p className="text-gray-600 text-xs font-mono tracking-wider uppercase select-none">
          WASD to move · Mouse to look · Click to interact
        </p>
        <p className="text-gray-700 text-[10px] font-mono tracking-wider uppercase select-none">
          R Refine · H Hire · T Trade · 1-2 Blocks · Lab at the glowing structure
        </p>
      </div>
    </div>
  )
}
