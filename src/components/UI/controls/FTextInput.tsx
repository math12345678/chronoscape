import React from 'react'

interface Props {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  color?: string
  onEnter?: () => void
  style?: React.CSSProperties
}

export const FTextInput = ({ value, onChange, placeholder, color = '#44ffcc', onEnter, style }: Props) => (
  <input
    type="text"
    value={value}
    onChange={e => onChange(e.target.value)}
    onKeyDown={e => { if (e.key === 'Enter' && onEnter) onEnter() }}
    placeholder={placeholder}
    style={{
      width: '100%',
      padding: '6px 8px',
      borderRadius: 6,
      border: `1px solid rgba(255,255,255,0.08)`,
      background: 'rgba(255,255,255,0.03)',
      color: '#ccd',
      fontFamily: 'monospace',
      fontSize: 11,
      outline: 'none',
      transition: 'border-color 0.15s ease',
      boxSizing: 'border-box',
      ...style,
    }}
    onFocus={e => { e.currentTarget.style.borderColor = `${color}55` }}
    onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
  />
)
