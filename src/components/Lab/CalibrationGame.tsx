import { useRef, useCallback, useEffect } from 'react'
import { useStore } from '../../store'
import { CALIBRATION_TARGETS, CALIBRATION_SWEEP_SPEED } from '../../config/constants'
import type { FormulaId } from '../../store'
import { useSoundEngine } from '../../hooks/useSoundEngine'

const FORMULA_INFO: Record<FormulaId, { label: string; description: string; gradient: string; color: string }> = {
  crystallization: {
    label: 'Crystallization',
    description: 'Permanent building — Crystal blocks never decay',
    gradient: 'from-violet-500 to-purple-600',
    color: '#aa88ff',
  },
  detonation: {
    label: 'Detonation',
    description: 'Weaponize Vapour — trigger explosive chain reactions',
    gradient: 'from-red-500 to-orange-600',
    color: '#ff6644',
  },
  timelineEcho: {
    label: 'Timeline Echo',
    description: 'Enhanced healing — rewind NPCs more efficiently',
    gradient: 'from-cyan-500 to-teal-600',
    color: '#44ffcc',
  },
}

/**
 * Calibration mini-game + formula progress overview.
 *
 * - A sweeping needle moves back and forth along a 0–100 dial
 * - Click or press SPACEBAR while the needle is inside the target zone for a hit
 * - Visual sparkle trail follows the needle for satisfying feedback
 * - Progress bars show formula discovery status
 */
