import { useState } from 'react'
import {
  getActiveProphecies, getAllProphecies, getCompletedCount, getMaxActiveProphecies,
  drawProphecy, getProphecyProgress,
} from '../../systems/TemporalProphecy'

interface Props { open: boolean; onClose: () => void }

export const TemporalProphecyUI = ({ open, onClose }: Props) => {
  const [tab, setTab] = useState<'active' | 'history'>('active')
  const [, forceUpdate] = useState(0)
  const redraw = () => forceUpdate(n => n + 1)

  const active = getActiveProphecies()
  const allProphecies = getAllProphecies()
  const maxActive = getMaxActiveProphecies()
  const completed = getCompletedCount()

  if (!open) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)', fontFamily: 'monospace',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'rgba(5,10,25,0.97)', border: '1px solid rgba(255,215,0,0.3)',
        borderRadius: 12, padding: 24, maxWidth: 600, width: '95%',
        maxHeight: '85vh', overflow: 'auto', color: '#fff',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ color: '#ffd700', fontSize: 18, letterSpacing: 2, fontWeight: 'bold' }}>
            🔮 TEMPORAL PROPHECY
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', padding: '4px 8px', background: 'rgba(255,215,0,0.1)', borderRadius: 4 }}>
              Active: {active.length}/{maxActive}
            </span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', padding: '4px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: 4 }}>
              Fulfilled: {completed}
            </span>
            {['active', 'history'].map(t => (
              <button key={t} onClick={() => setTab(t as any)} style={{
                padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,215,0,0.2)',
                background: tab === t ? 'rgba(255,215,0,0.2)' : 'transparent',
                color: tab === t ? '#ffd700' : 'rgba(255,255,255,0.4)',
                cursor: 'pointer', fontFamily: 'monospace', fontSize: 10,
              }}>{t === 'active' ? 'Active' : 'History'}</button>
            ))}
            <button onClick={onClose} style={{
              background: 'rgba(255,0,0,0.15)', border: '1px solid rgba(255,0,0,0.3)',
              color: '#ff4444', borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
              fontFamily: 'monospace', fontSize: 11,
            }}>✕</button>
          </div>
        </div>

        {tab === 'active' && (
          <div>
            {active.length < maxActive && (
              <button onClick={() => { drawProphecy(); redraw() }} style={{
                padding: '8px 20px', borderRadius: 8, border: 'none',
                background: 'linear-gradient(135deg, #ffd700, #ff8800)',
                color: '#000', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12, fontWeight: 'bold',
                marginBottom: 16, width: '100%',
              }}>
                🔮 Draw a Prophecy ({maxActive - active.length} slot{(maxActive - active.length) > 1 ? 's' : ''} available)
              </button>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {active.length === 0 && (
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center', padding: 20 }}>
                  No active prophecies. Draw one to begin your fate.
                </div>
              )}
              {active.map(p => <ProphecyCardView key={p.cardId} cardId={p.cardId} />)}
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {allProphecies.filter(p => p.completed || p.failed).length === 0 && (
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center', padding: 20 }}>
                No prophecies fulfilled or failed yet.
              </div>
            )}
            {allProphecies.filter(p => p.completed || p.failed).map(p => (
              <div key={p.cardId} style={{
                padding: 8, borderRadius: 6, fontSize: 11,
                border: `1px solid ${p.completed ? 'rgba(68,255,136,0.3)' : 'rgba(255,68,68,0.3)'}`,
                background: p.completed ? 'rgba(68,255,136,0.05)' : 'rgba(255,68,68,0.05)',
              }}>
                <span style={{ color: p.completed ? '#44ff88' : '#ff4444' }}>
                  {p.completed ? '✅ Fulfilled' : '❌ Failed'} — {p.cardId}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ProphecyCardView({ cardId }: { cardId: string }) {
  const prog = getProphecyProgress(cardId)
  if (!prog) return null

  const pct = prog.target > 0 ? Math.min(100, Math.floor(prog.current / prog.target * 100)) : 0
  const timeLeft = Math.max(0, prog.timeLimit - prog.elapsed)
  const timePct = Math.min(100, Math.floor(prog.elapsed / prog.timeLimit * 100))

  return (
    <div style={{
      padding: 12, borderRadius: 8, border: '1px solid rgba(255,215,0,0.2)',
      background: 'rgba(255,215,0,0.03)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: '#ffd700', fontSize: 12, fontWeight: 'bold' }}>{cardId}</span>
        <span style={{
          fontSize: 10, color: timeLeft < 30 ? '#ff4444' : 'rgba(255,255,255,0.4)',
          fontFamily: 'monospace',
        }}>
          {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
        </span>
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
        {prog.current.toLocaleString()} / {prog.target.toLocaleString()}
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, marginBottom: 4 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: '#ffd700', borderRadius: 2 }} />
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.03)', borderRadius: 2 }}>
        <div style={{
          width: `${timePct}%`, height: '100%',
          background: timeLeft < 30 ? '#ff4444' : 'rgba(255,255,255,0.2)',
          borderRadius: 2,
        }} />
      </div>
    </div>
  )
}
