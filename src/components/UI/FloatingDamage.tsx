import { useState, useEffect, useRef } from 'react'

interface DamageNumber {
  id: number
  x: number
  y: number
  amount: number
  color: string
  isKill: boolean
}

let nextId = 1
let _enqueue: ((n: Omit<DamageNumber, 'id'>) => void) | null = null

export function spawnDamageNumber(x: number, y: number, amount: number, color: string = '#ff4466', isKill: boolean = false) {
  _enqueue?.({ x, y, amount, color, isKill })
}

export const FloatingDamage = () => {
  const [numbers, setNumbers] = useState<DamageNumber[]>([])
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    _enqueue = (n) => {
      const id = nextId++
      setNumbers((prev) => [...prev, { ...n, id }])
      const dur = n.isKill ? 1800 : 1000
      timers.current.set(id, setTimeout(() => {
        setNumbers((prev) => prev.filter((dn) => dn.id !== id))
        timers.current.delete(id)
      }, dur))
    }
    return () => { _enqueue = null }
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden" style={{ perspective: '600px' }}>
      {numbers.map((n) => {
        const style: React.CSSProperties = {
          position: 'absolute',
          left: `${n.x}%`,
          top: `${n.y}%`,
          color: n.color,
          fontWeight: 'bold',
          fontSize: n.isKill ? '18px' : '14px',
          textShadow: `0 0 12px ${n.color}66, 0 2px 4px rgba(0,0,0,0.8)`,
          fontFamily: 'ui-monospace, monospace',
          animation: n.isKill
            ? 'fd-kill 1.8s ease-out forwards'
            : 'fd-hit 1s ease-out forwards',
          whiteSpace: 'nowrap',
          zIndex: 9999,
        }
        return (
          <div key={n.id} style={style}>
            {n.isKill ? `💀 ${n.amount}` : `-${n.amount}`}
          </div>
        )
      })}
      <style>{`
        @keyframes fd-hit {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          60% { opacity: 1; transform: translateY(-30px) scale(1.2); }
          100% { opacity: 0; transform: translateY(-50px) scale(0.8); }
        }
        @keyframes fd-kill {
          0% { opacity: 1; transform: translateY(0) scale(1.5); }
          20% { transform: translateY(-10px) scale(1); }
          60% { opacity: 1; transform: translateY(-40px) scale(1.1); }
          100% { opacity: 0; transform: translateY(-70px) scale(0.6); }
        }
      `}</style>
    </div>
  )
}
