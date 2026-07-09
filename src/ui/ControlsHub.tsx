import { useState, useEffect, useCallback, useRef } from 'react'
import { useStore } from '../store'
import type { FormulaId } from '../store'
import { useSoundEngine } from '../hooks/useSoundEngine'

interface HubSection {
  title: string
  color: string
  tier: number  // 0=always, 1=early, 2=mid, 3=late
  items: {
    id: string
    label: string
    icon: string
    shortcut?: string
    category: string
    color: string
    tier: number
    unlockCondition: () => boolean
    unlockHint: string  // shown when locked: "Unlocks when you ___"
    action: () => void
  }[]
}

/**
 * Tier thresholds for each progression tier.
 * - tier 0: always visible
 * - tier 1: unlocked after refining (has vapour)
 * - tier 2: unlocked after first formula discovery or 10 blocks placed
 * - tier 3: unlocked after detonation formula or 50 renown
 */
function getCurrentTier(): number {
  const s = useStore.getState()
  if (s.formulaDiscovered('detonation') || s.inventory.renown >= 50) return 3
  if (s.formulas.some(f => f.discovered) || s.totalBlocksPlaced >= 10) return 2
  if (s.inventory.vapour >= 1) return 1
  return 0
}

export const ControlsHub = () => {
  const [open, setOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [staggerPhase, setStaggerPhase] = useState<'entering' | 'idle'>('idle')
  const hasEnteredGame = useStore((s) => s.hasEnteredGame)
  const [justUnlocked, setJustUnlocked] = useState<string[]>([])
  const sounds = useSoundEngine()
  const staggerTimers = useRef<ReturnType<typeof setTimeout>[]>([])

  // Tab key toggle
  useEffect(() => {
    if (!hasEnteredGame) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault()
        const wasOpen = open
        setOpen((prev) => {
          if (prev) {
            setActiveCategory(null)
            setStaggerPhase('idle')
          }
          return !prev
        })
        if (!wasOpen) {
          sounds.menuOpen()
          // Start stagger animation (1.5s to cover all items)
          setStaggerPhase('entering')
          setTimeout(() => setStaggerPhase('idle'), 1500)
        }
      }
      if (e.key === 'Escape' && open) {
        setOpen(false)
        setActiveCategory(null)
        setStaggerPhase('idle')
      }
    }
    window.addEventListener('keydown', handler)
    const timersMap = staggerTimers.current
    return () => {
      window.removeEventListener('keydown', handler)
      timersMap.forEach(t => clearTimeout(t))
    }
  }, [hasEnteredGame, open, sounds])

  // Track newly unlocked items across sessions + auto-open on first major unlock
  useEffect(() => {
    if (!hasEnteredGame) return
    const unsub = useStore.subscribe((state, prev) => {
      // Track newly unlocked features to show glow animation
      if (state.showAdvancedHUD !== prev.showAdvancedHUD && state.showAdvancedHUD) {
        setJustUnlocked((prev) => [...prev, 'Advanced Systems'])
        // Auto-open Tab menu after toast delay
        setTimeout(() => {
          setOpen(true)
          setActiveCategory('Progression')
          setStaggerPhase('entering')
          sounds.menuOpen()
          setTimeout(() => setStaggerPhase('idle'), 1500)
        }, 2500)
        setTimeout(() => setJustUnlocked((j) => j.filter(id => id !== 'Advanced Systems')), 12000)
      }
      if (state.formulaDiscovered('detonation') && !prev.formulaDiscovered('detonation')) {
        setJustUnlocked((prev) => [...prev, 'detonation'])
        setTimeout(() => {
          setOpen(true)
          setActiveCategory('Combat')
          setStaggerPhase('entering')
          sounds.menuOpen()
          setTimeout(() => setStaggerPhase('idle'), 1500)
        }, 2500)
        setTimeout(() => setJustUnlocked((j) => j.filter(id => id !== 'detonation')), 12000)
      }
      if (state.formulaDiscovered('crystallization') && !prev.formulaDiscovered('crystallization')) {
        setJustUnlocked((prev) => [...prev, 'crystallization'])
        setTimeout(() => {
          setOpen(true)
          setActiveCategory('Progression')
          setStaggerPhase('entering')
          sounds.menuOpen()
          setTimeout(() => setStaggerPhase('idle'), 1500)
        }, 2500)
        setTimeout(() => setJustUnlocked((j) => j.filter(id => id !== 'crystallization')), 12000)
      }

    })
    return unsub
  }, [hasEnteredGame, sounds])

  // Panel toggle functions
  const togglePanel = useCallback((panelId: string) => {
    window.dispatchEvent(new CustomEvent('toggle-panel', { detail: { id: panelId } }))
    setOpen(false)
    setActiveCategory(null)
  }, [])

  // ── Unlock helpers ─────────────────────────────────

  const hasRaw = () => useStore.getState().inventory.raw >= 1
  const hasVapour = () => useStore.getState().inventory.vapour >= 1
  const hasLiquid = () => useStore.getState().inventory.liquid >= 1
  const hasRenown = (min: number) => () => useStore.getState().inventory.renown >= min
  const hasBlocks = (min: number) => () => Object.keys(useStore.getState().blocks).length >= min
  const hasFormula = (id: FormulaId) => () => useStore.getState().formulaDiscovered(id)
  const hasExplosions = (min: number) => () => useStore.getState().totalExplosions >= min
  const hasBlocksPlaced = (min: number) => () => useStore.getState().totalBlocksPlaced >= min
  const showAdvanced = () => useStore.getState().showAdvancedHUD

  // ── All items with progression gates ────────────────

  const ALL_ITEMS: { id: string; label: string; icon: string; shortcut?: string; category: string; color: string; tier: number; unlockCondition: () => boolean; unlockHint: string; action: () => void }[] = [
    // ── Tier 0: Always available ──
    { id: 'refine', label: 'Refine', icon: '⟡', shortcut: 'R', category: 'Core', color: '#44ffcc', tier: 0, unlockCondition: hasRaw, unlockHint: 'Harvest some Epoch first', action: () => togglePanel('refinePanel') },
    { id: 'inventory', label: 'Inventory', icon: '≡', category: 'Core', color: '#44ffcc', tier: 0, unlockCondition: () => true, unlockHint: '', action: () => togglePanel('invOverhaul') },

    // ── Tier 1: After first refine ──
    { id: 'exchange', label: 'Trade', icon: '⇄', category: 'Economy', color: '#facc15', tier: 1, unlockCondition: hasVapour, unlockHint: 'Refine some Chrono blocks first', action: () => togglePanel('exchange') },
    { id: 'alchemy', label: 'Alchemy', icon: '⚗', category: 'Economy', color: '#facc15', tier: 1, unlockCondition: hasVapour, unlockHint: 'Refine some Chrono blocks first', action: () => togglePanel('alchemy') },
    { id: 'crafting', label: 'Crafting', icon: '⚒', category: 'Economy', color: '#facc15', tier: 1, unlockCondition: hasVapour, unlockHint: 'Refine some Chrono blocks first', action: () => togglePanel('craftingOverhaul') },
    { id: 'bounty', label: 'Bounties', icon: '⚔', category: 'Combat', color: '#ff4466', tier: 1, unlockCondition: hasVapour, unlockHint: 'Refine some Chrono blocks first', action: () => togglePanel('bounty') },
    { id: 'lab', label: 'Research Lab', icon: '🔬', category: 'Progression', color: '#aa88ff', tier: 1, unlockCondition: hasVapour, unlockHint: 'Visit the Lab in-game', action: () => togglePanel('research') },
    { id: 'compendium', label: 'Formula Guide', icon: '📖', category: 'Progression', color: '#aa88ff', tier: 1, unlockCondition: hasVapour, unlockHint: 'Discover formulas to learn more', action: () => useStore.getState().setCompendiumOpen(true) },
    { id: 'achievements', label: 'Achievements', icon: '🏆', category: 'Progression', color: '#aa88ff', tier: 1, unlockCondition: hasVapour, unlockHint: 'Start your journey', action: () => useStore.getState().setAchievementPanelOpen(true) },
    { id: 'bank', label: 'Time Bank', icon: '⏳', category: 'Economy', color: '#facc15', tier: 1, unlockCondition: hasLiquid, unlockHint: 'Craft Liquid Epoch to invest', action: () => togglePanel('bank') },

    // ── Tier 2: After formula discovery or 10 blocks ──
    { id: 'forge', label: 'Chrono Forge', icon: '🔥', category: 'Economy', color: '#facc15', tier: 2, unlockCondition: hasFormula('detonation'), unlockHint: 'Discover the Detonation formula', action: () => togglePanel('chronoForge') },
    { id: 'industry', label: 'Industry', icon: '⚙', category: 'Economy', color: '#facc15', tier: 2, unlockCondition: showAdvanced, unlockHint: 'Place 10 blocks or discover a formula', action: () => togglePanel('industry') },
    { id: 'estate', label: 'Real Estate', icon: '🏠', category: 'Economy', color: '#facc15', tier: 2, unlockCondition: hasRenown(10), unlockHint: 'Earn 10 Renown', action: () => togglePanel('estate') },
    { id: 'ceo', label: 'CEO Office', icon: '✦', category: 'Economy', color: '#facc15', tier: 2, unlockCondition: hasRenown(20), unlockHint: 'Earn 20 Renown', action: () => togglePanel('ceo') },
    { id: 'auction', label: 'Auction', icon: '◆', category: 'Economy', color: '#facc15', tier: 2, unlockCondition: hasRenown(15), unlockHint: 'Earn 15 Renown', action: () => togglePanel('auction') },
    { id: 'insurance', label: 'Insurance', icon: '◈', category: 'Economy', color: '#facc15', tier: 2, unlockCondition: hasBlocks(5), unlockHint: 'Place 5 blocks', action: () => togglePanel('insurance') },
    { id: 'bestiary', label: 'Bestiary', icon: '✕', category: 'Combat', color: '#ff4466', tier: 2, unlockCondition: hasExplosions(1), unlockHint: 'Trigger an explosion', action: () => togglePanel('bestiary') },
    { id: 'arena', label: 'Arena', icon: '✦', category: 'Combat', color: '#ff4466', tier: 2, unlockCondition: showAdvanced, unlockHint: 'Place 10 blocks or discover a formula', action: () => togglePanel('arena') },
    { id: 'talents', label: 'Talents', icon: '⏫', category: 'Combat', color: '#ff4466', tier: 2, unlockCondition: showAdvanced, unlockHint: 'Place 10 blocks or discover a formula', action: () => togglePanel('talents') },
    { id: 'skills', label: 'Skill Tree', icon: '🌳', category: 'Combat', color: '#ff4466', tier: 2, unlockCondition: showAdvanced, unlockHint: 'Place 10 blocks or discover a formula', action: () => togglePanel('passiveTree') },
    { id: 'ascension', label: 'Ascension', icon: '⏫', category: 'Progression', color: '#aa88ff', tier: 2, unlockCondition: hasFormula('crystallization'), unlockHint: 'Discover Crystallization formula', action: () => togglePanel('ascension') },
    { id: 'blueprints', label: 'Blueprints', icon: '⬡', category: 'Progression', color: '#aa88ff', tier: 2, unlockCondition: hasBlocksPlaced(5), unlockHint: 'Place 5 blocks', action: () => togglePanel('building') },
    { id: 'enchanting', label: 'Enchanting', icon: '✨', category: 'Progression', color: '#aa88ff', tier: 2, unlockCondition: hasLiquid, unlockHint: 'Craft Liquid Epoch', action: () => togglePanel('enchanting') },
    { id: 'relics', label: 'Relic Forge', icon: '◇', category: 'Progression', color: '#aa88ff', tier: 2, unlockCondition: showAdvanced, unlockHint: 'Place 10 blocks or discover a formula', action: () => togglePanel('relicForge') },

    // ── Tier 3: After detonation or 50 renown ──
    { id: 'expeditions', label: 'Expeditions', icon: '⟐', category: 'Features', color: '#44aaff', tier: 3, unlockCondition: hasFormula('detonation'), unlockHint: 'Discover the Detonation formula', action: () => togglePanel('expedition') },
    { id: 'mounts', label: 'Mounts', icon: '🐴', category: 'Features', color: '#44aaff', tier: 3, unlockCondition: hasRenown(30), unlockHint: 'Earn 30 Renown', action: () => togglePanel('mounts') },
    { id: 'library', label: 'Time Library', icon: '📚', category: 'Features', color: '#44aaff', tier: 3, unlockCondition: hasFormula('detonation'), unlockHint: 'Discover the Detonation formula', action: () => togglePanel('library') },
    { id: 'gates', label: 'Dimensional Gates', icon: '◈', category: 'Features', color: '#44aaff', tier: 3, unlockCondition: hasFormula('crystallization'), unlockHint: 'Discover Crystallization formula', action: () => togglePanel('dimensionalGates') },
    { id: 'territories', label: 'Territories', icon: '⊞', category: 'Features', color: '#44aaff', tier: 3, unlockCondition: hasRenown(25), unlockHint: 'Earn 25 Renown', action: () => togglePanel('territories') },
    { id: 'raids', label: 'Raids', icon: '⚔', category: 'Features', color: '#44aaff', tier: 3, unlockCondition: hasExplosions(5), unlockHint: 'Trigger 5 explosions', action: () => togglePanel('raids') },
    { id: 'calendar', label: 'Event Calendar', icon: '📅', category: 'Features', color: '#44aaff', tier: 3, unlockCondition: hasRenown(50), unlockHint: 'Earn 50 Renown', action: () => togglePanel('calendar') },
    { id: 'prophecy', label: 'Prophecy', icon: '🔮', category: 'Features', color: '#44aaff', tier: 3, unlockCondition: hasFormula('crystallization'), unlockHint: 'Discover Crystallization formula', action: () => togglePanel('temporalProphecy') },
    { id: 'companions', label: 'Companions', icon: '◆', category: 'Features', color: '#44aaff', tier: 3, unlockCondition: hasRenown(40), unlockHint: 'Earn 40 Renown', action: () => togglePanel('companion') },
    { id: 'fusion', label: 'Companion Fusion', icon: '⟐', category: 'Features', color: '#44aaff', tier: 3, unlockCondition: hasRenown(60), unlockHint: 'Earn 60 Renown', action: () => togglePanel('companionFusion') },
    { id: 'genetics', label: 'Chrono Genetics', icon: '🧬', category: 'Features', color: '#44aaff', tier: 3, unlockCondition: hasFormula('timelineEcho'), unlockHint: 'Discover Timeline Echo formula', action: () => togglePanel('chronoGenetics') },
    { id: 'parallel', label: 'Parallel Selves', icon: '⟐', category: 'Features', color: '#44aaff', tier: 3, unlockCondition: hasFormula('timelineEcho'), unlockHint: 'Discover Timeline Echo formula', action: () => togglePanel('parallelSelves') },
    { id: 'megastructures', label: 'Mega Structures', icon: '⬡', category: 'Features', color: '#44aaff', tier: 3, unlockCondition: hasBlocksPlaced(50), unlockHint: 'Place 50 blocks', action: () => togglePanel('megaStructures') },
    { id: 'constructs', label: 'Automation', icon: '⚙', category: 'Features', color: '#44aaff', tier: 3, unlockCondition: hasFormula('detonation'), unlockHint: 'Discover the Detonation formula', action: () => togglePanel('construct') },
    { id: 'outposts', label: 'Outposts', icon: '⊡', category: 'Features', color: '#44aaff', tier: 3, unlockCondition: hasBlocksPlaced(20), unlockHint: 'Place 20 blocks', action: () => togglePanel('outpost') },
    { id: 'chronovate', label: 'Chronovate AI', icon: '◆', category: 'Features', color: '#44aaff', tier: 3, unlockCondition: hasFormula('detonation'), unlockHint: 'Discover the Detonation formula', action: () => togglePanel('chronovate') },
    { id: 'evolution', label: 'Evolution', icon: '🧬', category: 'Features', color: '#44aaff', tier: 3, unlockCondition: hasFormula('crystallization'), unlockHint: 'Discover Crystallization formula', action: () => togglePanel('evolutionDashboard') },
    { id: 'infinite', label: 'Infinite Prog.', icon: '∞', category: 'Features', color: '#44aaff', tier: 3, unlockCondition: hasFormula('detonation'), unlockHint: 'Discover the Detonation formula', action: () => togglePanel('infiniteProgression') },
    { id: 'lore', label: 'Lore', icon: '📜', category: 'Features', color: '#44aaff', tier: 3, unlockCondition: hasFormula('crystallization'), unlockHint: 'Discover Crystallization formula', action: () => togglePanel('lore') },
    { id: 'casino', label: 'Casino', icon: '🎲', category: 'Features', color: '#44aaff', tier: 3, unlockCondition: hasRenown(100), unlockHint: 'Earn 100 Renown', action: () => togglePanel('casino') },
    { id: 'dragRace', label: 'Drag Race', icon: '🏁', category: 'Features', color: '#44aaff', tier: 3, unlockCondition: hasFormula('detonation'), unlockHint: 'Discover the Detonation formula', action: () => togglePanel('dragRace') },
    { id: 'gangs', label: 'Gangs', icon: '⚔', category: 'Features', color: '#44aaff', tier: 3, unlockCondition: hasExplosions(3), unlockHint: 'Trigger 3 explosions', action: () => togglePanel('gangHideout') },
    { id: 'autoPrestige', label: 'Auto Prestige', icon: '⏳', category: 'Features', color: '#44aaff', tier: 3, unlockCondition: hasFormula('timelineEcho'), unlockHint: 'Discover Timeline Echo formula', action: () => togglePanel('autoPrestige') },
    { id: 'llm', label: 'AI Config', icon: '◆', category: 'Features', color: '#44aaff', tier: 3, unlockCondition: hasFormula('detonation'), unlockHint: 'Discover the Detonation formula', action: () => togglePanel('llmConfig') },
  ]

  // ── Build sections ──────────────────────────────────

  const currentTier = getCurrentTier()
  const tierLabel = currentTier === 0 ? 'Getting Started' : currentTier === 1 ? 'Early Game' : currentTier === 2 ? 'Mid Game' : 'Late Game'

  const sections: HubSection[] = [
    {
      title: 'Core',
      color: '#44ffcc',
      tier: 0,
      items: ALL_ITEMS.filter(i => i.category === 'Core'),
    },
    {
      title: 'Economy',
      color: '#facc15',
      tier: 1,
      items: ALL_ITEMS.filter(i => i.category === 'Economy'),
    },
    {
      title: 'Combat',
      color: '#ff4466',
      tier: 1,
      items: ALL_ITEMS.filter(i => i.category === 'Combat'),
    },
    {
      title: 'Progression',
      color: '#aa88ff',
      tier: 1,
      items: ALL_ITEMS.filter(i => i.category === 'Progression'),
    },
    {
      title: 'Features',
      color: '#44aaff',
      tier: 3,
      items: ALL_ITEMS.filter(i => i.category === 'Features'),
    },
  ]

  // Filter items: show unlocked + locked items that are within reach (<= currentTier + 1)
  const visibleSections = sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        const unlocked = item.unlockCondition()
        // Always show unlocked items
        if (unlocked) return true
        // Show locked items that are within 1 tier of current
        if (item.tier <= currentTier + 1) return true
        // Don't show items far above your level
        return false
      }),
    }))
    .filter((section) => section.items.length > 0)

  const allItems = visibleSections.flatMap((s) => s.items)
  const displayedItems = activeCategory
    ? visibleSections.find((s) => s.title === activeCategory)?.items ?? []
    : allItems
  const activeSection = activeCategory
    ? visibleSections.find((s) => s.title === activeCategory)
    : null

  // Count unlocks available vs total
  const unlockedCount = allItems.filter(i => i.unlockCondition()).length
  const totalVisible = allItems.length

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[80] backdrop-blur-sm"
        onClick={() => { setOpen(false); setActiveCategory(null) }}
      />

      {/* Hub panel */}
      <div
        className="fixed z-[81] inset-0 flex items-center justify-center pointer-events-none"
        style={{ animation: 'hub-enter 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <div className="pointer-events-auto w-full max-w-lg mx-4">
          {/* Header with tier badge */}
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-950/70 backdrop-blur-sm border border-gray-800/30">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
              <span className="text-gray-400 text-[10px] font-mono tracking-[0.2em] uppercase">
                Game Menu
              </span>
              <span className="text-gray-600 text-[10px] font-mono">
                Tab · Esc to close
              </span>
            </div>
            {/* Progression tier badge */}
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-900/60 border border-gray-800/40">
              <span className="text-[9px] font-mono tracking-wider text-gray-500">
                {tierLabel}
              </span>
              <span className="text-[8px] font-mono text-gray-600">
                {unlockedCount}/{totalVisible} systems
              </span>
              <div className="w-16 h-1 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(unlockedCount / Math.max(totalVisible, 1)) * 100}%`,
                    backgroundColor: currentTier >= 3 ? '#44ffcc' : currentTier >= 2 ? '#aa88ff' : currentTier >= 1 ? '#facc15' : '#44aaff',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 justify-center flex-wrap">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-3 py-1 rounded-full text-[10px] font-mono tracking-wider transition-all ${
                !activeCategory
                  ? 'bg-teal-900/40 text-teal-400 border border-teal-500/20'
                  : 'text-gray-500 hover:text-gray-300 border border-transparent'
              }`}
            >
              All
            </button>
            {visibleSections.map((section) => (
              <button
                key={section.title}
                onClick={() => setActiveCategory(section.title)}
                className={`px-3 py-1 rounded-full text-[10px] font-mono tracking-wider transition-all ${
                  activeCategory === section.title
                    ? 'bg-gray-800/60 text-white border border-gray-700/50'
                    : 'text-gray-500 hover:text-gray-300 border border-transparent'
                }`}
                style={activeCategory === section.title ? { borderColor: `${section.color}44` } : {}}
              >
                {section.title}
              </button>
            ))}
          </div>

          {/* Items grid */}
          <div
            className="bg-gray-900/90 backdrop-blur-xl border border-gray-800/50 rounded-xl overflow-hidden shadow-2xl"
            style={{ maxHeight: '60vh' }}
          >
            {activeSection && (
              <div className="px-4 pt-3 pb-1 border-b border-gray-800/30 flex items-center justify-between">
                <h3 className="text-xs font-bold tracking-wider" style={{ color: activeSection.color }}>
                  {activeSection.title}
                </h3>
                <span className="text-[8px] font-mono text-gray-600">
                  {activeSection.items.filter(i => i.unlockCondition()).length}/{activeSection.items.length}
                </span>
              </div>
            )}

            <div className="p-3 grid grid-cols-4 gap-1.5 overflow-y-auto" style={{ maxHeight: '55vh' }}>
              {displayedItems.map((item, index) => {
                const unlocked = item.unlockCondition()
                const isNew = justUnlocked.includes(item.id) || justUnlocked.includes(item.category)

                return (
                  <button
                    key={item.id}
                    onClick={unlocked ? item.action : undefined}
                    disabled={!unlocked}
                    className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg transition-all duration-150 group relative ${
                      unlocked
                        ? isNew
                          ? 'bg-teal-900/20 border border-teal-500/20 cursor-pointer hover:bg-gray-800/60 active:scale-95'
                          : 'cursor-pointer hover:bg-gray-800/60 active:scale-95'
                        : 'cursor-default opacity-40'
                    }`}
                    style={{
                      animation: staggerPhase === 'entering' ? `item-stagger 0.35s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.025}s both` : undefined,
                    }}
                    title={!unlocked ? item.unlockHint : ''}
                  >
                    {/* Newly unlocked glow — bigger and more vibrant */}
                    {isNew && unlocked && (
                      <>
                        <div
                          className="absolute inset-0 rounded-lg pointer-events-none"
                          style={{
                            boxShadow: 'inset 0 0 20px rgba(68,255,204,0.2), 0 0 15px rgba(68,255,204,0.1)',
                            animation: 'new-unlock-pulse 1.5s ease-in-out infinite',
                          }}
                        />
                        {/* Top accent line */}
                        <div
                          className="absolute left-2 right-2 top-0 h-0.5 rounded-full pointer-events-none"
                          style={{
                            background: 'linear-gradient(90deg, transparent, #44ffcc, transparent)',
                            animation: 'new-unlock-sweep 2s ease-in-out infinite',
                          }}
                        />
                        {/* New badge */}
                        <span
                          className="absolute -top-1 -right-1 w-2 h-2 rounded-full pointer-events-none"
                          style={{
                            background: '#44ffcc',
                            boxShadow: '0 0 8px #44ffcc',
                            animation: 'new-unlock-dot 1s ease-in-out infinite',
                          }}
                        />
                      </>
                    )}
                    <span
                      className={`text-lg transition-all duration-150 ${unlocked ? 'group-hover:scale-125 group-hover:-translate-y-0.5' : ''}`}
                      style={{
                        color: unlocked ? (activeSection?.color ?? '#88aacc') : 'rgba(255,255,255,0.2)',
                        filter: isNew ? 'brightness(1.4)' : undefined,
                      }}
                    >
                      {item.icon}
                    </span>
                    <span className="text-[9px] font-mono text-center leading-tight transition-colors"
                      style={{ color: unlocked ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)' }}
                    >
                      {item.label}
                    </span>
                    {unlocked && item.shortcut && (
                      <span className="text-[7px] text-gray-600 font-mono">[{item.shortcut}]</span>
                    )}
                    {!unlocked && (
                      <span className="text-[6px] text-gray-600 font-mono leading-tight text-center mt-0.5 px-1">
                        {item.unlockHint}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Footer with essentials + next unlock hint */}
            <div className="px-4 py-2.5 border-t border-gray-800/30">
              {/* Essential controls */}
              <div className="flex flex-wrap gap-2 justify-center mb-2">
                <span className="text-[8px] text-gray-600 font-mono tracking-wider">
                  <kbd className="bg-gray-800 text-gray-500 px-1 rounded text-[7px]">WASD</kbd> Move
                </span>
                <span className="text-[8px] text-gray-600 font-mono tracking-wider">
                  <kbd className="bg-gray-800 text-gray-500 px-1 rounded text-[7px]">Click</kbd> Interact
                </span>
                <span className="text-[8px] text-gray-600 font-mono tracking-wider">
                  <kbd className="bg-gray-800 text-gray-500 px-1 rounded text-[7px]">R</kbd> Refine
                </span>
                <span className="text-[8px] text-gray-600 font-mono tracking-wider">
                  <kbd className="bg-gray-800 text-gray-500 px-1 rounded text-[7px]">H</kbd> Heal
                </span>
                <span className="text-[8px] text-gray-600 font-mono tracking-wider">
                  <kbd className="bg-gray-800 text-gray-500 px-1 rounded text-[7px]">1-2</kbd> Blocks
                </span>
              </div>

              {/* Next unlock hint */}
              {unlockedCount < totalVisible && (() => {
                const nextLocked = allItems.find(i => !i.unlockCondition())
                if (!nextLocked) return null
                return (
                  <div className="text-center">
                    <span className="text-[8px] font-mono text-gray-600">
                      Next: <span style={{ color: '#44ffcc' }}>{nextLocked.unlockHint}</span>
                    </span>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes hub-enter {
          0% { opacity: 0; transform: scale(0.95) translateY(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes item-stagger {
          0% { opacity: 0; transform: translateY(12px) scale(0.9); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes new-unlock-pulse {
          0%, 100% { box-shadow: inset 0 0 20px rgba(68,255,204,0.2), 0 0 15px rgba(68,255,204,0.1); }
          50% { box-shadow: inset 0 0 30px rgba(68,255,204,0.35), 0 0 25px rgba(68,255,204,0.18); }
        }
        @keyframes new-unlock-sweep {
          0% { opacity: 0; transform: scaleX(0.3); }
          50% { opacity: 0.8; transform: scaleX(1); }
          100% { opacity: 0; transform: scaleX(0.3); }
        }
        @keyframes new-unlock-dot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.6; }
        }
      `}</style>
    </>
  )
}
