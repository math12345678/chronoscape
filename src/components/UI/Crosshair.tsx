import { useStore } from '../../store'

/**
 * Dynamic crosshair that changes state based on what the player is looking at.
 * Uses the InteractionTarget from the store to determine the current state.
 *
 * States:
 * - Default: small cross with center dot
 * - Rift: teal glowing ring with up/down arrows (harvest)
 * - NPC: green cross with + symbol (heal)
 * - Building: diamond shape with build-mode color
 * - Lab: violet diamond with star
 * - Trader: gold circle with arrows (trade)
 * - Block: small square when looking at a block
 */
const TYPE_STYLES: Record<string, { color: string; ringClass: string }> = {
  rift: { color: '#22ddaa', ringClass: 'border-teal-400/60 animate-pulse-glow-teal' },
  npc: { color: '#44ff88', ringClass: 'border-green-400/50 animate-pulse-glow-green' },
  lab: { color: '#aa88ff', ringClass: 'border-violet-400/50 animate-pulse-glow-violet' },
  trader: { color: '#ffaa44', ringClass: 'border-amber-400/50 animate-pulse-glow-amber' },
  shrine: { color: '#44ffcc', ringClass: 'border-teal-400/50 animate-pulse-glow-teal' },
  block: { color: '#888888', ringClass: 'border-gray-400/30' },
}

export const Crosshair = () => {
  const target = useStore((s) => s.interactionTarget)
  const selectedBlockType = useStore((s) => s.selectedBlockType)

  const isBuilding = selectedBlockType !== null
  const type = target?.type ?? null
  const style = type ? TYPE_STYLES[type] : null

  return (
    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50">
      <div className="relative w-12 h-12 flex items-center justify-center">
        {/* Ring behind crosshair — styled per interaction type */}
        <div
          className={`
            absolute rounded-full border transition-all duration-300
            ${isBuilding
              ? 'w-9 h-9 border-yellow-400/40 animate-pulse-glow-yellow'
              : style
                ? `w-8 h-8 ${style.ringClass}`
                : 'w-6 h-6 border-white/15'
            }
          `}
        />

        {isBuilding ? (
          /* Diamond crosshair for build mode */
          <svg width="20" height="20" viewBox="0 0 20 20" className="text-yellow-400 drop-shadow-glow-yellow">
            <rect x="8" y="0" width="4" height="3" rx="1" fill="currentColor" opacity="0.9" />
            <rect x="8" y="17" width="4" height="3" rx="1" fill="currentColor" opacity="0.9" />
            <rect x="0" y="8" width="3" height="4" rx="1" fill="currentColor" opacity="0.9" />
            <rect x="17" y="8" width="3" height="4" rx="1" fill="currentColor" opacity="0.9" />
            <rect x="8" y="8" width="4" height="4" rx="1" fill="currentColor" opacity="0.6" className="animate-pulse" />
          </svg>
        ) : type === 'rift' ? (
          /* Harvest crosshair — teal with up arrows */
          <svg width="18" height="18" viewBox="0 0 18 18" className="text-teal-300 drop-shadow-glow-teal">
            <circle cx="9" cy="9" r="1.5" fill="currentColor" opacity="0.9">
              <animate attributeName="r" values="1.5;2.2;1.5" dur="1.2s" repeatCount="indefinite" />
            </circle>
            {/* Outer diamond arrows */}
            <polygon points="9,1 10.5,5 7.5,5" fill="currentColor" opacity="0.7" />
            <polygon points="9,17 10.5,13 7.5,13" fill="currentColor" opacity="0.7" />
            <polygon points="1,9 5,10.5 5,7.5" fill="currentColor" opacity="0.7" />
            <polygon points="17,9 13,10.5 13,7.5" fill="currentColor" opacity="0.7" />
          </svg>
        ) : type === 'npc' ? (
          /* Heal crosshair — green with + */
          <svg width="18" height="18" viewBox="0 0 18 18" className="text-green-300 drop-shadow-glow-green">
            <circle cx="9" cy="9" r="2" fill="currentColor" opacity="0.9">
              <animate attributeName="r" values="2;2.5;2" dur="1.5s" repeatCount="indefinite" />
            </circle>
            {/* + symbol arms */}
            <rect x="8" y="3" width="2" height="4" rx="0.5" fill="currentColor" opacity="0.8" />
            <rect x="8" y="11" width="2" height="4" rx="0.5" fill="currentColor" opacity="0.8" />
            <rect x="3" y="8" width="4" height="2" rx="0.5" fill="currentColor" opacity="0.8" />
            <rect x="11" y="8" width="4" height="2" rx="0.5" fill="currentColor" opacity="0.8" />
          </svg>
        ) : type === 'lab' ? (
          /* Lab crosshair — violet diamond with star */
          <svg width="18" height="18" viewBox="0 0 18 18" className="text-violet-300 drop-shadow-glow-violet">
            <circle cx="9" cy="9" r="1.5" fill="currentColor" opacity="0.9" />
            <rect x="8" y="1" width="2" height="16" rx="0.5" fill="currentColor" opacity="0.6" transform="rotate(45 9 9)" />
            <rect x="8" y="1" width="2" height="16" rx="0.5" fill="currentColor" opacity="0.6" transform="rotate(-45 9 9)" />
          </svg>
        ) : type === 'trader' ? (
          /* Trader crosshair — gold circle */
          <svg width="18" height="18" viewBox="0 0 18 18" className="text-amber-300 drop-shadow-glow-amber">
            <circle cx="9" cy="9" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.7">
              <animate attributeName="r" values="2.5;3;2.5" dur="2s" repeatCount="indefinite" />
            </circle>
            {/* Arrow heads for trade */}
            <polygon points="4,9 7,7 7,11" fill="currentColor" opacity="0.7" />
            <polygon points="14,9 11,7 11,11" fill="currentColor" opacity="0.7" />
          </svg>
        ) : (
          /* Default crosshair */
          <svg width="16" height="16" viewBox="0 0 16 16" className="text-white/70">
            <circle cx="8" cy="8" r="1.5" fill="currentColor" opacity={0.6} />
            <rect x="7.5" y="0" width="1" height="4.5" rx="0.5" fill="currentColor" opacity="0.8" />
            <rect x="7.5" y="11.5" width="1" height="4.5" rx="0.5" fill="currentColor" opacity="0.8" />
            <rect x="0" y="7.5" width="4.5" height="1" rx="0.5" fill="currentColor" opacity="0.8" />
            <rect x="11.5" y="7.5" width="4.5" height="1" rx="0.5" fill="currentColor" opacity="0.8" />
          </svg>
        )}
      </div>
    </div>
  )
}
