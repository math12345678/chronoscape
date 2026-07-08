import { useState, useEffect } from 'react'
import type { FactionId } from '../../config/combat'
import { FACTIONS } from '../../config/combat'

export const TerritoryHUD = () => {
  const [faction, setFaction] = useState<FactionId | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onEnter = (e: Event) => {
      const detail = (e as CustomEvent).detail
      setFaction(detail.faction)
      setVisible(true)
    }
    const onExit = () => {
      setVisible(false)
      setTimeout(() => setFaction(null), 300)
    }
    window.addEventListener('territory-enter', onEnter)
    window.addEventListener('territory-exit', onExit)
    return () => {
      window.removeEventListener('territory-enter', onEnter)
      window.removeEventListener('territory-exit', onExit)
    }
  }, [])

  if (!faction) return null
  const cfg = FACTIONS[faction]

  return (
    <div
      className="fixed bottom-36 right-4 z-50 pointer-events-none select-none transition-all duration-300"
      style={{ opacity: visible ? 1 : 0, transform: `translate(0, ${visible ? 0 : 10}px)` }}
    >
      <div
        className="px-4 py-2 rounded-lg backdrop-blur-md border"
        style={{
          backgroundColor: `${cfg.color}10`,
          borderColor: `${cfg.color}30`,
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: cfg.color }}
          />
          <span
            className="text-[11px] font-bold uppercase tracking-widest"
            style={{ color: cfg.color }}
          >
            {cfg.name}
          </span>
          <span className="text-[8px] text-gray-500 italic ml-1">
            {cfg.description}
          </span>
        </div>
      </div>
    </div>
  )
}
