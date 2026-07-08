import React from 'react'

interface Props {
  label: string
  count: number
  max?: number
  color?: string
  onClick?: () => void
}

export const FBagSlot = ({ label, count, max, color = '#44ffcc', onClick }: Props) => (
  <div
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '4px 8px', borderRadius: 6,
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.04)',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'background 0.15s ease',
    }}
    onMouseEnter={e => { if (onClick) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        background: color, boxShadow: `0 0 4px ${color}`,
      }} />
      <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#889' }}>{label}</span>
    </div>
    <span style={{
      fontSize: 10, fontWeight: 700, fontFamily: 'monospace',
      color: count > 0 ? color : '#556',
    }}>
      {count}{max !== undefined ? `/${max}` : ''}
    </span>
  </div>
)
