// ═══════════════════════════════════════════════════════
// CHRONOSCAPE FINANCIAL EMPIRE — "Time is Money"
// ═══════════════════════════════════════════════════════
// All pricing in Liquid (≈) unless noted

// ── TIME BANK ─────────────────────────────────────────
// Savings account interest rates (APY, applied every tick)
export const SAVINGS_APY = 0.003  // 0.3% per tick (~1.8%/min at 6 ticks/min)
export const SAVINGS_TICK_INTERVAL = 10000 // 10s between interest payments

export interface TimeCD {
  id: string
  name: string
  duration: number   // ms until maturity
  apy: number        // total return at maturity
  minDeposit: number  // minimum raw
  maxDeposit: number  // maximum raw
  color: string
  icon: string
}

export const TIME_CDS: TimeCD[] = [
  { id: 'cd_30s',  name: 'Quick Time Deposit',  duration: 30_000,  apy: 0.15,  minDeposit: 20,  maxDeposit: 100,  color: '#44ff88', icon: '⏱️' },
  { id: 'cd_2m',   name: 'Standard Time Bond',   duration: 120_000, apy: 0.35,  minDeposit: 50,  maxDeposit: 300,  color: '#44ffcc', icon: '⏳' },
  { id: 'cd_5m',   name: 'Premium Time Note',    duration: 300_000, apy: 0.60,  minDeposit: 100, maxDeposit: 500,  color: '#ffcc44', icon: '⌛' },
  { id: 'cd_10m',  name: 'Chrono Treasury Bond', duration: 600_000, apy: 1.00,  minDeposit: 200, maxDeposit: 1000, color: '#ff8844', icon: '🏛️' },
]

export interface LoanProduct {
  id: string
  name: string
  description: string
  maxAmount: number          // maximum raw you can borrow
  interestRate: number       // total interest owed at repayment
  repaymentPeriod: number    // ms before default
  defaultPenalty: number     // % of total owed as penalty
  color: string
  icon: string
}

export const LOAN_PRODUCTS: LoanProduct[] = [
  { id: 'loan_small',  name: 'Micro Loan',      description: 'Quick cash for quick builds',        maxAmount: 30,  interestRate: 0.10, repaymentPeriod: 60_000,  defaultPenalty: 0.25, color: '#44ff88', icon: '💵' },
  { id: 'loan_med',    name: 'Standard Loan',   description: 'Fund your next big project',         maxAmount: 75,  interestRate: 0.20, repaymentPeriod: 120_000, defaultPenalty: 0.35, color: '#ffcc44', icon: '💰' },
  { id: 'loan_large',  name: 'Mega Loan',       description: 'Empire-scale financing',             maxAmount: 150, interestRate: 0.35, repaymentPeriod: 300_000, defaultPenalty: 0.50, color: '#ff6644', icon: '💎' },
]

// ── TIME INDUSTRIES ───────────────────────────────────
export type IndustryType = 'autoHarvester' | 'refinery' | 'tradeRoute'

export interface IndustryConfig {
  id: IndustryType
  name: string
  description: string
  buildCost: { raw?: number; vapour?: number; liquid?: number; crystal?: number; renown?: number }
  production: { resource: 'raw' | 'vapour' | 'liquid' | 'crystal'; amountPerTick: number; tickInterval: number }
  upgradeCost: { raw?: number; liquid?: number; renown?: number }  // per level
  maxLevel: number
  color: string
  icon: string
}

export const INDUSTRIES: Record<IndustryType, IndustryConfig> = {
  autoHarvester: {
    id: 'autoHarvester',
    name: 'Auto-Harvester',
    description: 'Automatically generates Raw time from the environment',
    buildCost: { raw: 50, vapour: 20, liquid: 10 },
    production: { resource: 'raw', amountPerTick: 3, tickInterval: 5000 },
    upgradeCost: { raw: 30, renown: 2 },
    maxLevel: 5,
    color: '#44ff88',
    icon: '⚙️',
  },
  refinery: {
    id: 'refinery',
    name: 'Refinery Pipeline',
    description: 'Auto-converts Raw → Vapour → Liquid at set ratios',
    buildCost: { raw: 80, vapour: 30, liquid: 15, crystal: 5 },
    production: { resource: 'liquid', amountPerTick: 2, tickInterval: 8000 },
    upgradeCost: { raw: 50, renown: 3 },
    maxLevel: 5,
    color: '#44ccff',
    icon: '🏭',
  },
  tradeRoute: {
    id: 'tradeRoute',
    name: 'Trade Route',
    description: 'Passive income from NPC trade caravans passing through',
    buildCost: { raw: 100, liquid: 25, renown: 5 },
    production: { resource: 'crystal', amountPerTick: 1, tickInterval: 10000 },
    upgradeCost: { liquid: 20, renown: 5 },
    maxLevel: 3,
    color: '#ffd700',
    icon: '🚚',
  },
}

