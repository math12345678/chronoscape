import { useState, useEffect, useRef } from 'react'
import { getPlayerHealth } from '../Combat/HealthTracker'
import { PLAYER_MAX_HEALTH } from '../../config/combat'

// ── Types ──────────────────────────────────────────────

interface Flash {
  id: number
  color: string
  intensity: number
  birth: number
  duration: number
}

// ── Module-level flash queue ───────────────────────────

let flashId = 0
const flashes: Flash[] = []

/** Schedule a screen flash from any code path (no React dependency needed) */
function queueFlash(color: string, intensity: number, duration: number) {
  if (flashes.length > 16) return
  flashes.push({ id: flashId++, color, intensity, birth: performance.now(), duration })
}

/**
 * Simplified damage vignette — only shows:
 * - Red flash on damage (intensity scales with damage)
 * - Low-HP heartbeat pulse (below 30%)
 * Everything else (kill celebrations, formula discoveries, storm events, etc.) removed.
 */
export const DamageVignette = () => {
  const [, tick] = useState(0)
  const frameRef = useRef(0)

  const handlersRef = useRef({
    dmg: () => {
      const health = getPlayerHealth()
      const pct = health / PLAYER_MAX_HEALTH
      const intensity = Math.min(1, 0.2 + (1 - pct) * 0.6)
      queueFlash('#ff0000', intensity, 400 + (1 - pct) * 300)
    },
    heal: () => {
      queueFlash('#44ff88', 0.3, 400)
    },
  })

  useEffect(() => {
    const h = handlersRef.current

    window.addEventListener('player-damaged', h.dmg)
    window.addEventListener('heal-effect', h.heal)

    const loop = () => {
      const now = performance.now()

      // Clean expired flashes
      for (let i = flashes.length - 1; i >= 0; i--) {
        if (now - flashes[i].birth > flashes[i].duration) {
          flashes.splice(i, 1)
        }
      }

      tick(now)
      frameRef.current = requestAnimationFrame(loop)
    }

    frameRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(frameRef.current)
      window.removeEventListener('player-damaged', h.dmg)
      window.removeEventListener('heal-effect', h.heal)
    }
  }, [])

  const now = performance.now()

  // Parse flash colors into rgba strings
  const colorToRgba = (color: string, alpha: number): string => {
    if (color === '#ff0000') return `rgba(255,0,0,${alpha})`
    if (color === '#44ff88') return `rgba(68,255,136,${alpha})`
    const hex = color.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    return `rgba(${r},${g},${b},${alpha})`
  }

  return (
    <>
      {/* Active flash vignettes */}
      {flashes.map(f => {
        const age = (now - f.birth) / f.duration
        const opacity = f.intensity * Math.max(0, 1 - age)
        if (opacity < 0.01) return null
        return (
          <div
            key={f.id}
            className="fixed inset-0 z-40 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at center, transparent 50%, ${colorToRgba(f.color, opacity)} 100%)`,
              transition: 'none',
            }}
          />
        )
      })}

      {/* Low HP heartbeat vignette */}
      {(() => {
        const health = getPlayerHealth()
        const healthPct = health / PLAYER_MAX_HEALTH
        if (healthPct >= 0.3) return null
        const lowHpPulse = Math.sin(now * 0.004) * 0.5 + 0.5
        if (lowHpPulse < 0.1) return null
        return (
          <div
            className="fixed inset-0 z-40 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at center, transparent 55%, rgba(255,0,0,${lowHpPulse * 0.15}) 100%)`,
              transition: 'none',
            }}
          />
        )
      })()}
    </>
  )
}

export { queueFlash }
