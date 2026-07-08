import { useState, useEffect } from 'react'
import {
  getKnowledgePaths, getMasteryRanks, getDimensionalPerks,
  getProceduralMilestones, getTotalProgressionLevel, getTotalXPEarned,
  levelKnowledge, getKnowledgeCost, canLevelKnowledge,
  addMasteryXP, unlockDimensionalPerk, completeMilestone,
  initializeDimensionalPerks, generateMilestone,
} from '../../systems/InfiniteProgression'
import type { KnowledgePath, MasteryRank, DimensionalPerk, ProceduralMilestone } from '../../systems/InfiniteProgression'
import { useStore } from '../../store'

interface Props { open: boolean; onClose: () => void }

export const InfiniteProgressionUI = ({ open, onClose }: Props) => {
  const [tab, setTab] = useState<'knowledge' | 'mastery' | 'perks' | 'milestones'>('knowledge')
  const [, forceUpdate] = useState(0)
  const redraw = () => forceUpdate(n => n + 1)

  useEffect(() => {
    if (!open) return
    initializeDimensionalPerks(3)
    const interval = setInterval(() => forceUpdate(n => n + 1), 3000)
    return () => clearInterval(interval)
  }, [open])

  if (!open) return null

  const knowledge = getKnowledgePaths()
  const mastery = getMasteryRanks()
  const perks = getDimensionalPerks()
  const milestones = getProceduralMilestones()
  const totalLevel = getTotalProgressionLevel()
  const totalXP = getTotalXPEarned()

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)', fontFamily: 'monospace',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'rgba(5,10,25,0.97)', border: '1px solid rgba(68,255,204,0.3)',
        borderRadius: 12, padding: 24, maxWidth: 700, width: '95%',
        maxHeight: '85vh', overflow: 'auto', color: '#fff',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ color: '#44ffcc', fontSize: 16, letterSpacing: 2, fontWeight: 'bold' }}>
            ♾ INFINITE PROGRESSION
          </span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', padding: '4px 8px', background: 'rgba(68,255,204,0.1)', borderRadius: 4 }}>
              Lv.{totalLevel}
            </span>
            {['knowledge', 'mastery', 'perks', 'milestones'].map(t => (
              <button key={t} onClick={() => setTab(t as any)} style={{
                padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(68,255,204,0.2)',
                background: tab === t ? 'rgba(68,255,204,0.2)' : 'transparent',
                color: tab === t ? '#44ffcc' : 'rgba(255,255,255,0.4)',
                cursor: 'pointer', fontFamily: 'monospace', fontSize: 9,
              }}>{t.slice(0, 3)}</button>
            ))}
            <button onClick={onClose} style={{
              background: 'rgba(255,0,0,0.15)', border: '1px solid rgba(255,0,0,0.3)',
              color: '#ff4444', borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
              fontFamily: 'monospace', fontSize: 11,
            }}>✕</button>
          </div>
        </div>

        {tab === 'knowledge' && <KnowledgePanel knowledge={knowledge} redraw={redraw} />}
        {tab === 'mastery' && <MasteryPanel mastery={mastery} redraw={redraw} />}
        {tab === 'perks' && <PerksPanel perks={perks} redraw={redraw} />}
        {tab === 'milestones' && <MilestonesPanel milestones={milestones} redraw={redraw} />}
      </div>
    </div>
  )
}

function KnowledgePanel({ knowledge, redraw }: { knowledge: KnowledgePath[]; redraw: () => void }) {
  const inv = useStore.getState().inventory
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {knowledge.map(kp => {
        const cost = getKnowledgeCost(kp.id)
        const canAfford = inv.raw >= cost
        const effectVal = kp.effectValue(kp.level)
        return (
          <div key={kp.id} style={{
            padding: 10, borderRadius: 8,
            border: `1px solid ${kp.color}33`, background: `${kp.color}06`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ color: kp.color, fontWeight: 'bold', fontSize: 13 }}>{kp.icon} {kp.name}</span>
                <span style={{ color: 'rgba(255,255,255,0.3)', marginLeft: 8, fontSize: 11 }}>
                  Lv.{kp.level}
                </span>
              </div>
              <button
                disabled={!canAfford}
                onClick={() => {
                  // Deduct cost
                  useStore.setState(s => ({ inventory: { ...s.inventory, raw: s.inventory.raw - cost } }))
                  levelKnowledge(kp.id, true)
                  redraw()
                }}
                style={{
                  padding: '4px 12px', borderRadius: 6, border: 'none', cursor: canAfford ? 'pointer' : 'default',
                  fontFamily: 'monospace', fontSize: 10, fontWeight: 'bold',
                  background: canAfford ? 'linear-gradient(135deg, #44ffcc, #44aaff)' : 'rgba(255,255,255,0.05)',
                  color: canAfford ? '#000' : 'rgba(255,255,255,0.3)',
                  opacity: canAfford ? 1 : 0.5,
                }}
              >
                {cost.toLocaleString()} Raw
              </button>
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{kp.description}</div>
            <div style={{ fontSize: 10, color: kp.color, marginTop: 2 }}>{kp.perLevelEffect.replace('X', `${effectVal.toFixed(1)}`)}</div>
          </div>
        )
      })}
    </div>
  )
}

