import { useState, useEffect } from 'react'
import { ENEMIES } from '../../config/combat'
import type { EnemyType } from '../../config/combat'
import {
  getBestiary, getBestiaryCompletion, getBestiaryTotalKills,
} from '../../systems/ChronoBestiary'

const ENEMY_ICONS: Record<string, string> = {
  wraith: '👻',
  voidWraith: '💀',
  timeCrystalGolem: '🗿',
  phaseShifter: '🌀',
  temporalSentinel: '🤖',
  chronoBehemoth: '🐉',
  timeTyrant: '👑',
}

const REWARD_MILESTONES = [10, 50, 100, 500, 1000]

export const ChronoBestiaryUI = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [bestiary, setBestiary] = useState(getBestiary())
  const [selectedType, setSelectedType] = useState<EnemyType | null>(null)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    if (!open) return
    const id = setInterval(() => {
      setBestiary(getBestiary())
      setRefresh((r) => r + 1)
    }, 1000)
    return () => clearInterval(id)
  }, [open])

  if (!open) return null

  const containerStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
  }

  const panelStyle: React.CSSProperties = {
    width: 650, maxHeight: '85vh', overflow: 'auto',
    background: 'linear-gradient(180deg, #0a1018, #080e16)',
    border: '1px solid #2a3a50', borderRadius: 12, padding: 24,
    boxShadow: '0 0 60px rgba(100,50,255,0.1)',
  }

  return (
    <div style={containerStyle} onClick={onClose}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>
              📖 Chrono Bestiary
            </span>
            <span style={{ marginLeft: 12, fontSize: 12, color: '#44ffcc' }}>
              {getBestiaryCompletion()}% complete · {getBestiaryTotalKills()} total kills
            </span>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: '1px solid #3a4a60', borderRadius: 6,
            color: '#aaa', padding: '4px 12px', cursor: 'pointer', fontSize: 14,
          }}>✕</button>
        </div>

        {/* Completion bar */}
        <div style={{ marginBottom: 16 }}>
          <div style={{
            height: 4, borderRadius: 2, background: '#1a2a3a',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${getBestiaryCompletion()}%`, height: '100%',
              background: 'linear-gradient(90deg, #44ffcc, #aa88ff)',
              borderRadius: 2, transition: 'width 0.5s',
            }} />
          </div>
        </div>

        {/* Enemy grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 8, marginBottom: 16,
        }}>
          {Object.entries(bestiary).map(([type, entry]) => {
            const config = ENEMIES[type as EnemyType]
            if (!config) return null
            const isSelected = selectedType === type

            return (
              <div key={type} style={{
                padding: 12, borderRadius: 8, cursor: 'pointer',
                border: `1px solid ${isSelected ? config.color : '#1a2a3a'}`,
                background: isSelected ? config.color + '15' : '#0e1622',
                transition: 'all 0.2s',
              }}
                onClick={() => setSelectedType(isSelected ? null : type as EnemyType)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 20 }}>{ENEMY_ICONS[type] ?? '?'}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: config.color }}>
                    {config.name}
                  </span>
                  {entry.kills === 0 && (
                    <span style={{ fontSize: 10, color: '#5a6a80', marginLeft: 'auto' }}>
                      ????
                    </span>
                  )}
                </div>
                {/* Kill count bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    flex: 1, height: 4, borderRadius: 2, background: '#1a2a3a',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${Math.min(100, (entry.kills / 100) * 100)}%`,
                      height: '100%',
                      background: entry.kills > 0 ? config.color : '#2a3a4a',
                      borderRadius: 2,
                    }} />
                  </div>
                  <span style={{ fontSize: 11, color: entry.kills > 0 ? '#ccc' : '#5a6a80' }}>
                    {entry.kills > 0 ? `x${entry.kills}` : 'Not encountered'}
                  </span>
                </div>
                {/* Milestones reached */}
                <div style={{ marginTop: 4, display: 'flex', gap: 3 }}>
                  {REWARD_MILESTONES.map((m) => (
                    <div key={m} style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: entry.kills >= m ? config.color : '#1a2a3a',
                      transition: 'background 0.3s',
                    }} title={`${m} kills`} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Selected enemy details */}
        {selectedType && bestiary[selectedType] && (
          <div style={{
            padding: 16, borderRadius: 8,
            background: '#0a0e14', border: '1px solid #1a2a3a',
          }}>
            <div style={{ fontSize: 13, color: ENEMIES[selectedType]?.color, fontWeight: 700, marginBottom: 8 }}>
              {ENEMIES[selectedType]?.name ?? selectedType}
            </div>
            {bestiary[selectedType].kills > 0 ? (
              <>
                <div style={{ fontSize: 12, color: '#7a8a9a', lineHeight: 1.6, marginBottom: 8 }}>
                  {bestiary[selectedType].loreText}
                </div>
                <div style={{ fontSize: 11, color: '#5a6a80' }}>
                  First encountered: {bestiary[selectedType].firstKilledAt
                    ? new Date(bestiary[selectedType].firstKilledAt!).toLocaleDateString()
                    : 'Unknown'}
                  &nbsp;· Last: {bestiary[selectedType].lastKilledAt
                    ? new Date(bestiary[selectedType].lastKilledAt!).toLocaleDateString()
                    : 'Unknown'}
                </div>
                {/* Milestone progress */}
                <div style={{ marginTop: 8 }}>
                  {REWARD_MILESTONES.map((m) => {
                    const reached = bestiary[selectedType].kills >= m
                    return (
                      <div key={m} style={{
                        fontSize: 11, color: reached ? '#44ff88' : '#5a6a80',
                        marginBottom: 2,
                      }}>
                        {reached ? '✓' : '○'} {m} kills
                        {reached ? ' — Unlocked' : ''}
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: '#5a6a80', fontStyle: 'italic' }}>
                No data collected. Encounter this creature to unlock its lore.
              </div>
            )}
          </div>
        )}

        {/* Stats footer */}
        <div style={{ marginTop: 16, fontSize: 11, color: '#4a5a6a' }}>
          Discover all 7 enemy types to complete the bestiary.
          Milestones at 10, 50, 100, 500, and 1000 kills per type.
        </div>
      </div>
    </div>
  )
}
