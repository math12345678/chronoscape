import React, { useEffect, useState, useCallback, useRef } from 'react'
import { setTimeScaleTarget } from './TimeManager'
import { isTimeFrozen } from '../skills/ChronoSKills'

// ── Module-level kill streak tracker ────────────────
let _killStreak = 0
let _lastKillTime = 0
let _multiplier = 1
let _timeDilated = false
let _dilationEndTime = 0

const STREAK_WINDOW = 4000
const DILATION_DURATION = 1500
const TIME_SCALE = 0.15

export function registerKill() {
  const now = performance.now()
  if (now - _lastKillTime > STREAK_WINDOW) { _killStreak = 0; _multiplier = 1 }
  _killStreak++
  _lastKillTime = now

  if (_killStreak >= 10) _multiplier = 4
  else if (_killStreak >= 6) _multiplier = 3
  else if (_killStreak >= 3) _multiplier = 2

  if (_killStreak >= 3 && !_timeDilated) {
    _timeDilated = true
    _dilationEndTime = now + DILATION_DURATION * _multiplier
  }
}

export function getKillStreak() { return _killStreak }
export function getMultiplier() { return _multiplier }
export function isTimeDilated() { return _timeDilated }
export function getStreakTimeRemaining() {
  const elapsed = performance.now() - _lastKillTime
  return Math.max(0, STREAK_WINDOW - elapsed)
}

export function tickTimeDilation(_delta: number) {
  if (_timeDilated && performance.now() > _dilationEndTime) {
    _timeDilated = false
    _killStreak = 0
    _multiplier = 1
    return true
  }
  if (_timeDilated) setTimeScaleTarget(TIME_SCALE)
  return false
}

// ── React Overlay ───────────────────────────────────
export const TimeSpeedOverlay = () => {
  const [, refresh] = useState(0)
  const raf = useRef<number>(0)
  const ended = useRef(false)

  const loop = useCallback(() => {
    if (ended.current) return
    const dilated = isTimeDilated()
    const killed = tickTimeDilation(0.016)
    if (killed) ended.current = true
    refresh(n => n + 1)
    if (dilated) raf.current = requestAnimationFrame(loop)
  }, [])

  useEffect(() => {
    if (isTimeDilated()) {
      ended.current = false
      raf.current = requestAnimationFrame(loop)
    }
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [loop])

  useEffect(() => {
    const iv = setInterval(() => refresh(n => n + 1), 100)
    return () => clearInterval(iv)
  }, [])

  const streak = getKillStreak()
  const multiplier = getMultiplier()
  const dilated = isTimeDilated()
  const timeLeft = getStreakTimeRemaining()
  const frozen = isTimeFrozen()
  const showStreak = streak >= 3 || dilated || frozen

  if (!showStreak) return null

  const color = streak >= 10 ? '#ff4488' : streak >= 6 ? '#ff8844' : '#44ffcc'
  const label = streak >= 10 ? 'GODLIKE' : streak >= 6 ? 'MASSACRE' : streak >= 3 ? 'COMBO' : ''

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      pointerEvents: 'none',
      zIndex: 9995,
    }}>
      {/* Vignette during dilation */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%)',
        opacity: dilated ? 0.8 : 0,
        transition: 'opacity 0.3s ease',
      }} />

      {/* Streak counter — top center */}
      <div style={{
        position: 'absolute',
        top: 100,
        left: '50%',
        transform: 'translateX(-50%)',
        fontFamily: 'monospace',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: 14,
          fontWeight: 700,
          color,
          textShadow: `0 0 20px ${color}44`,
          letterSpacing: 4,
          textTransform: 'uppercase',
        }}>
          {streak}x streak
        </div>
        {!dilated && (
          <div style={{
            fontSize: 9,
            color: '#667',
            marginTop: 4,
            letterSpacing: 1,
          }}>
            {Math.ceil(timeLeft / 1000)}s window remaining
          </div>
        )}
      </div>

      {/* Freeze indicator */}
      {frozen && (
        <div style={{
          position: 'absolute',
          top: '35%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          fontFamily: 'monospace',
        }}>
          <div style={{
            fontSize: 48,
            fontWeight: 900,
            color: '#4488ff',
            textShadow: '0 0 40px #4488ff44, 0 0 80px #4488ff22',
            letterSpacing: 8,
            opacity: 0.5,
            animation: 'pulse-slow 2s ease-in-out infinite',
          }}>
            FROZEN
          </div>
          <div style={{
            fontSize: 12,
            color: '#6688cc',
            letterSpacing: 2,
            textTransform: 'uppercase',
            marginTop: 8,
            opacity: 0.4,
          }}>
            enemies slowed
          </div>
        </div>
      )}

      {/* Dilation label */}
      {dilated && !frozen && (
        <div style={{
          position: 'absolute',
          top: '35%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          fontFamily: 'monospace',
        }}>
          <div style={{
            fontSize: 72,
            fontWeight: 900,
            color,
            textShadow: `0 0 40px ${color}, 0 0 80px ${color}44, 0 0 120px ${color}22`,
            letterSpacing: 8,
            opacity: 0.6,
            animation: 'pulse-slow 2s ease-in-out infinite',
          }}>
            {label}
          </div>
          <div style={{
            fontSize: 14,
            color: '#889',
            letterSpacing: 3,
            textTransform: 'uppercase',
            marginTop: 8,
            opacity: 0.5,
          }}>
            x{multiplier} time dilation
          </div>
        </div>
      )}
    </div>
  )
}
