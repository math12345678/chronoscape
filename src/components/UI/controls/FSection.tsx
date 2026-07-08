import React from 'react'
import { UI } from '../../../utils/uiStyles'

interface Props {
  title: string
  color?: string
  children?: React.ReactNode
  style?: React.CSSProperties
}

export const FSection = ({ title, color = '#44ffcc', children, style }: Props) => {
  const s = UI.section(title, color)
  return (
    <div style={{ ...s._container, ...style }}>
      <div style={s._title as React.CSSProperties}>
        <div style={s._dot} />
        <span style={{ ...UI.label(color), fontSize: 9, letterSpacing: 1.5 }}>{title}</span>
      </div>
      {children}
    </div>
  )
}
