import React, { useRef, useState, useEffect } from 'react'

interface Props {
  children: React.ReactNode
  maxHeight: number
  color?: string
}

export const FScrollBar = ({ children, maxHeight, color = '#44ffcc' }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollPct, setScrollPct] = useState(0)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onScroll = () => {
      const pct = el.scrollTop / (el.scrollHeight - el.clientHeight)
      setScrollPct(Math.min(1, Math.max(0, pct)))
    }
    setShow(el.scrollHeight > el.clientHeight)
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [children])

  return (
    <div style={{ position: 'relative', maxHeight, overflow: 'hidden' }}>
      <div ref={containerRef} style={{ maxHeight, overflowY: 'auto', paddingRight: 4 }}>
        {children}
      </div>
      {show && (
        <div style={{
          position: 'absolute', right: 0, top: 0, width: 3, height: '100%',
          background: 'rgba(255,255,255,0.04)', borderRadius: 2, pointerEvents: 'none',
        }}>
          <div style={{
            width: '100%', height: `${scrollPct * 100}%`, borderRadius: 2,
            background: `${color}44`, transition: 'height 0.1s ease',
          }} />
        </div>
      )}
    </div>
  )
}
