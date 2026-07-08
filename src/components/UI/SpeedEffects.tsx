import { useEffect, useRef, useState } from 'react'

/**
 * Edge vignette + speed lines that intensify at high movement speeds.
 * Reads player position from window.__playerPos set by PlayerController.
 * Build mode dampens the effect so block placement isn't obscured.
 */
export const SpeedEffects = () => {
  const [intensity, setIntensity] = useState(0)
  const frameRef = useRef(0)
  const prevPos = useRef({ x: 0, z: 0 })
  const prevTime = useRef(performance.now())
  const smoothSpeed = useRef(0)

  useEffect(() => {
    const loop = () => {
      frameRef.current = requestAnimationFrame(loop)

      const pos = (window as any).__playerPos
      const isSprinting = (window as any).__isSprinting ?? false
      const isBuilding = (window as any).__selectedBlockType != null
      const now = performance.now()
      const dt = Math.max(now - prevTime.current, 1) / 1000

      if (pos) {
        const dx = pos.x - prevPos.current.x
        const dz = pos.z - prevPos.current.z
        const speed = Math.sqrt(dx * dx + dz * dz) / Math.max(dt, 0.001)
        prevPos.current = { x: pos.x, z: pos.z }

        const target = isBuilding ? 0 : isSprinting ? Math.min(1, (speed - 4) / 12) : Math.min(0.5, (speed - 4) / 12) * 0.6
        smoothSpeed.current += (target - smoothSpeed.current) * Math.min(1, dt * 6)
      }

      prevTime.current = now
      setIntensity(smoothSpeed.current)
    }
    frameRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frameRef.current)
  }, [])

  if (intensity < 0.01) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-30">
      {/* Edge vignette - darkens edges at high speed */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: intensity * 0.5,
          background: `radial-gradient(ellipse at center, transparent ${50 - intensity * 20}%, rgba(0,0,0,${0.3 + intensity * 0.3}) 100%)`,
          transition: 'opacity 0.08s linear',
        }}
      />

      {/* Speed lines on edges */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: intensity * 0.15,
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.08) 3px, rgba(255,255,255,0.08) 4px)
          `,
          backgroundSize: '100% 6px',
          animation: 'speedLinesScroll 0.2s linear infinite',
          transition: 'opacity 0.08s linear',
        }}
      />

      {/* Side speed streaks */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          bottom: '20%',
          left: 0,
          width: `${Math.min(40, intensity * 40)}px`,
          background: `linear-gradient(90deg, rgba(255,255,255,${intensity * 0.04}) 0%, transparent 100%)`,
          transition: 'width 0.1s ease-out',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '20%',
          bottom: '20%',
          right: 0,
          width: `${Math.min(40, intensity * 40)}px`,
          background: `linear-gradient(270deg, rgba(255,255,255,${intensity * 0.04}) 0%, transparent 100%)`,
          transition: 'width 0.1s ease-out',
        }}
      />

      <style>{`
        @keyframes speedLinesScroll {
          0% { background-position: 0 0; }
          100% { background-position: 0 10px; }
        }
      `}</style>
    </div>
  )
}