export interface IndustryInstance {
  id: string
  type: IndustryType
  level: number
  builtAt: number
  lastProducedAt: number
  position: [number, number, number]
}

// ── TIME REAL ESTATE ──────────────────────────────────
export interface LandParcel {
  id: string
  name: string
  description: string
  position: [number, number, number]
  size: number          // 1-5 (influences income & price)
  basePrice: number     // in Liquid
  currentValue: number  // fluctuates with market
  owned: boolean
  hasBuilding: boolean
  buildingType: 'residential' | 'commercial' | 'industrial' | null
  buildingLevel: number   // 0-3
  baseRent: number        // per tick in Liquid
  tenant: boolean         // has NPC tenant paying rent
  color: string
  icon: string
}

export const LAND_PARCELS: LandParcel[] = [
  { id: 'plot_01', name: 'Sunset Ridge',    description: 'Overlooks the western shore',    position: [15, 0, 10],   size: 1, basePrice: 30,  currentValue: 30,  owned: false, hasBuilding: false, buildingType: null, buildingLevel: 0, baseRent: 2,  tenant: false, color: '#44ff88', icon: '🌅' },
  { id: 'plot_02', name: 'Rift Valley',     description: 'Near the energy rifts',          position: [-12, 0, -15], size: 2, basePrice: 50,  currentValue: 50,  owned: false, hasBuilding: false, buildingType: null, buildingLevel: 0, baseRent: 4,  tenant: false, color: '#44ccff', icon: '⚡' },
  { id: 'plot_03', name: 'Crystal Mesa',    description: 'Rich crystal deposits below',    position: [25, 0, -20],  size: 3, basePrice: 80,  currentValue: 80,  owned: false, hasBuilding: false, buildingType: null, buildingLevel: 0, baseRent: 7,  tenant: false, color: '#aa88ff', icon: '💎' },
  { id: 'plot_04', name: 'Harbor Front',    description: 'Prime waterfront property',      position: [-20, 0, 5],   size: 2, basePrice: 65,  currentValue: 65,  owned: false, hasBuilding: false, buildingType: null, buildingLevel: 0, baseRent: 5,  tenant: false, color: '#ffcc44', icon: '⚓' },
  { id: 'plot_05', name: 'Golden Prairie',  description: 'Vast fertile plains',            position: [8, 0, -10],   size: 4, basePrice: 100, currentValue: 100, owned: false, hasBuilding: false, buildingType: null, buildingLevel: 0, baseRent: 10, tenant: false, color: '#ffd700', icon: '🌾' },
  { id: 'plot_06', name: 'Void Edge',       description: 'Risky but lucrative zone',       position: [-30, 0, -25], size: 3, basePrice: 90,  currentValue: 90,  owned: false, hasBuilding: false, buildingType: null, buildingLevel: 0, baseRent: 8,  tenant: false, color: '#ff6644', icon: '🌀' },
]

// ── CEO EXECUTIVE DECISIONS ───────────────────────────
export interface ExecutiveDecision {
  id: string
  name: string
  description: string
  cost: { raw?: number; liquid?: number; crystal?: number; renown?: number }
  cooldown: number          // ms before can be used again
  effect: {
    type: 'marketBoost' | 'industryBoost' | 'rentBoost' | 'interestBoost' | 'taxCut' | 'dividend'
    value: number           // multiplier or flat amount
    duration: number        // ms (0 = instant)
  }
  color: string
  icon: string
}

