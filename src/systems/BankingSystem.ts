import { useStore } from '../store'
import { SAVINGS_APY, TIME_CDS, LOAN_PRODUCTS } from '../config/finance'
import { getPrestigeInterestBonus } from '../components/PrestigeSystem'

// ── Module-level banking state ─────────────────────────
interface SavingsAccount {
  balance: number
  lastInterestAt: number
  totalInterestEarned: number
}

interface CDInvestment {
  cdId: string
  amount: number
  startedAt: number
  claimed: boolean
}

interface ActiveLoan {
  loanId: string
  amount: number
  borrowedAt: number
  totalOwed: number
  repaid: boolean
  defaulted: boolean
}

export let _savings: SavingsAccount = { balance: 0, lastInterestAt: Date.now(), totalInterestEarned: 0 }
export let _cds: CDInvestment[] = []
export let _loans: ActiveLoan[] = []
export let _totalInterestEarned = 0
export let _totalLoansTaken = 0
export let _totalLoansDefaulted = 0

export function getSavingsBalance(): number { return _savings.balance }
export function getTotalInterestEarned(): number { return _totalInterestEarned }
export function getTotalLoansTaken(): number { return _totalLoansTaken }
export function getTotalLoansDefaulted(): number { return _totalLoansDefaulted }
export function getAllCDs(): CDInvestment[] { return [..._cds] }
export function getAllLoans(): ActiveLoan[] { return [..._loans] }
export function hasActiveLoans(): boolean { return _loans.filter(l => !l.repaid && !l.defaulted).length > 0 }
export function hasDefaultedLoans(): boolean { return _loans.filter(l => l.defaulted).length > 0 }

/** Deposit raw into savings */
export function depositSavings(amount: number): boolean {
  const state = useStore.getState()
  if (state.inventory.raw < amount) return false
  useStore.setState((s) => ({
    inventory: { ...s.inventory, raw: s.inventory.raw - amount },
  }))
  _savings.balance += amount
  return true
}

/** Withdraw raw from savings */
export function withdrawSavings(amount: number): boolean {
  if (_savings.balance < amount) return false
  useStore.setState((s) => ({
    inventory: { ...s.inventory, raw: s.inventory.raw + amount },
  }))
  _savings.balance -= amount
  return true
}

/** Apply interest to savings — call from economy tick */
export function applySavingsInterest(apyMultiplier: number = 1): number {
  if (_savings.balance <= 0) return 0
  const prestigeBonus = 1 + getPrestigeInterestBonus()
  const interest = Math.floor(_savings.balance * SAVINGS_APY * apyMultiplier * prestigeBonus)
  if (interest <= 0) return 0
  _savings.balance += interest
  _savings.totalInterestEarned += interest
  _totalInterestEarned += interest
  _savings.lastInterestAt = Date.now()
  return interest
}

/** Start a CD investment */
export function startCD(cdIndex: number, amount: number): boolean {
  const cd = TIME_CDS[cdIndex]
  if (!cd) return false
  if (amount < cd.minDeposit || amount > cd.maxDeposit) return false
  const state = useStore.getState()
  if (state.inventory.raw < amount) return false
  useStore.setState((s) => ({
    inventory: { ...s.inventory, raw: s.inventory.raw - amount },
  }))
  _cds.push({ cdId: cd.id, amount, startedAt: Date.now(), claimed: false })
  return true
}

/** Check if a CD has matured */
export function getCDMaturity(cd: CDInvestment): { matured: boolean; remaining: number; value: number } {
  const config = TIME_CDS.find(c => c.id === cd.cdId)
  if (!config) return { matured: true, remaining: 0, value: cd.amount }
  const elapsed = Date.now() - cd.startedAt
  const matured = elapsed >= config.duration
  const remaining = Math.max(0, config.duration - elapsed)
  const value = Math.floor(cd.amount * (1 + config.apy))
  return { matured, remaining, value }
}

/** Claim a matured CD */
export function claimCD(index: number): boolean {
  const cd = _cds[index]
  if (!cd || cd.claimed) return false
  const { matured, value } = getCDMaturity(cd)
  if (!matured) return false
  cd.claimed = true
  useStore.setState((s) => ({
    inventory: { ...s.inventory, raw: s.inventory.raw + value },
  }))
  return true
}

/** Take out a loan */
export function takeLoan(loanIndex: number): boolean {
  const loan = LOAN_PRODUCTS[loanIndex]
  if (!loan) return false
  const existingLoan = _loans.find(l => !l.repaid && !l.defaulted)
  if (existingLoan) return false
  const amount = loan.maxAmount
  const totalOwed = Math.ceil(amount * (1 + loan.interestRate))
  _loans.push({ loanId: loan.id, amount, borrowedAt: Date.now(), totalOwed, repaid: false, defaulted: false })
  _totalLoansTaken++
  useStore.setState((s) => ({
    inventory: { ...s.inventory, raw: s.inventory.raw + amount },
  }))
  return true
}

/** Repay a loan */
export function repayLoan(index: number): boolean {
  const loan = _loans[index]
  if (!loan || loan.repaid || loan.defaulted) return false
  const state = useStore.getState()
  if (state.inventory.raw < loan.totalOwed) return false
  useStore.setState((s) => ({
    inventory: { ...s.inventory, raw: s.inventory.raw - loan.totalOwed },
  }))
  loan.repaid = true
  return true
}

/** Check for loan defaults */
export function tickLoans(): string | null {
  let defaultedId: string | null = null
  for (const loan of _loans) {
    if (loan.repaid || loan.defaulted) continue
    const config = LOAN_PRODUCTS.find(l => l.id === loan.loanId)
    if (!config) continue
    const elapsed = Date.now() - loan.borrowedAt
    if (elapsed > config.repaymentPeriod) {
      loan.defaulted = true
      _totalLoansDefaulted++
      const penalty = Math.floor(loan.totalOwed * config.defaultPenalty)
      useStore.setState((s) => ({
        inventory: {
          ...s.inventory,
          raw: Math.max(0, s.inventory.raw - penalty),
          renown: Math.max(0, s.inventory.renown - Math.floor(penalty / 10)),
        },
      }))
      defaultedId = loan.loanId
    }
  }
  return defaultedId
}

/** Check if debt collector should spawn */
export function shouldSpawnDebtCollector(): boolean {
  return _loans.filter(l => l.defaulted && !l.repaid).length > 0
}
