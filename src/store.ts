import { create } from 'zustand'
import { CAPACITY, DECAY_CONFIG, BLOCK_COST, BLOCK_REFUND_RATE, VAPOUR_BLOCK_DECAY_MS, EXPLOSION_RADIUS, EXPLOSION_RADIUS_FOCUSED, CASCADE_CHANCE, LIQUID_TO_RENOWN_RATE, CRYSTAL_TO_RENOWN_RATE, BLOCK_COLOR_PALETTE } from './config/constants'
import type { ChallengeType } from './config/constants'
import { triggerShake } from './hooks/useScreenShake'
import { getPrestigeCapacityBonus, getPrestigeHarvestBonus } from './components/PrestigeSystem'

// ── Types ───────────────────────────────────────────────

export type TimeState = 'raw' | 'vapour' | 'liquid' | 'crystal'
export type BlockType = 'vapour' | 'crystal'
export type FormulaId = 'crystallization' | 'detonation' | 'timelineEcho'

export interface TimeInventory {
  raw: number
  vapour: number
  liquid: number
  crystal: number
  renown: number
  shards?: number
}

export interface BlockData {
  id: string                     // "x,y,z"
  type: BlockType
  placedAt: number               // timestamp ms
  decayDeadline: number | null   // ms timestamp when it despawns, null for crystal
  ownerId: string
}

export type WorldBlockMap = Record<string, BlockData>

export interface FormulaProgress {
  id: FormulaId
  discovered: boolean
  hitsRequired: number
  hitsLanded: number
}

export interface NPCData {
  id: string
  position: [number, number, number]
  vitality: number               // 0-100
  lastHealedAt: number | null
}

// ── Upgrade types ───────────────────────────────────────

export type UpgradeId = 'capacityBoost' | 'haste' | 'magnitude' | 'endurance'

export interface PlayerUpgrades {
  capacityBoost: number  // level 0-5, +25 capacity per level
  haste: number          // level 0-5, +10% speed per level
  magnitude: number      // level 0-5, +5 harvest per level
  endurance: number      // level 0-5, -10% decay rate per level
}

// ── Shop items ──────────────────────────────────────────

export type ShopItemId = 'capacitySurge' | 'blockColorGold' | 'blockColorRuby' | 'blockColorSapphire' | 'blockColorEmerald' | 'blockColorAmethyst' | 'blockColorTopaz' | 'blockColorCoral' | 'blockColorSky' | 'blockColorMint' | 'blockColorRose' | 'blockColorObsidian' | 'blockColorIvory'

export interface ShopPurchases {
  capacitySurge: boolean
  blockColorGold: boolean
  blockColorRuby: boolean
  blockColorSapphire: boolean
  blockColorEmerald: boolean
  blockColorAmethyst: boolean
  blockColorTopaz: boolean
  blockColorCoral: boolean
  blockColorSky: boolean
  blockColorMint: boolean
  blockColorRose: boolean
  blockColorObsidian: boolean
  blockColorIvory: boolean
}

export const BLOCK_COLOR_MAP: Record<string, string> = {
  vapour: '#ffaa00',
  crystal: '#aa88ff',
}

// Build SHOP_BLOCK_COLORS from the central BLOCK_COLOR_PALETTE (excluding 'default')
export const SHOP_BLOCK_COLORS: Record<string, { vapour: string; crystal: string; label: string }> = {
  gold: BLOCK_COLOR_PALETTE.gold,
  ruby: BLOCK_COLOR_PALETTE.ruby,
  sapphire: BLOCK_COLOR_PALETTE.sapphire,
  emerald: BLOCK_COLOR_PALETTE.emerald,
  amethyst: BLOCK_COLOR_PALETTE.amethyst,
  topaz: BLOCK_COLOR_PALETTE.topaz,
  coral: BLOCK_COLOR_PALETTE.coral,
  sky: BLOCK_COLOR_PALETTE.sky,
  mint: BLOCK_COLOR_PALETTE.mint,
  rose: BLOCK_COLOR_PALETTE.rose,
  obsidian: BLOCK_COLOR_PALETTE.obsidian,
  ivory: BLOCK_COLOR_PALETTE.ivory,
}

// ── Phase 4: Selection & Blueprint types ──────────────

export interface SelectionBox {
  start: [number, number, number]
  end: [number, number, number]
}

export interface ClipboardBlock {
  pos: [number, number, number]
  type: BlockType
}

export interface Blueprint {
  id: string
  name: string
  blocks: ClipboardBlock[]
  created: number
}

// ── Phase 4: Explosion types ───────────────────────────
export type ExplosionType = 'standard' | 'focused' | 'cascade'

// ── Phase 4: Scorch mark ───────────────────────────────
export interface ScorchMark {
  id: number
  position: [number, number, number]
  createdAt: number
}

// ── Phase 5: Achievement data ──────────────────────────
export interface AchievementDef {
  id: string
  title: string
  description: string
  icon: string
  color: string
  category: string
  renownReward: number
  check: () => boolean
  unlocked: boolean
}

// ── Phase 5: Challenge rift state ──────────────────────
export interface ChallengeState {
  active: boolean
  type: ChallengeType | null
  startedAt: number
  progress: number
  target: number
  completed: boolean
  tempRiftPositions: [number, number, number][]
  tempRiftCollected: boolean[]
}

// ── Phase 5: Time trial state ──────────────────────────
export interface TimeTrialState {
  active: boolean
  startedAt: number
  elapsed: number
}

// ── Market state ────────────────────────────────────────

export interface MarketState {
  liquid: number     // 0.5 - 1.5 multiplier
  crystal: number    // 0.5 - 1.5 multiplier
  drift: number      // internal drift phase
}

// ── Time Bonds (staking) ────────────────────────────────

export interface TimeBond {
  id: string
  amount: number        // amount of raw time invested
  createdAt: number     // timestamp
  duration: number      // ms
  interestRate: number  // 0.0-1.0, return multiplier
  claimed: boolean
}

// ── Refine ratio map ────────────────────────────────────

const REFINE_RATIOS: Record<TimeState, number> = {
  raw: 1,
  vapour: 1,
  liquid: 2,
  crystal: 5,
}

// ── Interaction target ──────────────────────────────────

export interface InteractionTarget {
  prompt: string
  type: 'rift' | 'npc' | 'block' | 'lab' | 'trader' | 'shrine' | 'challenge' | 'wraith' | 'resource' | 'enemy' | 'questGiver' | 'exchange' | 'alchemy' | 'bounty' | 'insurance' | 'bank' | 'industry' | 'estate' | 'ceo' | 'auction'
  npcId?: string
  riftId?: string
  wraithId?: string
  healCost?: number
  isFollower?: boolean
  canGiftLiquid?: boolean
  canGiftCrystal?: boolean
  challengeType?: ChallengeType
  resourceAmount?: number
  enemyId?: string
  questId?: string
}

