import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { triggerShake } from '../hooks/useScreenShake'
import { setTimeScaleTarget } from './TimeManager'
import { spawnEnemy } from './Combat/HostileEnemyManager'

export type CataclysmType =
  | 'timeStorm'
  | 'voidIncursion'
  | 'chronoCascade'
  | 'temporalNova'
  | 'singularityFlare'

interface CataclysmEvent {
  type: CataclysmType
  label: string
  description: string
  color: string
  duration: number
}

const EVENTS: Record<CataclysmType, CataclysmEvent> = {
  timeStorm: {
    type: 'timeStorm',
    label: 'TIME STORM',
    description: 'Time itself is breaking apart! Resources decay 3x faster!',
    color: '#4488ff',
    duration: 15000,
  },
  voidIncursion: {
    type: 'voidIncursion',
    label: 'VOID INCURSION',
    description: 'The void bleeds through! Enemies spawning everywhere!',
    color: '#ff2244',
    duration: 20000,
  },
  chronoCascade: {
    type: 'chronoCascade',
    label: 'CHRONO CASCADE',
    description: 'Time crystals rain from the sky! Massive harvest bonus!',
    color: '#ffd700',
    duration: 15000,
  },
  temporalNova: {
    type: 'temporalNova',
    label: 'TEMPORAL NOVA',
    description: 'A temporal shockwave erupts! All blocks vaporized!',
    color: '#ff44ff',
    duration: 3000,
  },
  singularityFlare: {
    type: 'singularityFlare',
    label: 'SINGULARITY FLARE',
    description: 'The Chrono Singularity pulses with godlike energy!',
    color: '#ffffff',
    duration: 10000,
  },
}

let _activeEvent: CataclysmType | null = null
let _eventEndTime = 0
let _nextEventTime = 60000 + Math.random() * 120000
let _timeStormMultiplier = 1
let _chronoCascadeMultiplier = 1

export function getActiveEvent(): CataclysmType | null { return _activeEvent }
export function getTimeStormMultiplier() { return _timeStormMultiplier }
export function getChronoCascadeMultiplier() { return _chronoCascadeMultiplier }

function triggerEvent(type: CataclysmType) {
  const ev = EVENTS[type]
  _activeEvent = type
  _eventEndTime = performance.now() + ev.duration

  triggerShake(type === 'temporalNova' ? 1 : 0.5, type === 'temporalNova' ? 3 : 5, 1)

  switch (type) {
    case 'timeStorm':
      _timeStormMultiplier = 3
      setTimeScaleTarget(1.5)
      break
    case 'voidIncursion':
      for (let i = 0; i < 8; i++) {
        const angle = Math.random() * Math.PI * 2
        const dist = 10 + Math.random() * 20
        spawnEnemy(['wraith', 'voidWraith', 'phaseShifter'][Math.floor(Math.random() * 3)] as any,
          Math.cos(angle) * dist, Math.sin(angle) * dist)
      }
      break
    case 'chronoCascade':
      _chronoCascadeMultiplier = 5
      useStore.getState().addRaw(200)
      break
    case 'temporalNova':
      useStore.setState(() => ({ blocks: {} }))
      useStore.setState((s) => ({
        inventory: {
          ...s.inventory,
          vapour: 0,
          liquid: Math.floor(s.inventory.liquid / 2),
          crystal: Math.floor(s.inventory.crystal / 2),
        },
      }))
      break
    case 'singularityFlare':
      triggerShake(0.8, 4, 2)
      useStore.setState((s) => ({
        inventory: {
          ...s.inventory,
          raw: s.inventory.raw + 5000,
          liquid: s.inventory.liquid + 1000,
          crystal: s.inventory.crystal + 500,
          renown: s.inventory.renown + 100,
        },
      }))
      break
  }

  window.dispatchEvent(new CustomEvent('cataclysm-event', {
    detail: { type, label: ev.label, description: ev.description, color: ev.color, duration: ev.duration, active: true },
  }))
}

function endEvent(type: CataclysmType) {
  _activeEvent = null
  _timeStormMultiplier = 1
  _chronoCascadeMultiplier = 1
  setTimeScaleTarget(1.0)

  window.dispatchEvent(new CustomEvent('cataclysm-event', {
    detail: { type, active: false },
  }))
}

export function tickCataclysm(delta: number) {
  const prestigeRank = (() => {
    try { return parseInt(localStorage.getItem('chronoscape_prestige_rank') || '0') } catch { return 0 }
  })()

  if (_activeEvent) {
    if (performance.now() > _eventEndTime) {
      endEvent(_activeEvent)
    }
    return
  }

  _nextEventTime -= delta * 1000
  if (_nextEventTime <= 0) {
    const types: CataclysmType[] = ['timeStorm', 'voidIncursion', 'chronoCascade']
    if (prestigeRank >= 9) types.push('singularityFlare', 'temporalNova')
    else if (prestigeRank >= 6) types.push('temporalNova')

    const chosen = types[Math.floor(Math.random() * types.length)]
    triggerEvent(chosen)
    _nextEventTime = 120000 + Math.random() * 240000
  }
}

export const CataclysmBanner = () => {
  const [event, setEvent] = useState<{ label: string; description: string; color: string; duration: number } | null>(null)
  const [visible, setVisible] = useState(false)
  const [progress, setProgress] = useState(1)

  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail
      if (d.active) {
        setEvent(d)
        setVisible(true)
        setProgress(1)
      } else {
        setTimeout(() => {
          setVisible(false)
          setEvent(null)
        }, 1000)
      }
    }
    window.addEventListener('cataclysm-event', handler)
    return () => window.removeEventListener('cataclysm-event', handler)
  }, [])

  useEffect(() => {
    if (!event) return
    const iv = setInterval(() => {
      const remaining = _eventEndTime - performance.now()
      setProgress(Math.max(0, remaining / event.duration))
    }, 50)
    return () => clearInterval(iv)
  }, [event])

  if (!visible || !event) return null

  return (
    <>
      {/* Full-screen flash overlay */}
      {progress > 0.5 && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 9989,
            background: `radial-gradient(circle at 50% 50%, ${event.color}08 0%, transparent 70%)`,
            animation: 'fadeOut 0.6s ease-out',
          }}
        />
      )}

      {/* Banner */}
      <div
        style={{
          position: 'fixed',
          top: '15%',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9990,
          textAlign: 'center',
          pointerEvents: 'none',
          transition: 'opacity 0.5s ease',
          opacity: event ? 1 : 0,
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 900,
            fontFamily: 'monospace',
            letterSpacing: '0.3em',
            color: event.color,
            textShadow: `0 0 30px ${event.color}66, 0 0 60px ${event.color}33`,
            animation: 'countdown-flash 0.5s ease-in-out 3',
          }}
        >
          ⚡ {event.label} ⚡
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: `${event.color}cc`,
            marginTop: 8,
            letterSpacing: '0.1em',
            textShadow: `0 0 10px ${event.color}44`,
          }}
        >
          {event.description}
        </div>
        {/* Progress bar */}
        <div
          style={{
            width: 200,
            height: 2,
            margin: '12px auto 0',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 1,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progress * 100}%`,
              height: '100%',
              background: event.color,
              transition: 'width 0.05s linear',
              boxShadow: `0 0 6px ${event.color}`,
            }}
          />
        </div>
      </div>
    </>
  )
}
