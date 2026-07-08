import { useState, useEffect } from 'react'
import { getActiveWorldEvents, getTotalEventsTriggered } from '../../systems/DynamicWorldEvents'

const EVENT_COLORS: Record<string, string> = {
  storm: '#44ffcc', crystal: '#aa88ff', void: '#ff4444',
  quake: '#ff8844', fracture: '#ff00ff', boss: '#ffd700',
  heal: '#44ff88', omega: '#ffffff',
}

const EVENT_ICONS: Record<string, string> = {
  storm: '⚡', crystal: '💎', void: '🌀',
  quake: '🌋', fracture: '💥', boss: '👹',
  heal: '💚', omega: '♾️',
}

/** Floating HUD showing active world events */
export const WorldEventsHUD = () => {
  const [events, setEvents] = useState(getActiveWorldEvents())
  const [total, setTotal] = useState(getTotalEventsTriggered())

  useEffect(() => {
    const interval = setInterval(() => {
      setEvents(getActiveWorldEvents())
      setTotal(getTotalEventsTriggered())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  if (events.length === 0) return null

  return (
    <div style={{
      position: 'fixed', top: 80, right: 16, zIndex: 9998,
      display: 'flex', flexDirection: 'column', gap: 6,
      fontFamily: 'monospace',
      pointerEvents: 'none',
    }}>
      {events.map(e => {
        const remaining = Math.max(0, e.duration - e.elapsed)
        const pct = e.duration > 0 ? (remaining / e.duration) * 100 : 0
        return (
          <div key={e.id} style={{
            padding: '8px 12px',
            background: 'rgba(5,10,25,0.85)',
            border: `1px solid ${EVENT_COLORS[e.icon] || e.color}44`,
            borderRadius: 8,
            animation: 'eventSlideIn 0.3s ease-out',
            minWidth: 200,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 14 }}>{EVENT_ICONS[e.icon] || '📡'}</span>
              <span style={{ color: EVENT_COLORS[e.icon] || e.color, fontSize: 11, fontWeight: 'bold' }}>
                {e.name}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginLeft: 'auto' }}>
                {Math.floor(remaining)}s
              </span>
            </div>
            <div style={{ height: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 1 }}>
              <div style={{
                width: `${pct}%`, height: '100%',
                background: EVENT_COLORS[e.icon] || e.color,
                borderRadius: 1,
                transition: 'width 1s linear',
              }} />
            </div>
          </div>
        )
      })}
      <style>{`
        @keyframes eventSlideIn { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </div>
  )
}
