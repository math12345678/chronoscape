import React, { useState } from 'react'

interface Props {
  onClick: () => void
  disabled?: boolean
  color?: string
  children: React.ReactNode
  style?: React.CSSProperties
  size?: 'sm' | 'md'
  fullWidth?: boolean
}

export const FButton = ({ onClick, disabled, color = '#44ffcc', children, style, size = 'sm', fullWidth }: Props) => {
  const [hover, setHover] = useState(false)
  const [pressed, setPressed] = useState(false)

  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPressed(false) }}
      onMouseDown={() => !disabled && setPressed(true)}
      onMouseUp={() => setPressed(false)}
      disabled={disabled}
      style={{
        background: disabled ? `${color}08` : pressed ? `${color}25` : hover ? `${color}15` : `${color}0a`,
        border: `1px solid ${disabled ? `${color}11` : pressed ? color : `${color}33`}`,
        color: disabled ? `${color}55` : color,
        borderRadius: size === 'sm' ? 6 : 8,
        padding: size === 'sm' ? '4px 12px' : '8px 20px',
        cursor: disabled ? 'default' : 'pointer',
        fontFamily: 'monospace',
        fontSize: size === 'sm' ? 9 : 11,
        fontWeight: 600,
        letterSpacing: 1,
        textTransform: 'uppercase',
        transition: 'all 0.15s ease',
        width: fullWidth ? '100%' : undefined,
        ...style,
      }}
    >
      {children}
    </button>
  )
}