// ── Store shape ─────────────────────────────────────────

export interface GameState {
  inventory: TimeInventory
  blocks: WorldBlockMap
  formulas: FormulaProgress[]
  npcs: NPCData[]
  interactionTarget: InteractionTarget | null
  selectedBlockType: BlockType | null
  labOpen: boolean
  // New systems
  upgrades: PlayerUpgrades
  shopPurchases: ShopPurchases
  marketState: MarketState
  timeBonds: TimeBond[]
  selectedBlockColor: string | null
  proudestBuildSize: number
  proudestBuildBlockIds: string[]
  // Secrets
  hiddenChamberRevealed: boolean
  chronoCrystalClaimed: boolean
  devNpcFound: boolean
  shootingStarSeen: boolean

  // Derived
  formulaDiscovered: (id: FormulaId) => boolean
  getCurrentCapacity: (type: keyof typeof CAPACITY) => number
  getEffectiveDecayRate: (type: keyof typeof DECAY_CONFIG) => number
  getEffectiveHarvestAmount: () => number
  getUpgradeCost: (id: UpgradeId, level: number) => { raw?: number; vapour?: number; liquid?: number; crystal?: number }
  getCurrentLiquidRate: () => number
  getCurrentCrystalRate: () => number
  getPendingBondReturns: (index: number) => number

  // Anomaly state (set by TimeAnomaly component, read by decay loop)
  anomalyActive: string | null
  anomalyEndsAt: number | null
  anomalyDecayMultiplier: number

  // Refine VFX state (set by refine action, read by RefineVFX)
  lastRefineType: TimeState | null
  lastRefineTime: number

  hasEnteredGame: boolean
  showAdvancedHUD: boolean
  setShowAdvancedHUD: (v: boolean) => void

  // Block placement effect state
  lastPlacedBlock: { x: number; y: number; z: number; type: BlockType } | null
  lastPlacedBlockTime: number

  // Formula discovery celebration state
  lastDiscoveredFormula: string | null
  lastDiscoveredTime: number

  // Recently decayed blocks (for decay VFX)
  recentDecayedBlocks: { x: number; y: number; z: number }[]

  // Time Dilation state
  timeScale: number
  targetTimeScale: number

  // Day/Night cycle (set by DayNightCycle, read by environment/UI)
  dayFactor: number

  // Phase 2: Milestones & Tutorial & Compendium
  milestones: Record<string, boolean>
  tutorialStep: number  // -1 = dismissed, 0-3 = tutorial steps
  lastRenownMilestone: number  // highest renown threshold notified
  compendiumOpen: boolean
  pendingFormulaPanel: { id: string; discoveredAt: number } | null
  totalBlocksPlaced: number
  totalExplosions: number

  // Phase 4: Multi-block selection
  selectionBox: SelectionBox | null
  clipboard: ClipboardBlock[] | null
  blueprints: Blueprint[]

  // Phase 4: Enhanced explosions
  scorchMarks: ScorchMark[]
  lastExplosionType: ExplosionType
  lastExplosionSize: number // number of blocks destroyed

  // Phase 5: Achievements
  achievementDefs: AchievementDef[]
  achievementPanelOpen: boolean

  // Phase 5: Challenge rifts
  challengeState: ChallengeState
  challengeCooldowns: Record<string, number>

  // Phase 5: Time trial
  timeTrial: TimeTrialState
  bestTimeTrial: number | null // ms

  // Phase 5: New Game+
  newGamePlus: boolean
  newGamePlusUnlock: boolean // unlocked after discovering all formulas

  // Panel-open request (for DOM click handler to communicate with App.tsx)
  pendingOpenPanel: string | null
  requestOpenPanel: (panel: string) => void

  // Phase 4 actions
  setSelectionBox: (box: SelectionBox | null) => void
  copySelectionToClipboard: () => void
  pasteClipboard: (anchor: [number, number, number]) => boolean
  saveBlueprint: (name: string) => void
  loadBlueprint: (id: string) => boolean
  deleteBlueprint: (id: string) => void
  triggerExplosionType: (center: [number, number, number], type: ExplosionType) => string[]
  clearScorchMarks: () => void

  // Phase 5 actions
  initAchievementDefs: () => void
  checkAchievements: () => void
  setAchievementPanelOpen: (open: boolean) => void
  startChallenge: (type: ChallengeType) => void
  updateChallengeProgress: (amount: number) => void
  endChallenge: () => void
  startTimeTrial: () => void
  updateTimeTrial: (dt: number) => void
  endTimeTrial: () => void
  activateNewGamePlus: () => void
  checkNewGamePlusUnlock: () => void

  // Phase 2 actions
  unlockMilestone: (id: string) => void
  setTutorialStep: (step: number) => void
  dismissTutorial: () => void
  setCompendiumOpen: (open: boolean) => void
  dismissFormulaPanel: () => void
  recordBlockPlaced: () => void
  recordExplosion: () => void
  checkRenownMilestones: () => void

  // Actions
  addRaw: (amount: number) => void
  addRenown: (amount: number) => void
  refine: (to: TimeState, amount?: number) => boolean
  decayVapour: (dt: number) => void
  decayRaw: (dt: number) => void
  discoverFormula: (id: FormulaId) => void
  addHitToFormula: (id: FormulaId) => void
  setHasEnteredGame: (v: boolean) => void
  setInteractionTarget: (target: InteractionTarget | null) => void
  setSelectedBlockType: (type: BlockType | null) => void
  openLab: () => void
  closeLab: () => void
  placeBlock: (x: number, y: number, z: number, type: BlockType) => boolean
  removeBlock: (id: string) => boolean
  removeBlocks: (ids: string[]) => void
  cleanupExpiredBlocks: () => void
  triggerExplosion: (center: [number, number, number], radius?: number) => string[]
  tradeLiquidForRenown: (amount?: number) => boolean
  tradeCrystalForRenown: (amount?: number) => boolean
  setTimeScaleTarget: (target: number) => void
  setTimeScale: (scale: number) => void
  // New actions
  purchaseUpgrade: (id: UpgradeId) => boolean
  purchaseShopItem: (id: ShopItemId) => boolean
  recordTrade: (type: 'liquid' | 'crystal') => void
  tickMarket: (dt: number) => void
  createBond: (amount: number, duration: number) => boolean
  claimBond: (index: number) => void
  setSelectedBlockColor: (color: string | null) => void
  recordProudestBuild: () => void
  claimChronoCrystal: () => void
  revealHiddenChamber: () => void
}

