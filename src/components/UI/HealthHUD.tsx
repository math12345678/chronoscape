import { useState, useEffect, useRef } from 'react'
import { getPlayerHealth, getKillCount, healPlayer } from '../Combat/HealthTracker'
import { getStamina, getMaxStamina } from '../PlayerController'
import { getEquippedWeapon } from '../Combat/HostileEnemyManager'
import { getWeaponAmmo } from '../Combat/ProjectileSystem'
import { WEAPONS, PLAYER_MAX_HEALTH } from '../../config/combat'
import type { WeaponId } from '../../config/combat'
import { playHealSound } from '../../utils/audio'
import { getPlayerTitle } from '../Gangs/GangSystem'
import { getKillStreak, getMultiplier } from '../TimeSpeedCombat'
import { glassPanelStrong, labelStyle, valueStyle } from '../../utils/uiStyles'
import { getModifiedWeaponName } from '../../systems/WeaponModifierSystem'
import { ModifierBadges } from './ModifierTooltip'
import { useStore } from '../../store'

// ── Animated health number hook ───────────────────────
function useAnimatedValue(target: number, speed: number = 6): number {
  const [display, setDisplay] = useState(target)
  const displayRef = useRef(target)
  const targetRef = useRef(target)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    targetRef.current = target
  }, [target])

  useEffect(() => {
    const animate = () => {
      const current = displayRef.current
      const goal = targetRef.current
      if (Math.abs(current - goal) < 0.3) {
        displayRef.current = goal
        setDisplay(goal)
        return
      }
      const diff = goal - current
      displayRef.current = current + diff * 0.15 * (speed / 6)
      setDisplay(displayRef.current)
      frameRef.current = requestAnimationFrame(animate)
    }
    frameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameRef.current)
  }, [target, speed])

  return display
}

