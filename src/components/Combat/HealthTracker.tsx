import { useRef, useEffect, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useStore } from '../../store'
import { PLAYER_MAX_HEALTH, HEAL_AMOUNT_PER_LIQUID, HEALTH_REGEN_RATE, HEALTH_REGEN_DELAY } from '../../config/combat'
import { triggerShake } from '../../hooks/useScreenShake'
import { tryBlockDamage } from '../Economy/TimeGear'
import { playDamageSound } from '../../utils/audio'
import { activateSpawnProtection } from '../../systems/SpawnProtection'
import { setTimeScaleTarget } from '../TimeManager'
import { UI } from '../../utils/uiStyles'

// ── Module-level health state ──────────────────────────
let _playerHealth = PLAYER_MAX_HEALTH
let _lastDamageTime = 0
let _killCount = 0
let _isDead = false
let _deathTime = 0

export function getPlayerHealth(): number { return _playerHealth }
export function getKillCount(): number { return _killCount }
export function isPlayerDead(): boolean { return _isDead }

/** Apply damage from any source. Returns actual damage dealt. */
export function damagePlayer(amount: number): number {
  if (_isDead) return 0
  if (tryBlockDamage(amount)) {
    amount = Math.floor(amount * 0.5)
  }
  const actual = Math.min(amount, _playerHealth)
  _playerHealth = Math.max(0, _playerHealth - amount)
  _lastDamageTime = performance.now()
  triggerShake(Math.min(0.4, amount * 0.02), 8, 0.3)
  playDamageSound()
  window.dispatchEvent(new CustomEvent('player-damaged'))

  if (_playerHealth <= 0) {
    _isDead = true
    _deathTime = performance.now()
    // Dramatic slow-motion on death
    setTimeScaleTarget(0.05)
    triggerShake(0.8, 15, 0.6)
    window.dispatchEvent(new CustomEvent('player-died'))
  }

  return actual
}

/** Heal player using Liquid resources. */
export function healPlayer(): boolean {
  if (_isDead) return false
  const state = useStore.getState()
  if (state.inventory.liquid < 1) return false
  if (_playerHealth >= PLAYER_MAX_HEALTH) return false
  const healAmount = Math.min(HEAL_AMOUNT_PER_LIQUID, PLAYER_MAX_HEALTH - _playerHealth)
  _playerHealth += healAmount
  useStore.setState((s) => ({
    inventory: { ...s.inventory, liquid: s.inventory.liquid - 1 },
  }))
  // Dispatch heal visual effect event
  window.dispatchEvent(new CustomEvent('heal-effect'))
  return true
}

/** Increment kill tracking and award resources */
export function recordKill(enemyConfig: { xpReward: number; renownReward: number }): void {
  _killCount++
  useStore.setState((s) => ({
    inventory: {
      ...s.inventory,
      raw: s.inventory.raw + enemyConfig.xpReward,
      renown: s.inventory.renown + enemyConfig.renownReward,
    },
  }))
}

/** Reset health (for respawn or full heal) */
export function resetHealth(): void {
  _playerHealth = PLAYER_MAX_HEALTH
}

/** Check if player can respawn (cooldown elapsed) */
export function canRespawn(): boolean {
  return _isDead && performance.now() - _deathTime > 2000
}

/** Respawn player: restore health, apply inventory penalty, teleport to origin */
export function respawnPlayer(): void {
  _playerHealth = PLAYER_MAX_HEALTH
  _isDead = false

  // Activate spawn protection — enemies in safe zone are cleared
  activateSpawnProtection()

  // Penalty: lose 40% of each resource
  useStore.setState((s) => ({
    inventory: {
      raw: Math.floor(s.inventory.raw * 0.6),
      liquid: Math.floor(s.inventory.liquid * 0.6),
      vapour: Math.floor(s.inventory.vapour * 0.6),
      crystal: Math.floor(s.inventory.crystal * 0.6),
      renown: s.inventory.renown,
    },
  }))

  // Restore time scale from death slow-motion with cinematic surge back
  setTimeScaleTarget(0.4)
  setTimeout(() => setTimeScaleTarget(1.0), 300)

  window.dispatchEvent(new CustomEvent('player-respawned'))
  // Trigger rebirth visual effect (white flash + particles)
  window.dispatchEvent(new CustomEvent('player-rebirth'))
}

/**
 * Health regen tick.
 */
export const HealthRegen = () => {
  const lastTick = useRef(performance.now())

  useFrame(() => {
    if (_isDead) return
    const now = performance.now()
    if (_playerHealth >= PLAYER_MAX_HEALTH) return
    if (now - _lastDamageTime < HEALTH_REGEN_DELAY * 1000) return
    const dt = (now - lastTick.current) / 1000
    lastTick.current = now
    _playerHealth = Math.min(PLAYER_MAX_HEALTH, _playerHealth + HEALTH_REGEN_RATE * dt)
  })

  return null
}

