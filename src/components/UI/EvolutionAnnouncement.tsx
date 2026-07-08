import { useState, useEffect } from 'react'

interface EvoEvent {
  epoch: number
  timestamp: number
}

export const EvolutionAnnouncement = () => {
  const [event, setEvent] = useState<EvoEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      setEvent({ epoch: detail.epoch, timestamp: Date.now() })
      setVisible(true)
      setTimeout(() => setVisible(false), 6000)
    }
    window.addEventListener('evolution-triggered', handler)
    return () => window.removeEventListener('evolution-triggered', handler)
  }, [])

  if (!visible || !event) return null

  return (
    <div style={{
      position: 'fixed', top: '30%', left: '50%', transform: 'translateX(-50%)',
      zIndex: 10001, textAlign: 'center', fontFamily: 'monospace',
      animation: 'fadeIn 0.5s ease-out',
      pointerEvents: 'none',
    }}>
      <div style={{
        fontSize: 28, fontWeight: 'bold', color: '#ffd700',
        textShadow: '0 0 30px rgba(255,215,0,0.6), 0 0 60px rgba(255,215,0,0.3)',
        letterSpacing: 6, marginBottom: 8,
      }}>
        ⚡ EPOCH {event.epoch} TRIGGERED
      </div>
      <div style={{
        fontSize: 14, color: 'rgba(255,255,255,0.7)',
        textShadow: '0 0 20px rgba(255,255,255,0.3)',
      }}>
        The world evolves. New content generated.
      </div>
      <div style={{
        marginTop: 12,
        display: 'flex', justifyContent: 'center', gap: 4,
      }}>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#ffd700',
            animation: `pulse 0.6s ${i * 0.15}s infinite alternate`,
          }} />
        ))}
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateX(-50%) translateY(-20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @keyframes pulse { from { opacity: 0.3; transform: scale(0.8); } to { opacity: 1; transform: scale(1.2); } }
      `}</style>
    </div>
  )
}
