import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
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
      description: 'Harvest raw Epoch from a time rift',
      icon: '⟐',
      color: '#ff8844',
      check: () => useStore.getState().inventory.raw >= 10,
      unlocked: false,
    },
    {
      id: 'first_refine',
      title: 'First Refinement',
      description: 'Condense raw Epoch into Chrono matter',
      icon: '⟡',
      color: '#ffaa00',
      check: () => useStore.getState().inventory.vapour >= 5,
      unlocked: false,
    },
    {
      id: 'first_crystal',
      title: '✦ Aeon Forging Unlocked!',
      description: 'Aeon crystals are now available. Build permanent time constructs.',
      icon: '◆',
      color: '#aa88ff',
      check: () => useStore.getState().formulaDiscovered('crystallization'),
      unlocked: false,
    },
    {
      id: 'first_explosion',
      title: '✦ Detonation Unlocked!',
      description: 'Right-click Chrono constructs to detonate them. Chain reactions reshape the landscape.',
      icon: '💥',
      color: '#ff6644',
      check: () => useStore.getState().formulaDiscovered('detonation'),
      unlocked: false,
    },
    {
      id: 'first_heal',
      title: 'Reverse the Clock',
      description: 'Heal yourself with Flux energy',
      icon: '💚',
      color: '#44ff88',
      check: () => false,
      unlocked: false,
    },
    {
      id: 'first_trade',
      title: 'First Trade',
      description: 'Trade resources for renown',
      icon: '⟐',
      color: '#ffcc44',
      check: () => false,
      unlocked: false,
    },
    {
      id: 'first_build',
      title: 'First Build',
      description: 'Place your first time construct in the world',
      icon: '⬡',
      color: '#ffaa00',
      check: () => false,
      unlocked: false,
    },
    {
      id: 'first_explosion_trigger',
      title: 'First Denaturation',
      description: 'Denature your first experimental construct',
      icon: '💥',
      color: '#ff6644',
      check: () => false,
      unlocked: false,
    },
    {
      id: 'renown_10',
      title: 'Cited Once',
      description: 'Accumulate 10 Citations',
      icon: '◎',
      color: '#ffcc44',
      check: () => useStore.getState().inventory.renown >= 10,
      unlocked: false,
    },
    {
      id: 'renown_20',
      title: 'Emerging Researcher',
      description: 'Accumulate 20 Citations',
      icon: '⟐',
      color: '#ffcc44',
      check: () => useStore.getState().inventory.renown >= 20,
      unlocked: false,
    },
    {
      id: 'renown_30',
      title: 'Published Author',
      description: 'Accumulate 30 Citations',
      icon: '✦',
      color: '#ffd700',
      check: () => useStore.getState().inventory.renown >= 30,
      unlocked: false,
    },
    {
      id: 'renown_50',
      title: 'Highly Cited',
      description: 'Accumulate 50 Citations',
      icon: '⟐',
      color: '#ffcc44',
      check: () => useStore.getState().inventory.renown >= 50,
      unlocked: false,
    },
    {
      id: 'upgrade_max',
      title: 'Lab Director',
      description: 'Max out any Grant Office upgrade',
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
      title: 'Grant Funded',
      description: 'Secure a research grant by creating a time bond',
      icon: '⏳',
      color: '#44ffaa',
      check: () => useStore.getState().timeBonds.length >= 1,
      unlocked: false,
    },
    {
      id: 'first_shop',
      title: 'Equipment Acquired',
      description: 'Purchase lab equipment from the Citation shop',
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
      title: 'Lab Technician',
      description: 'Assemble 10 constructs',
      icon: '⬡',
      color: '#ffaa00',
      check: () => Object.keys(useStore.getState().blocks).length >= 10,
      unlocked: false,
    },
  ]
}

// ── Manual unlock for event-based achievements ─────────

let _unlockedHeal = false
let _unlockedTrade = false
let _unlockedBuild = false
let _unlockedExplosion = false

