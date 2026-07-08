import { useRef, useEffect, useState, useMemo } from 'react'
import { LAB_POSITION, TIME_RIFT_POSITIONS, RIFT_TYPE_CONFIG } from '../../config/constants'
import { TRADER_POSITION } from '../Trader'
import { SHRINE_POSITION } from '../Shrine/TimeShrine'
import type { EnemyType } from '../../config/combat'

interface Waypoint {
  label: string
  pos: [number, number, number]
  color: string
  icon: string
}

// ── Module-level enemy position store (fed by HostileEnemyManager) ──
interface EnemyCompassData {
  x: number
  z: number
  type: EnemyType
}
let _compassEnemyData: EnemyCompassData[] = []
export function setCompassEnemyData(data: EnemyCompassData[]) { _compassEnemyData = data }
export function clearCompassEnemyData() { _compassEnemyData = [] }

// Build rift waypoints from the TIME_RIFT_POSITIONS constant
const RIFT_WAYPOINTS: Waypoint[] = TIME_RIFT_POSITIONS.map((r, i) => ({
  label: i === 0 ? 'Rift' : `Rift ${i + 1}`,
  pos: r.pos,
  color: RIFT_TYPE_CONFIG[r.type]?.color ?? '#44ffcc',
  icon: '⟐',
}))

const CORE_WAYPOINTS: Waypoint[] = [
  { label: 'Lab', pos: LAB_POSITION, color: '#aa88ff', icon: '◆' },
  { label: 'Trader', pos: TRADER_POSITION, color: '#ffaa44', icon: '⟐' },
  { label: 'Shrine', pos: SHRINE_POSITION, color: '#44ffcc', icon: '◇' },
  ...RIFT_WAYPOINTS,
]

/**
 * Rotating compass that shows cardinal directions and waypoint bearings.
 * Throttled to ~4fps to avoid excessive React re-renders.
 */
