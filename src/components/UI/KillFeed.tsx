import { useState, useEffect, useRef } from 'react'
import { ENEMIES } from '../../config/combat'
import type { EnemyType } from '../../config/combat'

interface KillEntry {
  id: number
  enemyType: EnemyType
  timestamp: number
}

let _pendingKill: EnemyType | null = null
let nextKillId = 0

export function queueKillFeed(enemyType: EnemyType) {
  _pendingKill = enemyType
}

export const KillFeed = () => {
  const [entries, setEntries] = useState<KillEntry[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (_pendingKill) {
        const eType = _pendingKill
        _pendingKill = null
        const entry: KillEntry = { id: nextKillId++, enemyType: eType, timestamp: Date.now() }
        setEntries((prev) => [...prev.slice(-3), entry])
        setTimeout(() => {
          setEntries((prev) => prev.filter((e) => e.id !== entry.id))
        }, 3000)
      }
    }, 100)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  if (entries.length === 0) return null

  const enemyColors: Record<string, string> = {
    wraith: '#ff4466',
    voidWraith: '#ff66aa',
    timeCrystalGolem: '#aa88ff',
  }

  return (
    <div className="fixed bottom-6 right-4 z-50 flex flex-col-reverse gap-1 pointer-events-none select-none">
      {entries.map((e) => {
        const cfg = ENEMIES[e.enemyType]
        return (
          <div
            key={e.id}
            className="flex items-center gap-2 bg-gray-950/70 backdrop-blur-sm border border-gray-800/40 rounded-lg px-3 py-1.5 min-w-[160px]"
            style={{
              animation: 'killfeed-entry 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, killfeed-exit 0.4s ease-in 2.6s forwards',
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: enemyColors[e.enemyType] ?? '#ff4466' }}
            />
            <span className="text-[11px] text-gray-300 font-medium">
              {cfg?.name ?? e.enemyType}
            </span>
            <span className="text-[8px] text-gray-600 ml-auto">+{cfg?.xpReward ?? 0}xp</span>
          </div>
        )
      })}
      <style>{`
        @keyframes killfeed-entry {
          0% { opacity: 0; transform: translateX(30px) scale(0.9); }
          100% { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes killfeed-exit {
          0% { opacity: 1; transform: translateX(0); }
          100% { opacity: 0; transform: translateX(20px); }
        }
      `}</style>
    </div>
  )
}
