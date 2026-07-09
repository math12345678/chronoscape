import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { UI, glassPanel } from '../utils/uiStyles'
import { getRelicPrestigeBonus } from '../systems/RelicForging'

// ── Prestige config ─────────────────────────────────
export const PRESETIGE_REQUIREMENTS = [
  { rank: 1, label: 'Novice', raw: 500, liquid: 300, vapour: 200, crystal: 100, renown: 1000 },
  { rank: 2, label: 'Apprentice', raw: 2000, liquid: 1500, vapour: 1000, crystal: 500, renown: 5000 },
  { rank: 3, label: 'Adept', raw: 8000, liquid: 5000, vapour: 3000, crystal: 2000, renown: 20000 },
  { rank: 4, label: 'Master', raw: 25000, liquid: 15000, vapour: 10000, crystal: 5000, renown: 75000 },
  { rank: 5, label: 'Grandmaster', raw: 75000, liquid: 50000, vapour: 30000, crystal: 20000, renown: 200000 },
  { rank: 6, label: 'Transcendent', raw: 200000, liquid: 150000, vapour: 100000, crystal: 50000, renown: 500000 },
  { rank: 7, label: 'Timeless', raw: 500000, liquid: 400000, vapour: 300000, crystal: 200000, renown: 1000000 },
  { rank: 8, label: 'Eternal', raw: 1000000, liquid: 800000, vapour: 600000, crystal: 400000, renown: 2500000 },
  { rank: 9, label: 'Singularity', raw: 5000000, liquid: 3000000, vapour: 2000000, crystal: 1000000, renown: 10000000 },
  { rank: 10, label: 'Chrono God', raw: 25000000, liquid: 15000000, vapour: 10000000, crystal: 5000000, renown: 50000000 },
  { rank: 11, label: 'Void Walker', raw: 100000000, liquid: 75000000, vapour: 50000000, crystal: 25000000, renown: 250000000 },
  { rank: 12, label: 'Timeline Weaver', raw: 500000000, liquid: 300000000, vapour: 200000000, crystal: 100000000, renown: 1000000000 },
  { rank: 13, label: 'Paradox Lord', raw: 2000000000, liquid: 1500000000, vapour: 1000000000, crystal: 500000000, renown: 5000000000 },
  { rank: 14, label: 'Epoch Titan', raw: 10000000000, liquid: 8000000000, vapour: 5000000000, crystal: 2500000000, renown: 25000000000 },
  { rank: 15, label: 'Omega Chronarch', raw: 50000000000, liquid: 30000000000, vapour: 20000000000, crystal: 10000000000, renown: 100000000000 },
  { rank: 16, label: 'Infinite', raw: 250000000000, liquid: 150000000000, vapour: 100000000000, crystal: 50000000000, renown: 500000000000 },
  { rank: 17, label: 'Absolute', raw: 1000000000000, liquid: 800000000000, vapour: 500000000000, crystal: 250000000000, renown: 2500000000000 },
  { rank: 18, label: 'Transcendental', raw: 5000000000000, liquid: 3000000000000, vapour: 2000000000000, crystal: 1000000000000, renown: 10000000000000 },
  { rank: 19, label: 'The End of Time', raw: 25000000000000, liquid: 15000000000000, vapour: 10000000000000, crystal: 5000000000000, renown: 50000000000000 },
  { rank: 20, label: 'CHRONOS', raw: 100000000000000, liquid: 75000000000000, vapour: 50000000000000, crystal: 25000000000000, renown: 250000000000000 },
]

export interface PrestigeBonusEx {
  damage: number
  harvestYield: number
  capacity: number
  interestRate: number
  dropRate: number
  speed: number
  fireRate: number
  regen: number
  timeCreditMult: number
  nukeCharges: number
}

