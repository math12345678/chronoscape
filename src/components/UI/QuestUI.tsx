import { useState, useEffect } from 'react'
import { getActiveQuests, getCompletedQuestIds, startQuest, claimQuestReward } from '../Quest/QuestGiver'
import { QUESTS } from '../../config/combat'
import type { QuestId } from '../../config/combat'

export const QuestUI = () => {
  const [open, setOpen] = useState(false)
  const [activeQuests, setActiveQuests] = useState(getActiveQuests())
  const [completedIds, setCompletedIds] = useState<string[]>([])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'j' || e.key === 'J') {
        setOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (!open) return
    const interval = setInterval(() => {
      setActiveQuests([...getActiveQuests()])
      setCompletedIds([...getCompletedQuestIds()])
    }, 300)
    return () => clearInterval(interval)
  }, [open])

  // Check for chain quests that can be started
  useEffect(() => {
    const allQuestIds = Object.keys(QUESTS) as QuestId[]
    for (const id of allQuestIds) {
      const qd = QUESTS[id]
      if (completedIds.includes(id)) continue
      if (activeQuests.find(q => q.questId === id)) continue
      if (qd.prerequisiteQuest && !completedIds.includes(qd.prerequisiteQuest)) continue
      startQuest(id)
    }
  }, [completedIds, activeQuests])

  if (!open) return null

  return (
    <div style={{
      position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
      zIndex: 9999, background: 'rgba(10,15,30,0.92)', border: '1px solid rgba(100,100,150,0.3)',
      borderRadius: 12, padding: 20, minWidth: 380, maxHeight: 500, overflow: 'auto',
      fontFamily: 'monospace', color: '#ccc',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 'bold', color: '#ffd700', letterSpacing: 1 }}>
          QUESTS (J)
        </div>
        <button onClick={() => setOpen(false)}
          style={{ background: 'none', border: '1px solid #555', color: '#999', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 12 }}>
          Close
        </button>
      </div>

      {activeQuests.length === 0 && completedIds.length === 0 && (
        <div style={{ color: '#666', textAlign: 'center', padding: 20 }}>
          No quests yet. Find a quest giver NPC around the world!
        </div>
      )}

      {activeQuests.map((q) => {
        const qd = QUESTS[q.questId]
        const progress = qd.objectives.map((obj, i) =>
          Math.min(1, q.stepProgress[i] / obj.targetCount)
        )
        const allDone = progress.every(p => p >= 1)

        return (
          <div key={q.questId} style={{
            border: '1px solid rgba(100,100,150,0.2)',
            borderRadius: 8, padding: 12, marginBottom: 8,
            background: allDone ? 'rgba(68,255,136,0.05)' : 'transparent',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 'bold', color: allDone ? '#44ff88' : '#ffd700', fontSize: 13 }}>
                {qd.title}
              </div>
              <div style={{ fontSize: 11, color: '#666' }}>
                {qd.giver}
              </div>
            </div>
            <div style={{ fontSize: 10, color: '#888', marginTop: 4 }}>
              {qd.description}
            </div>

            {qd.objectives.map((obj, i) => (
              <div key={i} style={{
                fontSize: 10, color: progress[i] >= 1 ? '#44ff88' : '#aaa',
                marginTop: 3, display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span>{progress[i] >= 1 ? '✓' : '○'}</span>
                <span>{obj.description}</span>
                <span style={{ color: '#666', marginLeft: 'auto' }}>
                  {Math.min(obj.targetCount, q.stepProgress[i])}/{obj.targetCount}
                </span>
              </div>
            ))}

            {allDone && !q.claimed && (
              <button onClick={() => { claimQuestReward(q.questId) }}
                style={{
                  marginTop: 8, background: '#44ff8844', border: '1px solid #44ff88',
                  color: '#44ff88', borderRadius: 6, padding: '4px 16px', cursor: 'pointer',
                  fontSize: 11, width: '100%',
                }}>
                Claim Reward
              </button>
            )}

            {/* Rewards preview */}
            <div style={{ fontSize: 9, color: '#666', marginTop: 6, display: 'flex', gap: 8 }}>
              {qd.rewards.renown ? <span>✦ {qd.rewards.renown}</span> : null}
              {qd.rewards.raw ? <span>⬡ {qd.rewards.raw}</span> : null}
              {qd.rewards.liquid ? <span>≈ {qd.rewards.liquid}</span> : null}
              {qd.rewards.crystal ? <span>◇ {qd.rewards.crystal}</span> : null}
              {qd.rewards.weapon ? <span style={{ color: '#ff8844' }}>⚔ {qd.rewards.weapon}</span> : null}
            </div>
          </div>
        )
      })}

      {completedIds.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 6, letterSpacing: 1 }}>
            COMPLETED
          </div>
          {completedIds.map(id => (
            <div key={id} style={{
              fontSize: 11, color: '#44ff8844', padding: '2px 0', display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <span>✓</span> {QUESTS[id as QuestId]?.title ?? id}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
