import { useState, useEffect } from 'react'
import {
  getAutomationConfig, getAutomationStats, updateAutomationConfig,
  setAutomationEnabled,
} from '../../systems/AutomationHub'
import type { AutomationMode } from '../../systems/AutomationHub'

const MODE_COLORS: Record<AutomationMode, string> = {
  idle: '#5a6a80',
  balanced: '#44ffcc',
  aggressive: '#ff6644',
  stockpile: '#ffcc44',
}

const MODE_DESCRIPTIONS: Record<AutomationMode, string> = {
  idle: 'Paused — no automation',
  balanced: 'Standard speed, moderate resource use',
  aggressive: 'Fast but resource-intensive',
  stockpile: 'Slow but efficient, conserves resources',
}

export const AutomationHubUI = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [config, setConfig] = useState(getAutomationConfig())
  const [stats, setStats] = useState(getAutomationStats())

  useEffect(() => {
    if (!open) return
    const id = setInterval(() => {
      setConfig(getAutomationConfig())
      setStats(getAutomationStats())
    }, 500)
    return () => clearInterval(id)
  }, [open])

  if (!open) return null

  const containerStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
  }

  const panelStyle: React.CSSProperties = {
    width: 520, maxHeight: '85vh', overflow: 'auto',
    background: 'linear-gradient(180deg, #0d1520, #080e16)',
    border: '1px solid #2a3a50', borderRadius: 12, padding: 24,
    boxShadow: '0 0 60px rgba(68,255,204,0.08)',
  }

  const toggleStyle = (on: boolean): React.CSSProperties => ({
    padding: '4px 10px', borderRadius: 4, fontSize: 10,
    border: `1px solid ${on ? '#44ff88' : '#3a4a50'}`,
    background: on ? '#44ff8818' : 'transparent',
    color: on ? '#44ff88' : '#5a6a80',
    cursor: 'pointer', fontWeight: 600,
  })

  const btnStyle = (color: string, active = false): React.CSSProperties => ({
    padding: '5px 10px', borderRadius: 4, fontSize: 10,
    border: `1px solid ${active ? color : '#2a3a50'}`,
    background: active ? color + '18' : 'transparent',
    color: active ? color : '#5a6a80',
    cursor: 'pointer', fontWeight: active ? 700 : 400,
  })

  return (
    <div style={containerStyle} onClick={onClose}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#44ffcc' }}>
              ⚙ Automation Hub
            </span>
            <button
              style={{
                ...toggleStyle(config.enabled),
                marginLeft: 12, verticalAlign: 'middle',
              }}
              onClick={() => {
                setAutomationEnabled(!config.enabled)
                setConfig(getAutomationConfig())
              }}
            >
              {config.enabled ? '● ON' : '○ OFF'}
            </button>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: '1px solid #3a4a60', borderRadius: 6,
            color: '#aaa', padding: '4px 12px', cursor: 'pointer', fontSize: 14,
          }}>✕</button>
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 4,
          marginBottom: 16,
        }}>
          {[
            { label: 'Harvested', value: stats.harvested, color: '#44ff88' },
            { label: 'Refined', value: stats.refined, color: '#ffcc44' },
            { label: 'Sold', value: stats.sold, color: '#44aaff' },
            { label: 'Actions', value: stats.total, color: '#ff66aa' },
          ].map((s) => (
            <div key={s.label} style={{
              padding: 6, borderRadius: 4, background: '#0e1622',
              border: '1px solid #1a2a3a', textAlign: 'center',
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.value.toLocaleString()}</div>
              <div style={{ fontSize: 9, color: '#5a6a80' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Mode selector */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#5a7a90', marginBottom: 6 }}>OPERATING MODE</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {(Object.keys(MODE_COLORS) as AutomationMode[]).map((mode) => (
              <button key={mode} style={{
                ...btnStyle(MODE_COLORS[mode], config.mode === mode),
                flex: 1, fontSize: 11, padding: '8px 4px',
              }} onClick={() => {
                updateAutomationConfig({ mode })
                setConfig(getAutomationConfig())
              }}>
                {mode.toUpperCase()}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 10, color: '#5a6a80', marginTop: 4 }}>
            {MODE_DESCRIPTIONS[config.mode]}
          </div>
        </div>

        {/* Settings */}

        {/* Auto-Harvest */}
        <div style={{
          padding: 10, borderRadius: 6, marginBottom: 8,
          background: '#0e1622', border: '1px solid #1a2a3a',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#44ff88' }}>⟐ Auto-Harvest</span>
            <button style={toggleStyle(config.autoHarvest)} onClick={() => {
              updateAutomationConfig({ autoHarvest: !config.autoHarvest })
              setConfig(getAutomationConfig())
            }}>
              {config.autoHarvest ? 'ON' : 'OFF'}
            </button>
          </div>
          {config.autoHarvest && (
            <div style={{ fontSize: 10, color: '#5a6a80' }}>
              Interval: {config.harvestInterval}s · Target: {config.harvestTarget}
            </div>
          )}
        </div>

        {/* Auto-Refine */}
        <div style={{
          padding: 10, borderRadius: 6, marginBottom: 8,
          background: '#0e1622', border: '1px solid #1a2a3a',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#ffcc44' }}>⟐ Auto-Refine</span>
            <button style={toggleStyle(config.autoRefine)} onClick={() => {
              updateAutomationConfig({ autoRefine: !config.autoRefine })
              setConfig(getAutomationConfig())
            }}>
              {config.autoRefine ? 'ON' : 'OFF'}
            </button>
          </div>
          {config.autoRefine && (
            <div style={{ fontSize: 10, color: '#5a6a80' }}>
              Target: {config.refineTarget} · Keep {config.refineThreshold}+ Raw
            </div>
          )}
        </div>

        {/* Auto-Sell */}
        <div style={{
          padding: 10, borderRadius: 6, marginBottom: 8,
          background: '#0e1622', border: '1px solid #1a2a3a',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#44aaff' }}>⟐ Auto-Sell</span>
            <button style={toggleStyle(config.autoSell)} onClick={() => {
              updateAutomationConfig({ autoSell: !config.autoSell })
              setConfig(getAutomationConfig())
            }}>
              {config.autoSell ? 'ON' : 'OFF'}
            </button>
          </div>
          {config.autoSell && (
            <div style={{ fontSize: 10, color: '#5a6a80' }}>
              Sell when above {config.sellAboveThreshold} · Keep min {config.keepMinimum}
            </div>
          )}
        </div>

        {/* Auto-Build */}
        <div style={{
          padding: 10, borderRadius: 6, marginBottom: 8,
          background: '#0e1622', border: '1px solid #1a2a3a',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#ff66aa' }}>⟐ Auto-Build</span>
            <button style={toggleStyle(config.autoBuild)} onClick={() => {
              updateAutomationConfig({ autoBuild: !config.autoBuild })
              setConfig(getAutomationConfig())
            }}>
              {config.autoBuild ? 'ON' : 'OFF'}
            </button>
          </div>
          {config.autoBuild && (
            <div style={{ fontSize: 10, color: '#5a6a80' }}>
              Interval: {config.buildInterval}s · Auto-places vapour blocks near spawn
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{
          marginTop: 12, padding: 10, borderRadius: 6,
          background: '#0a0e14', border: '1px solid #1a2a3a',
          fontSize: 10, color: '#4a5a6a', lineHeight: 1.5,
        }}>
          <b style={{ color: '#44ffcc' }}>Automation Hub</b> runs your base while you explore.
          All automation operates within your resource limits.
          Aggressive mode consumes more but produces faster.
        </div>
      </div>
    </div>
  )
}
