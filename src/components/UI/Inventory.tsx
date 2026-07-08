import { useState, useEffect, useRef } from 'react'
import { useStore } from '../../store'

export const Inventory = () => {
  const inventory = useStore((s) => s.inventory)
  const formulaDiscovered = useStore((s) => s.formulaDiscovered)
  const [, tick] = useState(0)
  const prevRef = useRef({ ...inventory })
  const flashRef = useRef<Record<string, number>>({})
  const frameRef = useRef(0)

  // Track inventory changes and trigger flash
  useEffect(() => {
    const keys = ['raw', 'vapour', 'liquid', 'crystal'] as const
    let changed = false
    for (const k of keys) {
      const prev = Math.floor(prevRef.current[k])
      const curr = Math.floor(inventory[k])
      if (prev !== curr) {
        flashRef.current[k] = performance.now()
        changed = true
      }
    }
    prevRef.current = { ...inventory }

    if (changed) {
      // RAF loop to animate flash
      const loop = () => {
        tick(performance.now())
        frameRef.current = requestAnimationFrame(loop)
      }
      frameRef.current = requestAnimationFrame(loop)
      return () => cancelAnimationFrame(frameRef.current)
    }
  }, [inventory])

  const rows = [
    { key: 'raw' as const, label: 'Epoch', color: '#ff8844', icon: '◈' },
    { key: 'vapour' as const, label: 'Chrono', color: '#ffaa00', icon: '◇' },
    { key: 'liquid' as const, label: 'Flux', color: '#4488ff', icon: '≈' },
    { key: 'crystal' as const, label: 'Aeon', color: '#aa88ff', icon: '◆' },
  ]
  const hasAny = inventory.raw + inventory.vapour + inventory.liquid + inventory.crystal > 0
  if (!hasAny) return null

  const now = performance.now()

  return (
    <div className="fixed top-3 left-3 z-50 select-none">
      <div className="bg-gray-950/70 backdrop-blur-sm border border-gray-800/40 rounded-lg shadow-2xl px-3 py-2 min-w-[150px]">
        <div className="flex flex-col gap-1">
          {rows.map((r) => {
            const isLocked = r.key === 'crystal' && !formulaDiscovered('crystallization')
            const val = Math.floor(inventory[r.key])
            const flashAt = flashRef.current[r.key] ?? 0
            const flashAge = now - flashAt
            const isFlashing = flashAt > 0 && flashAge < 400
            const flashScale = isFlashing ? 1 + (1 - flashAge / 400) * 0.3 : 1
            const flashBright = isFlashing ? 1 + (1 - flashAge / 400) * 0.5 : 1
            const flashGlow = isFlashing ? `0 0 ${8 * (1 - flashAge / 400)}px ${r.color}` : 'none'

            return (
              <div key={r.key} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5" style={{ textShadow: isFlashing ? `0 0 6px ${r.color}` : 'none' }}>
                  <span className="text-xs" style={{ color: isLocked ? '#444' : r.color }}>
                    {isLocked ? '?' : r.icon}
                  </span>
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${isLocked ? 'text-gray-600' : 'text-white/80'}`}>
                    {r.label}
                  </span>
                </div>
                <span
                  className="text-xs font-mono tabular-nums"
                  style={{
                    color: val > 0 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)',
                    transform: `scale(${flashScale})`,
                    filter: `brightness(${flashBright})`,
                    boxShadow: flashGlow,
                    transition: 'none',
                  }}
                >
                  {isLocked ? '—' : val}
                </span>
              </div>
            )
          })}
        </div>
        {inventory.renown > 0 && (
          <div className="flex items-center justify-between gap-3 mt-1.5 pt-1.5 border-t border-gray-800/40">
            <span className="text-[11px] font-bold uppercase tracking-wider text-yellow-500/80">
              ⚜ Renown
            </span>
            <span className="text-xs font-mono tabular-nums text-yellow-400/90">
              {Math.floor(inventory.renown)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
