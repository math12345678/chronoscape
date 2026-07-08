import React from 'react'
import { UI } from '../../../utils/uiStyles'

interface Props {
  label: string
  value?: string | number
  labelColor?: string
  valueColor?: string
  size?: 'sm' | 'md'
  style?: React.CSSProperties
}

export const FLabel = ({ label, value, labelColor = '#667', valueColor = '#ccd', size = 'sm', style }: Props) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...style }}>
    <span style={UI.label(labelColor)}>{label}</span>
    {value !== undefined && (
      <span style={{
        ...UI.value(valueColor),
        fontSize: size === 'sm' ? 10 : 12,
      }}>
        {value}
      </span>
    )}
  </div>
)
