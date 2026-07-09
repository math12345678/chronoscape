import { useState, useEffect } from 'react'
import {
  acceptBounty,
  _bounties, _activeBountyId, _bountyProgress, _bountyStartTime, _bountyCompleted,
} from '../../systems/BountySystem'

interface BountyBoardUIProps {
  open: boolean
  onClose: () => void
}

export const BountyBoardUI = ({ open, onClose }: BountyBoardUIProps) => {
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    if (!open) return
    const interval = setInterval(() => forceUpdate(n => n + 1), 2000)
    return () => clearInterval(interval)
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-auto">
      <div className="bg-gray-950/95 border border-red-700/40 rounded-xl shadow-2xl shadow-red-500/10 w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-red-800/30 flex items-center justify-between bg-gradient-to-r from-red-950/30 to-gray-950">
          <div>
            <h2 className="text-white font-bold text-lg tracking-wide flex items-center gap-2">
              <span className="text-red-400">🎯</span> Bounty Board
            </h2>
            <p className="text-red-500/50 text-xs mt-0.5 font-mono">Hunt. Collect. Profit.</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1 rounded hover:bg-gray-800">✕</button>
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 120px)' }}>
          {/* Active bounty */}
          {_activeBountyId && (() => {
            const bounty = _bounties.find(b => b.id === _activeBountyId)
            if (!bounty) return null
            const progress = _bountyProgress[_activeBountyId] ?? 0
            const hasTimeLimit = bounty.timeLimit > 0
            const remaining = hasTimeLimit ? Math.max(0, Math.ceil((bounty.timeLimit - (Date.now() - (_bountyStartTime[_activeBountyId] ?? Date.now()))) / 1000)) : -1

            return (
              <div className="bg-red-900/20 border border-red-700/40 rounded-lg p-4">
                <p className="text-red-400 text-xs uppercase tracking-wider font-bold mb-2">Active Bounty</p>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white font-bold">{bounty.icon} {bounty.target}</span>
                  <span className="text-white font-mono text-sm">{progress}/{bounty.targetCount}</span>
                </div>
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mb-1">
                  <div className="h-full rounded-full bg-red-500 transition-all duration-500"
                    style={{ width: `${(progress / bounty.targetCount) * 100}%` }} />
                </div>
                {hasTimeLimit && (
                  <p className="text-gray-500 text-[10px] font-mono">{remaining}s remaining</p>
                )}
              </div>
            )
          })()}

          {/* Bounty list */}
          {_bounties.map((bounty) => {
            const isActive = _activeBountyId === bounty.id
            const isDone = _bountyCompleted.includes(bounty.id)
            return (
              <div key={bounty.id}
                className={`bg-gray-800/40 rounded-lg p-4 border transition-all ${
                  isDone ? 'border-green-700/30 opacity-60' :
                  isActive ? 'border-red-700/50' : 'border-gray-700/30 hover:border-red-700/40'
                }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span>{bounty.icon}</span>
                    <div>
                      <p className="text-white text-sm font-bold">{bounty.target}</p>
                      <p className="text-gray-500 text-[10px]">Kill {bounty.targetCount}</p>
                    </div>
                  </div>
                  {isDone ? (
                    <span className="text-green-400 text-[10px] font-bold">✓ Completed</span>
                  ) : isActive ? (
                    <span className="text-red-400 text-[10px] font-bold">Active</span>
                  ) : (
                    <button onClick={() => { acceptBounty(bounty.id); forceUpdate(n => n + 1) }}
                      disabled={!!_activeBountyId}
                      className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 ${
                        _activeBountyId ? 'bg-gray-800 text-gray-600 cursor-not-allowed' :
                        'bg-red-700/50 hover:bg-red-600 text-red-300'
                      }`}>
                      {_activeBountyId ? 'Busy' : 'Accept'}
                    </button>
                  )}
                </div>
                <div className="flex gap-2 text-[10px] text-gray-500 font-mono">
                  <span>Reward: {bounty.reward.renown}✦ {bounty.reward.liquid ? `${bounty.reward.liquid}≈ ` : ''}{bounty.reward.crystal ? `${bounty.reward.crystal}◆` : ''}</span>
                  {bounty.timeLimit > 0 && <span>· {Math.floor(bounty.timeLimit / 60000)}m time limit</span>}
                </div>
              </div>
            )
          })}
        </div>

        <div className="px-5 py-2.5 border-t border-gray-800 text-center">
          <p className="text-gray-600 text-[9px] font-mono">
            <kbd className="bg-gray-800 text-gray-400 px-1 rounded text-[8px]">B</kbd> Bounties
            {' · '}One bounty at a time · Rewards auto-claim
          </p>
        </div>
      </div>
    </div>
  )
}
