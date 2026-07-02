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
        addNotification(`+${diff} ${type.charAt(0).toUpperCase() + type.slice(1)}`, NOTIF_COLORS[type])
      }
    }
  }, [inventory, addNotification])

  if (notifications.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-[60]">
      {notifications.map((n) => (
        <div
          key={n.id}
          className="absolute font-bold font-mono text-lg"
          style={{
            left: `${n.x}%`,
            top: `${n.y}%`,
            color: n.color,
            textShadow: '0 0 10px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)',
            animation: 'notif-float 1.2s ease-out forwards',
          }}
        >
          {n.text}
        </div>
      ))}

      {/* Keyframes injected via style tag so Tailwind classes work */}
      <style>{`
        @keyframes notif-float {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          60% { opacity: 1; transform: translateY(-20px) scale(1.1); }
          100% { opacity: 0; transform: translateY(-40px) scale(0.8); }
        }
      `}</style>
    </div>
  )
}