export const HealthHUD = () => {
  const showAdvanced = useStore((s) => s.showAdvancedHUD)
  const [health, setHealth] = useState(PLAYER_MAX_HEALTH)
  const [stamina, setStamina] = useState(getMaxStamina())
  const [weapon, setWeapon] = useState<WeaponId | null>(null)
  const [kills, setKills] = useState(0)
  const [ammo, setAmmo] = useState(0)
  const [healMsg, setHealMsg] = useState('')
  const [streak, setStreak] = useState(0)
  const [multi, setMulti] = useState(1)
  const [healPulse, setHealPulse] = useState(false)
  const timeRef = useRef(0)

  useEffect(() => {
    // Core stats always polled (health, stamina)
    const core = setInterval(() => {
      setHealth(getPlayerHealth())
      setStamina(getStamina())
    }, 150)

    // Advanced stats only polled when gated HUD is active (saves CPU)
    let advanced: ReturnType<typeof setInterval> | null = null
    if (showAdvanced) {
      advanced = setInterval(() => {
        setWeapon(getEquippedWeapon())
        setKills(getKillCount())
        setAmmo(getWeaponAmmo())
        setStreak(getKillStreak())
        setMulti(getMultiplier())
      }, 150)
    }

    // Animate low-HP pulse
    const anim = setInterval(() => {
      timeRef.current = performance.now()
    }, 50)

    return () => {
      clearInterval(core)
      if (advanced) clearInterval(advanced)
      clearInterval(anim)
    }
  }, [showAdvanced])

  const animHealth = useAnimatedValue(health)
  const animStamina = useAnimatedValue(stamina)
  const healthPct = Math.max(0, animHealth / PLAYER_MAX_HEALTH)
  const healthColor = healthPct > 0.6 ? '#44ff88' : healthPct > 0.3 ? '#ffaa44' : '#ff4444'
  const wep = weapon ? WEAPONS[weapon] : null

  // Low HP heartbeat
  const heartbeat = healthPct < 0.3 ? Math.sin(timeRef.current * 0.006) * 0.5 + 0.5 : 0

  // Segmented health bar: 5 segments
  const segments = 5
  const segFill = healthPct * segments

  return (
    <div className="fixed bottom-6 left-6 z-50 pointer-events-auto select-none">
      <div className={glassPanelStrong} style={{ minWidth: 190, padding: showAdvanced ? 14 : 12, borderColor: healthPct < 0.3 ? 'rgba(255,68,68,0.15)' : undefined }}>
        {/* Health header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className="w-1.5 h-1.5 rounded-full transition-colors duration-300"
              style={{
                backgroundColor: healthColor,
                boxShadow: healthPct < 0.3
                  ? `0 0 8px ${healthColor}88`
                  : `0 0 4px ${healthColor}44`,
                animation: healthPct < 0.3 ? 'health-low-pulse 0.6s ease-in-out infinite' : 'none',
              }}
            />
            <span className={labelStyle} style={{ color: '#667' }}>Health</span>
          </div>
          <span
            className={valueStyle}
            style={{
              color: healthColor,
              fontSize: 13,
              textShadow: healthPct < 0.3 ? `0 0 12px ${healthColor}66` : 'none',
            }}
          >
            {Math.ceil(animHealth)}
          </span>
        </div>

        {/* Segmented health bar */}
        <div className="flex gap-[3px] h-2.5">
          {Array.from({ length: segments }, (_, i) => {
            const fill = Math.max(0, Math.min(1, segFill - i))
            return (
              <div
                key={i}
                className="flex-1 rounded-sm overflow-hidden transition-all duration-300"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  boxShadow: fill > 0 ? `inset 0 0 6px ${healthColor}22` : 'none',
                }}
              >
                <div
                  className="h-full w-full rounded-sm transition-all duration-200 ease-out"
                  style={{
                    transform: `scaleX(${fill})`,
                    transformOrigin: 'left',
                    backgroundColor: healthColor,
                    boxShadow: fill > 0 ? `0 0 6px ${healthColor}44, 0 0 12px ${healthColor}22` : 'none',
                    opacity: healthPct < 0.3 ? 0.4 + heartbeat * 0.6 : 1,
                  }}
                />
              </div>
            )
          })}
        </div>

        {/* Heal button */}
        {health < PLAYER_MAX_HEALTH && (
          <button
            onClick={() => {
              const success = healPlayer()
              if (success) {
                playHealSound()
                setHealPulse(true)
                setTimeout(() => setHealPulse(false), 300)
              }
              setHealMsg(success ? '+25 HP' : 'No Liquid')
              setTimeout(() => setHealMsg(''), 1200)
            }}
            style={{
              marginTop: 8,
              width: '100%',
              fontSize: 9,
              letterSpacing: 1,
              textTransform: 'uppercase',
              fontFamily: 'monospace',
              fontWeight: 600,
              padding: '5px 8px',
              borderRadius: 6,
              border: `1px solid ${healPulse ? 'rgba(68,255,204,0.4)' : 'rgba(68,255,204,0.12)'}`,
              background: healPulse
                ? 'rgba(68,255,204,0.15)'
                : healMsg
                  ? 'rgba(68,255,204,0.06)'
                  : 'rgba(68,255,204,0.04)',
              color: healMsg ? '#44ffcc' : '#44ffcc77',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { if (!healPulse) e.currentTarget.style.background = 'rgba(68,255,204,0.1)' }}
            onMouseLeave={e => { if (!healPulse) e.currentTarget.style.background = 'rgba(68,255,204,0.04)' }}
          >
            <span className="flex items-center justify-center gap-1.5">
              {healPulse && <span className="w-1 h-1 rounded-full bg-teal-400 animate-ping" />}
              {healMsg || '[H] Heal (1 Liquid)'}
            </span>
          </button>
        )}

        {/* Stamina — always visible */}
        {showAdvanced && (
          <>
            <div className="flex items-center justify-between mt-3 mb-1">
              <span className={labelStyle} style={{ color: '#556' }}>Stamina</span>
              <span className={valueStyle} style={{ color: '#88ccff', fontSize: 12 }}>
                {Math.ceil(animStamina)}
              </span>
            </div>
            <div className="h-1.5 bg-white/[0.03] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-200"
                style={{
                  width: `${(stamina / getMaxStamina()) * 100}%`,
                  background: stamina < 20
                    ? 'linear-gradient(90deg, #ff6644, #ff8844)'
                    : 'linear-gradient(90deg, #44ccff, #88ddff)',
                  boxShadow: stamina < 20
                    ? '0 0 8px rgba(255,102,68,0.4)'
                    : '0 0 6px rgba(68,204,255,0.3)',
                }}
              />
            </div>
          </>
        )}

        {/* ── Advanced stats (gated) ── */}
        {showAdvanced && (
          <>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '10px 0' }} />

            {/* Weapon row */}
            <div className="flex items-center justify-between">
              <span className={labelStyle} style={{ color: '#445' }}>Arms</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold" style={{ color: weapon ? '#eef' : '#556' }}>
                  {weapon ? getModifiedWeaponName(weapon) : 'Unarmed'}
                </span>
                <ModifierBadges weaponId={weapon} />
              </div>
            </div>

            {/* Ammo */}
            {wep && (
              <div className="flex items-center justify-between mt-1">
                <span className={labelStyle} style={{ color: '#445' }}>Charge</span>
                <span className="font-mono font-bold text-xs" style={{
                  color: ammo <= 2 ? '#ff4444' : ammo <= 5 ? '#ffaa44' : '#44ffcc',
                  textShadow: ammo <= 2 ? '0 0 8px rgba(255,68,68,0.5)' : ammo <= 5 ? '0 0 8px rgba(255,170,68,0.3)' : 'none',
                }}>
                  {ammo}
                </span>
              </div>
            )}

            {/* Stats row */}
            <div className="flex items-center justify-between mt-1.5">
              <span className={labelStyle} style={{ color: '#445' }}>Kills</span>
              <span className="font-mono font-bold text-[11px]" style={{ color: kills > 0 ? '#bbc' : '#445' }}>
                {kills}
              </span>
            </div>

            {/* Streak */}
            {streak >= 3 && (
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[8px] uppercase tracking-[0.15em] font-medium" style={{
                  color: streak >= 10 ? '#ff4488' : streak >= 6 ? '#ff8844' : '#44ffcc',
                }}>
                  Streak
                </span>
                <span className="font-mono font-bold text-[10px]" style={{
                  color: streak >= 10 ? '#ff4488' : streak >= 6 ? '#ff8844' : '#44ffcc',
                }}>
                  x{multi} ({streak})
                </span>
              </div>
            )}

            {/* Title */}
            <div className="flex items-center justify-between mt-1.5">
              <span className={labelStyle} style={{ color: '#445' }}>Rank</span>
              <span className="font-mono font-bold text-[10px]" style={{ color: '#ffcc44' }}>{getPlayerTitle()}</span>
            </div>

            {/* Controls */}
            <div className="mt-2 pt-2 border-t border-white/[0.03] flex gap-2 justify-center text-[7px] text-gray-600 font-mono">
              <span>Hold Q Fire</span>
              <span>·</span>
              <span>Scroll Cycle</span>
              <span>·</span>
              <span>H Heal</span>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes health-low-pulse {
          0%, 100% { box-shadow: 0 0 4px rgba(255,68,68,0.4); }
          50% { box-shadow: 0 0 12px rgba(255,68,68,0.8); }
        }
      `}</style>
    </div>
  )
}
