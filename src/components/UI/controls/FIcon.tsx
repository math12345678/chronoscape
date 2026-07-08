import React from 'react'

interface Props {
  icon: string
  color?: string
  size?: number
  glow?: boolean
}

export const FIcon = ({ icon, color = '#44ffcc', size = 16, glow }: Props) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: size, height: size, borderRadius: size / 4,
    background: `${color}11`,
    border: `1px solid ${color}22`,
    color, fontSize: size * 0.55, fontWeight: 700, fontFamily: 'monospace',
    textShadow: glow ? `0 0 6px ${color}` : undefined,
  }}>
    {icon}
  </span>
)
