import React from 'react'

interface Props {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  color?: string
  label?: string
}

export const FSlider = ({ value, onChange, min = 0, max = 1, step = 0.01, color = '#44ffcc', label }: Props) => {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {label && <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#667', minWidth: 40 }}>{label}</span>}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{
          flex: 1, height: 4, appearance: 'none', outline: 'none',
          background: `linear-gradient(90deg, ${color}88 ${pct}%, rgba(255,255,255,0.06) ${pct}%)`,
          borderRadius: 2, cursor: 'pointer',
        }}
      />
      <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#889', minWidth: 30, textAlign: 'right' }}>
        {typeof value === 'number' ? value.toFixed(step < 0.01 ? 2 : 1) : value}
      </span>
    </div>
  )
}