export const PRESTIGE_BONUSES: PrestigeBonusEx[] = [
  { damage: 0.15, harvestYield: 0.2, capacity: 0.25, interestRate: 0.005, dropRate: 0, speed: 0, fireRate: 0, regen: 0, timeCreditMult: 1, nukeCharges: 3 },
  { damage: 0.25, harvestYield: 0.35, capacity: 0.5, interestRate: 0.008, dropRate: 0, speed: 0, fireRate: 0, regen: 0, timeCreditMult: 1, nukeCharges: 3 },
  { damage: 0.4, harvestYield: 0.5, capacity: 0.75, interestRate: 0.012, dropRate: 0, speed: 0, fireRate: 0, regen: 0, timeCreditMult: 1, nukeCharges: 3 },
  { damage: 0.55, harvestYield: 0.7, capacity: 1.0, interestRate: 0.018, dropRate: 0, speed: 0, fireRate: 0, regen: 0, timeCreditMult: 1, nukeCharges: 3 },
  { damage: 0.75, harvestYield: 0.9, capacity: 1.5, interestRate: 0.025, dropRate: 0, speed: 0, fireRate: 0, regen: 0, timeCreditMult: 1, nukeCharges: 3 },
  { damage: 1.0, harvestYield: 1.2, capacity: 2.0, interestRate: 0.035, dropRate: 0.1, speed: 0, fireRate: 0, regen: 0, timeCreditMult: 1, nukeCharges: 3 },
  { damage: 1.5, harvestYield: 1.5, capacity: 3.0, interestRate: 0.05, dropRate: 0.2, speed: 0, fireRate: 0, regen: 0, timeCreditMult: 1.25, nukeCharges: 4 },
  { damage: 2.0, harvestYield: 2.0, capacity: 5.0, interestRate: 0.075, dropRate: 0.3, speed: 0.1, fireRate: 0, regen: 0, timeCreditMult: 1.5, nukeCharges: 4 },
  { damage: 3.0, harvestYield: 3.0, capacity: 10.0, interestRate: 0.1, dropRate: 0.5, speed: 0.15, fireRate: 0.1, regen: 1, timeCreditMult: 2, nukeCharges: 5 },
  { damage: 5.0, harvestYield: 5.0, capacity: 20.0, interestRate: 0.15, dropRate: 1.0, speed: 0.25, fireRate: 0.15, regen: 2, timeCreditMult: 3, nukeCharges: 5 },
  { damage: 8.0, harvestYield: 8.0, capacity: 40.0, interestRate: 0.25, dropRate: 1.5, speed: 0.3, fireRate: 0.2, regen: 3, timeCreditMult: 4, nukeCharges: 6 },
  { damage: 12.0, harvestYield: 12.0, capacity: 60.0, interestRate: 0.35, dropRate: 2.0, speed: 0.35, fireRate: 0.25, regen: 4, timeCreditMult: 5, nukeCharges: 6 },
  { damage: 18.0, harvestYield: 18.0, capacity: 100.0, interestRate: 0.5, dropRate: 3.0, speed: 0.4, fireRate: 0.3, regen: 5, timeCreditMult: 6, nukeCharges: 7 },
  { damage: 25.0, harvestYield: 25.0, capacity: 150.0, interestRate: 0.75, dropRate: 5.0, speed: 0.45, fireRate: 0.35, regen: 6, timeCreditMult: 8, nukeCharges: 7 },
  { damage: 35.0, harvestYield: 35.0, capacity: 250.0, interestRate: 1.0, dropRate: 8.0, speed: 0.5, fireRate: 0.4, regen: 8, timeCreditMult: 10, nukeCharges: 8 },
  { damage: 50.0, harvestYield: 50.0, capacity: 500.0, interestRate: 1.5, dropRate: 12.0, speed: 0.55, fireRate: 0.45, regen: 10, timeCreditMult: 15, nukeCharges: 8 },
  { damage: 75.0, harvestYield: 75.0, capacity: 1000.0, interestRate: 2.0, dropRate: 20.0, speed: 0.6, fireRate: 0.5, regen: 12, timeCreditMult: 20, nukeCharges: 9 },
  { damage: 100.0, harvestYield: 100.0, capacity: 2000.0, interestRate: 3.0, dropRate: 30.0, speed: 0.65, fireRate: 0.55, regen: 15, timeCreditMult: 30, nukeCharges: 9 },
  { damage: 200.0, harvestYield: 200.0, capacity: 5000.0, interestRate: 5.0, dropRate: 50.0, speed: 0.7, fireRate: 0.6, regen: 20, timeCreditMult: 50, nukeCharges: 10 },
  { damage: 500.0, harvestYield: 500.0, capacity: 10000.0, interestRate: 10.0, dropRate: 100.0, speed: 0.8, fireRate: 0.7, regen: 30, timeCreditMult: 100, nukeCharges: 10 },
]

