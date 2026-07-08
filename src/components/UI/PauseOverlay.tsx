import { useEffect, useState, useCallback } from 'react'
import { lockPointer } from '../../utils/pointerLock'
import { useStore } from '../../store'
import {
  getQualityLevel,
  setQualityLevel,
  QUALITY_LABELS,
  resetQualityToAuto,
} from '../../utils/performance'
import type { QualityLevel } from '../../utils/performance'

const QUALITY_CYCLE: QualityLevel[] = [0, 1, 2, 3]

/**
 * Premium pause overlay with:
 * - Smooth fade-in/out backdrop
 * - Game stats summary (blocks placed, renown, time played)
 * - Graphics quality selector (persistent)
 * - Controls reference
 * - Click-to-resume
 */
export const PauseOverlay = () => {
  const [showHint, setShowHint] = useState(false)
  const [quality, setQuality] = useState(getQualityLevel)
  const [stats, setStats] = useState({ blocks: 0, renown: 0, raw: 0, liquid: 0, crystal: 0, vapour: 0 })
  const [showSettings, setShowSettings] = useState(false)

  const cycleQuality = useCallback(() => {
    const current = getQualityLevel()
    const idx = QUALITY_CYCLE.indexOf(current)
    const next = QUALITY_CYCLE[(idx + 1) % QUALITY_CYCLE.length]
    setQualityLevel(next)
    setQuality(next)
  }, [])

  useEffect(() => {
    let hintTimer: ReturnType<typeof setTimeout> | null = null

    const onLockChange = () => {
      if (!document.pointerLockElement) {
        // Read current stats
        const s = useStore.getState()
        setStats({
          blocks: Object.keys(s.blocks).length,
          renown: Math.floor(s.inventory.renown),
          raw: Math.floor(s.inventory.raw),
          liquid: Math.floor(s.inventory.liquid),
          crystal: Math.floor(s.inventory.crystal),
          vapour: Math.floor(s.inventory.vapour),
        })
        setQuality(getQualityLevel())
        hintTimer = setTimeout(() => setShowHint(true), 400)
      } else {
        setShowHint(false)
        setShowSettings(false)
        if (hintTimer) clearTimeout(hintTimer)
      }
    }

    document.addEventListener('pointerlockchange', onLockChange)
    document.addEventListener('pointerlockerror', onLockChange)

    if (!document.pointerLockElement) {
      hintTimer = setTimeout(() => setShowHint(true), 400)
    }

    return () => {
      document.removeEventListener('pointerlockchange', onLockChange)
      document.removeEventListener('pointerlockerror', onLockChange)
      if (hintTimer) clearTimeout(hintTimer)
    }
  }, [])

  if (document.pointerLockElement) return null

  return (
    <>
      {/* Backdrop — clickable to resume */}
      <div
        className="fixed inset-0 z-[60] cursor-pointer select-none"
        onClick={() => lockPointer()}
        style={{
          background: 'radial-gradient(ellipse at center, rgba(10,20,30,0.2) 0%, rgba(0,0,0,0.35) 100%)',
          transition: 'opacity 0.5s ease-out',
          opacity: showHint ? 1 : 0,
        }}
      >
        {showHint && (
          <div
            className="absolute bottom-24 left-1/2 -translate-x-1/2 text-center w-full max-w-md px-6"
            style={{ animation: 'pause-fade-in 0.5s ease-out' }}
          >
            {/* Resume button */}
            <div className="mb-4 inline-block">
              <div className="relative">
                <div className="absolute inset-[-8px] rounded-xl bg-white/5 blur-sm" />
                <button
                  onClick={(e) => { e.stopPropagation(); lockPointer() }}
                  className="relative px-8 py-3 rounded-xl bg-white/10 border border-white/20 text-white/90 font-mono text-sm tracking-widest uppercase transition-all duration-200 hover:bg-white/15 hover:border-white/30 hover:shadow-lg"
                >
                  ⏵ Resume Game
                </button>
              </div>
            </div>

            {/* Quick stats row */}
            <div className="flex justify-center gap-5 mb-4 text-xs">
              <div className="text-center">
                <p className="text-gray-500 font-mono text-[10px] uppercase tracking-wider mb-0.5">Blocks</p>
                <p className="text-white/80 font-mono">{stats.blocks}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-500 font-mono text-[10px] uppercase tracking-wider mb-0.5">Renown</p>
                <p className="text-amber-400 font-mono">{stats.renown}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-500 font-mono text-[10px] uppercase tracking-wider mb-0.5">Raw</p>
                <p className="text-teal-300 font-mono">{stats.raw}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-500 font-mono text-[10px] uppercase tracking-wider mb-0.5">Liquid</p>
                <p className="text-blue-300 font-mono">{stats.liquid}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-500 font-mono text-[10px] uppercase tracking-wider mb-0.5">Crystal</p>
                <p className="text-violet-300 font-mono">{stats.crystal}</p>
              </div>
            </div>

            {/* Settings toggle */}
            <div className="mb-4">
              <button
                onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings) }}
                className="px-4 py-1.5 rounded-lg border border-white/10 text-gray-400 font-mono text-[10px] tracking-wider uppercase transition-all duration-200 hover:border-white/20 hover:text-white/60"
              >
                ⚙ Settings
              </button>
            </div>

            {/* Settings panel */}
            {showSettings && (
              <div
                className="mb-4 p-3 rounded-xl bg-black/40 border border-white/10 text-left"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-gray-400 font-mono text-[10px] uppercase tracking-wider mb-3">Graphics</p>

                {/* Quality cycle button */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-mono text-[10px]">Quality Preset</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      cycleQuality()
                    }}
                    className="px-3 py-1 rounded-lg font-mono text-[11px] tracking-wider transition-all duration-200 border"
                    style={{
                      color: quality >= 3 ? '#ffd700' : quality >= 2 ? '#44ffcc' : quality >= 1 ? '#ff8844' : '#ff4444',
                      borderColor: quality >= 3 ? 'rgba(255,215,0,0.3)' : quality >= 2 ? 'rgba(68,255,204,0.3)' : quality >= 1 ? 'rgba(255,136,68,0.3)' : 'rgba(255,68,68,0.3)',
                    }}
                  >
                    {QUALITY_LABELS[quality]} {quality < 3 ? '→' : '↺'}
                  </button>
                </div>

                {/* Quality description */}
                <p className="text-gray-600 font-mono text-[8px] mt-2 leading-relaxed">
                  {quality === 0 && 'Bloom & effects disabled. Max frame rate.'}
                  {quality === 1 && 'Bloom + film grain. Balanced performance.'}
                  {quality === 2 && 'Bloom, tone mapping, vignette, chromatic aberration.'}
                  {quality === 3 && 'All effects + anti-aliasing. The full experience.'}
                </p>

                {/* Reset to auto */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    resetQualityToAuto()
                    setQuality(getQualityLevel())
                  }}
                  className="mt-2 text-[9px] text-gray-600 font-mono tracking-wider uppercase hover:text-gray-400 transition-colors"
                >
                  ↺ Auto Detect
                </button>
              </div>
            )}

            {/* Divider */}
            <div className="w-32 h-px bg-white/10 mx-auto mb-4" />

            {/* Controls hint */}
            <div className="space-y-1.5">
              <p className="text-gray-500 text-[10px] font-mono tracking-[0.15em] uppercase">
                WASD Move · Mouse Look · Left Click Interact
              </p>
              <p className="text-gray-600 text-[9px] font-mono tracking-[0.1em] uppercase space-x-3">
                <span>R Refine</span>
                <span>H Heal</span>
                <span>Q Fire</span>
                <span>1 Build</span>
                <span>Shift Sprint</span>
                <span>F1 Help</span>
              </p>
              <p className="text-gray-700 text-[8px] font-mono tracking-[0.1em] uppercase mt-2">
                ESC or click to resume
              </p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pause-fade-in {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  )
}
