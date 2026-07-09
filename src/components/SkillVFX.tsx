import { useEffect, useRef, useState } from 'react'
import { isTimeSurgeActive, isTimeFrozen } from '../skills/ChronoSKills'

// ── Speed line generator ────────────────────────────────
let lineId = 0
const lines: { id: number; x: number; y: number; speed: number; length: number; opacity: number }[] = []
let spawnTimer = 0

// ── Time Surge Speed Lines DOM overlay ────────────────
export const TimeSurgeLines = () => {
  const [surgeLines, setSurgeLines] = useState<typeof lines>([])
  const frames = useRef(0)
  const active = useRef(false)

  useEffect(() => {
    const interval = setInterval(() => {
      const surge = isTimeSurgeActive()
      active.current = surge

      if (surge) {
        spawnTimer += 50
        // Spawn 1-2 lines every 50ms
        if (spawnTimer >= 50) {
          spawnTimer = 0
          const count = Math.random() > 0.5 ? 1 : 2
          for (let i = 0; i < count; i++) {
            lines.push({
              id: lineId++,
              x: Math.random() * 100,
              y: Math.random() * 100,
              speed: 40 + Math.random() * 60,
              length: 8 + Math.random() * 20,
              opacity: 0.15 + Math.random() * 0.25,
            })
          }
        }

        // Update existing lines
        for (let i = lines.length - 1; i >= 0; i--) {
          const l = lines[i]
          l.x += l.speed * 0.016
          if (l.x > 120) {
            lines.splice(i, 1)
          }
        }

        // Cap at 30 lines
        if (lines.length > 30) lines.splice(0, lines.length - 30)
      } else {
        // Fade out when surge ends
        for (let i = lines.length - 1; i >= 0; i--) {
          lines[i].opacity -= 0.02
          lines[i].x += lines[i].speed * 0.008
          if (lines[i].opacity <= 0 || lines[i].x > 120) {
            lines.splice(i, 1)
          }
        }
      }

      frames.current++
      if (frames.current % 2 === 0) {
        setSurgeLines([...lines])
      }
    }, 50)

    return () => clearInterval(interval)
  }, [])

  if (surgeLines.length === 0 && !active.current) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      pointerEvents: 'none',
      zIndex: 9998,
      overflow: 'hidden',
    }}>
      {/* Red vignette when surge active */}
      {active.current && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(255,50,20,0.08) 100%)',
          animation: 'pulse-slow 1s ease-in-out infinite',
        }} />
      )}
      {surgeLines.map((l) => (
        <div
          key={l.id}
          style={{
            position: 'absolute',
            top: `${l.y}%`,
            left: `${l.x}%`,
            width: `${l.length}px`,
            height: 1.5,
            background: `linear-gradient(90deg, transparent, rgba(255,200,100,${l.opacity}), transparent)`,
            transform: 'rotate(-2deg)',
            boxShadow: `0 0 4px rgba(255,200,100,${l.opacity * 0.5})`,
            opacity: Math.min(1, l.opacity),
          }}
        />
      ))}
    </div>
  )
}

// ── Time Freeze Frost Overlay ──────────────────────────
export const FreezeOverlay = () => {
  const [show, setShow] = useState(false)
  const [intensity, setIntensity] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      const frozen = isTimeFrozen()
      setShow(frozen)
      if (frozen) {
        setIntensity((prev) => Math.min(1, prev + 0.05))
      } else {
        setIntensity((prev) => Math.max(0, prev - 0.03))
      }
    }, 50)
    return () => clearInterval(interval)
  }, [])

  if (intensity <= 0 && !show) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      pointerEvents: 'none',
      zIndex: 9997,
      opacity: intensity * 0.4,
    }}>
      {/* Blue vignette */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 30%, rgba(40,80,255,0.15) 100%)',
      }} />
      {/* Frost crystals */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `
          radial-gradient(circle at 10% 20%, rgba(180,220,255,0.06) 0%, transparent 50%),
          radial-gradient(circle at 90% 80%, rgba(180,220,255,0.06) 0%, transparent 50%),
          radial-gradient(circle at 50% 50%, rgba(180,220,255,0.03) 0%, transparent 40%),
          repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(180,220,255,0.02) 20px, rgba(180,220,255,0.02) 21px)
        `,
      }} />
    </div>
  )
}

// ── Chrono Shield Impact Flash ─────────────────────────
export let triggerShieldFlash: () => void = () => {}
let shieldFlashTimer = 0

export const ShieldFlashOverlay = () => {
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    triggerShieldFlash = () => {
      shieldFlashTimer = 150
      setFlash(true)
    }
    const interval = setInterval(() => {
      if (shieldFlashTimer > 0) {
        shieldFlashTimer -= 50
        if (shieldFlashTimer <= 0) {
          setFlash(false)
        }
      }
    }, 50)
    return () => clearInterval(interval)
  }, [])

  if (!flash) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      pointerEvents: 'none',
      zIndex: 9999,
      background: 'radial-gradient(ellipse at center, transparent 40%, rgba(255,200,50,0.15) 100%)',
      opacity: shieldFlashTimer / 150,
    }} />
  )
}
