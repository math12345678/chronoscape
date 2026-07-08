import { useState, useEffect } from 'react'
import {
  getCalendarDate, getActiveEvents, getEventHistory,
  formatCalendarDate, getSeason, getCalendarProgress,
} from '../../systems/CalendarEvents'
import type { CalendarEvent } from '../../systems/CalendarEvents'

export const CalendarUI = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [date, setDate] = useState(getCalendarDate())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [history, setHistory] = useState<string[]>([])
  const [, setRefresh] = useState(0)

  useEffect(() => {
    if (!open) return
    const id = setInterval(() => {
      setDate(getCalendarDate())
      setEvents(getActiveEvents())
      setHistory(getEventHistory())
      setRefresh((r) => r + 1)
    }, 1000)
    return () => clearInterval(id)
  }, [open])

  if (!open) return null

  const containerStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
  }

  const panelStyle: React.CSSProperties = {
    width: 500, maxHeight: '85vh', overflow: 'auto',
    background: 'linear-gradient(180deg, #0d1520, #080e16)',
    border: '1px solid #2a3a50', borderRadius: 12, padding: 24,
    boxShadow: '0 0 60px rgba(68,170,255,0.08)',
  }

  return (
    <div style={containerStyle} onClick={onClose}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>
            📅 Chrono Calendar
          </span>
          <button onClick={onClose} style={{
            background: 'none', border: '1px solid #3a4a60', borderRadius: 6,
            color: '#aaa', padding: '4px 12px', cursor: 'pointer', fontSize: 14,
          }}>✕</button>
        </div>

        {/* Current date */}
        <div style={{
          padding: 16, borderRadius: 8, background: '#0a1a20',
          border: '1px solid #1a3a2a', marginBottom: 16, textAlign: 'center',
        }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#44ffcc' }}>
            {formatCalendarDate(date)}
          </div>
          <div style={{ fontSize: 13, color: '#7a8a9a', marginTop: 4 }}>
            Season: {getSeason()} &middot; {getCalendarProgress()}
          </div>
        </div>

        {/* Active events */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#5a7a90', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 2 }}>
            Active Events
          </div>
          {events.length === 0 ? (
            <div style={{ fontSize: 12, color: '#5a6a80', fontStyle: 'italic' }}>
              No active events. Time flows normally.
            </div>
          ) : (
            events.map((event) => (
              <div key={event.id} style={{
                padding: 10, borderRadius: 6, marginBottom: 6,
                background: event.color + '0a', border: `1px solid ${event.color}33`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 18 }}>{event.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: event.color }}>
                    {event.name}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#7a8a9a', marginTop: 4 }}>
                  {event.description}
                </div>
                <div style={{ fontSize: 11, color: event.color, marginTop: 2 }}>
                  ◆ {event.effects}
                </div>
              </div>
            ))
          )}
        </div>

        {/* All events calendar */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#5a7a90', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 2 }}>
            Calendar of Events
          </div>
          {[
            { day: 1, name: "Time's New Year", icon: '🎉', color: '#ffd700' },
            { day: 80, name: 'Vernal Alignment', icon: '🌸', color: '#44ff88' },
            { day: 172, name: 'Solstice of Eternity', icon: '☀️', color: '#ff8844' },
            { day: 265, name: 'Harvest Moon', icon: '🌕', color: '#ffcc44' },
            { day: 300, name: 'Void Eclipse', icon: '🌑', color: '#aa44ff' },
            { day: 355, name: 'Chrono Stillness', icon: '❄️', color: '#44ccff' },
          ].map((ce) => {
            const isActive = events.some((e) => e.name === ce.name)
            return (
              <div key={ce.day} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 10px', borderRadius: 4, marginBottom: 2,
                background: isActive ? ce.color + '10' : 'transparent',
                border: `1px solid ${isActive ? ce.color : 'transparent'}`,
              }}>
                <span style={{ fontSize: 14 }}>{ce.icon}</span>
                <span style={{
                  fontSize: 12, color: isActive ? ce.color : '#5a6a80',
                  fontWeight: isActive ? 600 : 400,
                }}>
                  Day {ce.day} — {ce.name}
                  {isActive && <span style={{ color: '#44ff88', marginLeft: 4 }}>● ACTIVE</span>}
                </span>
              </div>
            )
          })}
        </div>

        {/* Event history */}
        {history.length > 0 && (
          <div>
            <div style={{ fontSize: 12, color: '#5a7a90', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 2 }}>
              Event History
            </div>
            {history.slice(-5).reverse().map((h, i) => (
              <div key={i} style={{ fontSize: 11, color: '#4a5a6a', padding: '2px 0' }}>
                {h}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
