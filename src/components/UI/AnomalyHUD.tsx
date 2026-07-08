import { useState, useEffect } from 'react'
import { getAnomalyState, getActiveEvent } from '../../systems/TemporalAnomalies'

export const AnomalyHUD = () => {
  const [, refresh] = useState(0)

  useEffect(() => {
    const id = setInterval(() => refresh((n) => n + 1), 500)
    return () => clearInterval(id)
  }, [])

  const state = getAnomalyState()
  if (!state.active) return null

  const event = getActiveEvent()
  const pct = event ? (state.timeRemaining / event.duration) * 100 : 0

  return (
    <div style={{
      position: 'fixed', top: 48, left: '50%', transform: 'translateX(-50%)', zIndex: 998,
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '6px 16px', borderRadius: 8,
      background: `${event?.color ?? '#ffd700'}12`,
      border: `1px solid ${event?.color ?? '#ffd700'}44`,
      boxShadow: `0 0 30px ${event?.color ?? '#ffd700'}22`,
      fontSize: 12,
    }}>
      <span style={{ fontSize: 16 }}>{event?.icon ?? '!'}</span>
      <span style={{ color: event?.color ?? '#ffd700', fontWeight: 700 }}>
        {state.effect.description}
      </span>
      <div style={{ width: 80, height: 4, borderRadius: 2, background: '#1a1a2a' }}>
        <div style={{
          width: `${pct}%`, height: '100%', borderRadius: 2,
          background: event?.color ?? '#ffd700',
          transition: 'width 0.5s',
        }} />
      </div>
      <span style={{ color: '#aaa', fontSize: 10 }}>
        {Math.ceil(state.timeRemaining)}s
      </span>
    </div>
  )
}
