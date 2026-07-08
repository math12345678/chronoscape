import { useState, useEffect } from 'react'
import {
  getAllRaidBosses, getRaidState, getRaidProgress,
  isRaidUnlocked, startRaid, damageRaidBoss, abortRaid,
} from '../../systems/TemporalRaids'
import { getPrestigeRank } from '../PrestigeSystem'
import { getThreatLevel } from '../../systems/EnemyEvolution'

export const RaidsUI = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [, setRefresh] = useState(0)

  useEffect(() => {
    if (!open) return
    const id = setInterval(() => setRefresh((n) => n + 1), 200)
    return () => clearInterval(id)
  }, [open])

  if (!open) return null

  const bosses = getAllRaidBosses()
  const raidState = getRaidState()
  const progress = getRaidProgress()
  const prestige = getPrestigeRank()
  const threat = getThreatLevel()

  const contStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
  }
  const panelStyle: React.CSSProperties = {
    width: 560, maxHeight: '85vh', overflow: 'auto',
    padding: 24, borderRadius: 12,
    background: 'linear-gradient(180deg, #0d1520, #080e16)',
    border: '1px solid #2a3a50',
  }

  const btn = (color: string, disabled = false): React.CSSProperties => ({
    padding: '8px 20px', borderRadius: 6, fontSize: 12, fontWeight: 700,
    border: `1px solid ${color}`,
    background: `${color}18`,
    color, cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.4 : 1,
  })

  return (
    <div style={contStyle} onClick={onClose}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#ff4444' }}>⚔ Temporal Raids</span>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid #3a4a60', borderRadius: 6, color: '#aaa', padding: '4px 12px', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ fontSize: 11, color: '#5a6a80', marginBottom: 16 }}>
          Won: {progress.totalRaidsWon}/{progress.totalRaidsAttempted} · Prestige {prestige} · Threat {threat}
        </div>

        {/* Active raid display */}
        {raidState.active && raidState.currentBoss && (
          <div style={{
            padding: 16, borderRadius: 8, marginBottom: 16,
            border: '1px solid #ff4444', background: '#ff444408',
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#ff4444', marginBottom: 8 }}>
              Active Raid: {bosses.find((b) => b.id === raidState.currentBoss)?.name ?? raidState.currentBoss}
            </div>
            <div style={{ height: 8, borderRadius: 4, background: '#1a1a2a', marginBottom: 8 }}>
              <div style={{
                height: '100%', borderRadius: 4,
                background: 'linear-gradient(90deg, #ff4444, #ff8844)',
                width: `${Math.max(0, (raidState.bossHealth / raidState.bossMaxHealth) * 100)}%`,
                transition: 'width 0.3s',
              }} />
            </div>
            <div style={{ fontSize: 11, color: '#aaa' }}>
              HP: {Math.floor(raidState.bossHealth).toLocaleString()}/{raidState.bossMaxHealth.toLocaleString()} · Time: {Math.floor(raidState.timeElapsed)}s
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button style={btn('#44ff88')} onClick={() => { damageRaidBoss(100); setRefresh((r) => r + 1) }}>
                Deal 100 DMG
              </button>
              <button style={btn('#ff4444')} onClick={() => { abortRaid(); setRefresh((r) => r + 1) }}>
                Abort
              </button>
            </div>
          </div>
        )}

        {/* Boss list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {bosses.map((boss) => {
            const unlocked = isRaidUnlocked(boss)
            const completed = progress.completedRaids.includes(boss.id)
            const meetsThreat = threat >= boss.threatRequired
            const meetsPrestige = prestige >= boss.prestigeRequired
            const canStart = unlocked && meetsThreat && meetsPrestige && !raidState.active

            return (
              <div key={boss.id} style={{
                padding: 12, borderRadius: 8,
                border: `1px solid ${completed ? boss.color + '44' : unlocked ? boss.color : '#1a1a2a'}`,
                background: completed ? `${boss.color}0a` : unlocked ? '#0a121c' : '#0a0e14',
                opacity: unlocked ? 1 : 0.4,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 24 }}>{boss.icon}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: boss.color }}>
                        {boss.name} <span style={{ fontSize: 10, color: '#5a6a80' }}>Tier {boss.tier}</span>
                      </div>
                      <div style={{ fontSize: 10, color: '#5a6a80' }}>{boss.description}</div>
                      <div style={{ fontSize: 9, color: '#4a5a6a', marginTop: 2 }}>
                        HP: {boss.health.toLocaleString()} · DMG: {boss.damage} · Time: {boss.timeLimit}s
                        {boss.abilities.map((a) => ' · ' + a)}
                      </div>
                    </div>
                  </div>
                  {completed ? (
                    <div style={{ fontSize: 10, color: boss.color, fontWeight: 600 }}>
                      ✓ Completed {progress.bestTimes[boss.id] ? `${progress.bestTimes[boss.id].toFixed(1)}s` : ''}
                    </div>
                  ) : canStart ? (
                    <button style={btn(boss.color)}
                      onClick={() => { startRaid(boss.id); setRefresh((r) => r + 1) }}>
                      Start
                    </button>
                  ) : (
                    <div style={{ fontSize: 9, color: '#3a4a5a' }}>
                      {!unlocked ? `Beat Tier ${boss.tier - 1}` : !meetsThreat ? `Need Threat ${boss.threatRequired}` : `Need Prestige ${boss.prestigeRequired}`}
                    </div>
                  )}
                </div>
                {!completed && (
                  <div style={{ fontSize: 10, color: '#ffd700', marginTop: 4 }}>
                    Reward: 🪨{boss.reward.raw.toLocaleString()} 💧{boss.reward.liquid} 💎{boss.reward.crystal} ⭐{boss.reward.renown}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