// ── Helper ──────────────────────────────────────────────

const clamp = (value: number, max: number) => Math.min(Math.max(0, value), max)

// ── Initial formulas ────────────────────────────────────

const INITIAL_FORMULAS: FormulaProgress[] = [
  { id: 'crystallization', discovered: false, hitsRequired: 3, hitsLanded: 0 },
  { id: 'detonation', discovered: false, hitsRequired: 5, hitsLanded: 0 },
  { id: 'timelineEcho', discovered: false, hitsRequired: 5, hitsLanded: 0 },
]

// ── Upgrade costs ───────────────────────────────────────
// Costs increase per level: base * level * multiplier

function getUpgradeCost(id: UpgradeId, level: number): { raw?: number; vapour?: number; liquid?: number; crystal?: number } {
  const costs: Record<UpgradeId, (lvl: number) => { raw?: number; vapour?: number; liquid?: number; crystal?: number }> = {
    capacityBoost: (lvl) => ({ raw: 25 * lvl }),
    haste: (lvl) => ({ vapour: 15 * lvl }),
    magnitude: (lvl) => ({ liquid: 10 * lvl }),
    endurance: (lvl) => ({ crystal: 5 * lvl }),
  }
  return costs[id](level)
}

// ── Store ───────────────────────────────────────────────

