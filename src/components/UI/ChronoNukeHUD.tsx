import { useState, useEffect } from 'react'
import { useStore } from '../../store'
import { getNukeCooldown, getNukeCharges, getMaxCharges, canNuke } from '../../skills/ChronoNuke'
import { UI } from '../../utils/uiStyles'

export const ChronoNukeHUD = () => {
  const [, refresh] = useState(0)

  useEffect(() => {
    const iv = setInterval(() => refresh(n => n + 1), 100)
    return () => clearInterval(iv)
  }, [])

  const cooldown = getNukeCooldown()
  const charges = getNukeCharges()
  const maxCharges = getMaxCharges()
  const ready = canNuke()
  const cooldownPct = 1 - (cooldown / 120000)
  const inv = useStore(s => s.inventory)

  const hasResources = inv.liquid >= 200 && inv.crystal >= 100 && inv.renown >= 25
  const canAfford = hasResources && charges > 0

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 120,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9995,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      {/* Charge indicators */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {Array.from({ length: maxCharges }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: i < charges ? '#ff44ff' : 'rgba(255,255,255,0.1)',
              boxShadow: i < charges ? '0 0 6px rgba(255,68,255,0.5)' : 'none',
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </div>

      {/* Nuke button */}
      <div
        style={{
          padding: '4px 12px',
          borderRadius: 4,
          background: ready && canAfford ? 'rgba(255,68,255,0.15)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${ready && canAfford ? 'rgba(255,68,255,0.3)' : 'rgba(255,255,255,0.06)'}`,
          opacity: ready ? 1 : 0.4,
          cursor: ready ? 'pointer' : 'default',
          transition: 'all 0.3s ease',
          animation: ready && canAfford ? 'pulse-glow-violet 1.5s ease-in-out infinite' : 'none',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: 'monospace',
          fontSize: 10,
          letterSpacing: '0.15em',
          fontWeight: 700,
          color: ready ? '#ff44ff' : '#445',
        }}>
          <span>{ready ? '✦' : '⊙'}</span>
          <span>[Q] CHRONO NUKE</span>
        </div>
      </div>

      {/* Cooldown bar */}
      {cooldown > 0 && (
        <div
          style={{
            width: 100,
            height: 1,
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 1,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${cooldownPct * 100}%`,
              height: '100%',
              background: '#ff44ff',
              transition: 'width 0.1s linear',
            }}
          />
        </div>
      )}

      {/* Cost tooltip */}
      {!canAfford && charges > 0 && (
        <div style={{
          fontSize: 7,
          color: '#ff4466',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          fontWeight: 500,
        }}>
          Need 200L 100C 25R
        </div>
      )}
    </div>
  )
}