export function unlockHealAchievement() { _unlockedHeal = true }
export function unlockTradeAchievement() { _unlockedTrade = true }
export function unlockBuildAchievement() { _unlockedBuild = true }
export function unlockExplosionAchievement() { _unlockedExplosion = true }

// ── Shared AudioContext (reused across all toast sounds) ──
let toastAudioCtx: AudioContext | null = null

function playToastSound(color: string) {
  try {
    if (!toastAudioCtx) {
      toastAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    const ctx = toastAudioCtx
    if (ctx.state === 'suspended') ctx.resume()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const freq = color === '#ffd700' ? 880 : color === '#aa88ff' ? 660 : color === '#44ff88' ? 523 : 440
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(freq, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + 0.15)
    gain.gain.setValueAtTime(0.06, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.3)
  } catch { /* silent */ }
}

// ── Toast component ────────────────────────────────────

/**
 * Premium toast notifications with layered animations, sound effects,
 * colored glow bars, and smooth stack behavior.
 */
export const ToastNotifications = () => {
  const [toasts, setToasts] = useState<Toast[]>([])
  const checkInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const welcomeShown = useRef(false)

  useEffect(() => { initAchievements() }, [])

  // Listen for toast events from game systems (combos, surges, etc.)
  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail
      const toast: Toast = {
        id: nextToastId++,
        title: d.title,
        description: d.description,
        icon: d.icon ?? '✦',
        color: d.color ?? '#44ffcc',
      }
      setToasts((prev) => [...prev.slice(-3), toast])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id))
      }, 5000)
    }
    window.addEventListener('toast-event', handler)
    return () => window.removeEventListener('toast-event', handler)
  }, [])

  // Show welcome toast on first entry
  const hasEnteredGame = useStore((s) => s.hasEnteredGame)
  useEffect(() => {
    if (hasEnteredGame && !welcomeShown.current) {
      welcomeShown.current = true
      const toast: Toast = {
        id: nextToastId++,
        title: 'Welcome, Chronomancer',
        description: 'Find a glowing Time Rift and click to harvest Epoch. Press Tab to open the menu — systems unlock as you progress!',
        icon: '⟐',
        color: '#44ffcc',
      }
      setToasts((prev) => [...prev.slice(-3), toast])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id))
      }, 6000)
    }
  }, [hasEnteredGame])

  const showToast = useCallback((achievement: Achievement) => {
    const toast: Toast = {
      id: nextToastId++,
      title: achievement.title,
      description: achievement.description,
      icon: achievement.icon,
      color: achievement.color,
    }
    setToasts((prev) => [...prev.slice(-3), toast])

    playToastSound(achievement.color)

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id))
    }, 5000)
  }, [])

  useEffect(() => {
    checkInterval.current = setInterval(() => {
      for (const achievement of achievements) {
        if (achievement.unlocked) continue

        if (achievement.id === 'first_heal') {
          if (_unlockedHeal) {
            achievement.unlocked = true
            showToast(achievement)
            _unlockedHeal = false
          }
          continue
        }
        if (achievement.id === 'first_trade') {
          if (_unlockedTrade) {
            achievement.unlocked = true
            showToast(achievement)
            _unlockedTrade = false
          }
          continue
        }
        if (achievement.id === 'first_build') {
          if (_unlockedBuild) {
            achievement.unlocked = true
            showToast(achievement)
            _unlockedBuild = false
          }
          continue
        }
        if (achievement.id === 'first_explosion_trigger') {
          if (_unlockedExplosion) {
            achievement.unlocked = true
            showToast(achievement)
            _unlockedExplosion = false
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
      {toasts.map((toast, index) => (
        <ToastItem key={toast.id} toast={toast} index={index} />
      ))}
    </div>
  )
}

// ── ToastItem with sparkle particles ──────────────────

const ToastItem = ({ toast, index }: { toast: Toast; index: number }) => {
  const sparkles = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2 + Math.random() * 4,
      delay: Math.random() * 0.3,
      duration: 0.6 + Math.random() * 0.4,
      angle: Math.random() * 360,
      distance: 20 + Math.random() * 40,
    }))
  }, [])

  return (
    <div
      className="relative overflow-hidden bg-gray-900/90 backdrop-blur-sm border rounded-lg px-4 py-3 shadow-2xl min-w-[280px] max-w-[340px]"
      style={{
        borderColor: `${toast.color}44`,
        animation: `toast-entry 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
        animationDelay: `${index * 0.1}s`,
        opacity: 0,
      }}
    >
      {/* Sparkle particles */}
      {sparkles.map((s) => (
        <div
          key={s.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            background: toast.color,
            boxShadow: `0 0 ${s.size * 2}px ${toast.color}`,
            opacity: 0,
            animation: `toast-sparkle ${s.duration}s ease-out ${s.delay + index * 0.1}s forwards`,
            '--sparkle-angle': `${s.angle}deg`,
            '--sparkle-distance': `${s.distance}px`,
          } as React.CSSProperties}
        />
      ))}

      <div
        className="absolute left-0 top-0 bottom-0 w-0.5"
        style={{
          background: `linear-gradient(180deg, ${toast.color}, ${toast.color}44)`,
          boxShadow: `0 0 8px ${toast.color}`,
        }}
      />

      {/* Ripple effect on entry */}
      <div
        className="absolute inset-0 rounded-lg pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 0% 50%, ${toast.color}22 0%, transparent 70%)`,
          animation: 'toast-ripple 0.6s ease-out forwards',
          opacity: 0,
        }}
      />

      <div className="flex items-start gap-3 ml-1 relative z-[1]">
        <span
          className="text-xl mt-0.5 relative"
          style={{ color: toast.color }}
        >
          {toast.icon}
          <span
            className="absolute inset-0 blur-sm"
            style={{ color: toast.color, opacity: 0.5 }}
          >
            {toast.icon}
          </span>
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-bold tracking-wide">{toast.title}</p>
          <p className="text-gray-400 text-[11px] mt-0.5 leading-relaxed">{toast.description}</p>
        </div>
      </div>

      <div
        className="mt-2 h-0.5 rounded-full overflow-hidden relative z-[1]"
        style={{ background: `${toast.color}22` }}
      >
        <div
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, ${toast.color}66, ${toast.color})`,
            boxShadow: `0 0 6px ${toast.color}66`,
            animation: `toast-progress 4.5s linear forwards`,
            animationDelay: `${index * 0.1}s`,
          }}
        />
      </div>

      <style>{`
        @keyframes toast-entry {
          0% { opacity: 0; transform: translateX(100px) scale(0.8) rotate(-2deg); }
          50% { opacity: 1; transform: translateX(-6px) scale(1.03) rotate(0.5deg); }
          75% { transform: translateX(2px) scale(0.99); }
          100% { opacity: 1; transform: translateX(0) scale(1) rotate(0deg); }
        }
        @keyframes toast-progress {
          0% { width: 100%; }
          100% { width: 0%; }
        }
        @keyframes toast-sparkle {
          0% { opacity: 0.8; transform: translate(0, 0) scale(1); }
          50% { opacity: 0.5; transform: translate(
            calc(cos(var(--sparkle-angle)) * var(--sparkle-distance)),
            calc(sin(var(--sparkle-angle)) * var(--sparkle-distance))
          ) scale(0.6); }
          100% { opacity: 0; transform: translate(
            calc(cos(var(--sparkle-angle)) * var(--sparkle-distance) * 1.5),
            calc(sin(var(--sparkle-angle)) * var(--sparkle-distance) * 1.5)
          ) scale(0); }
        }
        @keyframes toast-ripple {
          0% { opacity: 0.6; transform: scaleX(0); transform-origin: left center; }
          100% { opacity: 0; transform: scaleX(1); transform-origin: left center; }
        }
      `}</style>
    </div>
  )
}
