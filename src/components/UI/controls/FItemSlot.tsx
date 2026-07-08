import React from 'react'

interface Props {
  label: string
  value: string | number
  color?: string
  icon?: string
  size?: 'sm' | 'md'
}

export const FItemSlot = ({ label, value, color = '#44ffcc', icon, size = 'sm' }: Props) => {
  const dim = size === 'sm' ? 36 : 48
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
    }}>
      <div style={{
        width: dim, height: dim, borderRadius: 8,
        background: `${color}0a`, border: `1px solid ${color}22`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column',
      }}>
        {icon && <span style={{ fontSize: dim * 0.35, color, fontWeight: 700, fontFamily: 'monospace' }}>{icon}</span>}
        <span style={{ fontSize: dim * 0.25, color, fontWeight: 600, fontFamily: 'monospace' }}>{value}</span>
      </div>
      <span style={{ fontSize: 8, fontFamily: 'monospace', color: '#667', letterSpacing: 0.5 }}>{label}</span>
    </div>
  )
}
