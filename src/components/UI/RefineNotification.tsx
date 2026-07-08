import { useState, useCallback, useRef, useEffect } from 'react'
import { useStore } from '../../store'
import type { TimeState } from '../../store'

interface Notification {
  id: number
  text: string
  color: string
  x: number
  y: number
}

let notifId = 0

const NOTIF_COLORS: Record<TimeState, string> = {
  raw: '#ff8844',
  vapour: '#ffaa00',
  liquid: '#4488ff',
  crystal: '#aa88ff',
}

/**
 * Watches the store for inventory changes and shows floating "+X" notifications
 * when resources are gained.
 */
export const RefineNotification = () => {
  const inventory = useStore((s) => s.inventory)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const prevRef = useRef(inventory)

  const addNotification = useCallback((text: string, color: string) => {
    const id = ++notifId
    const notif: Notification = {
      id,
      text,
      color,
      x: 50 + (Math.random() - 0.5) * 20,
      y: 40 + (Math.random() - 0.5) * 10,
    }
    setNotifications((prev) => [...prev.slice(-4), notif])

    // Remove after animation
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    }, 1200)
  }, [])

  useEffect(() => {
    const prev = prevRef.current
    prevRef.current = inventory

    const resources: TimeState[] = ['vapour', 'liquid', 'crystal']
    for (const type of resources) {
      const diff = Math.floor(inventory[type]) - Math.floor(prev[type])
      if (diff > 0) {
        const labels: Record<string, string> = { vapour: 'Chrono', liquid: 'Flux', crystal: 'Aeon' }
        addNotification(`+${diff} ${labels[type] ?? type}`, NOTIF_COLORS[type])
      }
    }
  }, [inventory, addNotification])

  if (notifications.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-[60]">
      {notifications.map((n, index) => (
        <div key={n.id}>
          {/* Main notification text */}
          <div
            className="absolute font-bold font-mono text-lg"
            style={{
              left: `${n.x}%`,
              top: `${n.y}%`,
              color: n.color,
              textShadow: '0 0 10px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)',
              animation: 'notif-float 1.3s ease-out forwards',
              animationDelay: `${index * 0.08}s`,
            }}
          >
            {n.text}
          </div>
          {/* Sparkle burst particles */}
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={`sparkle-${n.id}-${i}`}
              className="absolute rounded-full"
              style={{
                left: `${n.x}%`,
                top: `${n.y}%`,
                width: `${2 + (i % 3) * 2}px`,
                height: `${2 + (i % 3) * 2}px`,
                background: n.color,
                boxShadow: `0 0 4px ${n.color}`,
                opacity: 0,
                animation: `notif-sparkle 0.7s ease-out ${index * 0.08}s forwards`,
                '--sparkle-angle': `${i * 60}deg`,
                '--sparkle-dist': `${15 + (i % 3) * 10}px`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      ))}

      <style>{`
        @keyframes notif-float {
          0% { opacity: 1; transform: translateY(0) scale(1) translateX(0); }
          30% { opacity: 1; transform: translateY(-10px) scale(1.15) translateX(2px); }
          60% { opacity: 0.8; transform: translateY(-25px) scale(1.05) translateX(-2px); }
          100% { opacity: 0; transform: translateY(-45px) scale(0.7) translateX(0); }
        }
        @keyframes notif-sparkle {
          0% { opacity: 0.9; transform: translate(0, 0) scale(1); }
          50% { opacity: 0.5; transform: translate(
            calc(cos(var(--sparkle-angle)) * var(--sparkle-dist)),
            calc(sin(var(--sparkle-angle)) * var(--sparkle-dist))
          ) scale(0.5); }
          100% { opacity: 0; transform: translate(
            calc(cos(var(--sparkle-angle)) * var(--sparkle-dist) * 1.5),
            calc(sin(var(--sparkle-angle)) * var(--sparkle-dist) * 1.5)
          ) scale(0); }
        }
      `}</style>
    </div>
  )
}