export const CalibrationGame = () => {
  const formulas = useStore((s) => s.formulas)
  const addHitToFormula = useStore((s) => s.addHitToFormula)
  const sounds = useSoundEngine()

  const needlePos = useRef(50)
  const needleDir = useRef(1)
  const lastTime = useRef(performance.now())
  const rafId = useRef<number | null>(null)
  const trailRef = useRef<number[]>([])

  // Select first undiscovered formula
  const activeFormula = formulas.find((f) => !f.discovered) ?? formulas[0]
  const target = CALIBRATION_TARGETS[activeFormula.id as keyof typeof CALIBRATION_TARGETS] ?? { start: 25, end: 55 }
  const info = FORMULA_INFO[activeFormula.id as FormulaId]
  const isInZone = needlePos.current >= target.start && needlePos.current <= target.end

  // Needle animation — driven by rAF
  const tick = useCallback(() => {
    const now = performance.now()
    const dt = Math.min((now - lastTime.current) / 1000, 0.1)
    lastTime.current = now

    needlePos.current += CALIBRATION_SWEEP_SPEED * dt * needleDir.current

    if (needlePos.current >= 100) {
      needlePos.current = 100
      needleDir.current = -1
    } else if (needlePos.current <= 0) {
      needlePos.current = 0
      needleDir.current = 1
    }

    const needle = document.getElementById('calibration-needle')
    if (needle) {
      needle.style.left = `${needlePos.current}%`
    }

    // Update trail effect
    trailRef.current.push(needlePos.current)
    if (trailRef.current.length > 8) trailRef.current.shift()
    const trail = document.getElementById('calibration-trail')
    if (trail) {
      trail.style.width = `${trailRef.current.length * 3}px`
      trail.style.left = `${needlePos.current}%`
    }

    // Update zone indicator
    const inZone = needlePos.current >= target.start && needlePos.current <= target.end
    const zone = document.getElementById('calibration-zone-glow')
    if (zone) {
      zone.style.opacity = inZone ? '0.6' : '0.15'
    }

    rafId.current = requestAnimationFrame(tick)
  }, [target])

  // Start rAF on mount
  useEffect(() => {
    lastTime.current = performance.now()
    rafId.current = requestAnimationFrame(tick)
    return () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current)
        rafId.current = null
      }
    }
  }, [tick])

  const handleCalibrate = useCallback(() => {
    if (activeFormula.discovered) return

    const pos = needlePos.current
    const isHit = pos >= target.start && pos <= target.end
    if (isHit) {
      addHitToFormula(activeFormula.id)
      sounds.calibrateHit()

      const flash = document.getElementById('calibration-flash')
      if (flash) {
        flash.style.opacity = '1'
        setTimeout(() => { flash.style.opacity = '0' }, 250)
      }

      // Hit particle burst
      const dial = document.getElementById('calibration-dial')
      if (dial) {
        dial.style.boxShadow = '0 0 20px rgba(68,255,136,0.3)'
        setTimeout(() => { dial.style.boxShadow = 'none' }, 400)
      }
    } else {
      sounds.calibrateMiss()

      const dial = document.getElementById('calibration-dial')
      if (dial) {
        dial.style.animation = 'none'
        dial.offsetHeight
        dial.style.animation = 'shake 0.25s ease'
      }
    }
  }, [activeFormula, target, addHitToFormula, sounds])

  // Spacebar support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault()
        handleCalibrate()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleCalibrate])

  const infoColor = info?.color ?? '#aa88ff'

  return (
    <div className="space-y-5">
      {/* Formula progress overview */}
      <div className="space-y-2.5">
        <h3 className="text-white/80 text-xs uppercase tracking-wider font-bold">
          Formulas
        </h3>
        {formulas.map((f) => {
          const finfo = FORMULA_INFO[f.id as FormulaId]
          const progress = f.hitsRequired > 0 ? (f.hitsLanded / f.hitsRequired) * 100 : 0
          const isActive = !f.discovered && f.id === activeFormula.id

          return (
            <div
              key={f.id}
              className={`
                relative rounded-lg px-3 py-2 transition-all duration-200
                ${f.discovered
                  ? 'bg-green-900/20 border border-green-700/30'
                  : isActive
                    ? 'bg-gray-800/60 border border-gray-600/50'
                    : 'bg-gray-800/30 border border-gray-700/30 opacity-60'
                }
              `}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold text-white uppercase tracking-wider ${f.discovered ? 'line-through decoration-green-400' : ''}`}>
                    {finfo.label}
                  </span>
                  {f.discovered && (
                    <span className="text-green-400 text-xs">✓ Discovered</span>
                  )}
                  {isActive && (
                    <span className="text-cyan-400 text-[10px] bg-cyan-900/30 px-1.5 py-0.5 rounded">
                      ACTIVE
                    </span>
                  )}
                </div>
                <span className="text-xs font-mono text-gray-400 tabular-nums">
                  {f.hitsLanded}/{f.hitsRequired}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    f.discovered
                      ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                      : `bg-gradient-to-r ${finfo.gradient}`
                  }`}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>

              <p className="text-gray-500 text-[10px] mt-1">{finfo.description}</p>
            </div>
          )
        })}
      </div>

      {/* Calibration dial */}
      {!activeFormula.discovered && (
        <div
          className="relative bg-gray-900/80 rounded-lg border border-gray-700/50 p-4 transition-shadow duration-300"
          id="calibration-dial"
        >
          <h3 className="text-white/80 text-xs uppercase tracking-wider font-bold mb-3">
            Calibration — {info?.label ?? 'Unknown'}
          </h3>

          {/* Dial track */}
          <div className="relative h-12 bg-gray-800 rounded-md overflow-hidden mb-2">
            {/* Target zone glow */}

            <div
              id="calibration-zone-glow"
              className="absolute inset-0 transition-opacity duration-100"
              style={{
                opacity: 0.15,
                background: `linear-gradient(90deg, transparent, ${infoColor}22, transparent)`,
                clipPath: `inset(0 ${100 - target.end}% 0 ${target.start}%)`,
              }}
            />
            {/* Target zone */}
            <div
              className="absolute top-0 h-full rounded-sm"
              style={{
                left: `${target.start}%`,
                width: `${target.end - target.start}%`,
                background: `linear-gradient(90deg, ${infoColor}44, ${infoColor}22)`,
                borderLeft: `2px solid ${infoColor}88`,
                borderRight: `2px solid ${infoColor}88`,
              }}
            />

            {/* Tick marks */}
            {[0, 25, 50, 75, 100].map((tick) => (
              <div
                key={tick}
                className="absolute top-0 w-px h-full bg-gray-700/50"
                style={{ left: `${tick}%` }}
              />
            ))}

            {/* Needle trail */}
            <div
              id="calibration-trail"
              className="absolute top-0 h-full transition-none pointer-events-none"
              style={{
                left: '50%',
                width: '20px',
                background: `linear-gradient(90deg, transparent, ${infoColor}44, transparent)`,
                transform: 'translateX(-50%)',
              }}
            />

            {/* Needle */}
            <div
              id="calibration-needle"
              className="absolute top-0 w-0.5 h-full transition-none"
              style={{
                left: '50%',
                backgroundColor: isInZone ? infoColor : '#ff8844',
                boxShadow: isInZone
                  ? `0 0 12px ${infoColor}88`
                  : '0 0 8px rgba(255,136,68,0.6)',
              }}
            >
              <div
                className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[8px] border-l-transparent border-r-transparent"
                style={{
                  borderBottomColor: isInZone ? infoColor : '#ff8844',
                }}
              />
            </div>

            {/* Hit/miss sparkle particles */}
            <div id="calibration-sparkles" className="absolute inset-0 pointer-events-none" />
          </div>

          {/* Click prompt with keybind hint */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <p className="text-gray-500 text-[11px]">
                Click or press
              </p>
              <kbd className="px-1.5 py-0.5 text-[10px] bg-gray-800 border border-gray-700 rounded text-gray-300 font-mono">
                Space
              </kbd>
              <p className="text-gray-500 text-[11px]">
                when in the zone
              </p>
            </div>
            <button
              onClick={handleCalibrate}
              className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-bold uppercase tracking-wider rounded-md hover:brightness-110 active:scale-95 transition-all"
            >
              Calibrate
            </button>
          </div>

          {/* Flash overlay */}
          <div
            id="calibration-flash"
            className="absolute inset-0 rounded-lg pointer-events-none transition-opacity duration-150"
            style={{ opacity: 0, background: `${infoColor}22` }}
          />

          {/* Info */}
          <p className="text-gray-600 text-[10px] text-center mt-2 font-mono">
            Speed: {CALIBRATION_SWEEP_SPEED} u/s · Zone: {target.start}–{target.end} · Hits: {activeFormula.hitsLanded}/{activeFormula.hitsRequired}
          </p>
        </div>
      )}

      {/* All discovered */}
      {formulas.every((f) => f.discovered) && (
        <div className="text-center py-8">
          <p className="text-green-400 text-lg font-bold">All formulas discovered!</p>
          <p className="text-gray-500 text-sm mt-1">The Lab has no more secrets for you.</p>
        </div>
      )}

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-2px); }
          80% { transform: translateX(2px); }
        }
      `}</style>
    </div>
  )
}
