import { useEffect, useState, useRef } from 'react'

interface CritPopup {
  id: number
  x: number
  y: number
  birth: number
}

let popups: CritPopup[] = []
let popupId = 0

export const CritPopupManager = () => {
  const [items, setItems] = useState<CritPopup[]>([])
  const last = useRef(0)

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { x?: number; y?: number } | undefined
      popups.push({
        id: popupId++,
        x: detail?.x ?? 50,
        y: detail?.y ?? 40,
        birth: performance.now(),
      })
    }
    // Also listen for crosshair-crit from projectile system
    const critHandler = () => {
      popups.push({
        id: popupId++,
        x: 50,
        y: 38,
        birth: performance.now(),
      })
    }
    window.addEventListener('crit-popup', handler)
    window.addEventListener('crosshair-crit', critHandler)

    const interval = setInterval(() => {
      const now = performance.now()
      popups = popups.filter(p => now - p.birth < 800)
      setItems([...popups])
    }, 50)

    return () => {
      window.removeEventListener('crit-popup', handler)
      window.removeEventListener('crosshair-crit', critHandler)
      clearInterval(interval)
    }
  }, [])

  return (
    <>
      {items.map(p => {
        const age = performance.now() - p.birth
        const opacity = Math.max(0, 1 - age / 800)
        const yOff = -20 * (age / 800)
        return (
          <div
            key={p.id}
            style={{
              position: 'fixed',
              left: `${p.x}%`,
              top: `${p.y}%`,
              transform: `translate(-50%, ${yOff}px)`,
              zIndex: 9999,
              pointerEvents: 'none',
              fontSize: 28,
              fontWeight: 900,
              fontFamily: '"JetBrains Mono", monospace',
              color: '#ffdd44',
              textShadow: '0 0 20px #ffdd44, 0 0 40px #ffdd4466, 0 0 80px #ffdd4433',
              letterSpacing: 4,
              opacity,
              transition: 'none',
            }}
          >
            CRITICAL!
          </div>
        )
      })}
    </>
  )
}