/**
 * Respawn camera positioner — sets camera to origin on respawn.
 */
export const RespawnCamera = () => {
  const { camera } = useThree()

  useEffect(() => {
    const handler = () => {
      camera.position.set(0, 2, 0)
    }
    window.addEventListener('player-respawned', handler)
    return () => window.removeEventListener('player-respawned', handler)
  }, [camera])

  return null
}

/**
 * Death Screen overlay — cinematic death/respawn experience.
 */
export const DeathScreen = () => {
  const [showRespawn, setShowRespawn] = useState(false)
  const [countdown, setCountdown] = useState(2)
  const [rebirth, setRebirth] = useState(false)
  const [rebirthFlash, setRebirthFlash] = useState(false)
  const heartbeatRef = useRef(0)
  const [hb, setHb] = useState(0)

  useEffect(() => {
    const died = () => {
      setShowRespawn(false)
      setCountdown(2)
      setRebirth(false)
      setRebirthFlash(false)
      heartbeatRef.current = 0
    }
    const respawned = () => {
      setShowRespawn(false)
      setRebirth(true)
      // Trigger a white flash after delay
      setTimeout(() => setRebirthFlash(true), 50)
      setTimeout(() => setRebirthFlash(false), 500)
      setTimeout(() => setRebirth(false), 1200)
    }
    window.addEventListener('player-died', died)
    window.addEventListener('player-respawned', respawned)

    // Heartbeat animation loop (rAF-based, not R3F useFrame)
    let rafId: number
    const loop = () => {
      heartbeatRef.current += 0.016 // ~60fps
      setHb(Math.sin(heartbeatRef.current * 6) * 0.5 + 0.5)
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)

    // Countdown timer: updates every 200ms, shows "2... 1..." before respawn available
    const check = setInterval(() => {
      if (_isDead) {
        if (canRespawn()) {
          setShowRespawn(true)
          setCountdown(0)
        } else {
          const remaining = Math.ceil((2000 - (performance.now() - _deathTime)) / 1000)
          setCountdown(Math.max(1, remaining))
        }
      }
    }, 200)
    return () => {
      window.removeEventListener('player-died', died)
      window.removeEventListener('player-respawned', respawned)
      cancelAnimationFrame(rafId)
      clearInterval(check)
    }
  }, [])

  if (!_isDead && !rebirth) return null

  // ── Rebirth flash overlay ──
  if (rebirthFlash) {
    return (
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 9999,
          background: `radial-gradient(ellipse at center, rgba(255,255,255,0.6) 0%, rgba(68,255,204,0.2) 40%, transparent 70%)`,
          animation: 'rebirth-flash 0.6s ease-out forwards',
        }}
      >
        <style>{`
          @keyframes rebirth-flash {
            0% { opacity: 1; transform: scale(1.2); }
            40% { opacity: 0.7; transform: scale(1); }
            100% { opacity: 0; transform: scale(0.9); }
          }
        `}</style>
      </div>
    )
  }

  if (!_isDead) return null

  const state = useStore.getState()
  const inv = state.inventory
  const heartbeatPulse = Math.sin(heartbeatRef.current * 6) * 0.5 + 0.5 // heartbeat pulse factor

  // Compute lost resources
  const lostResources = (['raw', 'liquid', 'vapour', 'crystal'] as const).map((res) => ({
    key: res,
    lost: Math.floor((inv as any)[res] * 0.4),
    color: ({ raw: '#ff8844', liquid: '#44ffcc', vapour: '#66ddff', crystal: '#aa88ff' } as Record<string, string>)[res],
  }))

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: `radial-gradient(ellipse at center, rgba(20,0,0,0.92) 0%, rgba(0,0,0,0.95) 60%, rgba(0,0,0,1) 100%)`,
      fontFamily: 'ui-monospace, monospace',
      animation: 'death-vignette-pulse 2s ease-in-out infinite',
    }}>
      {/* Vignette border — pulses red */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow: `inset 0 0 ${80 + heartbeatPulse * 60}px rgba(255,0,0,${0.1 + heartbeatPulse * 0.15})`,
          transition: 'box-shadow 0.1s ease',
        }}
      />

      {/* Sin line decoration */}
      <div style={{ fontSize: 10, color: 'rgba(255,0,0,0.15)', letterSpacing: '0.5em', marginBottom: 4 }}>
        ~~~ x ~~~ x ~~~ x ~~~
      </div>

      {/* TIME WASTED — pulsing with heartbeat */}
      <div
        style={{
          fontSize: 42, fontWeight: 900, letterSpacing: '0.3em',
          color: `rgba(255,34,68,${0.85 + heartbeatPulse * 0.15})`,
          textShadow: `
            0 0 ${30 + heartbeatPulse * 30}px rgba(255,34,68,${0.3 + heartbeatPulse * 0.3}),
            0 0 ${60 + heartbeatPulse * 40}px rgba(255,34,68,${0.1 + heartbeatPulse * 0.1})
          `,
          marginBottom: 6,
          transition: 'text-shadow 0.1s ease',
        }}
      >
        TIME WASTED
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 20, letterSpacing: '0.08em', fontStyle: 'italic' }}>
        "A chrono-thread severed before its time."
      </div>

      {/* ── Respawn countdown ring ── */}
      {!showRespawn && countdown > 0 && (
        <div style={{ marginBottom: 20, textAlign: 'center' }}>
          <div
            className="font-mono font-black"
            style={{
              fontSize: 48,
              color: `rgba(255,255,255,${0.15 + (countdown === 1 ? heartbeatPulse * 0.3 : 0)})`,
              textShadow: countdown === 1 ? '0 0 20px rgba(255,68,68,0.3)' : 'none',
              animation: countdown === 1 ? 'countdown-pulse 0.5s ease-in-out infinite' : 'none',
            }}
          >
            {countdown}
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em', marginTop: 2 }}>
            RE-ALIGNING CHRONO-THREAD
          </div>
        </div>
      )}

      {/* ── Penalty panel ── */}
      <div style={{
        ...UI.panel({ border: `rgba(255,34,68,${0.08 + heartbeatPulse * 0.05})`, padding: '14px 20px' }),
        marginBottom: 24, width: 270,
        backdropFilter: 'blur(4px)',
      }}>
        <div style={{ fontSize: 9, color: '#ff4466', marginBottom: 8, textAlign: 'center', letterSpacing: '0.1em' }}>
          ═══ PENALTY — 40% RESOURCE LOSS ═══
        </div>
        {lostResources.map(({ key, lost, color }) => (
          <div key={key} style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: 10, color, fontFamily: 'monospace', padding: '3px 0',
            borderBottom: '1px solid rgba(255,255,255,0.03)',
          }}>
            <span>{key === 'raw' ? '⟐ EPOCH' : key === 'liquid' ? '≈ FLUX' : key === 'vapour' ? '⊡ CHRONO' : '◆ AEON'}</span>
            <span style={{ opacity: lost > 0 ? 1 : 0.3 }}>-{lost}</span>
          </div>
        ))}
        {lostResources.every(r => r.lost === 0) && (
          <div style={{ fontSize: 9, color: '#555', textAlign: 'center', padding: '4px 0' }}>
            No resources lost
          </div>
        )}
      </div>

      {/* ── Respawn Button ── */}
      {showRespawn && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div
            onClick={respawnPlayer}
            className="death-respawn-btn"
            style={{
              padding: '14px 36px',
              background: 'linear-gradient(135deg, rgba(68,255,204,0.2), rgba(68,255,204,0.06))',
              border: '1px solid rgba(68,255,204,0.4)',
              borderRadius: 8,
              color: '#44ffcc',
              fontSize: 14,
              letterSpacing: '0.2em',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              animation: 'respawn-pulse 1.5s ease-in-out infinite',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(68,255,204,0.35), rgba(68,255,204,0.12))'
              e.currentTarget.style.boxShadow = '0 0 30px rgba(68,255,204,0.25)'
              e.currentTarget.style.borderColor = 'rgba(68,255,204,0.6)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(68,255,204,0.2), rgba(68,255,204,0.06))'
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.borderColor = 'rgba(68,255,204,0.4)'
            }}
          >
            ⚡ RE-ENTER THE TIMELINE
          </div>
          <div style={{ fontSize: 9, color: 'rgba(68,255,204,0.25)', letterSpacing: '0.05em' }}>
            click to return
          </div>
        </div>
      )}

      {/* ── Animations ── */}
      <style>{`
        @keyframes death-vignette-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.97; }
        }
        @keyframes respawn-pulse {
          0%, 100% {
            box-shadow: 0 0 10px rgba(68,255,204,0.15);
          }
          50% {
            box-shadow: 0 0 25px rgba(68,255,204,0.3), 0 0 50px rgba(68,255,204,0.1);
          }
        }
        @keyframes countdown-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        .death-respawn-btn:hover {
          transform: scale(1.03);
        }
      `}</style>
    </div>
  )
}
