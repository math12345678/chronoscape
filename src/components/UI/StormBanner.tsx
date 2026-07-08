import { useState, useEffect } from 'react'
import { isStormActive, getStormColor, getStormIntensity, buyStormShield } from '../StormEvents'
import { getTimeCreditBalance } from '../../config/timeCredit'

export const StormBanner = () => {
  const [event, setEvent] = useState<{ label: string; description: string; color: string } | null>(null)
  const [visible, setVisible] = useState(false)
  const [intensity, setIntensity] = useState(0)

  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail
      if (d.type) {
        setEvent({ label: d.label, description: d.description, color: d.color })
        setVisible(true)
      } else if (d.active === false) {
        setTimeout(() => { setVisible(false); setEvent(null) }, 1000)
      }
    }
    window.addEventListener('storm-event', handler)
    return () => window.removeEventListener('storm-event', handler)
  }, [])

  useEffect(() => {
    if (!visible) return
    const iv = setInterval(() => {
      setIntensity(getStormIntensity())
    }, 100)
    return () => clearInterval(iv)
  }, [visible])

  if (!visible || !event) return null

  const tc = getTimeCreditBalance()

  return (
    <div
      style={{
        position: 'fixed',
        top: '25%',
        right: 20,
        zIndex: 9990,
        pointerEvents: 'none',
        transition: 'opacity 0.5s ease',
        opacity: visible ? 1 : 0,
      }}
    >
      <div
        style={{
          padding: '10px 14px',
          borderRadius: 8,
          background: `${event.color}12`,
          border: `1px solid ${event.color}30`,
          backdropFilter: 'blur(8px)',
          maxWidth: 220,
        }}
      >
        <div style={{
          fontSize: 11,
          fontWeight: 900,
          fontFamily: 'monospace',
          letterSpacing: '0.15em',
          color: event.color,
          marginBottom: 4,
          textShadow: `0 0 10px ${event.color}44`,
        }}>
          ⚡ {event.label}
        </div>
        <div style={{ fontSize: 9, color: '#889', lineHeight: 1.4 }}>
          {event.description}
        </div>
        <div style={{
          marginTop: 6,
          height: 2,
          width: '100%',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 1,
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${intensity * 100}%`,
            height: '100%',
            background: event.color,
            transition: 'width 0.1s linear',
            boxShadow: `0 0 4px ${event.color}`,
          }} />
        </div>
      </div>
    </div>
  )
}