export const useStore = create<GameState>()((set, get) => ({
  inventory: { raw: 0, vapour: 0, liquid: 0, crystal: 0, renown: 0 },
  blocks: {},
  formulas: INITIAL_FORMULAS,
  npcs: [],
  interactionTarget: null,
  selectedBlockType: null,
  labOpen: false,
  upgrades: { capacityBoost: 0, haste: 0, magnitude: 0, endurance: 0 },
  shopPurchases: { capacitySurge: false, blockColorGold: false, blockColorRuby: false, blockColorSapphire: false, blockColorEmerald: false, blockColorAmethyst: false, blockColorTopaz: false, blockColorCoral: false, blockColorSky: false, blockColorMint: false, blockColorRose: false, blockColorObsidian: false, blockColorIvory: false },
  marketState: { liquid: 1.0, crystal: 1.0, drift: 0 },
  timeBonds: [],
  selectionBox: null,
  clipboard: null,
  blueprints: [],
  scorchMarks: [],
  lastExplosionType: 'standard',
  lastExplosionSize: 0,
  achievementDefs: [],
  achievementPanelOpen: false,
  challengeState: { active: false, type: null, startedAt: 0, progress: 0, target: 0, completed: false, tempRiftPositions: [], tempRiftCollected: [] },
  challengeCooldowns: {},
  timeTrial: { active: false, startedAt: 0, elapsed: 0 },
  bestTimeTrial: null,
  newGamePlus: false,
  newGamePlusUnlock: false,
  selectedBlockColor: null,
  proudestBuildSize: 0,
  proudestBuildBlockIds: [],
  hiddenChamberRevealed: false,
  chronoCrystalClaimed: false,
  devNpcFound: false,
  shootingStarSeen: false,
  hasEnteredGame: false,
  showAdvancedHUD: false,
  anomalyActive: null,
  anomalyEndsAt: null,
  anomalyDecayMultiplier: 1,
  lastRefineType: null,
  lastRefineTime: 0,
  lastPlacedBlock: null,
  lastPlacedBlockTime: 0,
  lastDiscoveredFormula: null,
  lastDiscoveredTime: 0,
  recentDecayedBlocks: [],
  dayFactor: 1.0,
  timeScale: 1.0,
  targetTimeScale: 1.0,
  milestones: {},
  tutorialStep: 0, // 0 = fresh player, guides them through first actions
  lastRenownMilestone: 0,
  compendiumOpen: false,
  pendingOpenPanel: null,
  pendingFormulaPanel: null,
  totalBlocksPlaced: 0,
  totalExplosions: 0,

  // ── Derived ─────────────────────────────────────────

  formulaDiscovered: (id: FormulaId) => {
    return get().formulas.find((f) => f.id === id)?.discovered ?? false
  },

  getCurrentCapacity: (type: keyof typeof CAPACITY) => {
    const state = get()
    let cap: number = CAPACITY[type]
    cap += state.upgrades.capacityBoost * 25
    if (state.shopPurchases.capacitySurge) cap += 100
    cap = Math.round(cap * getPrestigeCapacityBonus())
    return cap
  },

  getEffectiveDecayRate: (type: keyof typeof DECAY_CONFIG) => {
    const state = get()
    const base = DECAY_CONFIG[type]
    if (base === 0) return 0
    const reduction = state.upgrades.endurance * 0.1
    return Math.max(0, base * (1 - reduction))
  },

  getEffectiveHarvestAmount: () => {
    const state = get()
    const base = 10
    const bonus = state.upgrades.magnitude * 5
    return Math.round((base + bonus) * getPrestigeHarvestBonus())
  },

  getUpgradeCost: (id: UpgradeId, level: number) => {
    return getUpgradeCost(id, level)
  },

  getCurrentLiquidRate: () => {
    const state = get()
    // Floor for more granular price movement
    return Math.floor(LIQUID_TO_RENOWN_RATE * state.marketState.liquid)
  },

  getCurrentCrystalRate: () => {
    const state = get()
    return Math.floor(CRYSTAL_TO_RENOWN_RATE * state.marketState.crystal)
  },

  getPendingBondReturns: (index: number) => {
    const state = get()
    const bond = state.timeBonds[index]
    if (!bond || bond.claimed) return 0
    const elapsed = Date.now() - bond.createdAt
    const matured = elapsed >= bond.duration
    if (!matured) return 0
    const returns = Math.floor(bond.amount * bond.interestRate)
    return returns
  },

  // ── Actions ─────────────────────────────────────────

  addRenown: (amount: number) => {
    set((state) => ({
      inventory: {
        ...state.inventory,
        renown: clamp(state.inventory.renown + amount, 9999),
      },
    }))
    get().checkRenownMilestones()
  },

  addRaw: (amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) return
    set((state) => ({
      inventory: {
        ...state.inventory,
        raw: clamp(state.inventory.raw + amount, 9999),
      },
    }))
  },

  refine: (to: TimeState, amount: number = 1) => {
    const state = get()
    if (to === 'raw') return false
    if (amount <= 0) return false
    if (to === 'crystal' && !state.formulaDiscovered('crystallization')) {
      return false
    }

    const ratio = REFINE_RATIOS[to]
    if (!ratio || ratio <= 0) return false
    const cost = ratio * amount
    if (state.inventory.raw < cost) return false

    const cap = state.getCurrentCapacity(to as keyof typeof CAPACITY)

    set((s) => ({
      inventory: {
        ...s.inventory,
        raw: s.inventory.raw - cost,
        [to]: clamp(
          (s.inventory[to as keyof TimeInventory] as number) + amount,
          cap,
        ),
      },
    }))
    // Signal refine VFX
    set({ lastRefineType: to, lastRefineTime: Date.now() })
    return true
  },

  decayVapour: (dt: number) => {
    set((state) => {
      const effectiveRate = state.getEffectiveDecayRate('vapour')
      const cap = state.getCurrentCapacity('vapour')
      const drainRate = effectiveRate * cap
      return {
        inventory: {
          ...state.inventory,
          vapour: Math.max(0, state.inventory.vapour - drainRate * dt),
        },
      }
    })
  },

  decayRaw: (dt: number) => {
    set((state) => {
      const effectiveRate = state.getEffectiveDecayRate('raw')
      const cap = state.getCurrentCapacity('raw')
      const drainRate = effectiveRate * cap
      return {
        inventory: {
          ...state.inventory,
          raw: Math.max(0, state.inventory.raw - drainRate * dt),
        },
      }
    })
  },

  discoverFormula: (id: FormulaId) => {
    set((state) => ({
      formulas: state.formulas.map((f) =>
        f.id === id ? { ...f, discovered: true } : f,
      ),
      lastDiscoveredFormula: id,
      lastDiscoveredTime: Date.now(),
      pendingFormulaPanel: { id, discoveredAt: Date.now() },
    }))
    // Unlock related milestone
    get().unlockMilestone(`formula_${id}`)
    // Check if all formulas discovered → unlock New Game+
    get().checkNewGamePlusUnlock()
  },

  addHitToFormula: (id: FormulaId) => {
    const formula = get().formulas.find((f) => f.id === id)
    if (!formula || formula.discovered) return

    const newHits = formula.hitsLanded + 1
    if (newHits >= formula.hitsRequired) {
      get().discoverFormula(id)
    } else {
      set((state) => ({
        formulas: state.formulas.map((f) =>
          f.id === id ? { ...f, hitsLanded: newHits } : f,
        ),
      }))
    }
  },

  setHasEnteredGame: (v: boolean) => {
    set({ hasEnteredGame: v })
  },
  setShowAdvancedHUD: (v: boolean) => {
    set({ showAdvancedHUD: v })
  },
  setInteractionTarget: (target: InteractionTarget | null) => {
    set({ interactionTarget: target })
  },

  setSelectedBlockType: (type: BlockType | null) => {
    set({ selectedBlockType: type })
  },

  openLab: () => set({ labOpen: true }),
  closeLab: () => set({ labOpen: false }),

  placeBlock: (x: number, y: number, z: number, type: BlockType) => {
    const state = get()
    const id = `${x},${y},${z}`

    if (state.blocks[id]) return false

    const cost = BLOCK_COST[type] ?? 5
    const resourceKey = type === 'vapour' ? 'vapour' as const : 'crystal' as const
    if (state.inventory[resourceKey] < cost) return false

    const now = Date.now()
    const block: BlockData = {
      id,
      type,
      placedAt: now,
      decayDeadline: type === 'vapour' ? now + VAPOUR_BLOCK_DECAY_MS : null,
      ownerId: 'player',
    }

    const centerX = x + 0.5
    const centerY = y + 0.5
    const centerZ = z + 0.5

    set((s) => ({
      blocks: { ...s.blocks, [id]: block },
      inventory: {
        ...s.inventory,
        [resourceKey]: Math.max(0, s.inventory[resourceKey] - cost),
      },
      lastPlacedBlock: { x: centerX, y: centerY, z: centerZ, type },
      lastPlacedBlockTime: Date.now(),
      totalBlocksPlaced: s.totalBlocksPlaced + 1,
    }))
    return true
  },

  removeBlock: (id: string) => {
    const state = get()
    const block = state.blocks[id]
    if (!block) return false

    const cost = BLOCK_COST[block.type] ?? 5
    const refund = Math.floor(cost * BLOCK_REFUND_RATE)
    const resourceKey = block.type === 'vapour' ? 'vapour' as const : 'crystal' as const

    const newBlocks = { ...state.blocks }
    delete newBlocks[id]

    set((s) => ({
      blocks: newBlocks,
      inventory: {
        ...s.inventory,
        [resourceKey]: s.inventory[resourceKey] + refund,
      },
    }))
    return true
  },

  removeBlocks: (ids: string[]) => {
    set((state) => {
      const newBlocks = { ...state.blocks }
      for (const id of ids) {
        delete newBlocks[id]
      }
      return { blocks: newBlocks }
    })
  },

  cleanupExpiredBlocks: () => {
    const state = get()
    const now = Date.now()
    const newBlocks = { ...state.blocks }
    const decayedPositions: { x: number; y: number; z: number }[] = []

    for (const [id, block] of Object.entries(newBlocks)) {
      if (block.decayDeadline !== null && now >= block.decayDeadline) {
        const [x, y, z] = id.split(',').map(Number)
        decayedPositions.push({ x: x + 0.5, y: y + 0.5, z: z + 0.5 })
        delete newBlocks[id]
      }
    }

    if (decayedPositions.length > 0) {
      set({ blocks: newBlocks, recentDecayedBlocks: decayedPositions })
      setTimeout(() => {
        set({ recentDecayedBlocks: [] })
      }, 500)
    }
  },

  triggerExplosion: (center: [number, number, number], radius: number = EXPLOSION_RADIUS) => {
    const state = get()
    const removed: string[] = []

    for (const key of Object.keys(state.blocks)) {
      const [x, y, z] = key.split(',').map(Number)
      const dist = Math.sqrt(
        (x - center[0]) ** 2 + (y - center[1]) ** 2 + (z - center[2]) ** 2,
      )
      if (dist <= radius) {
        removed.push(key)
      }
    }

    const newBlocks = { ...state.blocks }
    for (const key of removed) {
      delete newBlocks[key]
    }
    set((s) => ({
      blocks: newBlocks,
      totalExplosions: s.totalExplosions + 1,
    }))

    return removed
  },

  tradeLiquidForRenown: (amount: number = 1) => {
    const state = get()
    const rate = state.getCurrentLiquidRate()
    const cost = rate * amount
    if (state.inventory.liquid < cost) return false
    set((s) => ({
      inventory: {
        ...s.inventory,
        liquid: s.inventory.liquid - cost,
        renown: s.inventory.renown + amount,
      },
    }))
    get().recordTrade('liquid')
    get().checkRenownMilestones()
    return true
  },

  tradeCrystalForRenown: (amount: number = 1) => {
    const state = get()
    const rate = state.getCurrentCrystalRate()
    const cost = rate * amount
    if (state.inventory.crystal < cost) return false
    set((s) => ({
      inventory: {
        ...s.inventory,
        crystal: s.inventory.crystal - cost,
        renown: s.inventory.renown + amount,
      },
    }))
    get().recordTrade('crystal')
    get().checkRenownMilestones()
    return true
  },

  // ── New Actions ────────────────────────────────────

  purchaseUpgrade: (id: UpgradeId) => {
    const state = get()
    const currentLevel = state.upgrades[id]
    if (currentLevel >= 5) return false

    const cost = getUpgradeCost(id, currentLevel + 1)
    const inv = state.inventory

    // Check affordability
    if ((cost.raw && inv.raw < cost.raw) ||
        (cost.vapour && inv.vapour < cost.vapour) ||
        (cost.liquid && inv.liquid < cost.liquid) ||
        (cost.crystal && inv.crystal < cost.crystal)) {
      return false
    }

    // Deduct costs
    set((s) => ({
      inventory: {
        ...s.inventory,
        raw: cost.raw ? s.inventory.raw - cost.raw : s.inventory.raw,
        vapour: cost.vapour ? s.inventory.vapour - cost.vapour : s.inventory.vapour,
        liquid: cost.liquid ? s.inventory.liquid - cost.liquid : s.inventory.liquid,
        crystal: cost.crystal ? s.inventory.crystal - cost.crystal : s.inventory.crystal,
      },
      upgrades: {
        ...s.upgrades,
        [id]: currentLevel + 1,
      },
    }))
    return true
  },

  purchaseShopItem: (id: ShopItemId) => {
    const state = get()
    if (state.shopPurchases[id]) return false // already owned

    const costs: Record<ShopItemId, number> = {
      capacitySurge: 8,
      blockColorGold: 3,
      blockColorRuby: 3,
      blockColorSapphire: 3,
      blockColorEmerald: 3,
      blockColorAmethyst: 3,
      blockColorTopaz: 3,
      blockColorCoral: 3,
      blockColorSky: 3,
      blockColorMint: 3,
      blockColorRose: 3,
      blockColorObsidian: 3,
      blockColorIvory: 3,
    }

    const cost = costs[id]
    if (state.inventory.renown < cost) return false

    set((s) => ({
      inventory: {
        ...s.inventory,
        renown: s.inventory.renown - cost,
      },
      shopPurchases: {
        ...s.shopPurchases,
        [id]: true,
      },
    }))
    return true
  },

  recordTrade: (type: 'liquid' | 'crystal') => {
    set((state) => {
      const m = state.marketState
      // Supply increases → price drops slightly
      const newLiquid = type === 'liquid'
        ? Math.max(0.5, m.liquid - 0.05)
        : Math.min(1.5, m.liquid + 0.02)
      const newCrystal = type === 'crystal'
        ? Math.max(0.5, m.crystal - 0.05)
        : Math.min(1.5, m.crystal + 0.02)
      return {
        marketState: {
          ...m,
          liquid: newLiquid,
          crystal: newCrystal,
        },
      }
    })
  },

  tickMarket: (dt: number) => {
    set((state) => {
      const m = state.marketState
      const newDrift = m.drift + dt * 0.1
      // Slow oscillation toward equilibrium
      const liquidTarget = 1.0 + Math.sin(newDrift) * 0.2
      const crystalTarget = 1.0 + Math.cos(newDrift * 0.7) * 0.2
      const lerp = (a: number, b: number, t: number) => a + (b - a) * t
      return {
        marketState: {
          liquid: lerp(m.liquid, liquidTarget, dt * 0.05),
          crystal: lerp(m.crystal, crystalTarget, dt * 0.05),
          drift: newDrift,
        },
      }
    })
  },

  createBond: (amount: number, duration: number) => {
    const state = get()
    if (state.inventory.raw < amount) return false

    const bond: TimeBond = {
      id: `bond-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      amount,
      createdAt: Date.now(),
      duration,
      interestRate: duration <= 30000 ? 0.15 : duration <= 120000 ? 0.30 : 0.50,
      claimed: false,
    }

    set((s) => ({
      inventory: {
        ...s.inventory,
        raw: s.inventory.raw - amount,
      },
      timeBonds: [...s.timeBonds, bond],
    }))
    return true
  },

  claimBond: (index: number) => {
    const state = get()
    const bond = state.timeBonds[index]
    if (!bond || bond.claimed) return

    const elapsed = Date.now() - bond.createdAt
    if (elapsed < bond.duration) return

    const returns = Math.floor(bond.amount * bond.interestRate)

    const newBonds = [...state.timeBonds]
    newBonds[index] = { ...bond, claimed: true }

    set((s) => ({
      inventory: {
        ...s.inventory,
        raw: s.inventory.raw + returns,
      },
      timeBonds: newBonds,
    }))
  },

  // ── Panel-open request ────────────────────────────

  requestOpenPanel: (panel: string) => {
    set({ pendingOpenPanel: panel })
  },

  // ── Phase 2 Actions ──────────────────────────────

  unlockMilestone: (id: string) => {
    const state = get()
    if (state.milestones[id]) return
    set({ milestones: { ...state.milestones, [id]: true } })
  },

  setTutorialStep: (step: number) => {
    set({ tutorialStep: step })
  },

  dismissTutorial: () => {
    set({ tutorialStep: -1 })
  },

  setCompendiumOpen: (open: boolean) => {
    set({ compendiumOpen: open })
  },

  dismissFormulaPanel: () => {
    set({ pendingFormulaPanel: null })
  },

  recordBlockPlaced: () => {
    set((s) => ({ totalBlocksPlaced: s.totalBlocksPlaced + 1 }))
  },

  recordExplosion: () => {
    set((s) => ({ totalExplosions: s.totalExplosions + 1 }))
  },

  checkRenownMilestones: () => {
    const state = get()
    const renown = Math.floor(state.inventory.renown)
    const currentMilestone = state.lastRenownMilestone
    // Check every 10 renown threshold
    const nextMilestone = Math.floor(renown / 10) * 10
    if (nextMilestone > currentMilestone) {
      set({ lastRenownMilestone: nextMilestone })
    }
  },

  setSelectedBlockColor: (color: string | null) => {
    set({ selectedBlockColor: color })
  },

  recordProudestBuild: () => {
    const state = get()
    // Find tallest contiguous structure by scanning block columns
    const columnHeights: Record<string, number> = {}
    for (const key of Object.keys(state.blocks)) {
      const [x, y, z] = key.split(',').map(Number)
      const colKey = `${x},${z}`
      columnHeights[colKey] = Math.max(columnHeights[colKey] ?? 0, y + 1)
    }
    // Count total blocks in the structure
    const total = Object.keys(state.blocks).length
    if (total > state.proudestBuildSize) {
      set({
        proudestBuildSize: total,
        proudestBuildBlockIds: Object.keys(state.blocks).slice(0, 100),
      })
    }
  },

  claimChronoCrystal: () => {
    set({ chronoCrystalClaimed: true })
    // Award renown
    set((s) => ({
      inventory: { ...s.inventory, renown: s.inventory.renown + 10 },
    }))
  },

  revealHiddenChamber: () => {
    set({ hiddenChamberRevealed: true })
  },

  // ── Phase 4: Selection & Clipboard ────────────────

  setSelectionBox: (box) => set({ selectionBox: box }),

  copySelectionToClipboard: () => {
    const state = get()
    const box = state.selectionBox
    if (!box) return
    const minX = Math.min(box.start[0], box.end[0])
    const maxX = Math.max(box.start[0], box.end[0])
    const minY = Math.min(box.start[1], box.end[1])
    const maxY = Math.max(box.start[1], box.end[1])
    const minZ = Math.min(box.start[2], box.end[2])
    const maxZ = Math.max(box.start[2], box.end[2])

    const blocks: ClipboardBlock[] = []
    for (const key of Object.keys(state.blocks)) {
      const [x, y, z] = key.split(',').map(Number)
      if (x >= minX && x <= maxX && y >= minY && y <= maxY && z >= minZ && z <= maxZ) {
        blocks.push({ pos: [x - minX, y - minY, z - minZ], type: state.blocks[key].type })
      }
    }
    set({ clipboard: blocks.length > 0 ? blocks : null })
  },

  pasteClipboard: (anchor) => {
    const state = get()
    const clip = state.clipboard
    if (!clip || clip.length === 0) return false

    const [ax, ay, az] = anchor
    const newBlocks: WorldBlockMap = {}
    const invDelta: Partial<TimeInventory> = {}
    let placed = 0

    for (const block of clip) {
      const bx = ax + block.pos[0]
      const by = ay + block.pos[1]
      const bz = az + block.pos[2]
      const key = `${bx},${by},${bz}`
      if (state.blocks[key]) continue
      const cost = BLOCK_COST[block.type] ?? 5
      const resourceKey = block.type === 'vapour' ? 'vapour' as const : 'crystal' as const
      if (state.inventory[resourceKey] < cost) continue

      const now = Date.now()
      newBlocks[key] = {
        id: key,
        type: block.type,
        placedAt: now,
        decayDeadline: block.type === 'vapour' ? now + VAPOUR_BLOCK_DECAY_MS : null,
        ownerId: 'player',
      }
      invDelta[resourceKey] = (invDelta[resourceKey] ?? state.inventory[resourceKey]) - cost
      placed++
    }

    if (placed === 0) return false

    set((s) => ({
      blocks: { ...s.blocks, ...newBlocks },
      inventory: {
        ...s.inventory,
        vapour: (invDelta.vapour ?? s.inventory.vapour),
        crystal: (invDelta.crystal ?? s.inventory.crystal),
      },
      totalBlocksPlaced: s.totalBlocksPlaced + placed,
    }))
    return true
  },

  saveBlueprint: (name) => {
    const state = get()
    const box = state.selectionBox
    if (!box) return
    const minX = Math.min(box.start[0], box.end[0])
    const maxX = Math.max(box.start[0], box.end[0])
    const minY = Math.min(box.start[1], box.end[1])
    const maxY = Math.max(box.start[1], box.end[1])
    const minZ = Math.min(box.start[2], box.end[2])
    const maxZ = Math.max(box.start[2], box.end[2])

    const blocks: ClipboardBlock[] = []
    for (const key of Object.keys(state.blocks)) {
      const [x, y, z] = key.split(',').map(Number)
      if (x >= minX && x <= maxX && y >= minY && y <= maxY && z >= minZ && z <= maxZ) {
        blocks.push({ pos: [x - minX, y - minY, z - minZ], type: state.blocks[key].type })
      }
    }
    if (blocks.length === 0) return
    const bp: Blueprint = {
      id: `bp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      blocks,
      created: Date.now(),
    }
    set({ blueprints: [...state.blueprints, bp] })
    // Persist to localStorage
    try {
      const existing = JSON.parse(localStorage.getItem('chronoscape_blueprints') || '[]')
      existing.push(bp)
      localStorage.setItem('chronoscape_blueprints', JSON.stringify(existing))
    } catch (e) {
      console.error('[Blueprint save] localStorage error:', e)
    }
  },

  loadBlueprint: (id) => {
    const bp = get().blueprints.find((b) => b.id === id)
    if (!bp) return false
    set({ clipboard: bp.blocks })
    return true
  },

  deleteBlueprint: (id) => {
    set((s) => ({ blueprints: s.blueprints.filter((b) => b.id !== id) }))
    try {
      const existing = JSON.parse(localStorage.getItem('chronoscape_blueprints') || '[]')
      localStorage.setItem('chronoscape_blueprints', JSON.stringify((existing as { id: string }[]).filter((b) => b.id !== id)))
    } catch (e) {
      console.error('[Blueprint delete] localStorage error:', e)
    }
  },

  // ── Phase 4: Explosion types ───────────────────────

  triggerExplosionType: (center, type) => {
    const state = get()
    const radius = type === 'focused' ? EXPLOSION_RADIUS_FOCUSED : EXPLOSION_RADIUS
    const removed: string[] = []

    for (const key of Object.keys(state.blocks)) {
      const [x, y, z] = key.split(',').map(Number)
      const dist = Math.sqrt(
        (x - center[0]) ** 2 + (y - center[1]) ** 2 + (z - center[2]) ** 2,
      )
      if (dist <= radius) {
        removed.push(key)
      }
    }

    // Cascade: each destroyed block has CASCADE_CHANCE to explode adjacent
    let finalRemoved = [...removed]
    if (type === 'cascade') {
      const toCheck = [...removed]
      while (toCheck.length > 0) {
        const key = toCheck.shift()!
        const [cx, cy, cz] = key.split(',').map(Number)
        for (const dx of [-1, 0, 1]) {
          for (const dy of [-1, 0, 1]) {
            for (const dz of [-1, 0, 1]) {
              if (dx === 0 && dy === 0 && dz === 0) continue
              const adjKey = `${cx + dx},${cy + dy},${cz + dz}`
              if (finalRemoved.includes(adjKey)) continue
              if (state.blocks[adjKey] && Math.random() < CASCADE_CHANCE) {
                finalRemoved.push(adjKey)
                toCheck.push(adjKey)
              }
            }
          }
        }
      }
    }

    const newBlocks = { ...state.blocks }
    for (const key of finalRemoved) {
      delete newBlocks[key]
    }

    // Add scorch marks
    const now = Date.now()
    const marks: ScorchMark[] = []
    let markId = 0
    for (const key of finalRemoved.slice(0, 20)) {
      const [x, _y, z] = key.split(',').map(Number)
      marks.push({ id: markId++, position: [x + 0.5, 0.05, z + 0.5], createdAt: now })
    }

    // Scale shake by number of destroyed blocks
    triggerShake(Math.min(1, 0.3 + finalRemoved.length * 0.05), 5)

    set((s) => ({
      blocks: newBlocks,
      totalExplosions: s.totalExplosions + 1,
      lastExplosionType: type,
      lastExplosionSize: finalRemoved.length,
      scorchMarks: [...s.scorchMarks, ...marks],
    }))

    // Scorch marks fade after 10s
    setTimeout(() => {
      set((s) => ({ scorchMarks: s.scorchMarks.slice(marks.length) }))
    }, 10000)

    return finalRemoved
  },

  clearScorchMarks: () => set({ scorchMarks: [] }),

  // ── Phase 5: Achievements ──────────────────────────

  initAchievementDefs: () => {
    if (get().achievementDefs.length > 0) return
    // Restore saved unlocked state from localStorage
    let savedUnlocked: string[] = []
    try {
      const raw = localStorage.getItem('chronoscape_achievements')
      if (raw) savedUnlocked = JSON.parse(raw)
    } catch { /* ignore */ }
    const savedSet = new Set(savedUnlocked)

    const defs: AchievementDef[] = [
      // Harvesting
      { id: 'harvest_1', title: 'First Harvest', description: 'Harvest 10 Raw from a rift', icon: '⟐', color: '#ff8844', category: 'Harvesting', renownReward: 1, check: () => get().inventory.raw >= 10, unlocked: savedSet.has('harvest_1') },
      { id: 'harvest_50', title: 'Time Gatherer', description: 'Harvest 50 total Raw', icon: '⟐', color: '#ffaa44', category: 'Harvesting', renownReward: 2, check: () => get().inventory.raw >= 50, unlocked: savedSet.has('harvest_50') },
      // Refining
      { id: 'refine_vapour', title: 'First Refinement', description: 'Refine Raw into Vapour', icon: '⟡', color: '#ffaa00', category: 'Refining', renownReward: 1, check: () => get().inventory.vapour >= 5, unlocked: savedSet.has('refine_vapour') },
      { id: 'refine_liquid', title: 'Alchemist', description: 'Refine into Liquid', icon: '⟡', color: '#44ccff', category: 'Refining', renownReward: 2, check: () => get().inventory.liquid >= 5, unlocked: savedSet.has('refine_liquid') },
      { id: 'refine_crystal', title: 'Crystallization', description: 'Discover and use Crystal', icon: '◆', color: '#aa88ff', category: 'Refining', renownReward: 3, check: () => get().formulaDiscovered('crystallization'), unlocked: savedSet.has('refine_crystal') },
      { id: 'refine_100', title: 'Master Refiner', description: 'Refine 100 total units', icon: '⟡', color: '#ffdd44', category: 'Refining', renownReward: 3, check: () => get().inventory.raw + get().inventory.vapour + get().inventory.liquid + get().inventory.crystal >= 100, unlocked: savedSet.has('refine_100') },
      // Building
      { id: 'build_1', title: 'Architect', description: 'Place your first block', icon: '⬡', color: '#ffaa00', category: 'Building', renownReward: 1, check: () => get().totalBlocksPlaced >= 1, unlocked: savedSet.has('build_1') },
      { id: 'build_10', title: 'Builder', description: 'Place 10 blocks', icon: '⬡', color: '#ff8844', category: 'Building', renownReward: 2, check: () => Object.keys(get().blocks).length >= 10, unlocked: savedSet.has('build_10') },
      { id: 'build_50', title: 'Master Builder', description: 'Place 50 blocks', icon: '⬡', color: '#ff6644', category: 'Building', renownReward: 5, check: () => get().totalBlocksPlaced >= 50, unlocked: savedSet.has('build_50') },
      { id: 'build_tower', title: 'Skyscraper', description: 'Build a tower 5 blocks high', icon: '⬡', color: '#44aaff', category: 'Building', renownReward: 3, check: () => { const keys = Object.keys(get().blocks); return keys.length >= 1 && keys.some(k => Number(k.split(',')[1]) >= 4); }, unlocked: savedSet.has('build_tower') },
      // Destruction
      { id: 'detonate_1', title: 'Demolition Expert', description: 'Trigger your first explosion', icon: '💥', color: '#ff6644', category: 'Destruction', renownReward: 1, check: () => get().totalExplosions >= 1, unlocked: savedSet.has('detonate_1') },
      { id: 'detonate_10', title: 'Pyromaniac', description: 'Detonate 10 explosions', icon: '💥', color: '#ff4422', category: 'Destruction', renownReward: 3, check: () => get().totalExplosions >= 10, unlocked: savedSet.has('detonate_10') },
      { id: 'detonate_cascade', title: 'Chain Reaction', description: 'Trigger a cascade explosion', icon: '💥', color: '#ff2200', category: 'Destruction', renownReward: 5, check: () => get().lastExplosionType === 'cascade' && get().lastExplosionSize >= 5, unlocked: savedSet.has('detonate_cascade') },
      // Economy
      { id: 'trade_1', title: 'Merchant', description: 'Complete your first trade', icon: '⟐', color: '#ffcc44', category: 'Economy', renownReward: 1, check: () => get().inventory.renown >= 1, unlocked: savedSet.has('trade_1') },
      { id: 'renown_10', title: 'Time Dealer', description: 'Accumulate 10 Renown', icon: '◎', color: '#ffcc44', category: 'Economy', renownReward: 2, check: () => get().inventory.renown >= 10, unlocked: savedSet.has('renown_10') },
      { id: 'renown_30', title: 'Merchant Prince', description: 'Accumulate 30 Renown', icon: '✦', color: '#ffd700', category: 'Economy', renownReward: 5, check: () => get().inventory.renown >= 30, unlocked: savedSet.has('renown_30') },
      { id: 'renown_50', title: 'Market Maker', description: 'Accumulate 50 Renown', icon: '⟐', color: '#ffcc44', category: 'Economy', renownReward: 8, check: () => get().inventory.renown >= 50, unlocked: savedSet.has('renown_50') },
      { id: 'bond_1', title: 'Investor', description: 'Create a time bond', icon: '⏳', color: '#44ffaa', category: 'Economy', renownReward: 2, check: () => get().timeBonds.length >= 1, unlocked: savedSet.has('bond_1') },
      { id: 'shop_1', title: 'Shopkeeper', description: 'Buy from the Renown shop', icon: '✦', color: '#ffd700', category: 'Economy', renownReward: 2, check: () => Object.values(get().shopPurchases).some(Boolean), unlocked: savedSet.has('shop_1') },
      // Exploration
      { id: 'formula_all', title: 'Chronomancer', description: 'Discover all 3 formulas', icon: '✦', color: '#ff44ff', category: 'Exploration', renownReward: 10, check: () => get().formulas.every((f) => f.discovered), unlocked: savedSet.has('formula_all') },
      { id: 'upgrade_max', title: 'Time Lord', description: 'Max any shrine upgrade', icon: '⬡', color: '#ffdd44', category: 'Exploration', renownReward: 5, check: () => Object.values(get().upgrades).some((v) => v >= 5), unlocked: savedSet.has('upgrade_max') },
      { id: 'visit_lab', title: 'Scientist', description: 'Enter the Lab', icon: '🔬', color: '#aa88ff', category: 'Exploration', renownReward: 1, check: () => get().labOpen, unlocked: savedSet.has('visit_lab') },
      { id: 'new_game_plus', title: '⏳ Timeless', description: 'Start a New Game+', icon: '⏳', color: '#ff44ff', category: 'Exploration', renownReward: 15, check: () => get().newGamePlus, unlocked: savedSet.has('new_game_plus') },
      // Social
      { id: 'heal_1', title: 'Reverse the Clock', description: 'Heal a wounded NPC', icon: '💚', color: '#44ff88', category: 'Social', renownReward: 1, check: () => get().inventory.liquid >= 1, unlocked: savedSet.has('heal_1') },
      { id: 'follow_npc', title: 'Leader', description: 'Have an NPC follow you', icon: '🚶', color: '#44ffcc', category: 'Social', renownReward: 2, check: () => get().totalBlocksPlaced >= 1, unlocked: savedSet.has('follow_npc') },
      { id: 'gift_npc', title: 'Generous', description: 'Gift resources to an NPC', icon: '🎁', color: '#ff88ff', category: 'Social', renownReward: 2, check: () => false, unlocked: savedSet.has('gift_npc') },
    ]
    set({ achievementDefs: defs })
  },

  checkAchievements: () => {
    const state = get()
    let newUnlocks = 0
    const updated = state.achievementDefs.map((a) => {
      if (a.unlocked) return a
      if (a.check()) {
        newUnlocks++
        return { ...a, unlocked: true }
      }
      return a
    })
    if (newUnlocks > 0) {
      // Award renown for new achievements
      const renownGain = updated
        .filter((a, i) => a.unlocked && !state.achievementDefs[i].unlocked)
        .reduce((sum, a) => sum + a.renownReward, 0)
      set({
        achievementDefs: updated,
        inventory: { ...state.inventory, renown: state.inventory.renown + renownGain },
      })
      // Persist to localStorage
      try {
        const unlockedIds = updated.filter((a) => a.unlocked).map((a) => a.id)
        localStorage.setItem('chronoscape_achievements', JSON.stringify(unlockedIds))
      } catch { /* ignore */ }
    }
  },

  setAchievementPanelOpen: (open) => set({ achievementPanelOpen: open }),

  // ── Phase 5: Challenge Rifts ───────────────────────

  startChallenge: (type) => {
    const targets: Record<string, number> = { harvest: 50, build: 5, detonate: 3 }
    set({
      challengeState: {
        active: true,
        type,
        startedAt: Date.now(),
        progress: 0,
        target: targets[type] ?? 10,
        completed: false,
        tempRiftPositions: [],
        tempRiftCollected: [],
      },
    })
  },

  updateChallengeProgress: (amount) => {
    const cs = get().challengeState
    if (!cs.active || cs.completed) return
    const newProgress = cs.progress + amount
    if (newProgress >= cs.target) {
      set({
        challengeState: { ...cs, progress: cs.target, completed: true },
        inventory: { ...get().inventory, renown: get().inventory.renown + 5 },
      })
    } else {
      set({ challengeState: { ...cs, progress: newProgress } })
    }
  },

  endChallenge: () => {
    set({
      challengeState: { active: false, type: null, startedAt: 0, progress: 0, target: 0, completed: false, tempRiftPositions: [], tempRiftCollected: [] },
    })
  },

  // ── Phase 5: Time Trial ────────────────────────────

  startTimeTrial: () => {
    set({ timeTrial: { active: true, startedAt: Date.now(), elapsed: 0 } })
  },

  updateTimeTrial: (dt) => {
    const tt = get().timeTrial
    if (!tt.active) return
    set({ timeTrial: { ...tt, elapsed: tt.elapsed + dt } })
  },

  endTimeTrial: () => {
    const tt = get().timeTrial
    if (!tt.active) return
    const elapsed = tt.elapsed
    const best = get().bestTimeTrial
    if (best === null || elapsed < best) {
      try { localStorage.setItem('chronoscape_best_time', String(elapsed)) } catch {}
      set({ bestTimeTrial: elapsed })
    }
    set({ timeTrial: { active: false, startedAt: 0, elapsed: 0 } })
  },

  // ── Phase 5: New Game+ ─────────────────────────────

  activateNewGamePlus: () => {
    const state = get()
    set({
      inventory: { raw: 0, vapour: 0, liquid: 0, crystal: 0, renown: state.inventory.renown },
      blocks: {},
      newGamePlus: true,
      newGamePlusUnlock: false,
      totalBlocksPlaced: 0,
      totalExplosions: 0,
      npcs: [],
      timeBonds: [],
      // Keep: upgrades, shopPurchases, achievements, formulas (discovered), milestones
    })
  },

  checkNewGamePlusUnlock: () => {
    if (get().formulas.every((f) => f.discovered) && !get().newGamePlus) {
      set({ newGamePlusUnlock: true })
    }
  },

  setTimeScaleTarget: (target: number) => {
    set({ targetTimeScale: target })
  },

  setTimeScale: (scale: number) => {
    set({ timeScale: scale })
  },
}))
