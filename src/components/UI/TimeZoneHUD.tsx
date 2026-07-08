import { useState, useEffect } from 'react'
import type { TimeZoneType } from '../TimeZoneSystem'
import { ZONE_CONFIG } from '../TimeZoneSystem'

export const TimeZoneHUD = () => {
  const [zone, setZone] = useState<TimeZoneType | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onEnter = (e: Event) => {
      const detail = (e as CustomEvent).detail
      setZone(detail.type)
      setVisible(true)
    }
    const onExit = () => {
      setVisible(false)
      setTimeout(() => setZone(null), 300)
    }
    window.addEventListener('timezone-enter', onEnter)
    window.addEventListener('timezone-exit', onExit)
    return () => {
      window.removeEventListener('timezone-enter', onEnter)
      window.removeEventListener('timezone-exit', onExit)
    }
  }, [])

  if (!zone) return null

  const cfg = ZONE_CONFIG[zone]

  return (
    <div
      className="fixed bottom-20 right-4 z-50 pointer-events-none select-none transition-all duration-300"
      style={{ opacity: visible ? 1 : 0, transform: `translate(0, ${visible ? 0 : 10}px)` }}
    >
      <div
        className="px-5 py-2.5 rounded-xl backdrop-blur-md border"
        style={{
          backgroundColor: `${cfg.color}15`,
          borderColor: `${cfg.color}40`,
        }}
      >
        <div className="flex items-center gap-3">
          <span
            className="text-lg animate-pulse"
            style={{ color: cfg.color }}
          >
            {cfg.icon}
          </span>
          <div>
            <div
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: cfg.color }}
            >
              {cfg.label}
            </div>
            <div className="text-[9px] text-gray-400 font-mono mt-0.5">
              {cfg.description}
            </div>
          </div>
          <div className="text-[10px] font-mono tabular-nums px-2 py-0.5 rounded bg-gray-900/60 text-gray-400">
            {cfg.timeScale}x
          </div>
        </div>
      </div>
    </div>
  )
}
