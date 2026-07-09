import { useState, useEffect, useRef } from 'react'
import { QUESTS } from '../../config/combat'
import type { QuestId } from '../../config/combat'

interface Notification {
  id: string
  title: string
  rewards: string
  fadeOut: boolean
}

let _listener: ((n: Notification) => void) | null = null

export function dispatchQuestComplete(id: QuestId) {
  const qd = QUESTS[id]
  const rewardParts: string[] = []
  if (qd.rewards.raw) rewardParts.push(`${qd.rewards.raw} Raw`)
  if (qd.rewards.liquid) rewardParts.push(`${qd.rewards.liquid} Liquid`)
  if (qd.rewards.crystal) rewardParts.push(`${qd.rewards.crystal} Crystal`)
  if (qd.rewards.renown) rewardParts.push(`${qd.rewards.renown} Renown`)
  if (qd.rewards.weapon) rewardParts.push('New Weapon!')
  const n: Notification = {
    id: `quest-${id}-${Date.now()}`,
    title: qd.title,
    rewards: rewardParts.join('  '),
    fadeOut: false,
  }
  if (_listener) _listener(n)
}

export const QuestCompleteNotification = () => {
  const [items, setItems] = useState<Notification[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    _listener = (n: Notification) => {
      setItems((prev) => [...prev, n])
      timers.current.set(n.id, setTimeout(() => {
        setItems((prev) => prev.filter((i) => i.id !== n.id))
        timers.current.delete(n.id)
      }, 4000))
    }
    return () => { _listener = null }
  }, [])

  if (items.length === 0) return null

  return (
    <div className="fixed top-40 left-1/2 -translate-x-1/2 z-50 pointer-events-none select-none flex flex-col items-center gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="animate-fade-in-up bg-yellow-900/80 backdrop-blur-md border border-yellow-500/40 rounded-xl px-6 py-3 shadow-lg shadow-yellow-900/30"
        >
          <div className="text-[10px] uppercase tracking-widest text-yellow-400 mb-1 text-center">
            Quest Complete
          </div>
          <div className="text-sm font-bold text-yellow-200 text-center mb-1">
            {item.title}
          </div>
          <div className="text-[10px] font-mono text-yellow-300/70 text-center">
            {item.rewards}
          </div>
        </div>
      ))}
    </div>
  )
}
