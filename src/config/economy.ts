// ── Time Stock Exchange ─────────────────────────────────
// Stock ticker symbols for all time resources
export const STOCK_SYMBOLS = {
  RAW: 'RAW',
  VAPOUR: 'VPR',
  LIQUID: 'LIQ',
  CRYSTAL: 'CRY',
  RENOWN: 'RNW',
} as const

export type StockSymbol = (typeof STOCK_SYMBOLS)[keyof typeof STOCK_SYMBOLS]

export interface StockTicker {
  symbol: StockSymbol
  name: string
  price: number        // current price in "time credits" (abstract unit)
  change24h: number    // percentage change (e.g., 0.05 = +5%)
  volatility: number   // 0-1, how much price swings
  volume: number       // recent trading volume
  color: string
  icon: string
}

/** Initial stock prices and configs */
export const INITIAL_STOCKS: StockTicker[] = [
  { symbol: 'RAW', name: 'Raw Time', price: 10, change24h: 0, volatility: 0.3, volume: 5000, color: '#ff8844', icon: '⟐' },
  { symbol: 'VPR', name: 'Vapour', price: 15, change24h: 0, volatility: 0.4, volume: 3500, color: '#ffaa00', icon: '⟡' },
  { symbol: 'LIQ', name: 'Liquid Time', price: 25, change24h: 0, volatility: 0.25, volume: 2000, color: '#44ccff', icon: '≈' },
  { symbol: 'CRY', name: 'Crystal', price: 50, change24h: 0, volatility: 0.35, volume: 800, color: '#aa88ff', icon: '◆' },
  { symbol: 'RNW', name: 'Renown', price: 100, change24h: 0, volatility: 0.15, volume: 300, color: '#ffd700', icon: '✦' },
]

// ── Investment Funds ────────────────────────────────────
export type FundId = 'conservative' | 'balanced' | 'aggressive' | 'speculative'

export interface FundConfig {
  id: FundId
  name: string
  description: string
  dailyReturn: number     // base daily return (0.02 = 2%)
  risk: number            // 0-1, volatility multiplier
  minDeposit: number      // minimum raw to invest
  maxDeposit: number      // max raw per fund
  color: string
  icon: string
}

export const FUNDS: Record<FundId, FundConfig> = {
  conservative: {
    id: 'conservative',
    name: 'Time Vault',
    description: 'Low risk, steady returns. Park your raw time securely.',
    dailyReturn: 0.015,
    risk: 0.05,
    minDeposit: 10,
    maxDeposit: 500,
    color: '#44ff88',
    icon: '🛡️',
  },
  balanced: {
    id: 'balanced',
    name: 'Chrono Growth',
    description: 'Moderate risk, balanced portfolio of time assets.',
    dailyReturn: 0.04,
    risk: 0.15,
    minDeposit: 25,
    maxDeposit: 300,
    color: '#ffcc44',
    icon: '📈',
  },
  aggressive: {
    id: 'aggressive',
    name: 'Void Ventures',
    description: 'High risk, high reward. Invest in volatile time rifts.',
    dailyReturn: 0.08,
    risk: 0.35,
    minDeposit: 50,
    maxDeposit: 200,
    color: '#ff6644',
    icon: '⚡',
  },
  speculative: {
    id: 'speculative',
    name: 'Crystal Futures',
    description: 'Extreme risk. Crystal market leverage. Potential 10x.',
    dailyReturn: 0.15,
    risk: 0.6,
    minDeposit: 100,
    maxDeposit: 100,
    color: '#ff44ff',
    icon: '💎',
  },
}

// ── Player Portfolio ────────────────────────────────────
export interface PortfolioEntry {
  fundId: FundId
  principal: number    // raw invested
  currentValue: number // current value (fluctuates)
  investedAt: number   // timestamp
  returns: number      // total returns earned
}

// ── Time-Powered Gear ──────────────────────────────────
export type GearId = 'jetpack' | 'energyShield' | 'speedBoots'

export interface GearConfig {
  id: GearId
  name: string
  description: string
  resource: 'vapour' | 'liquid' | 'crystal'
  costPerSecond: number
  unlockCost: { renown: number; liquid?: number; crystal?: number }
  color: string
  icon: string
}

