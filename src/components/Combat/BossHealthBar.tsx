import { useEffect, useState } from 'react'
import { getBossInfo } from './HostileEnemyManager'

export const BossHealthBar = () => {
  const [info, setInfo] = useState<{ hp: number; maxHp: number; name: string } | null>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      setInfo(getBossInfo())
    }, 200)
    return () => clearInterval(interval)
  }, [])

  if (!info) return null

  const pct = Math.max(0, info.hp / info.maxHp)
  const barColor = pct > 0.5 ? '#ff44aa' : pct > 0.25 ? '#ff8844' : '#ff2222'

  return (
    <div style={{
      position: 'fixed', top: 60, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, textAlign: 'center',
    }}>
      <div style={{
        color: '#ff44aa', fontFamily: 'monospace', fontSize: 13, fontWeight: 'bold',
        textShadow: '0 0 10px rgba(255,68,170,0.5)', marginBottom: 4, letterSpacing: 2,
      }}>
        ⚠ {info.name}
      </div>
      <div style={{
        width: 280, height: 10, background: 'rgba(0,0,0,0.5)',
        borderRadius: 5, overflow: 'hidden', border: '1px solid rgba(255,68,170,0.4)',
        margin: '0 auto',
      }}>
        <div style={{
          width: `${pct * 100}%`, height: '100%',
          background: `linear-gradient(90deg, ${barColor}, #ff88cc)`,
          transition: 'width 0.2s ease-out',
          borderRadius: 5,
        }} />
      </div>
    </div>
  )
}
