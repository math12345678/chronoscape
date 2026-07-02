import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useStore } from '../store'
import { useSoundEngine } from '../hooks/useSoundEngine'

type AnomalyType = 'squall' | 'surge'

interface ActiveAnomaly {
  type: AnomalyType
  endsAt: number // performance.now() timestamp
}

const MIN_INTERVAL = 45 // seconds between anomalies
const MAX_INTERVAL = 90
const SQUALL_DURATION = 30 // seconds
const SURGE_DURATION = 60

/**
 * Random time anomaly events:
 * - **Time Squall**: All decay rates multiplied by 3 for 30s. Panic refine/build!
 * - **Time Surge**: All time rifts become active regardless of cooldown for 60s. Harvest frenzy!
 * 
 * Events are announced via a screen-wide warning banner and have visual effects
 * in the 3D scene.
 */
export const TimeAnomaly = () => {
  const [active, setActive] = useState<ActiveAnomaly | null>(null)
  const nextAnomalyAt = useRef(performance.now() + 60_000) // first one after 60s
  const time = useRef(0)
  const prevActiveRef = useRef<ActiveAnomaly | null>(null)
  const sounds = useSoundEngine()

  // Update store when anomaly state changes
  useEffect(() => {
    useStore.setState({
      anomalyActive: active?.type ?? null,
      anomalyEndsAt: active?.endsAt ?? null,
      anomalyDecayMultiplier: active?.type === 'squall' ? 3 : 1,
    })

    // Play alarm sound when anomaly starts
    if (active && !prevActiveRef.current) {
      sounds.anomaly()
    }
    prevActiveRef.current = active
  }, [active, sounds])

  useFrame((_, delta) => {
    time.current += delta
    const now = performance.now()

    // Check if current anomaly should end
    if (active && now >= active.endsAt) {
      setActive(null)
      nextAnomalyAt.current = now + randomInterval()
    }

    // Check if it's time for a new anomaly
    if (!active && now >= nextAnomalyAt.current) {
      const type: AnomalyType = Math.random() < 0.5 ? 'squall' : 'surge'
      setActive({
        type,
        endsAt: now + (type === 'squall' ? SQUALL_DURATION * 1000 : SURGE_DURATION * 1000),
      })
    }
  })

  return null
}

function randomInterval(): number {
  return (MIN_INTERVAL + Math.random() * (MAX_INTERVAL - MIN_INTERVAL)) * 1000
}

/**
 * Anomaly warning banner displayed as HTML overlay.
 * Shows animated warning text with type-specific colors.
 */
export const AnomalyBanner = () => {
  const anomalyActive = useStore((s) => s.anomalyActive)
  const anomalyEndsAt = useStore((s) => s.anomalyEndsAt)
  const [timeLeft, setTimeLeft] = useState(0)

  useEffect(() => {
    if (!anomalyActive) return

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil(((anomalyEndsAt ?? 0) - performance.now()) / 1000))
      setTimeLeft(remaining)
      if (remaining <= 0) clearInterval(interval)
    }, 100)

    return () => clearInterval(interval)
  }, [anomalyActive, anomalyEndsAt])

  if (!anomalyActive) return null

  const isSquall = anomalyActive === 'squall'

  return (
    <div className="fixed inset-0 pointer-events-none z-[90]">
      {/* Flash overlay */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${
          isSquall ? 'bg-red-500/10' : 'bg-cyan-400/10'
        }`}
      />

      {/* Banner */}
      <div
        className={`
          absolute top-8 left-1/2 -translate-x-1/2
          px-8 py-3 rounded-lg
          animate-fade-in-up
          ${isSquall
            ? 'bg-red-900/80 border border-red-500/50 text-red-200'
            : 'bg-cyan-900/80 border border-cyan-400/50 text-cyan-200'
          }
        `}
      >
        <div className="flex items-center gap-4">
          {/* Icon */}
          <span className="text-2xl animate-pulse">
            {isSquall ? '🌪️' : '⚡'}
          </span>
          <div>
            <p className="font-bold text-sm uppercase tracking-wider">
              {isSquall ? 'TIME SQUALL' : 'TIME SURGE'}
            </p>
            <p className="text-xs opacity-70 font-mono">
              {isSquall
                ? 'All decay rates tripled! Spend or lose it!'
                : 'All rifts active! Harvest while you can!'
              }
            </p>
          </div>
          <div className="text-2xl font-mono font-bold tabular-nums">
            {timeLeft}s
          </div>
        </div>
      </div>
    </div>
  )
}
