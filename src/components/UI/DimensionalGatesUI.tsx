import { useState, useEffect } from 'react'
import { getThreatLevel } from '../../systems/EnemyEvolution'
import {
  DIMENSIONS, getDimensionState, getCurrentDimension,
  enterDimension, exitDimension, dimensionHasBeenUnlocked,
} from '../../systems/DimensionalGates'

export const DimensionalGatesUI = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [, setRefresh] = useState(0)

  useEffect(() => {
    if (!open) return
    const id = setInterval(() => setRefresh((n) => n + 1), 500)
    return () => clearInterval(id)
  }, [open])

  if (!open) return null

  const dimState = getDimensionState()
  const activeDim = getCurrentDimension()
  const threat = getThreatLevel()

  const cont: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)',
  }
  const panel: React.CSSProperties = {
    width: 600, maxHeight: '85vh', overflow: 'auto',
    padding: 24, borderRadius: 12,
    background: 'linear-gradient(180deg, #0d1520, #080e16)',
    border: '1px solid #aa44ff44',
    boxShadow: '0 0 60px rgba(170,68,255,0.08)',
  }

  return (
    <div style={cont} onClick={onClose}>
      <div style={panel} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#aa44ff' }}>Dimensional Gates</span>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid #3a4a60', borderRadius: 6, color: '#aaa', padding: '4px 12px', cursor: 'pointer' }}>X</button>
        </div>
        <div style={{ fontSize: 11, color: '#5a6a80', marginBottom: 16 }}>
          {activeDim
            ? `Currently in ${activeDim.name} (${Math.floor(dimState.timeInDimension)}s)`
            : 'Enter a dimension for unique rules and rewards.'}
        </div>

        {/* Active dimension controls */}
        {activeDim && (
          <div style={{
            padding: 12, borderRadius: 8, marginBottom: 16,
            border: `1px solid ${activeDim.color}44`,
            background: `${activeDim.color}0a`, textAlign: 'center',
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: activeDim.color, marginBottom: 4 }}>
              {activeDim.icon} {activeDim.name}
            </div>
            <div style={{ fontSize: 10, color: '#aaa', marginBottom: 4 }}>{activeDim.rule}</div>
            <div style={{ fontSize: 10, color: '#5a6a80', marginBottom: 8 }}>
              Time: {Math.floor(dimState.timeInDimension)}s
            </div>
            <button onClick={() => { exitDimension(); setRefresh((n) => n + 1) }}
              style={{
                padding: '8px 24px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                border: '1px solid #ff4444', color: '#ff4444',
                background: '#ff444418', cursor: 'pointer',
              }}>
              Exit Dimension
            </button>
          </div>
        )}

        {/* Dimension list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {DIMENSIONS.map((dim) => {
            const unlocked = dimensionHasBeenUnlocked(dim.id)
            const isActive = dimState.currentDimension === dim.id
            const meetsThreat = threat >= dim.threatRequired

            return (
              <div key={dim.id} style={{
                padding: 12, borderRadius: 8,
                border: `1px solid ${isActive ? dim.color : unlocked ? dim.color + '44' : '#1a1a2a'}`,
                background: isActive ? `${dim.color}12` : unlocked ? `${dim.color}06` : '#0a0e14',
                opacity: (unlocked || meetsThreat) ? 1 : 0.4,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: dim.color }}>
                      {dim.icon} {dim.name}
                      {unlocked && <span style={{ fontSize: 9, color: '#5a6a80', marginLeft: 6 }}>(unlocked)</span>}
                    </div>
                    <div style={{ fontSize: 10, color: '#7a8a9a' }}>{dim.description}</div>
                    <div style={{ fontSize: 9, color: '#5a6a80', marginTop: 2 }}>{dim.rule}</div>
                    <div style={{ fontSize: 9, color: '#4a5a6a', marginTop: 1 }}>
                      Harvest x{dim.harvestMult} · Dmg x{dim.damageMult} · Spd x{dim.speedMult}
                      {' \u00B7 '}{dim.resourceType} ({Math.round(dim.resourceChance * 100)}%)
                    </div>
                    {unlocked && dimState.totalTimePerDimension[dim.id] > 0 && (
                      <div style={{ fontSize: 9, color: '#5a6a80' }}>
                        Time spent: {Math.floor(dimState.totalTimePerDimension[dim.id])}s
                        {' \u00B7 '}Resources: {dimState.resourcesCollected[dim.id] ?? 0}
                      </div>
                    )}
                  </div>
                  {!isActive && (unlocked || meetsThreat) && !dimState.active && (
                    <button onClick={() => { enterDimension(dim.id); setRefresh((n) => n + 1) }}
                      style={{
                        padding: '6px 14px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                        border: `1px solid ${dim.color}`, color: dim.color,
                        background: `${dim.color}18`, cursor: 'pointer',
                      }}>
                      Enter
                    </button>
                  )}
                  {!isActive && !unlocked && !meetsThreat && (
                    <span style={{ fontSize: 9, color: '#3a4a5a' }}>
                      Need Threat {dim.threatRequired}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
