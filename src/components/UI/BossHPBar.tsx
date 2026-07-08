import { useEffect, useState } from 'react'
import { getBossInfo } from '../Combat/HostileEnemyManager'
import { UI } from '../../utils/uiStyles'

export const BossHPBar = () => {
  const [boss, setBoss] = useState<{ hp: number; maxHp: number; name: string } | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      const info = getBossInfo()
      if (info && info.hp > 0) {
        setBoss(info)
        setVisible(true)
      } else {
        setBoss(null)
        setVisible(false)
      }
    }, 100)
    return () => clearInterval(interval)
  }, [])

  if (!visible || !boss) return null

  const pct = boss.hp / boss.maxHp
  const color = pct > 0.5 ? '#ff8844' : pct > 0.25 ? '#ff4444' : '#ff0000'
  const glowColor = pct > 0.5 ? '#ff8844' : '#ff2222'

  return (
    <div style={{
      position: 'fixed',
      top: '6%',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9995,
      ...UI.panel({ border: `${color}22`, padding: '8px 20px' }),
      width: 340,
      animation: 'pulse-slow 1.5s ease-in-out infinite',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
      }}>
        <div style={UI.label(color)}>{boss.name}</div>
        <div style={{
          ...UI.value(color),
          fontSize: 11,
        }}>
          {Math.ceil(boss.hp)} / {boss.maxHp}
        </div>
      </div>
      <div style={{
        width: '100%',
        height: 6,
        background: 'rgba(255,255,255,0.04)',
        borderRadius: 3,
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct * 100}%`,
          height: '100%',
          borderRadius: 3,
          transition: 'width 0.2s ease-out',
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          boxShadow: `0 0 12px ${glowColor}66, 0 0 24px ${glowColor}33`,
        }} />
      </div>
      {/* Danger indicator at low HP */}
      {pct < 0.3 && (
        <div style={{
          position: 'absolute',
          right: -4,
          top: -4,
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#ff0000',
          boxShadow: '0 0 8px #ff0000, 0 0 16px #ff000066',
          animation: 'pulse-slow 0.5s ease-in-out infinite',
        }} />
      )}
    </div>
  )
}
