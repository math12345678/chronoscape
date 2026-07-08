import { useEffect, useRef } from 'react'
import { useStore } from '../store'

interface UnlockEvent {
  title: string
  description: string
  icon: string
  color: string
}

function fireToast(e: UnlockEvent) {
  window.dispatchEvent(new CustomEvent('toast-event', { detail: e }))
}

/**
 * Watches store state and fires toast notifications when progression milestones
 * unlock new feature tiers. This bridges the core loop to the 40+ systems
 * by telling players when they should check the Tab menu.
 */
export const FeatureUnlockWatcher = () => {
  const hasEntered = useStore((s) => s.hasEnteredGame)
  const shownRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!hasEntered) return

    const unsub = useStore.subscribe((state, prev) => {
      // ── Formula discoveries ────────────────────────
      if (state.formulaDiscovered('crystallization') && !prev.formulaDiscovered('crystallization')) {
        fireToast({
          title: '✦ Crystallization — Aeon Forging',
          icon: '◆',
          color: '#aa88ff',
          description: 'Crystal blocks last forever. Ascension, Evolution, Dimensional Gates, and Lore are now available in the menu (Tab).',
        })
      }

      if (state.formulaDiscovered('detonation') && !prev.formulaDiscovered('detonation')) {
        fireToast({
          title: '💥 Detonation — Power Unleashed',
          icon: '✦',
          color: '#ff6644',
          description: 'Explosions, Expeditions, Forge, Automation, Chronovate AI, Infinite Progression unlocked! Check the menu (Tab).',
        })
      }

      if (state.formulaDiscovered('timelineEcho') && !prev.formulaDiscovered('timelineEcho')) {
        fireToast({
          title: '⏳ Timeline Echo — Parallel Worlds',
          icon: '⟐',
          color: '#ff44ff',
          description: 'Chrono Genetics, Parallel Selves, Auto Prestige unlocked! Check the menu (Tab).',
        })
      }

      // ── Renown thresholds ──────────────────────────
      const prevRenown = Math.floor(prev.inventory.renown)
      const nowRenown = Math.floor(state.inventory.renown)
      const renownMilestones = [10, 20, 30, 50, 100]

      for (const ms of renownMilestones) {
        const key = `renown_${ms}`
        if (nowRenown >= ms && prevRenown < ms && !shownRef.current.has(key)) {
          shownRef.current.add(key)
          const unlocks: Record<number, UnlockEvent> = {
            10: {
              title: '◎ 10 Renown — Real Estate Unlocked',
              icon: '🏠',
              color: '#facc15',
              description: 'You can now buy property. New systems: Real Estate, Bank upgrades. Check the menu (Tab).',
            },
            20: {
              title: '✦ 20 Renown — CEO Office',
              icon: '✦',
              color: '#ffd700',
              description: 'Executive decisions await. CEO Office, Industry expanded. Check the menu (Tab).',
            },
            30: {
              title: '⟐ 30 Renown — Mounts & More',
              icon: '🐴',
              color: '#ffd700',
              description: 'Mounts unlocked! Explore faster. Check the menu (Tab).',
            },
            50: {
              title: '📅 50 Renown — Full Access',
              icon: '✦',
              color: '#ff44ff',
              description: 'Events Calendar, Casino, and all remaining features unlocked! Press Tab to explore.',
            },
            100: {
              title: '🎲 100 Renown — Casino Royale',
              icon: '🎲',
              color: '#ff44ff',
              description: 'The Casino is now open. Risk your renown for massive rewards!',
            },
          }
          if (unlocks[ms]) fireToast(unlocks[ms])
        }
      }

      // ── Blocks placed ──────────────────────────────
      if (state.totalBlocksPlaced >= 5 && prev.totalBlocksPlaced < 5 && !shownRef.current.has('blocks_5')) {
        shownRef.current.add('blocks_5')
        fireToast({
          title: '⬡ 5 Blocks — Blueprints & Insurance',
          icon: '⬡',
          color: '#ffaa00',
          description: 'Blueprints and Insurance unlocked. Save your structures! Check the menu (Tab).',
        })
      }

      if (state.totalBlocksPlaced >= 20 && prev.totalBlocksPlaced < 20 && !shownRef.current.has('blocks_20')) {
        shownRef.current.add('blocks_20')
        fireToast({
          title: '⊡ 20 Blocks — Outposts',
          icon: '⊡',
          color: '#44aaff',
          description: 'Chrono Outposts unlocked. Establish footholds across the world!',
        })
      }

      if (state.totalBlocksPlaced >= 50 && prev.totalBlocksPlaced < 50 && !shownRef.current.has('blocks_50')) {
        shownRef.current.add('blocks_50')
        fireToast({
          title: '⬡ 50 Blocks — Mega Structures',
          icon: '⬡',
          color: '#aa88ff',
          description: 'Mega Structures unlocked. Build monuments that span timelines!',
        })
      }

      // ── Explosions ─────────────────────────────────
      if (state.totalExplosions >= 1 && prev.totalExplosions < 1 && !shownRef.current.has('explosion_1')) {
        shownRef.current.add('explosion_1')
        fireToast({
          title: '💥 First Explosion — Bestiary',
          icon: '✕',
          color: '#ff4466',
          description: 'Bestiary unlocked. Track your enemies! Check the menu (Tab).',
        })
      }

      if (state.totalExplosions >= 3 && prev.totalExplosions < 3 && !shownRef.current.has('explosion_3')) {
        shownRef.current.add('explosion_3')
        fireToast({
          title: '⚔ 3 Explosions — Gangs',
          icon: '⚔',
          color: '#ff4466',
          description: 'Gang territory system unlocked. Fight for control!',
        })
      }

      if (state.totalExplosions >= 5 && prev.totalExplosions < 5 && !shownRef.current.has('explosion_5')) {
        shownRef.current.add('explosion_5')
        fireToast({
          title: '⚔ 5 Explosions — Temporal Raids',
          icon: '⚔',
          color: '#ff4466',
          description: 'Temporal Raids unlocked. Strike across timelines!',
        })
      }

      // ── Advanced HUD (completes the first major progression gate) ──
      if (state.showAdvancedHUD && !prev.showAdvancedHUD && !shownRef.current.has('advanced_hud')) {
        shownRef.current.add('advanced_hud')
        fireToast({
          title: '🔓 Advanced Systems Unlocked',
          icon: '✦',
          color: '#44ffcc',
          description: 'New features available! Industry, Arena, Talents, Enchanting, Relic Forge — press Tab to explore.',
        })
      }
    })

    return unsub
  }, [hasEntered])

  return null
}
