import { useState, useEffect } from 'react'
import {
  CLONE_DEFS, getActiveClones, getTotalCloneActions,
  getMaxClones, canDeployClone, deployClone, getCloneResourceRate,
} from '../../systems/ParallelSelves'

export const ParallelSelvesUI = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [, setRefresh] = useState(0)

  useEffect(() => {
    if (!open) return
    const id = setInterval(() => setRefresh((n) => n + 1), 500)
    return () => clearInterval(id)
  }, [open])

  if (!open) return null

  const clones = getActiveClones()
  const max = getMaxClones()

  const cont: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
  }
  const panel: React.CSSProperties = {
    width: 560, maxHeight: '85vh', overflow: 'auto',
    padding: 24, borderRadius: 12,
    background: 'linear-gradient(180deg, #0d1520, #080e16)',
    border: '1px solid #2a3a50',
  }

  return (
    <div style={cont} onClick={onClose}>
      <div style={panel} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#44ffcc' }}>Parallel Selves</span>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid #3a4a60', borderRadius: 6, color: '#aaa', padding: '4px 12px', cursor: 'pointer' }}>X</button>
        </div>
        <div style={{ fontSize: 11, color: '#5a6a80', marginBottom: 12 }}>
          Active: {clones.length}/{max} · Resource rate: +{getCloneResourceRate().toFixed(1)}/s · Total actions: {getTotalCloneActions().toLocaleString()}
        </div>

        {/* Active clones */}
        {clones.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: '#5a6a80', marginBottom: 4 }}>Active Clones:</div>
            {clones.map((c, i) => {
              const def = CLONE_DEFS.find((d) => d.id === c.defId)
              const pct = (c.remaining / (def?.duration ?? 1)) * 100
              return (
                <div key={i} style={{
                  padding: '6px 10px', marginBottom: 4, borderRadius: 6,
                  border: '1px solid #1a2a3a', background: '#0a121c',
                  display: 'flex', alignItems: 'center', gap: 8, fontSize: 11,
                }}>
                  <span style={{ fontSize: 16 }}>{def?.icon ?? '?'}</span>
                  <span style={{ color: def?.color ?? '#aaa', fontWeight: 600, flex: 1 }}>
                    {def?.name ?? 'Unknown'}
                  </span>
                  <div style={{ width: 60, height: 4, borderRadius: 2, background: '#1a1a2a' }}>
                    <div style={{
                      width: `${pct}%`, height: '100%', borderRadius: 2,
                      background: def?.color ?? '#aaa', transition: 'width 0.5s',
                    }} />
                  </div>
                  <span style={{ color: '#5a6a80', fontSize: 10 }}>
                    {Math.ceil(c.remaining)}s · {c.actionsPerformed} actions
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* Available clones */}
        <div style={{ fontSize: 10, color: '#5a6a80', marginBottom: 4 }}>Deployable Clones:</div>
        {CLONE_DEFS.map((def) => {
          const afford = canDeployClone(def.id)
          return (
            <div key={def.id} style={{
              padding: '8px 10px', marginBottom: 4, borderRadius: 6,
              border: `1px solid ${afford ? def.color + '44' : '#1a1a2a'}`,
              background: afford ? `${def.color}06` : '#0a0e14',
              opacity: afford ? 1 : 0.5,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 20 }}>{def.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: def.color }}>{def.name}</div>
                <div style={{ fontSize: 10, color: '#5a6a80' }}>{def.description}</div>
                <div style={{ fontSize: 9, color: '#4a5a6a' }}>
                  Duration: {def.duration}s · Unlock: {def.unlockCondition}
                </div>
              </div>
              <button
                onClick={() => { deployClone(def.id); setRefresh((n) => n + 1) }}
                disabled={!afford || clones.length >= max}
                style={{
                  padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  border: `1px solid ${afford ? def.color : '#2a3a3a'}`,
                  background: afford ? `${def.color}18` : 'transparent',
                  color: afford ? def.color : '#4a5a5a',
                  cursor: afford ? 'pointer' : 'default',
                }}>
                Deploy
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
