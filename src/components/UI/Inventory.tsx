import { useStore } from '../../store'
import { CAPACITY, DECAY_CONFIG } from '../../config/constants'

const RESOURCES = [
  { key: 'raw' as const, label: 'Raw', color: '#ff8844', gradient: 'from-orange-500 to-amber-600', icon: '⟐' },
  { key: 'vapour' as const, label: 'Vapour', color: '#ffaa00', gradient: 'from-amber-400 to-yellow-500', icon: '⟡' },
  { key: 'liquid' as const, label: 'Liquid', color: '#4488ff', gradient: 'from-blue-500 to-blue-600', icon: '≈' },
  { key: 'crystal' as const, label: 'Crystal', color: '#aa88ff', gradient: 'from-violet-500 to-purple-600', icon: '◆' },
]

export const Inventory = () => {
  const inventory = useStore((s) => s.inventory)
  const formulaDiscovered = useStore((s) => s.formulaDiscovered)

  return (
    <div className="fixed top-3 left-3 z-50 select-none pointer-events-none">
      <div className="bg-gray-950/80 backdrop-blur-sm border border-gray-800/50 rounded-xl shadow-2xl overflow-hidden min-w-[190px]">
        {/* Title bar */}
        <div className="px-3.5 py-2 border-b border-gray-800/50 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-teal-500/60" />
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">
            Inventory
          </span>
        </div>

        {/* Resource rows */}
        <div className="px-3 py-2 space-y-2">
          {RESOURCES.map((res) => {
            const isCrystal = res.key === 'crystal'
            const isLocked = isCrystal && !formulaDiscovered('crystallization')
            const value = inventory[res.key]
            const cap = CAPACITY[res.key] ?? 100
            const decayRate = DECAY_CONFIG[res.key] ?? 0
            const pct = cap > 0 ? (value / cap) * 100 : 0
            const hasBar = res.key === 'vapour' || res.key === 'raw'

            return (
              <div key={res.key} className="flex flex-col gap-0.5 group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-xs transition-all duration-300 group-hover:scale-110"
                      style={{ color: isLocked ? '#555' : res.color }}
                    >
                      {isLocked ? '🔒' : res.icon}
                    </span>
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider ${
                        isLocked ? 'text-gray-600' : 'text-white/90'
                      }`}
                    >
                      {res.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-mono tabular-nums text-white/80 transition-all duration-300 group-hover:text-white">
                      {Math.floor(value)}
                    </span>
                    <span className="text-[10px] font-mono tabular-nums text-gray-600">
                      /{cap}
                    </span>
                  </div>
                </div>

                {/* Animated draining bar with urgency effects */}
                {hasBar && (() => {
                  const isUrgent = pct > 0 && pct < 25
                  const isCritical = pct > 0 && pct < 10
                  return (
                    <div className="w-full h-1.5 bg-gray-800/80 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ease-linear ${
                          isCritical ? 'animate-pulse' : ''
                        }`}
                        style={{
                          width: `${Math.min(pct, 100)}%`,
                          background: `linear-gradient(90deg, ${res.color}88, ${res.color})`,
                          boxShadow: isCritical
                            ? `0 0 10px ${res.key === 'raw' ? '#ff4444' : '#ff8800'}88, 0 0 20px ${res.key === 'raw' ? '#ff4444' : '#ff8800'}44`
                            : isUrgent
                            ? `0 0 8px ${res.color}66`
                            : pct > 0
                            ? `0 0 6px ${res.color}44`
                            : 'none',
                        }}
                      />
                    </div>
                  )
                })()}

                {/* Decay rate indicator — pulses faster when low */}
                {decayRate > 0 && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        pct < 15
                          ? 'bg-red-400 animate-ping'
                          : pct < 40
                          ? 'bg-orange-400 animate-pulse'
                          : 'bg-red-500/50 animate-pulse'
                      }`}
                      style={{
                        boxShadow: pct < 15 ? '0 0 6px rgba(255,80,80,0.6)' : 'none',
                      }}
                    />
                    <span className="text-[9px] font-mono text-red-400/60">
                      -{Math.floor(decayRate * cap)}/s
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Renown footer */}
        <div className="px-3 py-1.5 border-t border-gray-800/50 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-500/80">
            Renown
          </span>
          <span className="text-xs font-mono tabular-nums text-yellow-400/80">
            {Math.floor(inventory.renown)}
          </span>
        </div>
      </div>
    </div>
  )
}
