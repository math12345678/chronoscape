import { create } from 'zustand'
import { CAPACITY, DECAY_CONFIG, BLOCK_COST, BLOCK_REFUND_RATE, VAPOUR_BLOCK_DECAY_MS, EXPLOSION_RADIUS, LIQUID_TO_RENOWN_RATE, CRYSTAL_TO_RENOWN_RATE } from './config/constants'

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

export type ShopItemId = 'capacitySurge' | 'blockColorGold' | 'blockColorRuby' | 'blockColorSapphire'

export interface ShopPurchases {
  capacitySurge: boolean
  blockColorGold: boolean
  blockColorRuby: boolean
  blockColorSapphire: boolean
}

export const BLOCK_COLOR_MAP: Record<string, string> = {
  vapour: '#ffaa00',
  crystal: '#aa88ff',
}

export const SHOP_BLOCK_COLORS: Record<string, { vapour: string; crystal: string; label: string }> = {
  gold: { vapour: '#ffd700', crystal: '#ffaa44', label: 'Gold' },
  ruby: { vapour: '#ff4466', crystal: '#ff6688', label: 'Ruby' },
  sapphire: { vapour: '#44aaff', crystal: '#4488ff', label: 'Sapphire' },
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
  type: 'rift' | 'npc' | 'block' | 'lab' | 'trader' | 'shrine'
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

  // Actions
  addRaw: (amount: number) => void
  addRenown: (amount: number) => void
  refine: (to: TimeState, amount?: number) => boolean
  decayVapour: (dt: number) => void
  decayRaw: (dt: number) => void
  discoverFormula: (id: FormulaId) => void
  addHitToFormula: (id: FormulaId) => void
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
  shopPurchases: { capacitySurge: false, blockColorGold: false, blockColorRuby: false, blockColorSapphire: false },
  marketState: { liquid: 1.0, crystal: 1.0, drift: 0 },
  timeBonds: [],
  selectedBlockColor: null,
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
  timeScale: 1.0,
  targetTimeScale: 1.0,

  // ── Derived ─────────────────────────────────────────

  formulaDiscovered: (id: FormulaId) => {
    return get().formulas.find((f) => f.id === id)?.discovered ?? false
  },

  getCurrentCapacity: (type: keyof typeof CAPACITY) => {
    const state = get()
    let cap = CAPACITY[type]
    // Apply capacity boost upgrade
    cap += state.upgrades.capacityBoost * 25
    // Apply shop capacity surge
    if (state.shopPurchases.capacitySurge) {
      cap += 100
    }
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
    return base + bonus
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
  },

  addRaw: (amount: number) => {
    set((state) => ({
      inventory: {
        ...state.inventory,
        raw: clamp(state.inventory.raw + amount, 9999),
      },
    }))
  },

  refine: (to: TimeState, amount: number = 1) => {
    const state = get()
    if (to === 'crystal' && !state.formulaDiscovered('crystallization')) {
      return false
    }

    const cost = REFINE_RATIOS[to] * amount
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
    }))
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
    set({ blocks: newBlocks })

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

  setSelectedBlockColor: (color: string | null) => {
    set({ selectedBlockColor: color })
  },

  setTimeScaleTarget: (target: number) => {
    set({ targetTimeScale: target })
  },

  setTimeScale: (scale: number) => {
    set({ timeScale: scale })
  },
}))
