import { useState, useEffect, useRef } from 'react'
import { getFPS, getQualityLevel } from '../../utils/performance'
import type { QualityLevel } from '../../utils/performance'

const QUALITY_LABELS: Record<QualityLevel, { label: string; color: string }> = {
  0: { label: 'LOW', color: '#ff4444' },
  1: { label: 'MED', color: '#ffaa44' },
  2: { label: 'HIGH', color: '#44ff88' },
  3: { label: 'ULTRA', color: '#ff44ff' },
}

/**
 * Performance overlay for developers.
 * Toggle with F8 key. Shows in top-right corner.
 */
export const PerformanceOverlay = () => {
  const [visible, setVisible] = useState(false)
  const [fps, setFps] = useState(60)
  const [quality, setQuality] = useState<QualityLevel>(2)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F8') {
        e.preventDefault()
        setVisible((v) => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (!visible) return
    const interval = setInterval(() => {
      setFps(getFPS())
      setQuality(getQualityLevel())
    }, 500)
    return () => clearInterval(interval)
  }, [visible])

  if (!visible) return null

  const ql = QUALITY_LABELS[quality]

  // Color-code FPS
  const fpsColor = fps >= 55 ? '#44ff88' : fps >= 35 ? '#ffaa44' : '#ff4444'

  return (
    <div className="fixed bottom-4 right-24 z-[60] pointer-events-none select-none font-mono">
      <div className="bg-gray-950/80 backdrop-blur-sm border border-gray-800/50 rounded-lg px-3 py-2 min-w-[120px]">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[10px] uppercase tracking-wider text-gray-500">FPS</span>
          <span className="text-xs font-bold tabular-nums" style={{ color: fpsColor }}>
            {fps}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 mt-0.5">
          <span className="text-[10px] uppercase tracking-wider text-gray-500">Quality</span>
          <span className="text-[10px] font-bold" style={{ color: ql.color }}>
            {ql.label}
          </span>
        </div>
        <div className="mt-1.5 text-[8px] text-gray-600 text-center">
          F8 to hide
        </div>
      </div>
    </div>
  )
}
