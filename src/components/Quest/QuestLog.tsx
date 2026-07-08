import { useState, useEffect } from 'react'
import type { QuestId } from '../../config/combat'
import { QUESTS, WEAPONS } from '../../config/combat'
import { getActiveQuests, getCompletedQuestIds, startQuest, claimQuestReward, getQuestProgress } from './QuestGiver'

/**
 * Quest log UI panel — shows active quests, available quests, and completed quests.
 * Press J to toggle.
 */
export const QuestLog = () => {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'j' || e.key === 'J') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    const customHandler = () => setOpen((o) => !o)
    window.addEventListener('keydown', handler)
    window.addEventListener('toggle-quest-log', customHandler)
    return () => {
      window.removeEventListener('keydown', handler)
      window.removeEventListener('toggle-quest-log', customHandler)
    }
  }, [])

  // Re-render every second for progress updates
  const [, forceUpdate] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => forceUpdate((n) => n + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  if (!open) return null

  const allQuestIds = Object.keys(QUESTS) as QuestId[]
  const active = getActiveQuests()
  const completed = getCompletedQuestIds()

  // Determine available quests (unlocked by preconditions)
  const available = allQuestIds.filter((id) => {
    if (completed.includes(id)) return false
    if (active.find((q) => q.questId === id)) return false
    const qd = QUESTS[id]
    if (qd.prerequisiteQuest && !completed.includes(qd.prerequisiteQuest)) return false
    return true
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-auto">
      <div className="bg-gray-900/95 border border-gray-700/50 rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between sticky top-0 bg-gray-900/95">
          <h2 className="text-white font-bold text-sm tracking-wide uppercase">Quest Log</h2>
          <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white transition-colors text-lg leading-none">✕</button>
        </div>

        {/* Active quests */}
        {active.length > 0 && (
          <div className="px-5 py-4 border-b border-gray-800">
            <h3 className="text-[10px] uppercase tracking-wider text-teal-400 mb-3 font-medium">Active</h3>
            {active.map((q) => {
              const qd = QUESTS[q.questId]
              const progress = getQuestProgress(q.questId)
              return (
                <div key={q.questId} className="bg-gray-800/50 rounded-lg p-3 mb-2 border border-gray-700/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-sm font-medium">{qd.title}</span>
                    <span className="text-[10px] text-gray-400">{Math.round(progress * 100)}%</span>
                  </div>
                  <p className="text-[11px] text-gray-400 mb-2">{qd.description}</p>
                  {qd.objectives.map((obj, i) => {
                    const cur = Math.min(obj.targetCount, q.stepProgress[i] ?? 0)
                    return (
                      <div key={i} className="flex items-center justify-between text-[10px] text-gray-500 py-0.5">
                        <span className={cur >= obj.targetCount ? 'text-teal-400' : ''}>{obj.description}</span>
                        <span className={cur >= obj.targetCount ? 'text-teal-400' : ''}>{cur}/{obj.targetCount}</span>
                      </div>
                    )
                  })}
                    {q.completed && !q.claimed && (
                      <button
                        onClick={() => claimQuestReward(q.questId)}
                        className="mt-2 w-full text-[10px] uppercase tracking-wider bg-teal-700/50 hover:bg-teal-600 text-teal-300 rounded py-1.5 transition-colors"
                      >
                        Claim Rewards (+{qd.rewards.renown}R {qd.rewards.raw ? `${qd.rewards.raw} Raw ` : ''}{qd.rewards.liquid ? `${qd.rewards.liquid} Liq ` : ''}{qd.rewards.weapon ? `⚔ ${WEAPONS[qd.rewards.weapon]?.name ?? qd.rewards.weapon} ` : ''})
                      </button>
                    )}
                  {q.claimed && (
                    <p className="mt-1 text-[10px] text-teal-500 text-center">✓ Completed</p>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Available quests */}
        {available.length > 0 && (
          <div className="px-5 py-4 border-b border-gray-800">
            <h3 className="text-[10px] uppercase tracking-wider text-gray-400 mb-3 font-medium">Available</h3>
            {available.map((id) => {
              const qd = QUESTS[id as QuestId]
              return (
                <div key={id} className="bg-gray-800/30 rounded-lg p-3 mb-2 border border-gray-700/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-gray-300 text-sm font-medium">{qd.title}</span>
                    <span className="text-[9px] text-gray-500">{qd.giver === 'auto' ? 'Auto-track' : `See ${qd.giver}`}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mb-1">{qd.description}</p>
                  <p className="text-[9px] text-gray-600">
                    Rewards: {qd.rewards.renown}R {qd.rewards.raw ? `· ${qd.rewards.raw} Raw ` : ''}{qd.rewards.liquid ? `· ${qd.rewards.liquid} Liq` : ''}{qd.rewards.crystal ? `· ${qd.rewards.crystal} Cry` : ''}{qd.rewards.weapon ? `· ${qd.rewards.weapon}` : ''}
                  </p>
                  {qd.giver !== 'auto' && (
                    <button
                      onClick={() => startQuest(id as QuestId)}
                      className="mt-2 text-[10px] uppercase tracking-wider bg-gray-700/50 hover:bg-gray-600 text-gray-300 rounded px-3 py-1 transition-colors"
                    >
                      Accept
                    </button>
                  )}
                  {qd.giver === 'auto' && (
                    <p className="mt-1.5 text-[8px] text-gray-600 italic">Tracks automatically as you play</p>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Completed quests */}
        {completed.length > 0 && (
          <div className="px-5 py-4">
            <h3 className="text-[10px] uppercase tracking-wider text-gray-500 mb-3 font-medium">Completed ({completed.length})</h3>
            <div className="flex flex-wrap gap-1.5">
              {completed.map((id) => (
                <span key={id} className="text-[10px] text-teal-500 bg-teal-900/20 rounded px-2 py-0.5">
                  {QUESTS[id as QuestId]?.title ?? id}
                </span>
              ))}
            </div>
          </div>
        )}

        {active.length === 0 && available.length === 0 && completed.length === 0 && (
          <div className="px-5 py-8 text-center text-gray-500 text-xs">
            No quests available yet. Visit the Lab for quests.
          </div>
        )}

        {/* Footer hint */}
        <div className="px-5 py-3 border-t border-gray-800 text-[8px] text-gray-600 text-center">
          Press J to close · Quests auto-track your progress
        </div>
      </div>
    </div>
  )
}
