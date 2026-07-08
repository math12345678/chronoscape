import { useState, useEffect, useRef } from 'react'
import { useStore } from '../../store'

interface MilestoneToast {
  id: number
  milestone: number
}

let nextMilestoneToastId = 0

const MILESTONE_LABELS: Record<number, { title: string; desc: string }> = {
  10: { title: '✦ First Citation', desc: 'Your research has been cited for the first time. The scientific community is taking notice.' },
  20: { title: '✦ Emerging Researcher', desc: 'Citations are accumulating. Your methodology is gaining recognition in the field.' },
  30: { title: '✦ Published Author', desc: 'A significant body of work. Other chronomancers cite your publications regularly.' },
  40: { title: '✦ Esteemed Scholar', desc: 'Your contributions to time-energy research are widely referenced and respected.' },
  50: { title: '✦ Highly Cited', desc: 'Your papers on chrono-structural manipulation are considered foundational texts.' },
  60: { title: '✦ Citation Milestone', desc: '60 citations! Your research is becoming essential reading in temporal dynamics.' },
  70: { title: '✦ Renowned Authority', desc: 'You are recognized as a leading expert in temporal harvesting methodology.' },
  80: { title: '✦ Distinguished Scholar', desc: 'Your body of work spans multiple disciplines. Funding agencies seek your expertise.' },
  90: { title: '✦ Master Chronomancer', desc: 'Few researchers have achieved this level of recognition. Your legacy is secure.' },
  100: { title: '✦ Chrono Legend', desc: 'Your name will be etched in the annals of time-energy research forever.' },
}

function getMilestoneLabel(milestone: number): { title: string; desc: string } | null {
  return MILESTONE_LABELS[milestone] ?? null
}

let milestoneAudioCtx: AudioContext | null = null

function getMilestoneCtx(): AudioContext {
  if (!milestoneAudioCtx) {
    milestoneAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  return milestoneAudioCtx
}

function playMilestoneSound() {
  try {
    const ctx = getMilestoneCtx()
    if (ctx.state === 'suspended') ctx.resume()
    const now = ctx.currentTime

    // Golden fanfare chord (C major arpeggio)
    const notes = [523, 659, 784, 1047]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, now + i * 0.08)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.04, now + i * 0.08)
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.6)
      osc.connect(g).connect(ctx.destination)
      osc.start(now + i * 0.08)
      osc.stop(now + i * 0.08 + 0.6)
    })

    // Sustain a golden pad
    const pad = ctx.createOscillator()
    pad.type = 'sine'
    pad.frequency.setValueAtTime(523, now)
    const pg = ctx.createGain()
    pg.gain.setValueAtTime(0.02, now + 0.2)
    pg.gain.linearRampToValueAtTime(0, now + 1.5)
    pad.connect(pg).connect(ctx.destination)
    pad.start(now + 0.2)
    pad.stop(now + 1.5)
  } catch { /* silent */ }
}

/**
 * Watches for renown milestone thresholds and shows a celebration toast
 * with golden styling and a fanfare sound effect.
 */
export const RenownMilestoneWatcher = () => {
  const renown = useStore((s) => Math.floor(s.inventory.renown))
  const [toasts, setToasts] = useState<MilestoneToast[]>([])
  const lastNotifiedRef = useRef(0)

  useEffect(() => {
    // Determine current milestone
    const currentMilestone = Math.floor(renown / 10) * 10
    if (currentMilestone > 0 && currentMilestone !== lastNotifiedRef.current) {
      const label = getMilestoneLabel(currentMilestone)
      if (label) {
        lastNotifiedRef.current = currentMilestone
        const id = nextMilestoneToastId++
        setToasts((prev) => [...prev.slice(-2), { id, milestone: currentMilestone }])
        playMilestoneSound()

        // Remove after display
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id))
        }, 5000)
      }
    } else if (currentMilestone === 0) {
      lastNotifiedRef.current = 0
    }
  }, [renown])

  if (toasts.length === 0) return null

  return (
    <>
      {toasts.map((toast) => {
        const label = getMilestoneLabel(toast.milestone)
        if (!label) return null
        return (
          <div
            key={toast.id}
            className="fixed top-24 right-4 z-[96] pointer-events-none select-none"
          >
            <div
              className="relative overflow-hidden bg-gray-900/90 backdrop-blur-sm border rounded-xl px-5 py-4 shadow-2xl min-w-[280px] max-w-[360px]"
              style={{
                borderColor: '#ffd70044',
                boxShadow: '0 0 30px rgba(255,215,0,0.15), 0 0 60px rgba(255,215,0,0.08)',
                animation: 'milestone-entry 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
              }}
            >
              {/* Golden glow bars */}
              <div
                className="absolute left-0 top-0 bottom-0 w-0.5"
                style={{
                  background: 'linear-gradient(180deg, #ffd700, #ffaa00)',
                  boxShadow: '0 0 8px #ffd700',
                }}
              />
              <div
                className="absolute right-0 top-0 bottom-0 w-0.5"
                style={{
                  background: 'linear-gradient(180deg, #ffaa00, #ffd70044)',
                  boxShadow: '0 0 6px #ffd70066',
                }}
              />

              <div className="flex items-start gap-3 ml-1">
                {/* Golden star icon */}
                <span className="text-2xl mt-0.5 relative" style={{ color: '#ffd700' }}>
                  ⭐
                  <span
                    className="absolute inset-0 blur-sm"
                    style={{ color: '#ffd700', opacity: 0.5 }}
                  >
                    ⭐
                  </span>
                </span>

                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-bold tracking-wide"
                    style={{
                      color: '#ffd700',
                      textShadow: '0 0 10px rgba(255,215,0,0.3)',
                    }}
                  >
                    {label.title}
                  </p>
                  <p className="text-gray-300 text-[11px] mt-0.5 leading-relaxed">
                    {label.desc}
                  </p>
                  <p className="text-[10px] font-mono mt-1 text-amber-500/80">
                    {toast.milestone} Citations
                  </p>
                </div>
              </div>

              {/* Animated sparkle bar */}
              <div className="mt-3 h-1 rounded-full overflow-hidden bg-gray-800/60">
                <div
                  className="h-full rounded-full animate-shimmer"
                  style={{
                    background: 'linear-gradient(90deg, #ffd70066, #ffd700, #ffaa00, #ffd70066)',
                    backgroundSize: '200% auto',
                    boxShadow: '0 0 8px #ffd70066',
                    animation: 'milestone-progress 5s linear forwards, shimmer 1.5s linear infinite',
                  }}
                />
              </div>
            </div>
          </div>
        )
      })}

      <style>{`
        @keyframes milestone-entry {
          0% { opacity: 0; transform: translateX(100px) scale(0.8); }
          50% { opacity: 1; transform: translateX(-6px) scale(1.03); }
          100% { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes milestone-progress {
          0% { width: 100%; }
          100% { width: 0%; }
        }
        @keyframes shimmer {
          0% { background-position: 0% 0%; }
          100% { background-position: 200% 0%; }
        }
        .animate-shimmer {
          background-size: 200% 100%;
        }
      `}</style>
    </>
  )
}
