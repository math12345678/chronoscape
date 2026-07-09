import { useState, useEffect } from 'react'
import { getAllTiers } from '../../systems/InfiniteWorldGenerator'
import { getCurrentEpoch, getTotalContentGenerated } from '../../systems/EvolvingContentEngine'
import { getDifficultyScore, getEvolutionStage, getActiveModifiers, getSynergies } from '../../systems/AdaptiveDifficultySystem'
import { getTotalProgressionLevel, getTotalDamageBonus, getTotalHarvestBonus, getTotalSpeedBonus, getTotalDefenseBonus } from '../../systems/InfiniteProgression'

interface Props { open: boolean; onClose: () => void }

export const EvolutionDashboardUI = ({ open, onClose }: Props) => {
  const [tab, setTab] = useState<'overview' | 'biomes' | 'difficulty'>('overview')
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    if (!open) return
    const interval = setInterval(() => forceUpdate(n => n + 1), 2000)
    return () => clearInterval(interval)
  }, [open])

  if (!open) return null

  const tiers = getAllTiers()
  const epoch = getCurrentEpoch()
  const totalContent = getTotalContentGenerated()
  const diffScore = getDifficultyScore()
  const evoStage = getEvolutionStage()
  const modifiers = getActiveModifiers()
  const synergies = getSynergies()
  const totalLevel = getTotalProgressionLevel()

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
            🌌 EVOLUTION DASHBOARD
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {['overview', 'biomes', 'difficulty'].map(t => (
              <button key={t} onClick={() => setTab(t as any)} style={{
                padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(68,255,204,0.2)',
                background: tab === t ? 'rgba(68,255,204,0.2)' : 'transparent',
                color: tab === t ? '#44ffcc' : 'rgba(255,255,255,0.4)',
                cursor: 'pointer', fontFamily: 'monospace', fontSize: 10,
              }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
            ))}
            <button onClick={onClose} style={{
              background: 'rgba(255,0,0,0.15)', border: '1px solid rgba(255,0,0,0.3)',
              color: '#ff4444', borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
              fontFamily: 'monospace', fontSize: 11,
            }}>✕</button>
          </div>
        </div>

        {tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <StatCard label="Current Epoch" value={`${epoch}`} color="#ffd700" />
            <StatCard label="Evolution Stage" value={`${evoStage}`} color="#ff4488" />
            <StatCard label="Difficulty Score" value={`${diffScore.toFixed(0)}`} color="#ff4444" />
            <StatCard label="Content Generated" value={`${totalContent}`} color="#44ff88" />
            <StatCard label="Progression Level" value={`${totalLevel}`} color="#44aaff" />
            <StatCard label="Biome Tiers" value={`${tiers.length}`} color="#aa44ff" />
            <StatCard label="Active Modifiers" value={`${modifiers.length}`} color="#ff8844" />
            <StatCard label="Synergies" value={`${synergies.length}`} color="#ff00ff" />
            <StatCard label="Damage Bonus" value={`+${(getTotalDamageBonus() * 100).toFixed(0)}%`} color="#ff4444" />
            <StatCard label="Harvest Bonus" value={`+${(getTotalHarvestBonus() * 100).toFixed(0)}%`} color="#ffd700" />
            <StatCard label="Speed Bonus" value={`+${(getTotalSpeedBonus() * 100).toFixed(0)}%`} color="#44ff88" />
            <StatCard label="Defense Bonus" value={`+${(getTotalDefenseBonus() * 100).toFixed(0)}%`} color="#44aaff" />
          </div>
        )}

        {tab === 'biomes' && (
          <div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 8 }}>Biome Tiers (distance-based):</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {tiers.map(t => (
                <div key={t.id} style={{
                  padding: 8, borderRadius: 6, fontSize: 11,
                  border: `1px solid ${t.color}33`,
                  background: `${t.color}08`,
                }}>
                  <span style={{ color: t.color, fontWeight: 'bold' }}>{t.name}</span>
                  <span style={{ color: 'rgba(255,255,255,0.3)', marginLeft: 8 }}>
                    {t.minDistance}-{t.maxDistance === Infinity ? '∞' : t.maxDistance}u
                  </span>
                  <div style={{ color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                    {t.description} | Enemies: x{t.enemyMultiplier} | Resources: x{t.resourceMultiplier}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'difficulty' && (
          <div>
            {modifiers.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 6 }}>Active Difficulty Modifiers:</div>
                {modifiers.map(m => (
                  <div key={m.id} style={{
                    padding: 8, borderRadius: 6, marginBottom: 6, fontSize: 11,
                    border: `1px solid ${m.color}44`, background: `${m.color}08`,
                  }}>
                    <div>
                      <span style={{ color: m.color, fontWeight: 'bold' }}>{m.name}</span>
                      <span style={{ color: 'rgba(255,255,255,0.3)', marginLeft: 6 }}>×{m.magnitude.toFixed(1)}</span>
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.5)' }}>{m.description}</div>
                  </div>
                ))}
              </div>
            )}

            {synergies.length > 0 && (
              <div>
                <div style={{ color: '#ff00ff', fontSize: 11, marginBottom: 6 }}>⚠ Active Synergies:</div>
                {synergies.map(s => (
                  <div key={s.id} style={{
                    padding: 8, borderRadius: 6, marginBottom: 6, fontSize: 11,
                    border: `1px solid ${s.color}66`, background: `${s.color}11`,
                  }}>
                    <div>
                      <span style={{ color: s.color, fontWeight: 'bold' }}>{s.name}</span>
                      <span style={{ color: 'rgba(255,255,255,0.3)', marginLeft: 6 }}>×{s.magnitude.toFixed(1)}</span>
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.5)' }}>{s.description}</div>
                  </div>
                ))}
              </div>
            )}

            {modifiers.length === 0 && synergies.length === 0 && (
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center', padding: 20 }}>
                No active modifiers yet. The world is still stable...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      padding: 12, borderRadius: 8, border: `1px solid ${color}22`,
      background: `${color}06`,
    }}>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginBottom: 4 }}>{label}</div>
      <div style={{ color, fontSize: 18, fontWeight: 'bold' }}>{value}</div>
    </div>
  )
}