export const Compass = () => {
  const [bearing, setBearing] = useState(0)
  const [waypointBearings, setWaypointBearings] = useState<number[]>([])
  const [wpDistances, setWpDistances] = useState<number[]>([])

  const waypoints = useMemo(() => CORE_WAYPOINTS, [])

  // Use refs for the throttled poll to avoid creating closures every render
  const lastUpdateRef = useRef(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const THROTTLE_MS = 250 // ~4fps — more than enough for a compass

    const tick = () => {
      const now = performance.now()
      if (now - lastUpdateRef.current >= THROTTLE_MS) {
        lastUpdateRef.current = now

        const camDir = (window as any).__CAMERA_DIRECTION as { x: number; z: number } | undefined
        const camPos = (window as any).__CAMERA_POSITION as { x: number; z: number } | undefined

        if (camDir && camPos) {
          const yaw = Math.atan2(camDir.x, -camDir.z)
          const newBearing = yaw + Math.PI
          setBearing(newBearing)

          const bearings: number[] = []
          const distances: number[] = []
          for (const wp of waypoints) {
            const dx = wp.pos[0] - camPos.x
            const dz = wp.pos[2] - camPos.z
            const dist = Math.sqrt(dx * dx + dz * dz)
            const wpBearing = Math.atan2(dx, -dz)
            let relBearing = wpBearing - (newBearing - Math.PI)
            relBearing = ((relBearing + Math.PI) % (Math.PI * 2)) - Math.PI
            bearings.push(relBearing)
            distances.push(dist)
          }
          setWaypointBearings(bearings)
          setWpDistances(distances)
        }
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [waypoints])

  const cardinals = [
    { label: 'N', angle: 0 },
    { label: 'NE', angle: 45 },
    { label: 'E', angle: 90 },
    { label: 'SE', angle: 135 },
    { label: 'S', angle: 180 },
    { label: 'SW', angle: 225 },
    { label: 'W', angle: 270 },
    { label: 'NW', angle: 315 },
  ]

  const degrees = ((bearing * 180) / Math.PI) % 360
  const rotation = -degrees

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none select-none">
      <div className="relative" style={{ width: 280, height: 40 }}>
        <div className="absolute inset-0 bg-gray-950/70 backdrop-blur-sm rounded-full border border-gray-800/40 overflow-hidden">
          <div
            className="absolute inset-0 flex items-center"
            style={{
              transition: 'transform 0.15s ease-out',
              transform: `rotate(${rotation}deg)`,
            }}
          >
            {cardinals.map((c, i) => {
              const isN = c.label === 'N'
              const isMain = ['N', 'E', 'S', 'W'].includes(c.label)
              return (
                <div
                  key={i}
                  className="absolute flex items-center justify-center"
                  style={{
                    left: '50%',
                    transformOrigin: 'center center',
                    transform: `translateX(-50%) rotate(${-rotation}deg)`,
                    width: 24,
                    height: 24,
                    marginLeft: Math.sin((c.angle * Math.PI) / 180) * 125,
                  }}
                >
                  <span
                    className={`text-[11px] font-bold font-mono ${
                      isN ? 'text-red-400' : isMain ? 'text-gray-300' : 'text-gray-600'
                    }`}
                    style={{
                      textShadow: isN ? '0 0 8px rgba(248,113,113,0.4)' : 'none',
                    }}
                  >
                    {c.label}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-cyan-400/70 z-10" />

          {waypointBearings.map((relBearing, i) => {
            const xPos = Math.sin(relBearing) * 125
            if (Math.abs(xPos) > 130) return null
              const dist = wpDistances[i] ?? 0
            const distLabel = dist < 10 ? '' : `${Math.round(dist)}m`
            const wp = waypoints[i]
            return (
              <div
                key={i}
                className="absolute top-1/2 -translate-y-1/2 flex items-center gap-0.5 z-20"
                style={{
                  left: `calc(50% + ${xPos}px)`,
                  transform: 'translate(-50%, -50%)',
                  transition: 'left 0.15s ease-out',
                  opacity: Math.abs(relBearing) < Math.PI / 4 ? 0.9 : 0.4,
                }}
              >
                <span className="text-[9px]" style={{ color: wp.color }}>{wp.icon}</span>
                {distLabel && (
                  <span className="text-[7px] font-mono text-gray-500">{distLabel}</span>
                )}
              </div>
            )
          })}

          {/* ── Enemy indicators ── */}
          {_compassEnemyData.map((enemy, i) => {
            const camPos = (window as any).__CAMERA_POSITION as { x: number; z: number } | undefined
            if (!camPos) return null
            const dx = enemy.x - camPos.x
            const dz = enemy.z - camPos.z
            const dist = Math.sqrt(dx * dx + dz * dz)
            if (dist > 80) return null // too far
            const angle = Math.atan2(dx, -dz)
            let relBearing = angle - (bearing - Math.PI)
            relBearing = ((relBearing + Math.PI) % (Math.PI * 2)) - Math.PI
            const xPos = Math.sin(relBearing) * 125
            if (Math.abs(xPos) > 128) return null
            const isBoss = enemy.type === 'chronoBehemoth' || enemy.type === 'timeTyrant'
            const enemyDist = dist < 10 ? '' : `${Math.round(dist)}m`
            const urgency = Math.max(0.3, 1 - dist / 80)
            return (
              <div
                key={`enemy-${i}`}
                className="absolute top-1/2 -translate-y-1/2 z-30"
                style={{
                  left: `calc(50% + ${xPos}px)`,
                  transform: 'translate(-50%, -50%)',
                  transition: 'left 0.1s linear',
                  opacity: urgency,
                }}
              >
                <span
                  className={`font-mono ${isBoss ? 'text-[11px]' : 'text-[9px]'}`}
                  style={{
                    color: isBoss ? '#ffaa00' : '#ff4466',
                    textShadow: isBoss
                      ? `0 0 8px rgba(255,170,0,${urgency * 0.6})`
                      : `0 0 6px rgba(255,68,102,${urgency * 0.4})`,
                    animation: isBoss ? 'enemy-compass-boss 0.6s ease-in-out infinite' : 'enemy-compass-default 0.8s ease-in-out infinite',
                    animationDelay: `${i * 0.1}s`,
                  }}
                >
                  {isBoss ? '✧' : '◉'}
                </span>
                {enemyDist && (
                  <span className="text-[6px] font-mono text-red-400/60 ml-0.5">{enemyDist}</span>
                )}
              </div>
            )
          })}

          <style>{`
            @keyframes enemy-compass-default {
              0%, 100% { opacity: 0.7; transform: translateY(0); }
              50% { opacity: 1; transform: translateY(-1px); }
            }
            @keyframes enemy-compass-boss {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.8; transform: scale(1.2); }
            }
          `}</style>
        </div>

        <div className="absolute top-[42px] left-1/2 -translate-x-1/2 flex items-center gap-3 flex-wrap justify-center w-[400px]">
          {waypoints.slice(0, 5).map((wp, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className="text-[9px]" style={{ color: wp.color }}>{wp.icon}</span>
              <span className="text-[8px] font-mono uppercase tracking-wider text-gray-500">
                {wp.label}
              </span>
            </div>
          ))}
          <span className="text-[7px] font-mono text-gray-600">+ explore</span>
        </div>
      </div>
    </div>
  )
}

/**
 * Camera direction publisher — call from inside R3F Canvas to give
 * the Compass component access to camera orientation.
 */
export function publishCameraDirection(dir: { x: number; z: number }, pos: { x: number; z: number }) {
  ;(window as any).__CAMERA_DIRECTION = dir
  ;(window as any).__CAMERA_POSITION = pos
}
