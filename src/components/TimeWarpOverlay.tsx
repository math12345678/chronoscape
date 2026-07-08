import { useEffect, useState } from 'react'
import { isTimeWarpActive } from './TimeRift'

export const TimeWarpOverlay = () => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(isTimeWarpActive())
    }, 100)
    return () => clearInterval(interval)
  }, [])

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(102,255,153,0.12) 70%, rgba(68,221,119,0.25) 100%)',
        pointerEvents: 'none',
        zIndex: 9998,
        animation: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          bottom: 80,
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#66ff99',
          fontFamily: 'monospace',
          fontSize: 14,
          textShadow: '0 0 10px rgba(102,255,153,0.5)',
          opacity: 0.7,
          letterSpacing: 4,
        }}
      >
        ⏱ TIME WARP ACTIVE
      </div>
    </div>
  )
}
