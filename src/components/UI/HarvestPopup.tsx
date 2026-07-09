import { useState, useEffect, useCallback, useRef } from 'react'

interface PopupItem {
  id: number
  text: string
  color: string
  isCombo: boolean
  isSurge: boolean
  createdAt: number
}

let nextId = 1

export const HarvestPopup = () => {
  const [items, setItems] = useState<PopupItem[]>([])
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const add = useCallback((text: string, color: string, duration: number, isCombo: boolean, isSurge: boolean = false) => {
    const id = nextId++
    const item: PopupItem = { id, text, color, isCombo, isSurge, createdAt: performance.now() }
    setItems((prev) => [...prev.slice(-3), item])
    const timer = setTimeout(() => {
      setItems((prev) => prev.filter((i) => i.id !== id))
      timers.current.delete(id)
    }, duration)
    timers.current.set(id, timer)
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (!detail) return
      const amt = detail.amount ?? detail.yield ?? 0
      const combo = detail.combo ?? 0
      const mult = detail.multiplier ?? 1
      const color = detail.color ?? '#44ffcc'
      const isCombo = combo > 1
      const isSurge = detail.isSurge ?? false

      const label = amt > 0 ? `+${amt}` : 'Harvest!'
      add(label, isCombo ? '#ff8844' : color, isCombo ? 1600 : 1200, isCombo)

      if (isCombo && !isSurge) {
        add(`x${mult.toFixed(1)}`, '#ffaa44', 1800, true)
      }
    }
    window.addEventListener('harvest-event', handler)
    const timersMap = timers.current
    return () => {
      window.removeEventListener('harvest-event', handler)
      timersMap.forEach((t) => clearTimeout(t))
    }
  }, [add])

  if (items.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-[95] flex items-center justify-center">
      {items.map((item, idx) => {
        const age = performance.now() - item.createdAt
        const duration = item.isSurge ? 2200 : item.isCombo ? 1800 : 1200
        const progress = Math.min(age / duration, 1)
        const opacity = item.isSurge
          ? progress < 0.15 ? 1 : 1 - (progress - 0.15) / 0.85
          : item.isCombo
            ? progress < 0.1 ? 1 : 1 - (progress - 0.1) / 0.9
            : progress < 0.15 ? progress / 0.15 : 1 - (progress - 0.15) / 0.85
        const scale = item.isSurge
          ? progress < 0.15 ? 0.5 + progress * 6 : 1.4 - (progress - 0.15) * 0.15
          : item.isCombo
            ? progress < 0.1 ? 1 + progress * 5 : 1.5 - (progress - 0.1) * 0.3
            : progress < 0.15 ? 0.3 + progress * 4 : 1 - progress * 0.05
        const yOffset = item.isSurge ? 20 : item.isCombo ? 40 : -10 + idx * -35
        const glow = item.isSurge
          ? `0 0 50px ${item.color}88, 0 0 100px ${item.color}44`
          : item.isCombo
            ? `0 0 30px ${item.color}66, 0 0 60px ${item.color}33`
            : `0 0 20px ${item.color}66`

        return (
          <div
            key={item.id}
            className="absolute font-bold tracking-wide"
            style={{
              color: item.color,
              fontSize: item.isSurge ? 42 : item.isCombo ? 32 : 26,
              fontFamily: "'JetBrains Mono', monospace",
              opacity: Math.max(0, opacity),
              transform: `translateY(${yOffset}px) scale(${Math.max(0.2, scale)})`,
              textShadow: glow,
              transition: 'none',
              filter: item.isSurge ? 'brightness(1.4)' : item.isCombo ? 'brightness(1.2)' : 'none',
            }}
          >
            {item.text}
          </div>
        )
      })}
    </div>
  )
}
