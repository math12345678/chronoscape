import { useState, useEffect } from 'react'
import { useStore } from '../../store'
import {
  getArenaState, startArena, startNextWave,
  endArena, recordArenaKill, getCurrentWaveInfo,
} from '../../systems/ChallengeArena'

export const ChallengeArenaUI = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const inventory = useStore((s) => s.inventory)
  const [arena, setArena] = useState(getArenaState())
  const [waveInfo, setWaveInfo] = useState(getCurrentWaveInfo())
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const id = setInterval(() => {
      setArena(getArenaState())
      setWaveInfo(getCurrentWaveInfo())
    }, 200)
    return () => clearInterval(id)
  }, [open])

  if (!open) return null

  const containerStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
  }

  const panelStyle: React.CSSProperties = {
    width: 480, maxHeight: '85vh', overflow: 'auto',
    background: 'linear-gradient(180deg, #0d1520, #080e16)',
    border: '1px solid #2a3a50', borderRadius: 12, padding: 24,
    boxShadow: '0 0 60px rgba(255,68,0,0.1)',
  }

  const btnStyle = (color: string, disabled = false): React.CSSProperties => ({
    padding: '10px 20px', borderRadius: 8,
    border: `1px solid ${disabled ? '#3a4a50' : color}`,
    background: disabled ? 'transparent' : color + '18',
    color: disabled ? '#3a4a5a' : color,
    fontWeight: 700, fontSize: 14, cursor: disabled ? 'default' : 'pointer',
    width: '100%', opacity: disabled ? 0.4 : 1,
  })

  return (
    <div style={containerStyle} onClick={onClose}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#ff6644' }}>
            ⚔ Challenge Arena
          </span>
          <button onClick={onClose} style={{
            background: 'none', border: '1px solid #3a4a60', borderRadius: 6,
            color: '#aaa', padding: '4px 12px', cursor: 'pointer', fontSize: 14,
          }}>✕</button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'Best Wave', value: String(arena.bestWave), color: '#ffd700' },
            { label: 'Total Runs', value: String(arena.totalRuns), color: '#44aaff' },
            { label: 'Arena Kills', value: String(arena.totalKills), color: '#ff6644' },
          ].map((s) => (
            <div key={s.label} style={{
              padding: 8, borderRadius: 6, background: '#0e1622',
              border: '1px solid #1a2a3a', textAlign: 'center',
            }}>
              <div style={{ fontSize: 10, color: '#5a6a80' }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Active arena info */}
        {arena.active ? (
          <div>
            {waveInfo ? (
              /* Wave active */
              <div style={{
                padding: 16, borderRadius: 8, background: '#0a1a20',
                border: '1px solid #1a3a2a', marginBottom: 12,
              }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#44ffcc', marginBottom: 8 }}>
                  Wave {waveInfo.wave}
                </div>
                <div style={{ fontSize: 13, color: '#7a8a9a', marginBottom: 4 }}>
                  Enemies remaining: {waveInfo.enemiesRemaining}/{waveInfo.maxEnemies}
                </div>
                <div style={{
                  height: 8, borderRadius: 4, background: '#1a2a3a',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${(1 - waveInfo.enemiesRemaining / waveInfo.maxEnemies) * 100}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #44ffcc, #44aaff)',
                    borderRadius: 4, transition: 'width 0.3s',
                  }} />
                </div>
                <div style={{ fontSize: 11, color: '#5a6a80', marginTop: 4 }}>
                  Time limit: {waveInfo.timeLimit}s
                </div>
              </div>
            ) : (
              /* Between waves */
              <div style={{ textAlign: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 14, color: '#7a8a9a', marginBottom: 8 }}>
                  Wave {arena.currentWave} complete!
                </div>
                <button style={btnStyle('#44ffcc')} onClick={() => {
                  const w = startNextWave()
                  if (w) setWaveInfo(getCurrentWaveInfo())
                }}>
                  Start Wave {arena.currentWave + 1}
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ ...btnStyle('#44ff88'), flex: 1 }} onClick={() => {
                recordArenaKill()
              }}>
                +1 Kill (test)
              </button>
              <button style={{ ...btnStyle('#ff4444'), width: 'auto', padding: '10px 16px' }}
                onClick={() => { endArena(); setArena(getArenaState()) }}>
                Surrender
              </button>
            </div>
          </div>
        ) : (
          /* Start screen */
          <div>
            <div style={{
              fontSize: 13, color: '#7a8a9a', marginBottom: 16, lineHeight: 1.5,
            }}>
              Enter the arena and face wave after wave of increasingly difficult enemies.
              Each wave rewards Raw and Renown. How far can you make it?
            </div>
            <div style={{
              padding: 10, borderRadius: 6, background: '#0a0e14',
              border: '1px solid #1a2a3a', marginBottom: 16,
            }}>
              <div style={{ fontSize: 11, color: '#5a6a80' }}>
                Entry cost: <b style={{ color: '#44ffcc' }}>{arena.entryCost} Raw</b>
              </div>
              <div style={{ fontSize: 11, color: '#5a6a80' }}>
                Waves: <b style={{ color: '#44aaff' }}>30</b> &middot;
                Difficulty scales with each wave &middot; Time limit per wave
              </div>
            </div>
            <button style={btnStyle('#ff6644', inventory.raw < arena.entryCost)}
              disabled={inventory.raw < arena.entryCost}
              onClick={() => {
                const ok = startArena()
                if (ok) {
                  setArena(getArenaState())
                  setMessage('Arena started! Press "Start Wave 1" to begin.')
                }
              }}>
              {inventory.raw < arena.entryCost ? 'Not enough Raw' : '⚔ Enter Arena'}
            </button>
            {message && (
              <div style={{
                marginTop: 8, fontSize: 12, color: '#44ffcc', textAlign: 'center',
              }}>
                {message}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
