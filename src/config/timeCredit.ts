// ── Time Credit: The universal currency ──────────────
// "Time is Money" — you earn TC$ passively every second
// based on your net worth, prestige, and infrastructure.

export interface TimeCreditState {
  balance: number
  earnedPerSecond: number
  totalEarned: number
  lastTick: number
}

let _state: TimeCreditState = {
  balance: 50, // Starting capital
  earnedPerSecond: 1, // Base rate: $1/sec
  totalEarned: 0,
  lastTick: Date.now(),
}

export function getTimeCreditState(): TimeCreditState {
  return { ..._state }
}

export function getTimeCreditBalance(): number {
  return Math.floor(_state.balance)
}

export function getTimeCreditPerSecond(): number {
  return _state.earnedPerSecond
}

export function getTimeCreditTotalEarned(): number {
  return Math.floor(_state.totalEarned)
}

export function addTimeCredit(amount: number) {
  _state.balance += amount
  if (amount > 0) _state.totalEarned += amount
}

export function spendTimeCredit(amount: number): boolean {
  if (_state.balance < amount) return false
  _state.balance -= amount
  return true
}

export function setTimeCreditPerSecond(rate: number) {
  _state.earnedPerSecond = rate
}

export function recalcTimeCreditRate(prestigeRank: number, hasIndustries: boolean, territoryCount: number) {
  let rate = 1
  rate += prestigeRank * 0.5
  if (hasIndustries) rate += 2
  rate += territoryCount * 0.3
  _state.earnedPerSecond = Math.max(0.5, rate)
}

export function tickTimeCredit(dt: number) {
  const elapsed = dt * 1000
  const earned = _state.earnedPerSecond * (elapsed / 1000)
  _state.balance += earned
  _state.totalEarned += earned
  _state.lastTick = Date.now()
}

// ── Price tags in TC$ ──────────────────────────────
export const TC_PRICES = {
  // Vehicle upgrades
  vehicleSpeed1: 100,
  vehicleSpeed2: 500,
  vehicleSpeed3: 2000,
  vehicleHandling: 300,
  vehicleBoost: 750,
  vehiclePaint: 200,

  // Gang perks
  gangHire: 500,
  gangTurfWar: 1000,
  gangHideout: 3000,

  // Storm insurance
  stormShield: 400,
  temporalInsurance: 1500,
}
