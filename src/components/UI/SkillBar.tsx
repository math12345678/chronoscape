import { useEffect, useState } from 'react'
import { getSkillStates, activateSkill } from '../../skills/ChronoSKills'
import { UI } from '../../utils/uiStyles'

export const SkillBar = () => {
  const [, refresh] = useState(0)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const skill = getSkillStates().find(
        s => (e.key === s.key || e.key === s.key.toUpperCase()) && document.pointerLockElement
      )
      if (skill) { e.preventDefault(); activateSkill(skill.id) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    const iv = setInterval(() => refresh(n => n + 1), 50)
    return () => clearInterval(iv)
  }, [])

  const skills = getSkillStates()

  return (
    <div style={{
      position: 'fixed',
      bottom: 100,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9990,
      display: 'flex',
      gap: 6,
      pointerEvents: 'none',
      userSelect: 'none',
    }}>
      {skills.map(skill => {
        const cdPct = skill.cooldownRemaining > 0 ? skill.cooldownRemaining / skill.cooldownMs : 0
        const ready = cdPct === 0 && !skill.active && skill.unlocked
        const color = skill.active ? '#ffffff' : ready ? skill.color : skill.unlocked ? '#334' : '#222'
        const isLocked = !skill.unlocked

        return (
          <div
            key={skill.id}
            title={isLocked ? `Locked — discover ${skill.unlockFormula} to unlock` : skill.description}
            style={{
              ...UI.panel({ border: ready ? skill.color + '44' : isLocked ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)' }),
              width: 56,
              height: 56,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
              opacity: ready ? 1 : isLocked ? 0.3 : 0.5,
              transition: 'all 0.2s ease',
              cursor: 'default',
              filter: isLocked ? 'grayscale(1)' : 'none',
            }}
          >
            {isLocked ? (
              <>
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  color: '#445', fontFamily: 'monospace',
                }}>
                  <div style={{ fontSize: 14, marginBottom: 2 }}>&#x1F512;</div>
                  <div style={{ fontSize: 5, color: '#334', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    locked
                  </div>
                </div>
              </>
            ) : (
              <>
                {cdPct > 0 && (
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    height: `${cdPct * 100}%`,
                    background: 'rgba(0,0,0,0.5)',
                    transition: 'height 0.05s linear',
                    pointerEvents: 'none',
                  }} />
                )}
                {skill.active && (
                  <div style={{
                    position: 'absolute', inset: -2,
                    border: `2px solid ${skill.color}`,
                    borderRadius: 14,
                    animation: 'pulse-glow 0.8s ease-in-out infinite',
                    opacity: 0.6,
                  }} />
                )}
                <div style={{
                  fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color,
                  textShadow: ready ? `0 0 8px ${skill.color}44` : 'none',
                  zIndex: 1, textTransform: 'uppercase',
                }}>
                  {skill.key}
                </div>
                <div style={{
                  fontSize: 6, color: ready ? '#889' : '#445',
                  letterSpacing: 0.5, textTransform: 'uppercase',
                  marginTop: 2, zIndex: 1,
                }}>
                  {skill.name.split(' ')[0]}
                </div>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
