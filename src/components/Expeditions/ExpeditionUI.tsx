import { useState, useEffect } from 'react'
import {
  startExpedition, getActiveExpedition, getCompletedExpeditions,
  getExpeditionDifficultyColor, failExpedition,
} from '../../systems/Expeditions'
import type { ExpeditionDifficulty } from '../../systems/Expeditions'

const DIFF_NAMES: Record<ExpeditionDifficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  legendary: 'Legendary',
}

export const ExpeditionUI = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [active, setActive] = useState(getActiveExpedition())
  const [completed, setCompleted] = useState(getCompletedExpeditions())
  const [, setRefresh] = useState(0)

  useEffect(() => {
    if (!open) return
    const id = setInterval(() => {
      const a = getActiveExpedition()
      setActive(a)
      setCompleted(getCompletedExpeditions())
      setRefresh((r) => r + 1)
    }, 500)
    return () => clearInterval(id)
  }, [open])

  if (!open) return null

  const handleStart = () => {
    const ok = startExpedition()
    if (ok) setActive(getActiveExpedition())
  }

  const handleExit = () => {
    failExpedition()
    setActive(null)
  }

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(4px)',
  }

  const panelStyle: React.CSSProperties = {
    width: 500,
    background: 'linear-gradient(180deg, #0d1520, #080e16)',
    border: '1px solid #2a3a50',
    borderRadius: 12,
    padding: 24,
    boxShadow: '0 0 60px rgba(100,50,255,0.1)',
  }

  const btnStyle = (mainColor: string): React.CSSProperties => ({
    padding: '10px 20px',
    borderRadius: 8,
    border: `1px solid ${mainColor}`,
    background: mainColor + '18',
    color: mainColor,
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    transition: 'all 0.2s',
  })

  return (
    <div style={containerStyle} onClick={onClose}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>
            ⟐ Temporal Expeditions
          </span>
          <button onClick={onClose} style={{
            background: 'none', border: '1px solid #3a4a60', borderRadius: 6,
            color: '#aaa', padding: '4px 12px', cursor: 'pointer', fontSize: 14,
          }}>✕</button>
        </div>

        {active && !active.completed && !active.failed ? (
          /* Active expedition */
          <div>
            <div style={{
              fontSize: 18, fontWeight: 700, color: getExpeditionDifficultyColor(active.def.difficulty),
              marginBottom: 8,
            }}>
              {active.def.name}
              <span style={{ fontSize: 12, marginLeft: 8, opacity: 0.7 }}>
                [{DIFF_NAMES[active.def.difficulty]}]
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#7a8a9a', marginBottom: 12 }}>
              Enemies: {active.def.enemyCount - active.enemiesKilled} remaining &middot;
              Killed: {active.enemiesKilled}
            </div>
            {/* Objectives */}
            {active.def.objectives.map((obj, i) => {
              const pct = active.progress[i] / obj.targetCount
              return (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 13, color: '#ccd', marginBottom: 4 }}>
                    {obj.description} ({active.progress[i]}/{obj.targetCount})
                  </div>
                  <div style={{
                    height: 6, borderRadius: 3, background: '#1a2a3a',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${Math.min(100, pct * 100)}%`,
                      height: '100%',
                      background: pct >= 1 ? '#44ff88' : '#44aaff',
                      borderRadius: 3,
                      transition: 'width 0.3s',
                    }} />
                  </div>
                </div>
              )
            })}
            {/* Exit button */}
            <button style={{ ...btnStyle('#ff4444'), marginTop: 12 }} onClick={handleExit}>
              ✕ Abandon Expedition
            </button>
          </div>
        ) : active?.completed ? (
          /* Completed! */
          <div style={{ textAlign: 'center', padding: 20 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>✦</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#44ff88', marginBottom: 8 }}>
              Expedition Complete!
            </div>
            <div style={{ fontSize: 13, color: '#8a9aaa', marginBottom: 16 }}>
              Rewards have been added to your inventory.
            </div>
            <button style={{ ...btnStyle('#44ff88') }} onClick={() => { setActive(null) }}>
              ⟐ New Expedition
            </button>
          </div>
        ) : active?.failed ? (
          /* Failed */
          <div style={{ textAlign: 'center', padding: 20 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#ff4444', marginBottom: 8 }}>
              Expedition Failed
            </div>
            <div style={{ fontSize: 13, color: '#8a9aaa', marginBottom: 16 }}>
              You ran out of time or were overwhelmed.
            </div>
            <button style={{ ...btnStyle('#ffcc44') }} onClick={() => { setActive(null) }}>
              Try Again
            </button>
          </div>
        ) : (
          /* Start screen */
          <div>
            <div style={{ fontSize: 14, color: '#7a8a9a', marginBottom: 16, lineHeight: 1.5 }}>
              Enter a procedurally-generated pocket dimension. Face enemies, collect crystals,
              destroy cores, or survive the timer. Rewards scale with difficulty.
            </div>
            <div style={{ fontSize: 13, color: '#44ffcc', marginBottom: 16 }}>
              Completed: <b>{completed}</b>
            </div>
            <div style={{ fontSize: 12, color: '#6a7a90', marginBottom: 16 }}>
              Costs scale by difficulty (Raw / Liquid / Renown).
              Make sure you have resources before entering!
            </div>
            <button style={{ ...btnStyle('#44ffaa'), width: '100%' }} onClick={handleStart}>
              ⟐ Generate &amp; Start Expedition
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
