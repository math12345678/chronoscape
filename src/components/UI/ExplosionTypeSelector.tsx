import { useStore } from '../../store'
import type { ExplosionType } from '../../store'

const EXPLOSION_TYPES: { type: ExplosionType; label: string; description: string; icon: string; color: string }[] = [
  {
    type: 'standard',
    label: 'Standard',
    description: 'Radius 3 — balanced destruction',
    icon: '💥',
    color: '#ff6644',
  },
  {
    type: 'focused',
    label: 'Focused',
    description: 'Radius 1.5 — precision blast, more damage',
    icon: '🎯',
    color: '#ff8844',
  },
  {
    type: 'cascade',
    label: 'Cascade',
    description: '30% chain-reaction chance per destroyed block',
    icon: '🔥',
    color: '#ff2200',
  },
]

/**
 * Explosion Type Selector.
 * Shows when the player has discovered Detonation and right-clicks a vapour block.
 * Float-style panel in the bottom-right corner.
 */
export const ExplosionTypeSelector = () => {
  const lastExplosionType = useStore((s) => s.lastExplosionType)
  const formulaDiscovered = useStore((s) => s.formulaDiscovered)
  const hasDetonation = formulaDiscovered('detonation')

  if (!hasDetonation) return null

  return (
    <div className="fixed bottom-8 right-4 z-50 select-none">
      <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-700/40 rounded-lg overflow-hidden">
        {/* Label */}
        <div className="px-3 py-1.5 border-b border-gray-800/50">
          <p className="text-[9px] text-gray-500 uppercase tracking-wider font-mono font-bold">
            Explosion Type
          </p>
        </div>

        {/* Type buttons */}
        <div className="flex gap-1 p-1.5">
          {EXPLOSION_TYPES.map((t) => {
            const isActive = lastExplosionType === t.type
            return (
              <button
                key={t.type}
                onClick={() => {
                  // Store the selected type for use in BuildPreview
                  useStore.setState({ lastExplosionType: t.type })
                }}
                className={`
                  relative flex flex-col items-center px-2.5 py-2 rounded-lg transition-all duration-150
                  ${isActive
                    ? 'bg-gray-800/80 border border-red-700/40 shadow-lg shadow-red-900/20'
                    : 'bg-gray-800/30 border border-gray-700/20 hover:bg-gray-800/50 hover:border-gray-600/30'
                  }
                `}
                title={t.description}
              >
                <span className="text-lg" style={{ color: t.color }}>
                  {t.icon}
                </span>
                <span
                  className={`text-[9px] font-mono font-bold mt-0.5 transition-colors ${
                    isActive ? 'text-white' : 'text-gray-500'
                  }`}
                >
                  {t.label}
                </span>

                {/* Active indicator */}
                {isActive && (
                  <div
                    className="absolute -bottom-px left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
                    style={{ backgroundColor: t.color, boxShadow: `0 0 6px ${t.color}88` }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