export const EXECUTIVE_DECISIONS: ExecutiveDecision[] = [
  {
    id: 'ceo_market_manip', name: 'Market Manipulation', description: 'Temporarily boost all stock prices by 20%', cost: { renown: 10, liquid: 50 },
    cooldown: 300_000, effect: { type: 'marketBoost', value: 1.2, duration: 60_000 }, color: '#44ff88', icon: '📊',
  },
  {
    id: 'ceo_industry_surge', name: 'Industry Surge', description: 'Double production from all industries for 30s', cost: { crystal: 10, renown: 5 },
    cooldown: 180_000, effect: { type: 'industryBoost', value: 2.0, duration: 30_000 }, color: '#44ccff', icon: '⚡',
  },
  {
    id: 'ceo_rent_hike', name: 'Rent Hike', description: 'Double rent from all properties for 60s', cost: { renown: 8, liquid: 30 },
    cooldown: 240_000, effect: { type: 'rentBoost', value: 2.0, duration: 60_000 }, color: '#ffd700', icon: '🏠',
  },
  {
    id: 'ceo_interest_cut', name: 'Interest Rate Cut', description: 'Boost savings APY by 3x for 2 minutes', cost: { crystal: 5, renown: 8 },
    cooldown: 300_000, effect: { type: 'interestBoost', value: 3.0, duration: 120_000 }, color: '#44ff88', icon: '💹',
  },
  {
    id: 'ceo_tax_cut', name: 'Tax Cut', description: 'Reduce build costs by 30% for 90s', cost: { renown: 12, liquid: 40 },
    cooldown: 360_000, effect: { type: 'taxCut', value: 0.7, duration: 90_000 }, color: '#ff8844', icon: '📉',
  },
  {
    id: 'ceo_dividend', name: 'Issue Dividend', description: 'Immediate payout based on your total net worth', cost: { renown: 15, crystal: 8 },
    cooldown: 600_000, effect: { type: 'dividend', value: 0.05, duration: 0 }, color: '#ff44ff', icon: '💎',
  },
]

// ── BOARD OF DIRECTORS ────────────────────────────────
export interface BoardMember {
  id: string
  name: string
  title: string
  description: string
  bonus: {
    type: 'industrySpeed' | 'tradeDiscount' | 'rentYield' | 'interestBonus' | 'gearDiscount'
    value: number         // multiplier (1.2 = +20%)
  }
  hireCost: { renown: number; liquid?: number; crystal?: number }
  hired: boolean
  color: string
  icon: string
}

export const BOARD_MEMBERS: BoardMember[] = [
  { id: 'board_efficiency',  name: 'Elena Chronos',    title: 'COO', description: 'Speeds up industry production 20%',         bonus: { type: 'industrySpeed', value: 1.2 }, hireCost: { renown: 10, liquid: 50 }, hired: false, color: '#44ff88', icon: '👩‍💼' },
  { id: 'board_trade',      name: 'Marcus Vapour',    title: 'CTO', description: 'Reduces trade route costs 15%',             bonus: { type: 'tradeDiscount', value: 0.85 }, hireCost: { renown: 12, liquid: 40 }, hired: false, color: '#44ccff', icon: '👨‍💼' },
  { id: 'board_rent',       name: 'Priya Crystal',    title: 'CIO', description: 'Increases property rent yield 25%',         bonus: { type: 'rentYield', value: 1.25 }, hireCost: { renown: 15, crystal: 10 }, hired: false, color: '#ffd700', icon: '👩‍💼' },
  { id: 'board_interest',   name: 'Dr. Timeweaver',   title: 'CFO', description: 'Boosts savings & CD interest by 15%',      bonus: { type: 'interestBonus', value: 1.15 }, hireCost: { renown: 20, liquid: 30, crystal: 5 }, hired: false, color: '#ff44ff', icon: '🧙‍♂️' },
  { id: 'board_gear',       name: 'Gear Master Kael', title: 'CIO', description: 'Gear resource costs 20% less',              bonus: { type: 'gearDiscount', value: 0.8 }, hireCost: { renown: 8, crystal: 8 }, hired: false, color: '#ff8844', icon: '🛠️' },
]