export const GEAR: Record<GearId, GearConfig> = {
  jetpack: {
    id: 'jetpack',
    name: 'Time Jetpack',
    description: 'Fly upward by consuming Liquid. Spacebar to activate.',
    resource: 'liquid',
    costPerSecond: 2,
    unlockCost: { renown: 15, liquid: 50 },
    color: '#44ffcc',
    icon: '🚀',
  },
  energyShield: {
    id: 'energyShield',
    name: 'Energy Shield',
    description: 'Absorbs 50% of incoming damage. Consumes Vapour per hit.',
    resource: 'vapour',
    costPerSecond: 0,  // per hit, not per second
    unlockCost: { renown: 10, crystal: 10 },
    color: '#44aaff',
    icon: '🛡️',
  },
  speedBoots: {
    id: 'speedBoots',
    name: 'Chrono Boots',
    description: '2x sprint speed. Consumes Vapour while sprinting.',
    resource: 'vapour',
    costPerSecond: 1,
    unlockCost: { renown: 8, liquid: 20 },
    color: '#ffaa44',
    icon: '👟',
  },
}

// ── Alchemy Recipes ─────────────────────────────────────
export type AlchemyRecipeId = 'timeEssence' | 'crystalShard' | 'chronoPotion' | 'voidExtract'

export interface AlchemyRecipe {
  id: AlchemyRecipeId
  name: string
  description: string
  input: { raw?: number; vapour?: number; liquid?: number; crystal?: number }
  cookTime: number      // ms (real time)
  output: { raw?: number; liquid?: number; crystal?: number; renown?: number; gearUnlock?: GearId }
  color: string
  icon: string
}

export const ALCHEMY_RECIPES: Record<AlchemyRecipeId, AlchemyRecipe> = {
  timeEssence: {
    id: 'timeEssence',
    name: 'Time Essence',
    description: 'Concentrate raw time into pure essence',
    input: { raw: 20 },
    cookTime: 30_000,    // 30s
    output: { liquid: 5 },
    color: '#44ffcc',
    icon: '💧',
  },
  crystalShard: {
    id: 'crystalShard',
    name: 'Crystal Shard',
    description: 'Slow-crystallize liquid into solid crystal',
    input: { liquid: 15 },
    cookTime: 120_000,   // 2m
    output: { crystal: 3 },
    color: '#aa88ff',
    icon: '💎',
  },
  chronoPotion: {
    id: 'chronoPotion',
    name: 'Chrono Potion',
    description: 'A potent mixture that grants renown',
    input: { vapour: 10, liquid: 10 },
    cookTime: 60_000,    // 1m
    output: { renown: 5 },
    color: '#ffd700',
    icon: '🧪',
  },
  voidExtract: {
    id: 'voidExtract',
    name: 'Void Extract',
    description: 'Dangerous alchemy that might unlock Chrono Boots',
    input: { crystal: 5, liquid: 20 },
    cookTime: 300_000,   // 5m
    output: { crystal: 8, gearUnlock: 'speedBoots' },
    color: '#ff44ff',
    icon: '🌀',
  },
}

// ── Bounties ────────────────────────────────────────────
export interface Bounty {
  id: string
  target: string        // enemy type name
  targetCount: number   // how many to kill
  reward: { renown: number; liquid?: number; crystal?: number }
  timeLimit: number     // ms (0 = no limit)
  color: string
  icon: string
}

export function generateBounties(): Bounty[] {
  const bounties: Bounty[] = [
    {
      id: `bounty_wraith_${Date.now()}`,
      target: 'Wraith',
      targetCount: 5,
      reward: { renown: 5, liquid: 10 },
      timeLimit: 300_000, // 5m
      color: '#6644aa',
      icon: '👻',
    },
    {
      id: `bounty_void_${Date.now()}`,
      target: 'Void Wraith',
      targetCount: 2,
      reward: { renown: 10, crystal: 5 },
      timeLimit: 0,
      color: '#ff4466',
      icon: '💀',
    },
    {
      id: `bounty_golem_${Date.now()}`,
      target: 'Crystal Golem',
      targetCount: 1,
      reward: { renown: 15, liquid: 25 },
      timeLimit: 0,
      color: '#8866ff',
      icon: '🗿',
    },
  ]
  return bounties
}

// ── Insurance ──────────────────────────────────────────
export interface InsurancePlan {
  resource: 'raw' | 'vapour'
  premiumPerUnit: number  // liquid cost per unit covered
  coveragePercent: number // 0-1, what fraction of decay is reimbursed
  duration: number        // ms
}

export const INSURANCE_PLANS: InsurancePlan[] = [
  { resource: 'raw', premiumPerUnit: 0.5, coveragePercent: 0.75, duration: 300_000 },    // 5m
  { resource: 'vapour', premiumPerUnit: 1, coveragePercent: 0.80, duration: 120_000 },   // 2m
]

// ── Exchange Building Position ──────────────────────────
export const EXCHANGE_POSITION: [number, number, number] = [20, 0.5, -25]

// ── Alchemy Position ────────────────────────────────────
export const ALCHEMY_POSITION: [number, number, number] = [-25, 0.5, -30]

// ── Bounty Board Position ───────────────────────────────
export const BOUNTY_POSITION: [number, number, number] = [-15, 0.5, 30]
