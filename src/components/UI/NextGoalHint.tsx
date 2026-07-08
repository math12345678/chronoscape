import { useState, useEffect, useRef } from 'react'
import { useStore } from '../../store'

interface Goal {
  label: string
  hint: string
  icon: string
  check: () => boolean
  priority: number  // lower = more important
}

/**
 * All possible goals in priority order.
 * The first uncompleted goal is shown.
 */
function getGoals(): Goal[] {
  const s = () => useStore.getState()
  return [
    // ── Tier 0: Getting started ──
    { label: 'Harvest your first rift', hint: 'Find a glowing Time Rift and click it', icon: '⟐', priority: 0, check: () => s().inventory.raw >= 1 },
    { label: 'Refine into Chrono', hint: 'Press R — or just keep harvesting, it refines automatically', icon: '⟡', priority: 1, check: () => s().inventory.vapour >= 1 },
    { label: 'Place your first block', hint: 'Press 1, then click the ground', icon: '⬡', priority: 2, check: () => Object.keys(s().blocks).length >= 1 },

    // ── Tier 1: Early game ──
    { label: 'Press Tab to explore the menu', hint: 'All systems unlock as you progress — check back often!', icon: '≡', priority: 3, check: () => s().showAdvancedHUD || s().formulas.some(f => f.discovered) },
    { label: 'Visit the Lab', hint: 'Find the Lab to discover permanent upgrades', icon: '🔬', priority: 4, check: () => s().formulas.some(f => f.discovered) },
    { label: 'Discover a formula', hint: 'Harvest and refine to unlock Crystallization', icon: '✦', priority: 5, check: () => s().formulaDiscovered('crystallization') },
    { label: 'Earn 10 Renown', hint: 'Trade resources with the Trader or Time Exchange', icon: '◎', priority: 6, check: () => s().inventory.renown >= 10 },

    // ── Tier 2: Mid game ──
    { label: 'Discover Detonation', hint: 'Keep harvesting — hit combo milestones to unlock it', icon: '💥', priority: 7, check: () => s().formulaDiscovered('detonation') },
    { label: 'Place 20 blocks', hint: 'Build structures across the island', icon: '⊡', priority: 8, check: () => s().totalBlocksPlaced >= 20 },
    { label: 'Earn 30 Renown', hint: 'Trade, complete bounties, and run the economy', icon: '⟐', priority: 9, check: () => s().inventory.renown >= 30 },
    { label: 'Place 50 blocks', hint: 'Build a monument!', icon: '⬡', priority: 10, check: () => s().totalBlocksPlaced >= 50 },

    // ── Tier 3: Late game ──
    { label: 'Discover Timeline Echo', hint: 'Master all formulas to unlock parallel worlds', icon: '⏳', priority: 11, check: () => s().formulaDiscovered('timelineEcho') },
    { label: 'Earn 100 Renown', hint: 'Build an economic empire', icon: '🎲', priority: 12, check: () => s().inventory.renown >= 100 },
    { label: 'Discover all formulas', hint: 'Complete the formula compendium', icon: '✦', priority: 13, check: () => s().formulas.every(f => f.discovered) },
  ]
}

/**
 * Compact "Next Goal" indicator that appears near the bottom of the screen.
 * Shows what the player should work toward next, based on progression.
 * Auto-hides after the player reaches late game (all formulas discovered).
 */
export const NextGoalHint = () => {
  const [, refresh] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hiddenRef = useRef(false)

  useEffect(() => {
    intervalRef.current = setInterval(() => refresh(n => n + 1), 2000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  // Hide when Tab menu opens
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Tab') hiddenRef.current = true
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Don't show before entering game
  const hasEntered = useStore((s) => s.hasEnteredGame)
  if (!hasEntered || hiddenRef.current) return null

  // Find the first uncompleted goal
  const goals = getGoals()
  const firstGoal = goals.find(g => !g.check())

  // All goals complete — hide
  if (!firstGoal) return null

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none select-none"
      style={{
        animation: 'goal-in 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
        style={{
          background: 'rgba(5,10,25,0.6)',
          border: '1px solid rgba(255,255,255,0.04)',
          backdropFilter: 'blur(6px)',
        }}
      >
        <span className="text-[10px]" style={{ color: '#44ffcc', opacity: 0.5 }}>
          ⟐
        </span>
        <span className="text-[10px] font-mono tracking-wide" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {firstGoal.label}
        </span>
        <div
          className="h-3 w-px"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        />
        <span className="text-[9px] font-mono" style={{ color: 'rgba(255,255,255,0.18)' }}>
          {firstGoal.hint}
        </span>
      </div>

      <style>{`
        @keyframes goal-in {
          0% { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
