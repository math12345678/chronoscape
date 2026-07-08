import { useState, useEffect, useCallback } from 'react'
import { getTimeCreditBalance } from '../../config/timeCredit'
import { isPlayerDriving } from './HoverVehicle'
import { UI } from '../../utils/uiStyles'
import {
  startRace,
  isRaceActive,
  getRaceProgress,
  getOpponentProgress,
  getRaceDistance,
  getRaceFinished,
  getRaceWon,
  claimRacePrize,
  getRaces,
  getVehicleUpgrades,
  upgradeVehicle,
} from './DragRace'

export const DragRacePanel = ({ onClose }: { onClose: () => void }) => {
  const [tab, setTab] = useState<'races' | 'upgrades'>('races')
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    const iv = setInterval(() => setRefresh(n => n + 1), 100)
    return () => clearInterval(iv)
  }, [])

  const tc = getTimeCreditBalance()
  const raceActive = isRaceActive()
  const raceFinished = getRaceFinished()
  const raceWon = getRaceWon()
  const progress = getRaceProgress()
  const opponent = getOpponentProgress()
  const distance = getRaceDistance()
  const driving = isPlayerDriving()
  const upgrades = getVehicleUpgrades()

  const handleStartRace = useCallback((idx: number) => {
    if (startRace(idx)) {
      onClose()
    }
  }, [onClose])

  const handleClaim = useCallback(() => {
    if (claimRacePrize()) setRefresh(n => n + 1)
  }, [])

  const handleUpgrade = useCallback((slot: 'engineLevel' | 'handlingLevel' | 'boostLevel' | 'paintJob') => {
    if (upgradeVehicle(slot)) setRefresh(n => n + 1)
  }, [])

  if (!driving && !raceActive) {
    return (
      <div style={{
        ...UI.panel({ padding: '12px' }),
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 320, zIndex: 9000, fontFamily: 'monospace', color: '#889',
      }}>
        <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700, color: '#ffd700', marginBottom: 12, textAlign: 'center' }}>
          DRAG RACE — ${tc.toLocaleString()}
        </div>
        <p style={{ fontSize: 10, color: '#667', textAlign: 'center', marginBottom: 12 }}>
          Get in a vehicle (press V) to start racing!
        </p>
        <div style={{ textAlign: 'center' }}>
          <button onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#889', padding: '6px 16px', borderRadius: 6, cursor: 'pointer',
              fontSize: 10, fontFamily: 'monospace',
            }}
          >Close</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      ...UI.panel({ padding: '12px' }),
      position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
      width: 320, zIndex: 9000, fontFamily: 'monospace', color: '#889',
    }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12, justifyContent: 'center' }}>
        <button onClick={() => setTab('races')}
          style={{
            padding: '4px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 9,
            fontFamily: 'monospace', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700,
            background: tab === 'races' ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.04)',
            border: tab === 'races' ? '1px solid rgba(255,215,0,0.3)' : '1px solid rgba(255,255,255,0.06)',
            color: tab === 'races' ? '#ffd700' : '#667',
          }}
        >Races</button>
        <button onClick={() => setTab('upgrades')}
          style={{
            padding: '4px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 9,
            fontFamily: 'monospace', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700,
            background: tab === 'upgrades' ? 'rgba(68,255,204,0.15)' : 'rgba(255,255,255,0.04)',
            border: tab === 'upgrades' ? '1px solid rgba(68,255,204,0.3)' : '1px solid rgba(255,255,255,0.06)',
            color: tab === 'upgrades' ? '#44ffcc' : '#667',
          }}
        >Upgrades</button>
      </div>

      {tab === 'races' && (
        <>
          {raceActive || raceFinished ? (
            /* Active race HUD */
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, textAlign: 'center', marginBottom: 8, color: raceFinished ? (raceWon ? '#44ff88' : '#ff6644') : '#ffd700' }}>
                {raceFinished ? (raceWon ? 'YOU WIN!' : 'You Lost...') : 'RACING — mash Space/Click!'}
              </div>
              {/* Progress bars */}
              <div style={{ marginBottom: 4 }}>
                <div style={{ fontSize: 8, color: '#44ffcc', marginBottom: 2 }}>YOU</div>
                <div style={{ height: 14, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, (progress / distance) * 100)}%`, background: '#44ffcc', borderRadius: 4, transition: 'width 0.1s' }} />
                </div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 8, color: '#ff6644', marginBottom: 2 }}>OPPONENT</div>
                <div style={{ height: 14, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, (opponent / distance) * 100)}%`, background: '#ff6644', borderRadius: 4, transition: 'width 0.1s' }} />
                </div>
              </div>
              {raceWon && !getRaceFinished() && (
                <div style={{ textAlign: 'center' }}>
                  <button onClick={handleClaim}
                    style={{
                      background: 'rgba(68,255,136,0.15)', border: '1px solid rgba(68,255,136,0.3)',
                      color: '#44ff88', padding: '6px 20px', borderRadius: 6, cursor: 'pointer',
                      fontSize: 10, fontFamily: 'monospace', fontWeight: 700,
                    }}
                  >Claim Prize</button>
                </div>
              )}
            </div>
          ) : (
            /* Race selection */
            getRaces().map((race, idx) => {
              const canAfford = tc >= race.entryFee
              return (
                <div key={idx} style={{
                  padding: '8px 10px', marginBottom: 6,
                  borderRadius: 6,
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.04)',
                  opacity: canAfford ? 1 : 0.4,
                  cursor: canAfford ? 'pointer' : 'default',
                }} onClick={() => canAfford && handleStartRace(idx)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 12, color: canAfford ? '#ffd700' : '#667' }}>
                      {race.opponentName}
                    </span>
                    <span style={{
                      fontSize: 8, padding: '1px 6px', borderRadius: 3,
                      background: race.difficulty === 'easy' ? 'rgba(68,255,136,0.1)' : race.difficulty === 'medium' ? 'rgba(255,200,68,0.1)' : 'rgba(255,68,68,0.1)',
                      color: race.difficulty === 'easy' ? '#44ff88' : race.difficulty === 'medium' ? '#ffcc44' : '#ff4444',
                    }}>
                      {race.difficulty.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: 9, color: '#667', marginBottom: 2 }}>
                    {race.distance}m · ${race.prizePool.toLocaleString()} prize
                  </div>
                  <div style={{ fontSize: 8, color: canAfford ? '#44ffcc' : '#ff6644' }}>
                    Entry: ${race.entryFee} TC
                  </div>
                </div>
              )
            })
          )}
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <button onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#889', padding: '6px 16px', borderRadius: 6, cursor: 'pointer',
                fontSize: 10, fontFamily: 'monospace',
              }}
            >Close</button>
          </div>
        </>
      )}

      {tab === 'upgrades' && (
        <div>
          {(['engineLevel', 'handlingLevel', 'boostLevel', 'paintJob'] as const).map(slot => {
            const label = slot === 'engineLevel' ? 'Engine' : slot === 'handlingLevel' ? 'Handling' : slot === 'boostLevel' ? 'Boost' : 'Paint Job'
            const level = slot === 'paintJob' ? (upgrades.paintJob ? 1 : 0) : upgrades[slot] as number
            const maxLevel = slot === 'engineLevel' ? 3 : slot === 'handlingLevel' ? 2 : slot === 'boostLevel' ? 2 : 1
            const maxed = level >= maxLevel
            const costs: Record<string, number> = {
              engineLevel: level === 0 ? 100 : level === 1 ? 500 : 2000,
              handlingLevel: level === 0 ? 300 : 800,
              boostLevel: level === 0 ? 750 : 1500,
              paintJob: 200,
            }
            const cost = costs[slot]
            const canAfford = tc >= cost && !maxed

            return (
              <div key={slot} style={{
                padding: '8px 10px', marginBottom: 6,
                borderRadius: 6,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.04)',
                opacity: maxed ? 0.5 : 1,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: 11, color: maxed ? '#44ff88' : '#ccd' }}>
                    {label} {maxed ? 'MAX' : `Lv.${level}/${maxLevel}`}
                  </span>
                  {!maxed && (
                    <button onClick={() => handleUpgrade(slot)}
                      style={{
                        background: canAfford ? 'rgba(68,255,204,0.1)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${canAfford ? 'rgba(68,255,204,0.3)' : 'rgba(255,255,255,0.06)'}`,
                        color: canAfford ? '#44ffcc' : '#556',
                        padding: '3px 10px', borderRadius: 4, cursor: canAfford ? 'pointer' : 'default',
                        fontSize: 9, fontFamily: 'monospace',
                      }}
                    >${cost} TC</button>
                  )}
                </div>
                <div style={{ fontSize: 8, color: '#667', marginTop: 2 }}>
                  {slot === 'engineLevel' && `+${level * 3} speed (next: +${(level + 1) * 3})`}
                  {slot === 'handlingLevel' && `+${Math.round(level * 15)}% turn rate (next: +${Math.round((level + 1) * 15)}%)`}
                  {slot === 'boostLevel' && `+${Math.round(level * 30)}% boost power (next: +${Math.round((level + 1) * 30)}%)`}
                  {slot === 'paintJob' && 'Custom paint job'}
                </div>
              </div>
            )
          })}
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <button onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#889', padding: '6px 16px', borderRadius: 6, cursor: 'pointer',
                fontSize: 10, fontFamily: 'monospace',
              }}
            >Close</button>
          </div>
        </div>
      )}
    </div>
  )
}