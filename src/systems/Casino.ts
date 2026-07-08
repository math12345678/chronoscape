// ── Casino — high risk / high reward gambling ──────────────

import { useStore } from '../store'

// ── Slot Machine ───────────────────────────────────────────

export interface SlotResult {
  symbols: string[]
  win: boolean
  multiplier: number
  winnings: number
}

const SLOT_SYMBOLS = ['⟐', '⟡', '◆', '✦', '⬡', '⏳']
const PAYOUTS: Record<string, number> = {
  '⟐': 2,
  '⟡': 3,
  '◆': 5,
  '✦': 10,
  '⬡': 15,
  '⏳': 25,
}

export function spinSlots(bet: number): SlotResult {
  const symbols = Array.from({ length: 3 }, () =>
    SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)]
  )

  // Check for win (all 3 same)
  const allSame = symbols[0] === symbols[1] && symbols[1] === symbols[2]
  const twoMatch = symbols[0] === symbols[1] || symbols[1] === symbols[2] || symbols[0] === symbols[2]

  // Check for special jackpot (all ⟐ or all ⏳)
  const jackpot = allSame && (symbols[0] === '⟐' || symbols[0] === '⏳')

  let multiplier = 0
  if (jackpot) {
    multiplier = 50
  } else if (allSame) {
    multiplier = PAYOUTS[symbols[0]] ?? 5
  } else if (twoMatch) {
    multiplier = 1.5
  }

  const winnings = Math.floor(bet * multiplier)
  const win = winnings > 0

  if (win) {
    useStore.setState((s) => ({
      inventory: {
        ...s.inventory,
        raw: s.inventory.raw + winnings,
      },
    }))
  }

  return { symbols, win, multiplier, winnings }
}

// ── Roulette ───────────────────────────────────────────────

export type RouletteBet = 'low' | 'high' | 'red' | 'black' | 'odd' | 'even' | 'specific'

const ROULETTE_NUMBERS = Array.from({ length: 37 }, (_, i) => i)
const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]

export interface RouletteResult {
  number: number
  color: 'red' | 'black' | 'green'
  win: boolean
  multiplier: number
  winnings: number
}

export function spinRoulette(bet: number, betType: RouletteBet, specificNumber?: number): RouletteResult {
  const num = ROULETTE_NUMBERS[Math.floor(Math.random() * ROULETTE_NUMBERS.length)]
  const color: 'red' | 'black' | 'green' =
    num === 0 ? 'green' : RED_NUMBERS.includes(num) ? 'red' : 'black'

  let win = false
  let multiplier = 0

  switch (betType) {
    case 'low': win = num >= 1 && num <= 18; multiplier = 2; break
    case 'high': win = num >= 19 && num <= 36; multiplier = 2; break
    case 'red': win = color === 'red'; multiplier = 2; break
    case 'black': win = color === 'black'; multiplier = 2; break
    case 'odd': win = num % 2 === 1 && num !== 0; multiplier = 2; break
    case 'even': win = num % 2 === 0 && num !== 0; multiplier = 2; break
    case 'specific': win = num === specificNumber; multiplier = 36; break
  }

  const winnings = win ? Math.floor(bet * multiplier) : 0

  if (win) {
    useStore.setState((s) => ({
      inventory: {
        ...s.inventory,
        raw: s.inventory.raw + winnings,
      },
    }))
  }

  return { number: num, color, win, multiplier, winnings }
}

// ── Coin Flip ──────────────────────────────────────────────

export function coinFlip(bet: number, call: 'heads' | 'tails'): { result: 'heads' | 'tails'; win: boolean; winnings: number } {
  const result: 'heads' | 'tails' = Math.random() < 0.5 ? 'heads' : 'tails'
  const win = result === call
  const winnings = win ? Math.floor(bet * 1.8) : 0

  if (win) {
    useStore.setState((s) => ({
      inventory: {
        ...s.inventory,
        raw: s.inventory.raw + winnings,
      },
    }))
  }

  return { result, win, winnings }
}

// ── Gambling Stats ─────────────────────────────────────────

interface CasinoStats {
  totalBet: number
  totalWon: number
  spins: number
  wins: number
  biggestWin: number
  biggestWinType: string
}

let _casinoStats: CasinoStats = { totalBet: 0, totalWon: 0, spins: 0, wins: 0, biggestWin: 0, biggestWinType: '' }

export function getCasinoStats(): CasinoStats {
  return { ..._casinoStats }
}

export function recordBet(amount: number): void {
  _casinoStats.totalBet += amount
  _casinoStats.spins++
}

export function recordWin(amount: number, type: string): void {
  _casinoStats.totalWon += amount
  _casinoStats.wins++
  if (amount > _casinoStats.biggestWin) {
    _casinoStats.biggestWin = amount
    _casinoStats.biggestWinType = type
  }
}

export function getCasinoNet(): number {
  return _casinoStats.totalWon - _casinoStats.totalBet
}

export function serializeCasinoStats(): CasinoStats {
  return { ..._casinoStats }
}

export function loadCasinoStats(stats: CasinoStats): void {
  _casinoStats = { ...stats }
}

// ── Win probability visualization ──────────────────────────

export function getSlotProbability(): number {
  // 3 same symbols out of 6 = 6 / (6^3) = 6/216 = 2.78%
  // + two matching: ~41.7%
  return 2.78
}
