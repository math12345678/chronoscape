import { useState, useCallback, useRef, useEffect } from 'react'
import { useStore } from '../../store'

// ── Types ──────────────────────────────────────────────

interface Toast {
  id: number
  title: string
  description: string
  icon: string
  color: string
}

interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  color: string
  check: () => boolean
  unlocked: boolean
}

// ── Achievements list ─────────────────────────────────

let nextToastId = 1
let achievements: Achievement[] = []
let initialized = false

function initAchievements() {
  if (initialized) return
  initialized = true

  achievements = [
    {
      id: 'first_harvest',
      title: 'First Harvest',
      description: 'Tap into the time stream',
      icon: '⟐',
      color: '#ff8844',
      check: () => useStore.getState().inventory.raw >= 10,
      unlocked: false,
    },
    {
      id: 'first_refine',
      title: 'First Refinement',
      description: 'Transform raw time into something useful',
      icon: '⟡',
      color: '#ffaa00',
      check: () => useStore.getState().inventory.vapour >= 5,
      unlocked: false,
    },
    {
      id: 'first_crystal',
      title: 'Crystallized Knowledge',
      description: 'Unlock the power of permanent time',
      icon: '◆',
      color: '#aa88ff',
      check: () => useStore.getState().formulaDiscovered('crystallization'),
      unlocked: false,
    },
    {
      id: 'first_explosion',
      title: 'Chronos Breaker',
      description: 'Weaponize time itself',
      icon: '💥',
      color: '#ff6644',
      check: () => useStore.getState().formulaDiscovered('detonation'),
      unlocked: false,
    },
    {
      id: 'first_heal',
      title: 'Reverse the Clock',
      description: 'Heal a wounded soul',
      icon: '💚',
      color: '#44ff88',
      check: () => false, // checked manually via event trigger
      unlocked: false,
    },
    {
      id: 'renown_10',
      title: 'Time Dealer',
      description: 'Accumulate 10 Renown',
      icon: '◎',
      color: '#ffcc44',
      check: () => useStore.getState().inventory.renown >= 10,
      unlocked: false,
    },
    {
      id: 'renown_50',
      title: 'Market Maker',
      description: 'Accumulate 50 Renown',
      icon: '⟐',
      color: '#ffcc44',
      check: () => useStore.getState().inventory.renown >= 50,
      unlocked: false,
    },
    {
      id: 'upgrade_max',
      title: 'Time Lord',
      description: 'Max out any shrine upgrade',
      icon: '⬡',
      color: '#ffdd44',
      check: () => {
        const u = useStore.getState().upgrades
        return u.capacityBoost >= 5 || u.haste >= 5 || u.magnitude >= 5 || u.endurance >= 5
      },
      unlocked: false,
    },
    {
      id: 'first_bond',
      title: 'Investor',
      description: 'Create a time bond',
      icon: '⏳',
      color: '#44ffaa',
      check: () => useStore.getState().timeBonds.length >= 1,
      unlocked: false,
    },
    {
      id: 'first_shop',
      title: 'Shopkeeper',
      description: 'Buy something from the Renown shop',
      icon: '✦',
      color: '#ffd700',
      check: () => {
        const p = useStore.getState().shopPurchases
        return Object.values(p).some((v) => v === true)
      },
      unlocked: false,
    },
    {
      id: 'blocks_10',
      title: 'Builder',
      description: 'Place 10 blocks',
      icon: '⬡',
      color: '#ffaa00',
      check: () => Object.keys(useStore.getState().blocks).length >= 10,
      unlocked: false,
    },
  ]
}

// ── Manual unlock for event-based achievements ─────────

let _unlockedHeal = false

export function unlockHealAchievement() {
  _unlockedHeal = true
}

// ── Toast component ────────────────────────────────────

/**
 * Toast notification overlay that displays achievement milestones.
 * Toasts slide in from the right, stay for 3s, then fade out.
 */
export const ToastNotifications = () => {
  const [toasts, setToasts] = useState<Toast[]>([])
  const lastCheckRef = useRef(0)
  const checkInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  // Initialize achievements
  useEffect(() => {
    initAchievements()
  }, [])

  const showToast = useCallback((achievement: Achievement) => {
    const toast: Toast = {
      id: nextToastId++,
      title: achievement.title,
      description: achievement.description,
      icon: achievement.icon,
      color: achievement.color,
    }
    setToasts((prev) => [...prev.slice(-2), toast]) // max 3 visible

    // Auto-remove after 3.5s
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id))
    }, 3500)
  }, [])

  // Periodically check achievements
  useEffect(() => {
    checkInterval.current = setInterval(() => {
      for (const achievement of achievements) {
        if (achievement.unlocked) continue

        // Check heal achievement separately
        if (achievement.id === 'first_heal') {
          if (_unlockedHeal) {
            achievement.unlocked = true
            showToast(achievement)
            _unlockedHeal = false
          }
          continue
        }

        if (achievement.check()) {
          achievement.unlocked = true
          showToast(achievement)
        }
      }
    }, 2000)

    return () => {
      if (checkInterval.current) clearInterval(checkInterval.current)
    }
  }, [showToast])

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[95] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast, i) => (
        <div
          key={toast.id}
          className={`
            bg-gray-900/90 backdrop-blur-sm border rounded-lg px-4 py-3
            shadow-2xl min-w-[260px] max-w-[320px]
            animate-in slide-in-from-right-8 fade-in duration-300
          `}
          style={{
            borderColor: `${toast.color}44`,
            animation: `toast-slide-in 0.4s ease-out forwards`,
          }}
        >
          <div className="flex items-start gap-3">
            <span
              className="text-xl mt-0.5"
              style={{ color: toast.color }}
            >
              {toast.icon}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-bold">{toast.title}</p>
              <p className="text-gray-400 text-[11px] mt-0.5">{toast.description}</p>
            </div>
          </div>

          {/* Progress glow bar */}
          <div
            className="mt-2 h-0.5 rounded-full transition-all"
            style={{
              background: `linear-gradient(90deg, ${toast.color}66, ${toast.color})`,
              width: '100%',
            }}
          />
        </div>
      ))}

      {/* Toast animation keyframe */}
      <style>{`
        @keyframes toast-slide-in {
          0% { opacity: 0; transform: translateX(80px) scale(0.9); }
          60% { opacity: 1; transform: translateX(-8px) scale(1.02); }
          100% { opacity: 1; transform: translateX(0) scale(1); }
        }
      `}</style>
    </div>
  )
}
