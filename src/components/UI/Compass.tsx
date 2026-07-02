import { LAB_POSITION } from '../../config/constants'

interface Waypoint {
  label: string
  pos: [number, number, number]
  color: string
  icon: string
}

const WAYPOINTS: Waypoint[] = [
  { label: 'Lab', pos: LAB_POSITION, color: '#aa88ff', icon: '◆' },
  { label: 'Trader', pos: [0, 0, 18], color: '#ffaa44', icon: '⟐' },
  { label: 'Shrine', pos: [18, 0, -8], color: '#44ffcc', icon: '◇' },
]

/**
 * Waypoint reference strip at the top of the screen.
 * Shows icons and labels for key locations the player can visit:
 * Lab, Trader, and Shrine.
 *
 * A rotating compass would require reading camera state from inside
 * the R3F Canvas — this static version is simpler and still useful.
 */
export const Compass = () => {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none select-none">
      <div className="flex items-center gap-1 px-3 py-1.5 bg-gray-950/60 backdrop-blur-sm rounded-full border border-gray-800/30">
        {WAYPOINTS.map((wp) => (
          <div
            key={wp.label}
            className="flex items-center gap-1 px-2 py-0.5 rounded"
          >
            <span className="text-[11px]" style={{ color: wp.color }}>{wp.icon}</span>
            <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: `${wp.color}cc` }}>
              {wp.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