// ── Module state ────────────────────────────────────
let _prestigeRank = 0
let _prestigeMultiplier: PrestigeBonusEx = { damage: 0, harvestYield: 0, capacity: 0, interestRate: 0, dropRate: 0, speed: 0, fireRate: 0, regen: 0, timeCreditMult: 1, nukeCharges: 3 }

export function getPrestigeRank() { return _prestigeRank }
export function getPrestigeMultiplier() { return _prestigeMultiplier }

/** Set prestige rank externally (used by Ascension system) */
export function setPrestigeRank(rank: number) { _prestigeRank = rank }

/** Set prestige bonus externally (used by Ascension system) */
export function setPrestigeBonus(bonus: PrestigeBonusEx) { _prestigeMultiplier = bonus }

/** Damage multiplier: 1.0 + prestige bonus */
export function getPrestigeDamageBonus() { return 1.0 + _prestigeMultiplier.damage }

/** Harvest yield multiplier: 1.0 + prestige bonus */
export function getPrestigeHarvestBonus() { return 1.0 + _prestigeMultiplier.harvestYield }

/** Capacity multiplier: 1.0 + prestige bonus */
export function getPrestigeCapacityBonus() { return 1.0 + _prestigeMultiplier.capacity }

/** Interest rate add (for compound interest calc) */
export function getPrestigeInterestBonus() { return _prestigeMultiplier.interestRate }

/** Drop rate multiplier */
export function getPrestigeDropBonus() { return 1.0 + _prestigeMultiplier.dropRate }

/** Speed multiplier */
export function getPrestigeSpeedBonus() { return 1.0 + _prestigeMultiplier.speed }

/** Fire rate multiplier */
export function getPrestigeFireRateBonus() { return 1.0 + _prestigeMultiplier.fireRate }

/** Regen HP/s */
export function getPrestigeRegenBonus() { return _prestigeMultiplier.regen }

/** Time Credit multiplier */
export function getPrestigeTimeCreditMult() { return _prestigeMultiplier.timeCreditMult }

/** Nuke max charges */
export function getPrestigeNukeCharges() { return _prestigeMultiplier.nukeCharges }

function calculatePrestige() {
  const store = useStore.getState()
  const { raw, liquid, vapour, crystal, renown } = store.inventory

  let newRank = 0
  let newBonus: PrestigeBonusEx = { damage: 0, harvestYield: 0, capacity: 0, interestRate: 0, dropRate: 0, speed: 0, fireRate: 0, regen: 0, timeCreditMult: 1, nukeCharges: 3 }

  for (let i = 0; i < PRESETIGE_REQUIREMENTS.length; i++) {
    const req = PRESETIGE_REQUIREMENTS[i]
    if (raw >= req.raw && liquid >= req.liquid && vapour >= req.vapour && crystal >= req.crystal && renown >= req.renown) {
      newRank = i + 1
      newBonus = PRESTIGE_BONUSES[i]
    } else {
      break
    }
  }

  if (newRank > _prestigeRank) {
    _prestigeRank = newRank
    // Prestige Wealth relic: scales the tier's bonuses up (leaves nukeCharges,
    // an integer count, alone rather than fractionally scaling it).
    const wealthMult = 1 + getRelicPrestigeBonus()
    _prestigeMultiplier = wealthMult === 1 ? newBonus : {
      ...newBonus,
      damage: newBonus.damage * wealthMult,
      harvestYield: newBonus.harvestYield * wealthMult,
      capacity: newBonus.capacity * wealthMult,
      interestRate: newBonus.interestRate * wealthMult,
      dropRate: newBonus.dropRate * wealthMult,
      speed: newBonus.speed * wealthMult,
      fireRate: newBonus.fireRate * wealthMult,
      regen: newBonus.regen * wealthMult,
      timeCreditMult: newBonus.timeCreditMult * wealthMult,
    }
  }
}

export function tickPrestige() {
  calculatePrestige()
}

