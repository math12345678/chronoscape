import { useState, useEffect } from 'react'
import { useStore } from '../../store'
import { getTimeCreditBalance, getTimeCreditPerSecond } from '../../config/timeCredit'

const RESOURCE_CONFIG: { key: string; label: string; color: string; icon: string }[] = [
  { key: 'raw', label: 'Epoch', color: '#ff8844', icon: '⟐' },
  { key: 'vapour', label: 'Chrono', color: '#ffaa00', icon: '⟡' },
]

const ADV_RESOURCE_CONFIG: { key: string; label: string; color: string; icon: string }[] = [
  { key: 'liquid', label: 'Flux', color: '#44ffcc', icon: '≈' },
  { key: 'crystal', label: 'Aeon', color: '#aa88ff', icon: '◆' },
  { key: 'renown', label: 'Renown', color: '#ffd700', icon: '✦' },
]

export const TimeCreditHUD = () => {
  const [, refresh] = useState(0)
  const inventory = useStore((s) => s.inventory)
  const showAdvanced = useStore((s) => s.showAdvancedHUD)

  useEffect(() => {
    const iv = setInterval(() => refresh(n => n + 1), 250)
    return () => clearInterval(iv)
  }, [])

  const balance = getTimeCreditBalance()
  const perSec = getTimeCreditPerSecond()

  return (
    <div
      style={{
        position: 'fixed',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        pointerEvents: 'none',
        userSelect: 'none',
        fontFamily: 'monospace',
      }}
    >
      {/* Core resources — always visible */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 12px',
          borderRadius: 8,
          background: 'rgba(5,10,25,0.7)',
          border: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(8px)',
        }}
      >
        {RESOURCE_CONFIG.map((r) => (
          <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ fontSize: 10, color: r.color, opacity: 0.6 }}>{r.icon}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: r.color }}>
              {Math.floor(inventory[r.key as keyof typeof inventory] as number)}
            </span>
            <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', marginRight: 4 }}>{r.label}</span>
          </div>
        ))}
      </div>

      {/* Advanced resources — gated */}
      {showAdvanced && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 12px',
            borderRadius: 8,
            background: 'rgba(5,10,25,0.7)',
            border: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {ADV_RESOURCE_CONFIG.map((r) => (
            <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ fontSize: 10, color: r.color, opacity: 0.6 }}>{r.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: r.color }}>
                {Math.floor(inventory[r.key as keyof typeof inventory] as number)}
              </span>
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', marginRight: 4 }}>{r.label}</span>
            </div>
          ))}
          {/* Time Credits — premium currency */}
          <div style={{ width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.08)', margin: '0 2px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <span style={{ fontSize: 11, fontWeight: 900, color: '#ffd700' }}>
              ${balance.toLocaleString()}
            </span>
            <span style={{ fontSize: 8, color: 'rgba(255,215,0,0.4)' }}>
              +{perSec.toFixed(1)}/s
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
