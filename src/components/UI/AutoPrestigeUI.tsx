import { useState, useEffect } from 'react'
import {
  getAutoPrestigeConfig, getAutoPrestigeCount, getAutoAscensionCount,
  updateAutoPrestigeConfig,
} from '../../systems/AutoPrestige'
import type { AutoPrestigeConfig } from '../../systems/AutoPrestige'

export const AutoPrestigeUI = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [cfg, setCfg] = useState<AutoPrestigeConfig>(getAutoPrestigeConfig())
  const [count, setCount] = useState(0)
  const [ascCount, setAscCount] = useState(0)

  useEffect(() => {
    if (!open) return
    const id = setInterval(() => {
      setCfg(getAutoPrestigeConfig())
      setCount(getAutoPrestigeCount())
      setAscCount(getAutoAscensionCount())
    }, 500)
    return () => clearInterval(id)
  }, [open])

  if (!open) return null

  const update = (u: Partial<AutoPrestigeConfig>) => {
    updateAutoPrestigeConfig(u)
    setCfg(getAutoPrestigeConfig())
  }

  const contStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
  }
  const panelStyle: React.CSSProperties = {
    width: 440, padding: 24, borderRadius: 12,
    background: 'linear-gradient(180deg, #0d1520, #080e16)',
    border: '1px solid #2a3a50',
  }
  const btn = (color: string, active: boolean): React.CSSProperties => ({
    padding: '6px 12px', borderRadius: 6, fontSize: 11,
    border: `1px solid ${active ? color : '#2a3a50'}`,
    background: active ? `${color}18` : 'transparent',
    color: active ? color : '#5a6a80', fontWeight: active ? 600 : 400,
    cursor: 'pointer',
  })

  return (
    <div style={contStyle} onClick={onClose}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: cfg.enabled ? '#44ff88' : '#5a6a80' }}>
            ⚙ Auto-Prestige
          </span>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid #3a4a60', borderRadius: 6, color: '#aaa', padding: '4px 12px', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button style={btn('#44ff88', cfg.enabled)} onClick={() => update({ enabled: !cfg.enabled })}>
            {cfg.enabled ? '🟢 ON' : '🔴 OFF'}
          </button>
          <button style={btn('#ffd700', cfg.autoAscend)} onClick={() => update({ autoAscend: !cfg.autoAscend })}>
            {cfg.autoAscend ? '✨ Auto-Ascend' : 'Auto-Ascend'}
          </button>
        </div>

        {/* Mode */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: '#5a6a80', marginBottom: 4 }}>Mode</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(['rankTarget', 'resourceTarget', 'timeInterval'] as const).map((mode) => (
              <button key={mode} style={btn('#44aaff', cfg.mode === mode)}
                onClick={() => update({ mode })}>
                {mode === 'rankTarget' ? 'Rank Target' : mode === 'resourceTarget' ? 'Resource' : 'Time'}
              </button>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: '#5a6a80', width: 100 }}>Min Rank:</span>
            <input type="number" value={cfg.minRank}
              onChange={(e) => update({ minRank: Math.max(1, parseInt(e.target.value) || 1) })}
              style={{ width: 60, padding: '4px 8px', borderRadius: 4, border: '1px solid #2a3a50', background: '#0a121c', color: '#c0d0e0', fontSize: 11 }} />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: '#5a6a80', width: 100 }}>Target Rank:</span>
            <input type="number" value={cfg.targetRank}
              onChange={(e) => update({ targetRank: parseInt(e.target.value) || 0 })}
              style={{ width: 60, padding: '4px 8px', borderRadius: 4, border: '1px solid #2a3a50', background: '#0a121c', color: '#c0d0e0', fontSize: 11 }} />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: '#5a6a80', width: 100 }}>Interval (min):</span>
            <input type="number" value={cfg.intervalMinutes}
              onChange={(e) => update({ intervalMinutes: Math.max(1, parseInt(e.target.value) || 1) })}
              style={{ width: 60, padding: '4px 8px', borderRadius: 4, border: '1px solid #2a3a50', background: '#0a121c', color: '#c0d0e0', fontSize: 11 }} />
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, fontSize: 10, color: '#5a6a80' }}>
          <span>Auto-Prestiges: <strong style={{ color: '#44ff88' }}>{count}</strong></span>
          <span>Auto-Ascensions: <strong style={{ color: '#ffd700' }}>{ascCount}</strong></span>
        </div>
      </div>
    </div>
  )
}
