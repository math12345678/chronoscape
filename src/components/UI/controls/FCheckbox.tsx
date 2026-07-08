import React from 'react'

interface Props {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
  color?: string
  disabled?: boolean
}

export const FCheckbox = ({ checked, onChange, label, color = '#44ffcc', disabled }: Props) => (
  <label style={{
    display: 'inline-flex', alignItems: 'center', gap: 6, cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  }}>
    <div
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: 14, height: 14, borderRadius: 3,
        border: `1px solid ${checked ? color : 'rgba(255,255,255,0.15)'}`,
        background: checked ? `${color}22` : 'rgba(255,255,255,0.03)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s ease',
      }}
    >
      {checked && (
        <div style={{
          width: 6, height: 6, borderRadius: 1,
          background: color, boxShadow: `0 0 4px ${color}`,
        }} />
      )}
    </div>
    {label && (
      <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#889', letterSpacing: 0.5 }}>{label}</span>
    )}
  </label>
)
