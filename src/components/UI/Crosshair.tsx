import { useState, useEffect, useRef } from 'react'
import { useStore } from '../../store'

/**
 * Simplified crosshair — no entity-specific icons.
 * Just a clean dot + ring that changes color when targeting a rift or building.
 */
export const Crosshair = () => {
  const target = useStore((s) => s.interactionTarget)
  const selectedBlockType = useStore((s) => s.selectedBlockType)
  const [hitFlash, setHitFlash] = useState(false)
  const [harvestFlash, setHarvestFlash] = useState(false)
  const hitFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const harvestFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handleHit = () => {
      setHitFlash(true)
      if (hitFlashTimer.current) clearTimeout(hitFlashTimer.current)
      hitFlashTimer.current = setTimeout(() => setHitFlash(false), 120)
    }
    const handleHarvest = () => {
      setHarvestFlash(true)
      if (harvestFlashTimer.current) clearTimeout(harvestFlashTimer.current)
      harvestFlashTimer.current = setTimeout(() => setHarvestFlash(false), 180)
    }
    window.addEventListener('crosshair-hit', handleHit)
    window.addEventListener('harvest-event', handleHarvest)
    return () => {
      window.removeEventListener('crosshair-hit', handleHit)
      window.removeEventListener('harvest-event', handleHarvest)
      if (hitFlashTimer.current) clearTimeout(hitFlashTimer.current)
      if (harvestFlashTimer.current) clearTimeout(harvestFlashTimer.current)
    }
  }, [])

  const isBuilding = selectedBlockType !== null
  const isRift = target?.type === 'rift'
  const isInteractable = target !== null && !isRift

  // Colors based on context
  const ringColor = isBuilding
    ? 'rgba(250,204,21,0.5)'
    : isRift
      ? 'rgba(34,221,170,0.6)'
      : isInteractable
        ? 'rgba(170,136,255,0.4)'
        : 'rgba(255,255,255,0.15)'

  const ringSize = isBuilding ? 40 : 32
  const dotColor = isBuilding ? '#facc15' : isRift ? '#22ddaa' : isInteractable ? '#aa88ff' : 'rgba(255,255,255,0.3)'

  return (
    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50">
      <div className="relative w-14 h-14 flex items-center justify-center">
        {/* Hit flash ring */}
        <div
          className="absolute rounded-full"
          style={{
            width: '40px', height: '40px',
            border: '2px solid rgba(255,68,102,0.6)',
            boxShadow: '0 0 12px rgba(255,68,102,0.3)',
            opacity: hitFlash ? 1 : 0,
            transform: hitFlash ? 'scale(1.1)' : 'scale(0.8)',
            transition: 'opacity 0.06s, transform 0.06s',
          }}
        />
        {/* Harvest flash ring */}
        <div
          className="absolute rounded-full"
          style={{
            width: '44px', height: '44px',
            border: '2px solid rgba(68,255,204,0.5)',
            boxShadow: '0 0 16px rgba(68,255,204,0.25)',
            opacity: harvestFlash ? 1 : 0,
            transform: harvestFlash ? 'scale(1.15)' : 'scale(0.8)',
            transition: 'opacity 0.06s, transform 0.06s',
          }}
        />

        {/* Outer ring */}
        <div
          className="absolute rounded-full transition-all duration-300 ease-out"
          style={{
            width: `${ringSize}px`,
            height: `${ringSize}px`,
            border: `1.5px solid ${ringColor}`,
            boxShadow: isBuilding || isRift ? `0 0 12px ${ringColor}` : 'none',
          }}
        />

        {/* Center dot */}
        <div
          className="rounded-full transition-all duration-200"
          style={{
            width: isBuilding ? '6px' : '3px',
            height: isBuilding ? '6px' : '3px',
            backgroundColor: dotColor,
            boxShadow: isBuilding ? `0 0 8px ${dotColor}88` : isRift ? `0 0 6px ${dotColor}66` : 'none',
          }}
        />

        {/* Build mode corner brackets */}
        {isBuilding && (
          <svg width="22" height="22" viewBox="0 0 22 22" className="absolute">
            <rect x="9" y="0" width="4" height="3" rx="1" fill="#facc15" opacity="0.8" />
            <rect x="9" y="19" width="4" height="3" rx="1" fill="#facc15" opacity="0.8" />
            <rect x="0" y="9" width="3" height="4" rx="1" fill="#facc15" opacity="0.8" />
            <rect x="19" y="9" width="3" height="4" rx="1" fill="#facc15" opacity="0.8" />
          </svg>
        )}
      </div>
    </div>
  )
}