function MasteryPanel({ mastery, redraw }: { mastery: MasteryRank[]; redraw: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {mastery.map(m => {
        const pct = m.xpToNext > 0 ? Math.min(100, (m.xp / m.xpToNext) * 100) : 0
        return (
          <div key={m.id} style={{
            padding: 10, borderRadius: 8,
            border: `1px solid ${m.color}33`, background: `${m.color}06`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ color: m.color, fontWeight: 'bold', fontSize: 13 }}>{m.icon} {m.name}</span>
                <span style={{ color: 'rgba(255,255,255,0.3)', marginLeft: 8, fontSize: 11 }}>
                  Rank {m.rank}
                </span>
              </div>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                {m.xp}/{m.xpToNext} XP
              </span>
            </div>
            <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, marginTop: 4 }}>
              <div style={{ width: `${pct}%`, height: '100%', background: m.color, borderRadius: 2 }} />
            </div>
            <div style={{ fontSize: 10, color: m.color, marginTop: 2 }}>
              {m.bonusPerRank} (total: +{m.bonusValue * m.rank})
            </div>
          </div>
        )
      })}
    </div>
  )
}

function PerksPanel({ perks, redraw }: { perks: DimensionalPerk[]; redraw: () => void }) {
  const inv = useStore.getState().inventory
  const activeCount = perks.filter(p => p.active).length

  if (perks.length === 0) {
    return <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center', padding: 20 }}>Explore dimensional gates to unlock perks.</div>
  }

  return (
    <div>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 8 }}>
        Active Perks: {activeCount} | Shards: {inv.shards?.toLocaleString() ?? 0}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {perks.map(p => (
          <div key={p.id} style={{
            padding: 8, borderRadius: 6, fontSize: 11,
            border: `1px solid ${p.active ? `${p.color}44` : 'rgba(255,255,255,0.08)'}`,
            background: p.active ? `${p.color}08` : 'rgba(255,255,255,0.02)',
            opacity: p.active ? 1 : 0.6,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ color: p.color, fontWeight: 'bold' }}>{p.icon} {p.name}</span>
                <span style={{ color: 'rgba(255,255,255,0.3)', marginLeft: 6 }}>D{p.dimension + 1}</span>
              </div>
              {!p.active && (
                <button
                  disabled={(inv.shards ?? 0) < p.costShards}
                  onClick={() => {
                    if (unlockDimensionalPerk(p.id, inv.shards ?? 0)) {
                      useStore.setState(s => ({ inventory: { ...s.inventory, shards: (s.inventory.shards ?? 0) - p.costShards } }))
                      redraw()
                    }
                  }}
                  style={{
                    padding: '2px 8px', borderRadius: 4, border: 'none', cursor: 'pointer',
                    fontFamily: 'monospace', fontSize: 10,
                    background: (inv.shards ?? 0) >= p.costShards ? '#ffd700' : 'rgba(255,255,255,0.1)',
                    color: (inv.shards ?? 0) >= p.costShards ? '#000' : 'rgba(255,255,255,0.3)',
                  }}
                >
                  {p.costShards} shards
                </button>
              )}
              {p.active && <span style={{ color: '#44ff88', fontSize: 10 }}>✓ ACTIVE</span>}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)' }}>{p.description}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MilestonesPanel({ milestones, redraw }: { milestones: ProceduralMilestone[]; redraw: () => void }) {
  const completed = milestones.filter(m => m.completed).length

  if (milestones.length === 0) {
    return <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center', padding: 20 }}>No milestones yet. Keep playing!</div>
  }

  return (
    <div>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 8 }}>
        Completed: {completed} / {milestones.length}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {milestones.map(m => (
          <div key={m.id} style={{
            padding: 8, borderRadius: 6, fontSize: 11,
            border: `1px solid ${m.completed ? `${m.color}44` : 'rgba(255,255,255,0.08)'}`,
            background: m.completed ? `${m.color}08` : 'rgba(255,255,255,0.02)',
            opacity: m.completed ? 1 : 0.7,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: m.completed ? m.color : 'rgba(255,255,255,0.5)' }}>
                {m.completed ? '✅' : '⬜'} {m.icon} {m.title}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>
                +{m.rewardValue} {m.reward}
              </span>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.4)' }}>{m.description}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
