import { useState, useEffect } from 'react'
import { useStore } from '../../store'
import { SAVINGS_APY, TIME_CDS, LOAN_PRODUCTS } from '../../config/finance'
import {
  depositSavings, withdrawSavings, startCD, claimCD,
  takeLoan, repayLoan, getCDMaturity,
  _savings, _cds, _loans, _totalInterestEarned,
  _totalLoansTaken, _totalLoansDefaulted,
} from '../../systems/BankingSystem'

// ── Banking UI Component ──────────────────────────────
interface TimeBankUIProps {
  open: boolean
  onClose: () => void
}

export const TimeBankUI = ({ open, onClose }: TimeBankUIProps) => {
  const [tab, setTab] = useState<'savings' | 'deposits' | 'loans'>('savings')
  const [depositAmount, setDepositAmount] = useState(20)
  const [withdrawAmount, setWithdrawAmount] = useState(20)
  const [cdAmount, setCdAmount] = useState(50)
  const [, forceUpdate] = useState(0)
  const raw = useStore((s) => Math.floor(s.inventory.raw))

  // Re-render every 2s for CD countdowns
  useEffect(() => {
    if (!open) return
    const interval = setInterval(() => forceUpdate(n => n + 1), 2000)
    return () => clearInterval(interval)
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-auto">
      <div className="bg-gray-950/95 border border-amber-700/40 rounded-xl shadow-2xl shadow-amber-500/10 w-full max-w-lg mx-4 max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-amber-800/30 flex items-center justify-between bg-gradient-to-r from-amber-950/30 to-gray-950">
          <div>
            <h2 className="text-white font-bold text-lg tracking-wide flex items-center gap-2">
              <span className="text-amber-400">🏛️</span> Time Bank
            </h2>
            <p className="text-amber-500/50 text-xs mt-0.5 font-mono">Your time. Invested.</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1 rounded hover:bg-gray-800">✕</button>
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 120px)' }}>
          {/* Balance summary */}
          <div className="flex gap-2 text-[10px] font-mono">
            <div className="flex-1 bg-gray-800/40 rounded p-2 border border-gray-700/30">
              <span className="text-gray-500">Raw </span>
              <span className="text-orange-300">{raw}</span>
            </div>
            <div className="flex-1 bg-gray-800/40 rounded p-2 border border-gray-700/30">
              <span className="text-gray-500">Savings </span>
              <span className="text-amber-300">{_savings.balance}</span>
            </div>
            <div className="flex-1 bg-gray-800/40 rounded p-2 border border-gray-700/30">
              <span className="text-gray-500">Interest </span>
              <span className="text-green-400">+{_totalInterestEarned}</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-800">
            {(['savings', 'deposits', 'loans'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                  tab === t ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-950/20' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {t === 'savings' ? 'Savings' : t === 'deposits' ? 'Time CDs' : 'Loans'}
              </button>
            ))}
          </div>

          {tab === 'savings' && (
            <div className="space-y-3">
              <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-700/30">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white text-sm font-bold">Savings Account</span>
                  <span className="text-green-400 text-xs font-mono">APY: {(SAVINGS_APY * 100).toFixed(1)}%/tick</span>
                </div>
                <p className="text-gray-500 text-[10px] mb-3 font-mono">
                  Balance: {_savings.balance} ⟐ · Total interest earned: {_savings.totalInterestEarned} ⟐
                </p>

                {/* Deposit */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-gray-400 text-[10px] w-14">Deposit:</span>
                  <button onClick={() => setDepositAmount(Math.max(5, depositAmount - 5))}
                    className="w-6 h-6 rounded bg-gray-800 text-white hover:bg-gray-700 text-xs">−</button>
                  <span className="text-white font-mono text-sm w-14 text-center">{depositAmount}</span>
                  <button onClick={() => setDepositAmount(Math.min(500, depositAmount + 5))}
                    className="w-6 h-6 rounded bg-gray-800 text-white hover:bg-gray-700 text-xs">+</button>
                  <button onClick={() => { if (depositSavings(depositAmount)) forceUpdate(n => n + 1) }}
                    disabled={raw < depositAmount}
                    className="flex-1 py-1.5 bg-amber-700/50 hover:bg-amber-600 text-amber-300 text-[10px] font-bold uppercase rounded-lg transition-all active:scale-95 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed">
                    Deposit
                  </button>
                </div>

                {/* Withdraw */}
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-[10px] w-14">Withdraw:</span>
                  <button onClick={() => setWithdrawAmount(Math.max(5, withdrawAmount - 5))}
                    className="w-6 h-6 rounded bg-gray-800 text-white hover:bg-gray-700 text-xs">−</button>
                  <span className="text-white font-mono text-sm w-14 text-center">{withdrawAmount}</span>
                  <button onClick={() => setWithdrawAmount(Math.min(500, withdrawAmount + 5))}
                    className="w-6 h-6 rounded bg-gray-800 text-white hover:bg-gray-700 text-xs">+</button>
                  <button onClick={() => { if (withdrawSavings(withdrawAmount)) forceUpdate(n => n + 1) }}
                    disabled={_savings.balance < withdrawAmount}
                    className="flex-1 py-1.5 bg-gray-700/50 hover:bg-gray-600 text-gray-300 text-[10px] font-bold uppercase rounded-lg transition-all active:scale-95 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed">
                    Withdraw
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === 'deposits' && (
            <div className="space-y-3">
              <p className="text-gray-500 text-[10px] font-mono">
                Lock Raw into Time Deposits for guaranteed returns. Higher durations = higher APY.
              </p>

              {/* Active CDs */}
              {_cds.filter(c => !c.claimed).length > 0 && (
                <div>
                  <h3 className="text-[10px] uppercase tracking-wider text-amber-400 mb-2 font-medium">Active Deposits</h3>
                  {_cds.map((cd, i) => {
                    if (cd.claimed) return null
                    const { matured, remaining, value } = getCDMaturity(cd)
                    const config = TIME_CDS.find(c => c.id === cd.cdId)
                    return (
                      <div key={`cd-${cd.cdId}-${cd.startedAt}`}
                        className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/30 mb-2">
                        <div className="flex items-center justify-between">
                          <span className="text-white text-sm font-medium" style={{ color: config?.color }}>
                            {config?.icon} {config?.name}
                          </span>
                          {matured ? (
                            <button onClick={() => { claimCD(i); forceUpdate(n => n + 1) }}
                              className="px-3 py-1 bg-green-700/50 hover:bg-green-600 text-green-300 text-[10px] font-bold uppercase rounded transition-all">
                              Claim ({value} ⟐)
                            </button>
                          ) : (
                            <span className="text-gray-500 text-[10px] font-mono">
                              {Math.ceil(remaining / 1000)}s
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono mt-1">
                          <span>Invested: {cd.amount} ⟐</span>
                          {!matured && <span>Matures to: {value} ⟐ (+{config ? (config.apy * 100).toFixed(0) : 0}%)</span>}
                        </div>
                        {!matured && (
                          <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden mt-1">
                            <div className="h-full rounded-full bg-amber-500 transition-all duration-1000"
                              style={{ width: `${(1 - remaining / (config?.duration ?? 1)) * 100}%` }} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Available CDs */}
              <div>
                <h3 className="text-[10px] uppercase tracking-wider text-gray-400 mb-2 font-medium">Available Deposits</h3>
                {TIME_CDS.map((cd, i) => (
                  <div key={cd.id} className="bg-gray-800/40 rounded-lg p-4 border border-gray-700/30 mb-2">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span>{cd.icon}</span>
                        <div>
                          <p className="text-white text-sm font-medium" style={{ color: cd.color }}>{cd.name}</p>
                          <p className="text-gray-500 text-[10px]">{Math.floor(cd.duration / 60000)}m {Math.floor((cd.duration % 60000) / 1000)}s · {(cd.apy * 100).toFixed(0)}% APY</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setCdAmount(Math.max(cd.minDeposit, cdAmount - 10))}
                        className="w-6 h-6 rounded bg-gray-800 text-white hover:bg-gray-700 text-xs">−</button>
                      <span className="text-white font-mono text-sm w-14 text-center">{cdAmount}</span>
                      <button onClick={() => setCdAmount(Math.min(cd.maxDeposit, cdAmount + 10))}
                        className="w-6 h-6 rounded bg-gray-800 text-white hover:bg-gray-700 text-xs">+</button>
                      <span className="text-gray-500 text-[9px] font-mono">Min: {cd.minDeposit} Max: {cd.maxDeposit}</span>
                      <button onClick={() => { if (startCD(i, cdAmount)) forceUpdate(n => n + 1) }}
                        disabled={raw < cdAmount || cdAmount < cd.minDeposit || cdAmount > cd.maxDeposit}
                        className="px-3 py-1.5 bg-amber-700/50 hover:bg-amber-600 text-amber-300 text-[10px] font-bold uppercase rounded-lg transition-all active:scale-95 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed">
                        Invest
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'loans' && (
            <div className="space-y-3">
              <p className="text-gray-500 text-[10px] font-mono">
                Borrow Raw against future earnings. Defaulting damages your reputation and resources.
              </p>

              {/* Active loans */}
              {_loans.filter(l => !l.repaid).length > 0 && (
                <div>
                  <h3 className="text-[10px] uppercase tracking-wider text-red-400 mb-2 font-medium">Active Loans</h3>
                  {_loans.map((loan, i) => {
                    if (loan.repaid) return null
                    const config = LOAN_PRODUCTS.find(l => l.id === loan.loanId)
                    const elapsed = Date.now() - loan.borrowedAt
                    const remaining = config ? Math.max(0, config.repaymentPeriod - elapsed) : 0
                    const isDefaulted = loan.defaulted

                    return (
                      <div key={`loan-${loan.loanId}-${loan.borrowedAt}`}
                        className={`rounded-lg p-3 border mb-2 ${
                          isDefaulted ? 'bg-red-900/20 border-red-700/50' : 'bg-gray-800/40 border-gray-700/30'
                        }`}>
                        <div className="flex items-center justify-between">
                          <span className="text-white text-sm font-medium" style={{ color: config?.color }}>
                            {config?.icon} {config?.name}
                          </span>
                          {isDefaulted ? (
                            <span className="text-red-400 text-[10px] font-bold">DEFAULTED</span>
                          ) : !loan.repaid && loan.totalOwed ? (
                            <button onClick={() => { if (repayLoan(i)) forceUpdate(n => n + 1) }}
                              className="px-3 py-1 bg-green-700/50 hover:bg-green-600 text-green-300 text-[10px] font-bold uppercase rounded transition-all">
                              Repay ({loan.totalOwed} ⟐)
                            </button>
                          ) : null}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono mt-1">
                          <span>Borrowed: {loan.amount} ⟐</span>
                          <span>Owe: {loan.totalOwed} ⟐ (+{(config?.interestRate ?? 0) * 100}%)</span>
                        </div>
                        {!isDefaulted && (
                          <div className="text-[9px] text-gray-600 font-mono mt-0.5">
                            {remaining > 0 ? `${Math.ceil(remaining / 1000)}s to repay` : 'OVERDUE!'}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Available loans */}
              <div>
                <h3 className="text-[10px] uppercase tracking-wider text-gray-400 mb-2 font-medium">Available Loans</h3>
                {LOAN_PRODUCTS.map((loan, i) => {
                  const hasActiveLoan = _loans.some(l => !l.repaid && !l.defaulted)
                  return (
                    <div key={loan.id} className="bg-gray-800/40 rounded-lg p-4 border border-gray-700/30 mb-2">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-white text-sm font-medium" style={{ color: loan.color }}>
                            {loan.icon} {loan.name}
                          </p>
                          <p className="text-gray-500 text-[10px]">{loan.description}</p>
                        </div>
                        <button onClick={() => { if (takeLoan(i)) forceUpdate(n => n + 1) }}
                          disabled={hasActiveLoan}
                          className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 ${
                            hasActiveLoan ? 'bg-gray-800 text-gray-600 cursor-not-allowed' :
                            'bg-red-700/50 hover:bg-red-600 text-red-300'
                          }`}>
                          {hasActiveLoan ? 'One Active' : 'Borrow'}
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-gray-600 font-mono">
                        <span>Up to {loan.maxAmount} ⟐ · {(loan.interestRate * 100).toFixed(0)}% interest</span>
                        <span>{Math.floor(loan.repaymentPeriod / 60000)}m to repay · {(loan.defaultPenalty * 100).toFixed(0)}% default penalty</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Loan stats */}
              <div className="text-center text-[9px] text-gray-600 font-mono">
                Loans taken: {_totalLoansTaken} · Defaulted: {_totalLoansDefaulted}
                {_totalLoansDefaulted > 0 && <span className="text-red-400"> ⚠️ Debt collectors may visit</span>}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-gray-800 text-center">
          <p className="text-gray-600 text-[9px] font-mono">
            <kbd className="bg-gray-800 text-gray-400 px-1 rounded text-[8px]">K</kbd> Bank
            {' · '}Interest compounds every 10s · Borrow responsibly
          </p>
        </div>
      </div>
    </div>
  )
}
