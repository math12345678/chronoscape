import { useEffect, useRef, useCallback, useState } from 'react'

interface FloatItem {
  id: number
  text: string
  color: string
  x: number
  y: number
  isSurge: boolean
}

let nextFloatId = 1

export const FloatingNumbers = () => {
  const [items, setItems] = useState<FloatItem[]>([])
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const add = useCallback((text: string, color: string, isSurge: boolean) => {
    const id = nextFloatId++
    const item: FloatItem = {
      id, text, color, isSurge,
      x: (Math.random() - 0.5) * 300,
      y: 40 + Math.random() * 30,
    }
    setItems((prev) => [...prev, item])
    const timer = setTimeout(() => {
      setItems((prev) => prev.filter((i) => i.id !== id))
      timers.current.delete(id)
    }, 1800)
    timers.current.set(id, timer)
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (!detail) return
      const amt = detail.amount ?? detail.yield ?? 0
      const combo = detail.combo ?? 0
      const isSurge = detail.isSurge ?? false
      const color = isSurge ? '#ff44ff' : combo > 1 ? '#ff8844' : detail.color ?? '#44ffcc'
      const label = amt > 0 ? `+${amt}` : 'Harvest!'

      const count = isSurge ? 5 : combo > 3 ? 3 : combo > 1 ? 2 : 1
      for (let i = 0; i < count; i++) {
        setTimeout(() => add(label, color, isSurge), i * 60)
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
    <div className="fixed inset-0 pointer-events-none z-[96] overflow-hidden">
      <style>{`
        @keyframes floatUp {
          0% { opacity: 0; transform: translateY(0) scale(0.3); }
          8% { opacity: 1; transform: translateY(-15px) scale(1.15); }
          100% { opacity: 0; transform: translateY(-120px) scale(0.7); }
        }
        @keyframes floatSurge {
          0% { opacity: 0; transform: translateY(0) scale(0.3); }
          6% { opacity: 1; transform: translateY(-20px) scale(1.3); }
          100% { opacity: 0; transform: translateY(-160px) scale(0.8); }
        }
      `}</style>
      {items.map((item) => (
        <div
          key={item.id}
          className="absolute font-black tracking-widest"
          style={{
            color: item.color,
            fontSize: item.isSurge ? 52 : 38,
            fontFamily: "'JetBrains Mono', monospace",
            left: `calc(50% + ${item.x}px)`,
            top: `${item.y}%`,
            textShadow: item.isSurge
              ? `0 0 40px ${item.color}aa, 0 0 80px ${item.color}55`
              : `0 0 25px ${item.color}88`,
            filter: item.isSurge ? 'brightness(1.5)' : 'brightness(1.2)',
            animation: item.isSurge
              ? 'floatSurge 1.8s cubic-bezier(0.22, 1, 0.36, 1) forwards'
              : 'floatUp 1.4s cubic-bezier(0.22, 1, 0.36, 1) forwards',
          }}
        >
          {item.text}
        </div>
      ))}
    </div>
  )
}
