import { useState, useEffect } from 'react'
import { INSURANCE_PLANS } from '../../config/economy'
import { useStore } from '../../store'

// ── Module-level insurance state ───────────────────────
interface ActivePolicy {
  resource: 'raw' | 'vapour'
  insuredAmount: number
  premiumPaid: number
  expiresAt: number
  active: boolean
}

let _policies: ActivePolicy[] = []
let _totalClaimed = 0

export function getActivePolicies() { return _policies }
export function getTotalClaimed() { return _totalClaimed }

/** Buy an insurance policy */
export function buyInsurance(planIndex: number, amount: number): boolean {
  const plan = INSURANCE_PLANS[planIndex]
  if (!plan) return false

  const state = useStore.getState()
  const premium = Math.ceil(plan.premiumPerUnit * amount)
  if (state.inventory.liquid < premium) return false

  useStore.setState((s) => ({
    inventory: { ...s.inventory, liquid: s.inventory.liquid - premium },
  }))

  _policies.push({
    resource: plan.resource,
    insuredAmount: amount,
    premiumPaid: premium,
    expiresAt: Date.now() + plan.duration,
    active: true,
  })
  return true
}

/** Check if a resource amount is covered by insurance */
export function getCoveredAmount(resource: 'raw' | 'vapour'): number {
  const now = Date.now()
  let total = 0
  for (const p of _policies) {
    if (p.resource !== resource) continue
    if (now > p.expiresAt) continue
    total += p.insuredAmount
  }
  return total
}

/** Claim insurance after decay */
export function claimDecayPayout(resource: 'raw' | 'vapour', decayedAmount: number): number {
  const plan = INSURANCE_PLANS.find(p => p.resource === resource)
  if (!plan) return 0

  const covered = getCoveredAmount(resource)
  if (covered <= 0) return 0

  const payout = Math.floor(Math.min(decayedAmount, covered) * plan.coveragePercent)
  if (payout > 0) {
    useStore.setState((s) => ({
      inventory: { ...s.inventory, liquid: s.inventory.liquid + payout },
    }))
    _totalClaimed += payout
  }
  return payout
}

/** Clean up expired policies */
export function cleanExpiredPolicies() {
  const now = Date.now()
  _policies = _policies.filter(p => now <= p.expiresAt && p.active)
}

interface TimeInsuranceUIProps {
  open: boolean
  onClose: () => void
}

export const TimeInsuranceUI = ({ open, onClose }: TimeInsuranceUIProps) => {
  const liquid = useStore((s) => Math.floor(s.inventory.liquid))
  const [, forceUpdate] = useState(0)
  // Lifted state: insurance amounts per plan index (REACT HOOKS SAFE)
  const [planAmounts, setPlanAmounts] = useState<Record<number, number>>({ 0: 50, 1: 50 })

  useEffect(() => {
    if (!open) return
    const interval = setInterval(() => {
      cleanExpiredPolicies()
      forceUpdate(n => n + 1)
    }, 5000)
    return () => clearInterval(interval)
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-auto">
      <div className="bg-gray-950/95 border border-amber-700/40 rounded-xl shadow-2xl shadow-amber-500/10 w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-amber-800/30 flex items-center justify-between bg-gradient-to-r from-amber-950/30 to-gray-950">
          <div>
            <h2 className="text-white font-bold text-lg tracking-wide flex items-center gap-2">
              <span className="text-amber-400">🛡️</span> Time Insurance
            </h2>
            <p className="text-amber-500/50 text-xs mt-0.5 font-mono">Protect your time from decay.</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1 rounded hover:bg-gray-800">✕</button>
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 120px)' }}>
          {/* Balance */}
          <div className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/30 flex items-center justify-between">
            <span className="text-gray-400 text-xs">Available Liquid</span>
            <span className="text-cyan-300 font-mono text-sm">{liquid} ≈</span>
          </div>

          {/* Active policies */}
          {_policies.length > 0 && (
            <div>
              <h3 className="text-[10px] uppercase tracking-wider text-amber-400 mb-2 font-medium">Active Policies</h3>
              {_policies.map((p, i) => {
                const remaining = Math.max(0, Math.ceil((p.expiresAt - Date.now()) / 1000))
                return (
                  <div key={i} className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/30 mb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-white text-sm font-medium capitalize">{p.resource} Coverage</span>
                      <span className="text-gray-400 text-[10px] font-mono">{remaining}s</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono mt-1">
                      <span>Insured: {p.insuredAmount} {p.resource}</span>
                      <span>Paid: {p.premiumPaid} ≈</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Total claimed */}
          {_totalClaimed > 0 && (
            <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-3 text-center">
              <p className="text-green-400 text-xs font-mono">Total claimed from insurance: {_totalClaimed} ≈</p>
            </div>
          )}

          {/* Insurance plans — FIXED: useState lifted out of loop */}
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-gray-400 mb-2 font-medium">Available Plans</h3>
            {INSURANCE_PLANS.map((plan, i) => {
              const durationMin = Math.floor(plan.duration / 60000)
              const durationSec = Math.floor((plan.duration % 60000) / 1000)
              const amount = planAmounts[i] ?? 50

              return (
                <div key={i} className="bg-gray-800/40 rounded-lg p-4 border border-gray-700/30">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-white text-sm font-bold capitalize">{plan.resource} Shield</p>
                      <p className="text-gray-500 text-[10px]">
                        Covers {(plan.coveragePercent * 100).toFixed(0)}% of decay · {durationMin > 0 ? `${durationMin}m ` : ''}{durationSec}s
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-gray-400 text-[10px]">Amount:</span>
                    <button onClick={() => setPlanAmounts(p => ({ ...p, [i]: Math.max(10, amount - 10) }))}
                      className="w-5 h-5 rounded bg-gray-800 text-white hover:bg-gray-700 text-[10px]">−</button>
                    <span className="text-white font-mono text-xs w-12 text-center">{amount}</span>
                    <button onClick={() => setPlanAmounts(p => ({ ...p, [i]: Math.min(500, amount + 10) }))}
                      className="w-5 h-5 rounded bg-gray-800 text-white hover:bg-gray-700 text-[10px]">+</button>
                    <span className="text-gray-500 text-[10px] font-mono">Premium: {Math.ceil(plan.premiumPerUnit * amount)} ≈</span>
                  </div>

                  <button onClick={() => { if (buyInsurance(i, amount)) forceUpdate(n => n + 1) }}
                    disabled={liquid < Math.ceil(plan.premiumPerUnit * amount)}
                    className={`w-full py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 ${
                      liquid >= Math.ceil(plan.premiumPerUnit * amount)
                        ? 'bg-amber-700/50 hover:bg-amber-600 text-amber-300'
                        : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                    }`}>
                    Buy Policy — {Math.ceil(plan.premiumPerUnit * amount)} ≈
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        <div className="px-5 py-2.5 border-t border-gray-800 text-center">
          <p className="text-gray-600 text-[9px] font-mono">
            <kbd className="bg-gray-800 text-gray-400 px-1 rounded text-[8px]">N</kbd> Insurance
            {' · '}Payouts in Liquid · Expires after duration
          </p>
        </div>
      </div>
    </div>
  )
}
