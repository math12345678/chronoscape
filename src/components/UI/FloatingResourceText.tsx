import { useState, useEffect, useRef } from 'react'
import { useStore } from '../../store'

// ── Types ──────────────────────────────────────────────

interface FloatingText {
  id: number
  text: string
  color: string
  x: number
  y: number
}

const RESOURCE_CONFIG: Record<string, { label: string; color: string }> = {
  raw: { label: 'Raw', color: '#ff8844' },
  vapour: { label: 'Vapour', color: '#ffaa00' },
  liquid: { label: 'Liquid', color: '#4488ff' },
  crystal: { label: 'Crystal', color: '#aa88ff' },
  renown: { label: 'Citations', color: '#ffd700' },
}

let nextFloatingId = 0

/**
 * Floating resource gain text that appears when resources are earned.
 * Polls on a fixed 800ms interval to avoid storming on rapid state changes.
 */
export const FloatingResourceText = () => {
  const [floats, setFloats] = useState<FloatingText[]>([])
  const prevRef = useRef<Record<string, number> | null>(null)

  useEffect(() => {
    // Initialize from actual store values to avoid false positives on first render
    const s = useStore.getState()
    prevRef.current = {
      raw: Math.floor(s.inventory.raw),
      vapour: Math.floor(s.inventory.vapour),
      liquid: Math.floor(s.inventory.liquid),
      crystal: Math.floor(s.inventory.crystal),
      renown: Math.floor(s.inventory.renown),
    }

    // Poll periodically to detect resource gains without storming on rapid state changes
    const interval = setInterval(() => {
      const state = useStore.getState()
      const snapshot: Record<string, number> = {
        raw: Math.floor(state.inventory.raw),
        vapour: Math.floor(state.inventory.vapour),
        liquid: Math.floor(state.inventory.liquid),
        crystal: Math.floor(state.inventory.crystal),
        renown: Math.floor(state.inventory.renown),
      }

      if (!prevRef.current) {
        prevRef.current = snapshot
        return
      }

      const deltas: { key: string; diff: number }[] = []
      for (const [key, val] of Object.entries(snapshot)) {
        const prev = prevRef.current[key] ?? 0
        const diff = val - prev
        if (diff > 0 && diff < 500) {
          deltas.push({ key, diff })
        }
      }
      prevRef.current = snapshot

      if (deltas.length > 0) {
        const newIds: number[] = []
        const newFloats: FloatingText[] = deltas.map((d) => {
          const config = RESOURCE_CONFIG[d.key]
          const id = nextFloatingId++
          newIds.push(id)
          return {
            id,
            text: `+${d.diff} ${config.label}`,
            color: config.color,
            x: 70 + Math.random() * 20,
            y: 55 + Math.random() * 20,
          }
        })

        setFloats((prev) => [...prev.slice(-8), ...newFloats])

        // Cleanup after animation
        setTimeout(() => {
          setFloats((prev) => prev.filter((f) => !newIds.includes(f.id)))
        }, 2200)
      }
    }, 250) // 250ms — responsive enough without storming the renderer

    return () => clearInterval(interval)
  }, [])

  if (floats.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-[55] overflow-hidden">
      {floats.map((f) => (
        <div
          key={f.id}
          className="absolute font-mono font-bold text-xs tracking-wide"
          style={{
            left: `${f.x}%`,
            top: `${f.y}%`,
            color: f.color,
            animation: 'text-float-up 2s ease-out forwards',
            textShadow: `0 0 8px ${f.color}66, 0 0 20px ${f.color}33`,
          }}
        >
          {f.text}
        </div>
      ))}

      <style>{`
        @keyframes text-float-up {
          0% { opacity: 0; transform: translateY(0) scale(0.6); }
          12% { opacity: 1; transform: translateY(-8px) scale(1.1); }
          25% { opacity: 1; transform: translateY(-16px) scale(1); }
          65% { opacity: 0.7; transform: translateY(-35px) scale(0.95); }
          100% { opacity: 0; transform: translateY(-55px) scale(0.8); }
        }
      `}</style>
    </div>
  )
}