// ── React Panel ─────────────────────────────────────
export const PrestigePanel = () => {
  const [open, setOpen] = useState(false)
  const resources = useStore(s => s.inventory)
  const [, refresh] = useState(0)

  useEffect(() => {
    calculatePrestige()
    const iv = setInterval(() => {
      calculatePrestige()
      refresh(n => n + 1)
    }, 1000)
    return () => clearInterval(iv)
  }, [])

  const rank = getPrestigeRank()
  const bonus = getPrestigeMultiplier()
  const nextReq = rank < PRESETIGE_REQUIREMENTS.length ? PRESETIGE_REQUIREMENTS[rank] : null
  const currentLabel = rank > 0 ? PRESETIGE_REQUIREMENTS[rank - 1].label : 'Unranked'

  const reqMet = (have: number, need: number) => have >= need

  const color = rank >= 20 ? '#ffffff'
    : rank >= 18 ? '#00ffff'
    : rank >= 16 ? '#ff8800'
    : rank >= 14 ? '#44ff44'
    : rank >= 12 ? '#ff44ff'
    : rank >= 10 ? '#ffffff'
    : rank >= 9 ? '#ff00ff'
    : rank >= 6 ? '#ff4488'
    : rank >= 4 ? '#ff8844'
    : rank >= 2 ? '#44ffcc'
    : '#44aaff'

  const rankGlow = rank >= 20
    ? `0 0 40px rgba(255,255,255,0.5), 0 0 80px rgba(0,255,255,0.3)`
    : rank >= 18
    ? `0 0 30px rgba(0,255,255,0.4), 0 0 60px rgba(0,255,255,0.2)`
    : rank >= 16
    ? `0 0 30px rgba(255,136,0,0.4), 0 0 60px rgba(255,136,0,0.2)`
    : rank >= 14
    ? `0 0 30px rgba(68,255,68,0.4), 0 0 60px rgba(68,255,68,0.2)`
    : rank >= 12
    ? `0 0 30px rgba(255,68,255,0.4), 0 0 60px rgba(255,68,255,0.2)`
    : rank >= 10
    ? `0 0 30px rgba(255,255,255,0.3), 0 0 60px rgba(255,0,255,0.2)`
    : rank >= 9
    ? `0 0 20px rgba(255,0,255,0.4), 0 0 40px rgba(255,0,255,0.2)`
    : `0 0 20px ${color}44`

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      zIndex: 9999,
    }}>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          ...UI.button(color),
          padding: '8px 16px',
          fontSize: 11,
          background: `${color}10`,
          border: `1px solid ${color}30`,
          boxShadow: rank >= 9 ? `0 0 15px ${color}44` : 'none',
          animation: rank >= 9 ? 'glow-spin 3s linear infinite' : 'none',
        }}
      >
        {rank >= 9 ? '✦' : '⬡'} Prestige {rank > 0 ? `R${rank}` : ''}
      </button>

      {open && (
        <div style={{
          ...UI.panel({ width: '260px', border: `${color}20` }),
          position: 'absolute',
          bottom: 48,
          right: 0,
          padding: 16,
          boxShadow: `0 8px 32px rgba(0,0,0,0.4), ${rankGlow}`,
        }}>
          {/* Header */}
          <div style={{ ...UI.row(8), marginBottom: 12 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }} />
            <span style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 500, color }}>Prestige Rank {rank}</span>
          </div>

          {/* Current rank label */}
          <div style={{
            fontSize: 28,
            fontWeight: 900,
            fontFamily: 'monospace',
            color,
            textShadow: `0 0 20px ${color}44`,
            marginBottom: 12,
            letterSpacing: 2,
          }}>
            {currentLabel}
          </div>

          {/* Active bonuses */}
          {rank > 0 && (
            <div style={{ ...UI.col(4), marginBottom: 12 }}>
              <div style={{ fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 500, color: '#667', marginBottom: 4 }}>Active Bonuses</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
                <div style={{ ...UI.col(2) }}>
                  <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', color }}>+{Math.round(bonus.damage * 100)}%</span>
                  <span style={{ fontSize: 7, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 500, color: '#445' }}>DMG</span>
                </div>
                <div style={{ ...UI.col(2) }}>
                  <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', color }}>+{Math.round(bonus.harvestYield * 100)}%</span>
                  <span style={{ fontSize: 7, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 500, color: '#445' }}>YIELD</span>
                </div>
                <div style={{ ...UI.col(2) }}>
                  <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', color }}>+{Math.round(bonus.capacity * 100)}%</span>
                  <span style={{ fontSize: 7, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 500, color: '#445' }}>CAP</span>
                </div>
                <div style={{ ...UI.col(2) }}>
                  <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', color }}>+{bonus.interestRate * 100}%</span>
                  <span style={{ fontSize: 7, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 500, color: '#445' }}>APY</span>
                </div>
                <div style={{ ...UI.col(2) }}>
                  <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', color }}>+{Math.round(bonus.dropRate * 100)}%</span>
                  <span style={{ fontSize: 7, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 500, color: '#445' }}>DROPS</span>
                </div>
                <div style={{ ...UI.col(2) }}>
                  <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', color }}>+{Math.round(bonus.speed * 100)}%</span>
                  <span style={{ fontSize: 7, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 500, color: '#445' }}>SPEED</span>
                </div>
                <div style={{ ...UI.col(2) }}>
                  <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', color }}>+{Math.round(bonus.fireRate * 100)}%</span>
                  <span style={{ fontSize: 7, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 500, color: '#445' }}>FIRE</span>
                </div>
                <div style={{ ...UI.col(2) }}>
                  <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', color }}>+{bonus.regen}</span>
                  <span style={{ fontSize: 7, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 500, color: '#445' }}>REGEN</span>
                </div>
                <div style={{ ...UI.col(2) }}>
                  <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', color }}>x{bonus.timeCreditMult}</span>
                  <span style={{ fontSize: 7, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 500, color: '#445' }}>TC$</span>
                </div>
              </div>
            </div>
          )}

          {/* Next rank requirements */}
          {nextReq && (
            <div style={{ ...UI.col(4) }}>
              <div style={{ fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 500, color: '#667', marginBottom: 4 }}>
                Next: {nextReq.label}
              </div>
              {([
                ['Raw', resources.raw, nextReq.raw],
                ['Liquid', resources.liquid, nextReq.liquid],
                ['Vapour', resources.vapour, nextReq.vapour],
                ['Crystal', resources.crystal, nextReq.crystal],
                ['Renown', resources.renown, nextReq.renown],
              ] as const).map(([label, have, need]) => {
                const met = reqMet(have, need)
                const pct = Math.min(1, have / need)
                return (
                  <div key={label} style={{ ...UI.col(2), marginBottom: 4 }}>
                    <div style={{ ...UI.row(), justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 7, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 500, color: met ? color : '#667' }}>{label}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', color: met ? color : '#667' }}>
                        {Math.floor(have).toLocaleString()} / {need.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ width: '100%', height: 2, background: 'rgba(255,255,255,0.04)', borderRadius: 1, overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct * 100}%`,
                        height: '100%',
                        background: `linear-gradient(90deg, ${color}, ${color}88)`,
                        borderRadius: 1,
                        transition: 'width 0.5s ease',
                        boxShadow: `0 0 4px ${color}44`,
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Max rank */}
          {!nextReq && (
            <div style={{
              fontSize: rank >= 20 ? 12 : rank >= 10 ? 11 : 9,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              fontWeight: 500,
              color,
              textAlign: 'center',
              padding: 12,
            }}>
              {rank >= 20
                ? '✦ CHRONOS — YOU ARE THE TIMELINE ITSELF ✦'
                : rank >= 19
                ? '✦ THE END OF TIME — ALL THINGS CONVERGE ✦'
                : rank >= 18
                ? '✦ TRANSCENDENTAL — BEYOND COMPREHENSION ✦'
                : rank >= 16
                ? '✦ INFINITE — YOU ARE EVERYWHERE ✦'
                : rank >= 14
                ? '✦ EPOCH TITAN — YOU SHAPE REALITY ✦'
                : rank >= 12
                ? '✦ PARADOX LORD — YOU BREAK RULES ✦'
                : rank >= 10
                ? '✦ CHRONO GOD — YOU ARE TIME ITSELF ✦'
                : rank === 9
                ? '✦ SINGULARITY — YOU ARE THE TIMELINE ✦'
                : 'Max Prestige — You are Eternal'
              }
            </div>
          )}
        </div>
      )}
    </div>
  )
}