// ── TIME AUCTION ──────────────────────────────────────
export interface AuctionItem {
  id: string
  name: string
  description: string
  icon: string
  color: string
  startingBid: number       // in Liquid
  currentBid: number
  bidder: 'player' | string // NPC name or 'player'
  bidderNpc: string | null  // NPC name if NPC is winning
  timeLeft: number          // ms remaining
  totalDuration: number     // total auction time
  reward: {
    type: 'gear' | 'resources' | 'blueprint' | 'renown' | 'boost'
    gearId?: string
    resources?: { liquid?: number; crystal?: number; renown?: number }
    blueprintSize?: number
  }
}

export function generateAuctionItem(): AuctionItem {
  const items: Array<Omit<AuctionItem, 'id' | 'currentBid' | 'bidder' | 'bidderNpc' | 'timeLeft' | 'totalDuration'>> = [
    { name: 'Chrono Jetpack Prototype', description: 'Unlocks the Jetpack gear instantly', icon: '🚀', color: '#44ffcc', startingBid: 50, reward: { type: 'gear', gearId: 'jetpack' } },
    { name: 'Void Shield Blueprint', description: 'Unlocks the Energy Shield gear', icon: '🛡️', color: '#44aaff', startingBid: 40, reward: { type: 'gear', gearId: 'energyShield' } },
    { name: 'Speed Runner Boots', description: 'Unlocks Speed Boots gear', icon: '👟', color: '#ffaa44', startingBid: 30, reward: { type: 'gear', gearId: 'speedBoots' } },
    { name: 'Crystal Cache', description: 'Instant 25 Crystal', icon: '💎', color: '#aa88ff', startingBid: 40, reward: { type: 'resources', resources: { crystal: 25 } } },
    { name: 'Liquid Reserve', description: 'Instant 50 Liquid', icon: '💧', color: '#44ccff', startingBid: 30, reward: { type: 'resources', resources: { liquid: 50 } } },
    { name: 'Renown Grant', description: 'Instant 15 Renown', icon: '✦', color: '#ffd700', startingBid: 60, reward: { type: 'renown' } },
    { name: 'Productivity Boost', description: 'All industries run 3x faster for 2 minutes', icon: '⚡', color: '#ff6644', startingBid: 45, reward: { type: 'boost' } },
    { name: 'Mega Blueprint', description: 'Pre-built 25-block castle blueprint', icon: '🏰', color: '#ff4488', startingBid: 55, reward: { type: 'blueprint', blueprintSize: 25 } },
  ]
  const item = items[Math.floor(Math.random() * items.length)]
  return {
    ...item,
    id: `auction_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    currentBid: item.startingBid,
    bidder: 'npc',
    bidderNpc: ['Chrono Corp', 'Void Industries', 'Crystal Syndicate', 'Time Traders LLC', 'Rift Capital'][Math.floor(Math.random() * 5)],
    timeLeft: 120_000 + Math.random() * 180_000, // 2-5 minutes
    totalDuration: 120_000 + Math.random() * 180_000,
  }
}

export const NPC_BIDDERS = ['Chrono Corp', 'Void Industries', 'Crystal Syndicate', 'Time Traders LLC', 'Rift Capital']

// ── BUILDING POSITIONS ────────────────────────────────
export const BANK_POSITION: [number, number, number] = [18, 0.5, -35]
export const INDUSTRY_POSITION: [number, number, number] = [30, 0.5, -28]
export const ESTATE_POSITION: [number, number, number] = [-22, 0.5, -22]
export const CEO_POSITION: [number, number, number] = [25, 0.5, -12]
export const AUCTION_POSITION: [number, number, number] = [-28, 0.5, -15]
export const DEBT_COLLECTOR_SPAWN: [number, number, number] = [0, 0.5, 45]

// ── WEALTH TIERS ──────────────────────────────────────
export const WEALTH_TIERS = [
  { name: 'Time Pauper',   threshold: 0,    color: '#666666' },
  { name: 'Time Peasant',  threshold: 100,  color: '#888866' },
  { name: 'Time Merchant', threshold: 500,  color: '#44ff88' },
  { name: 'Time Baron',    threshold: 2000, color: '#44ccff' },
  { name: 'Time Magnate',  threshold: 5000, color: '#ffd700' },
  { name: 'Time Tycoon',   threshold: 15000, color: '#ff8844' },
  { name: 'Time Mogul',    threshold: 50000, color: '#ff44ff' },
  { name: 'Chrono Billionaire', threshold: 200000, color: '#ff0000' },
] as const
