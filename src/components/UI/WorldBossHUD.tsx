import { useState, useEffect } from 'react'
import {
  isBossActive, getActiveBoss, getBossHealth, getBossMaxHealth,
  getBossMessage, getBossMessageTime, clearBossMessage,
} from '../../systems/WorldBossEvents'

export const WorldBossHUD = () => {
  const [bossActive, setBossActive] = useState(false)
  const [health, setHealth] = useState(0)
  const [maxHealth, setMaxHealth] = useState(0)
  const [bossName, setBossName] = useState('')
  const [bossColor, setBossColor] = useState('#ff4444')
  const [message, setMessage] = useState<string | null>(null)
  const [messageAge, setMessageAge] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      const active = isBossActive()
      setBossActive(active)
      if (active) {
        const boss = getActiveBoss()
        if (boss) {
          setBossName(boss.name)
          setBossColor(boss.color)
        }
        const h = getBossHealth()
        const mh = getBossMaxHealth()
        setHealth(h)
        setMaxHealth(mh)
      }

      // Messages
      const msg = getBossMessage()
      setMessage(msg)
      if (msg) {
        const age = (Date.now() - getBossMessageTime()) / 1000
        setMessageAge(age)
        if (age > 8) {
          clearBossMessage()
          setMessage(null)
        }
      }
    }, 100)
    return () => clearInterval(id)
  }, [])

  return (
    <>
      {/* Boss health bar */}
      {bossActive && (
        <div style={{
          position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)',
          zIndex: 500, width: 400,
        }}>
          {/* Boss name */}
          <div style={{
            textAlign: 'center', fontSize: 16, fontWeight: 700,
            color: bossColor, marginBottom: 6, textShadow: `0 0 20px ${bossColor}44`,
            letterSpacing: 2,
          }}>
            ⚔ {bossName} ⚔
          </div>
          {/* Health bar */}
          <div style={{
            height: 12, borderRadius: 6, background: '#1a0a0a',
            border: `1px solid ${bossColor}44`, overflow: 'hidden',
            position: 'relative',
          }}>
            <div style={{
              width: `${(health / maxHealth) * 100}%`,
              height: '100%',
              background: `linear-gradient(90deg, ${bossColor}, #ff4444)`,
              borderRadius: 6,
              transition: 'width 0.15s ease-out',
              boxShadow: `0 0 15px ${bossColor}`,
            }} />
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#fff',
              textShadow: '0 1px 3px rgba(0,0,0,0.8)',
            }}>
              {Math.ceil(health)} / {maxHealth}
            </div>
          </div>
        </div>
      )}

      {/* Global announcement */}
      {message && messageAge < 8 && (
        <div style={{
          position: 'fixed', top: '40%', left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, textAlign: 'center',
          animation: 'bossAnnounce 0.5s ease-out',
          opacity: Math.max(0, 1 - messageAge / 8),
        }}>
          <div style={{
            fontSize: 28, fontWeight: 900, letterSpacing: 4,
            color: bossColor,
            textShadow: `0 0 40px ${bossColor}, 0 0 80px ${bossColor}66`,
            background: 'rgba(0,0,0,0.6)',
            padding: '16px 32px',
            borderRadius: 12,
            border: `1px solid ${bossColor}44`,
          }}>
            {message}
          </div>
        </div>
      )}

      <style>{`
        @keyframes bossAnnounce {
          0% { transform: translateX(-50%) scale(0.5); opacity: 0; }
          100% { transform: translateX(-50%) scale(1); opacity: 1; }
        }
      `}</style>
    </>
  )
}
