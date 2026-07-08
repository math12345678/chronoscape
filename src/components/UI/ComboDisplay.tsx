import { useState, useEffect, useRef } from 'react'

interface HarvestPopup {
  id: number
  amount: string
  x: number
  y: number
  birth: number
}

let harvestPopupId = 0
const harvestPopups: HarvestPopup[] = []

export const ComboDisplay = () => {
  const [combo, setCombo] = useState(0)
  const [multiplier, setMultiplier] = useState(1)
  const [pop, setPop] = useState(false)
  const [pops, setPops] = useState<HarvestPopup[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const frameRef = useRef(0)
  const [milestone, setMilestone] = useState(0)
  const hasActivePopups = useRef(false)

  // Only run the render loop when there are active popups
  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail
      if (d.amount) {
        harvestPopups.push({
          id: harvestPopupId++,
          amount: `+${d.amount}`,
          x: 45 + Math.random() * 10,
          y: 35 + Math.random() * 8,
          birth: performance.now(),
        })
        hasActivePopups.current = true
        // Start the loop if it's not running
        if (!frameRef.current) {
          frameRef.current = requestAnimationFrame(function tick() {
            const now = performance.now()
            for (let i = harvestPopups.length - 1; i >= 0; i--) {
              if (now - harvestPopups[i].birth > 900) harvestPopups.splice(i, 1)
            }
            setPops([...harvestPopups])
            if (harvestPopups.length > 0) {
              frameRef.current = requestAnimationFrame(tick)
            } else {
              hasActivePopups.current = false
              frameRef.current = 0
              // Clear the state so React can bail out
              setPops([])
            }
          })
        }
      }
    }
    window.addEventListener('harvest-event', handler)
    return () => {
      cancelAnimationFrame(frameRef.current)
      window.removeEventListener('harvest-event', handler)
    }
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail
      setCombo(d.combo)
      setMultiplier(d.multiplier)
      if (d.combo > 0) {
        setPop(true)
        clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => setPop(false), 200)
      }
      if (d.combo >= 5 && d.combo % 5 === 0) {
        setMilestone(d.combo)
        setTimeout(() => setMilestone(0), 800)
      }
    }
    window.addEventListener('combo-update', handler)
    return () => {
      window.removeEventListener('combo-update', handler)
      clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <>
      {pops.map(p => {
        const age = (performance.now() - p.birth) / 900
        const opacity = Math.max(0, 1 - age)
        const yOff = -40 * age
        return (
          <div
            key={p.id}
            className="fixed pointer-events-none z-50 select-none"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              transform: `translate(-50%, ${yOff}px)`,
              fontSize: 16 + (1 - age) * 8,
              fontWeight: 800,
              fontFamily: '"JetBrains Mono", monospace',
              color: '#44ffcc',
              textShadow: '0 0 12px rgba(68,255,204,0.5)',
              opacity,
              transition: 'none',
            }}
          >
            {p.amount}
          </div>
        )
      })}

      {combo >= 2 && (
        <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-40 select-none">
          <div
            className="absolute"
            style={{
              left: '50%', top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 80 + combo * 4,
              height: 80 + combo * 4,
              borderRadius: '50%',
              border: `2px solid ${multiplier >= 3 ? 'rgba(255,68,255,0.15)' : 'rgba(68,255,204,0.12)'}`,
              boxShadow: `0 0 ${8 + combo * 2}px ${multiplier >= 3 ? 'rgba(255,68,255,0.08)' : 'rgba(68,255,204,0.06)'}`,
              animation: 'comboRing 2s linear infinite',
            }}
          />
          {milestone > 0 && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                borderRadius: '50%',
                background: `radial-gradient(circle, ${multiplier >= 3 ? 'rgba(255,68,255,0.2)' : 'rgba(68,255,204,0.2)'} 0%, transparent 70%)`,
                transform: 'scale(3)',
                animation: 'fadeOut 0.8s ease-out forwards',
              }}
            />
          )}
          <div
            style={{
              textAlign: 'center',
              transform: pop ? 'scale(1.2)' : 'scale(1)',
              transition: 'transform 0.1s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <div
              className="font-mono font-black tracking-widest"
              style={{
                fontSize: combo >= 7 ? 52 : combo >= 5 ? 44 : 36,
                color: multiplier >= 3 ? '#ff44ff' : multiplier >= 2 ? '#ff8844' : '#44ffcc',
                textShadow: combo >= 7
                  ? '0 0 40px rgba(255,68,255,0.5), 0 0 80px rgba(255,68,255,0.3)'
                  : multiplier >= 3
                    ? '0 0 30px rgba(255,68,255,0.4)'
                    : multiplier >= 2
                      ? '0 0 30px rgba(255,136,68,0.3)'
                      : '0 0 30px rgba(68,255,204,0.3)',
                opacity: Math.min(1, 0.5 + combo * 0.1),
              }}
            >
              {combo}x
            </div>
            <div
              className="font-mono text-xs tracking-widest"
              style={{
                color: multiplier >= 3 ? 'rgba(255,68,255,0.4)' : 'rgba(255,255,255,0.3)',
                marginTop: -2,
              }}
            >
              x{multiplier.toFixed(1)} harvest
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes comboRing { 0% { transform: translate(-50%, -50%) rotate(0deg); } 100% { transform: translate(-50%, -50%) rotate(360deg); } }`}</style>
    </>
  )
}
