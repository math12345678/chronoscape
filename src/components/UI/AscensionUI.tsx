import { useState, useEffect } from 'react'
import {
  getAscensionLevel, getAscensionShards, getTotalLifetimeShards,
  getTotalAscensions, getPendingShards, getUpgradeLevel,
  canAscend, ascend,
  ASCENSION_UPGRADES, buyUpgrade, getUpgradeCost,
  calculateShardsFromPrestige,
} from '../../systems/ChronoAscension'
import { getPrestigeRank } from '../PrestigeSystem'
import type { AscensionUpgrade } from '../../systems/ChronoAscension'

export const AscensionUI = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [, refresh] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const id = setInterval(() => refresh((n) => n + 1), 500)
    return () => clearInterval(id)
  }, [open])

  if (!open) return null

  const level = getAscensionLevel()
  const shards = getAscensionShards()
  const lifetime = getTotalLifetimeShards()
  const totalAsc = getTotalAscensions()
  const pending = getPendingShards()
  const rank = getPrestigeRank()
  const ascendReady = canAscend()

  const containerStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 2000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)',
  }

  const panelStyle: React.CSSProperties = {
    width: 700, maxHeight: '90vh', display: 'flex', flexDirection: 'column',
    background: 'linear-gradient(180deg, #0a0515, #05020a)',
    border: '1px solid #6a2aff44', borderRadius: 12, padding: 24,
    boxShadow: '0 0 80px rgba(106,42,255,0.12)',
  }

  const glowColor = level >= 10 ? '#ff00ff'
    : level >= 5 ? '#aa44ff'
    : level >= 2 ? '#8844ff'
    : '#6a2aff'

  const selectedUpgrade: AscensionUpgrade | undefined =
    selected ? ASCENSION_UPGRADES.find((u) => u.id === selected) : undefined

  return (
    <div style={containerStyle} onClick={onClose}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 24, fontWeight: 900, color: glowColor, letterSpacing: 3, textShadow: `0 0 30px ${glowColor}44` }}>
            ✦ CHRONO ASCENSION ✦
          </span>
          <button onClick={onClose} style={{
            background: 'none', border: '1px solid #4a2a6a', borderRadius: 6,
            color: '#aaa', padding: '4px 12px', cursor: 'pointer', fontSize: 14,
          }}>✕</button>
        </div>

        <div style={{ fontSize: 11, color: '#6a5a8a', marginBottom: 16 }}>
          Transcend the prestige system. Reset everything for Ascension Shards — permanent upgrades that persist across all runs.
        </div>

        {/* Stats Row */}
        <div style={{
          display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap',
        }}>
          {[
            ['Ascension Level', level.toString(), glowColor],
            ['Ascension Shards', shards.toLocaleString(), '#ffd700'],
            ['Lifetime Shards', lifetime.toLocaleString(), '#aa88ff'],
            ['Total Ascensions', totalAsc.toString(), '#ff44ff'],
            ['Pending Prestige', pending > 0 ? `${pending} shards` : 'None', pending > 0 ? '#ff8844' : '#5a4a6a'],
          ].map(([label, value, color]) => (
            <div key={label} style={{
              flex: 1, minWidth: 100, padding: 10, borderRadius: 8,
              background: '#0a0515', border: '1px solid #1a0a2a', textAlign: 'center',
            }}>
              <div style={{ fontSize: 9, color: '#5a4a6a', letterSpacing: 1 }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color, fontFamily: 'monospace' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Ascend Button */}
        <div style={{
          padding: 16, borderRadius: 8, marginBottom: 16, textAlign: 'center',
          background: 'linear-gradient(135deg, #1a0a2a, #0a0015)',
          border: `1px solid ${ascendReady ? glowColor : '#2a1a3a'}44`,
          boxShadow: ascendReady ? `0 0 30px ${glowColor}22` : 'none',
        }}>
          {ascendReady ? (
            <>
              <div style={{ fontSize: 14, fontWeight: 700, color: glowColor, marginBottom: 8 }}>
                ⚡ Ready to Ascend — Rank {rank} Max
              </div>
              <div style={{ fontSize: 11, color: '#8a7aaa', marginBottom: 4 }}>
                Gain {Math.floor(50 * (1 + getUpgradeLevel('asc_shard') * 0.25))} base shards
                {pending > 0 ? ` + ${pending} pending prestige shards` : ''}
              </div>
              <div style={{ fontSize: 10, color: '#6a5a8a', marginBottom: 12 }}>
                This will reset ALL progress except Ascension upgrades.
              </div>
              <button
                onClick={() => { ascend(); refresh((n) => n + 1) }}
                style={{
                  padding: '12px 48px', borderRadius: 8, fontSize: 16, fontWeight: 900,
                  border: `2px solid ${glowColor}`,
                  background: `linear-gradient(135deg, ${glowColor}33, ${glowColor}11)`,
                  color: glowColor, cursor: 'pointer', letterSpacing: 4,
                  boxShadow: `0 0 40px ${glowColor}33`,
                  animation: 'pulse-glow 2s infinite',
                }}>
                ✦ ASCEND ✦
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#5a4a6a' }}>
                🔒 Reach Prestige Rank 20 to Ascend
              </div>
              <div style={{ fontSize: 11, color: '#4a3a5a', marginTop: 4 }}>
                Current: Rank {rank}/20 · Pending shards from prestige: {pending}
              </div>
              <div style={{ fontSize: 10, color: '#3a2a4a', marginTop: 4 }}>
                Each prestige gives {calculateShardsFromPrestige(Math.max(1, rank))} shards
              </div>
            </>
          )}
        </div>

        {/* Main content: list + detail */}
        <div style={{ display: 'flex', gap: 16, flex: 1, overflow: 'hidden' }}>
          {/* Upgrade list */}
          <div style={{
            width: 300, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            {ASCENSION_UPGRADES.map((upg) => {
              const cost = getUpgradeCost(upg)
              const uLevel = getUpgradeLevel(upg.id)
              const maxed = uLevel >= upg.maxLevel
              const canBuy = shards >= cost && !maxed

              return (
                <div key={upg.id} style={{
                  padding: '8px 10px', borderRadius: 6,
                  border: `1px solid ${selected === upg.id ? upg.color : '#1a0a2a'}`,
                  background: selected === upg.id ? `${upg.color}0a` : '#0a0515',
                  cursor: 'pointer',
                  opacity: maxed ? 0.6 : 1,
                }}
                  onClick={() => setSelected(upg.id)}
                  onDoubleClick={() => { if (canBuy && buyUpgrade(upg)) refresh((n) => n + 1) }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 14 }}>{upg.icon}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 700, color: upg.color, flex: 1, marginLeft: 6,
                    }}>{upg.name}</span>
                    <span style={{
                      fontSize: 10, color: maxed ? '#ffd700' : canBuy ? '#44ff88' : '#5a4a6a',
                      fontWeight: 600,
                    }}>
                      {maxed ? 'MAX' : `${cost}💎`}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 2, marginTop: 4 }}>
                    {Array.from({ length: upg.maxLevel }).map((_, i) => (
                      <div key={i} style={{
                        width: 4, height: 4, borderRadius: '50%',
                        background: i < uLevel ? upg.color : '#1a0a2a',
                        transition: 'background 0.3s',
                      }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 9, color: '#6a5a8a', marginTop: 2 }}>
                    Lv.{uLevel}/{upg.maxLevel} · {upg.description}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Detail + Buy */}
          <div style={{
            flex: 1, borderRadius: 8, padding: 16,
            background: '#0a0515', border: '1px solid #1a0a2a',
          }}>
            {selectedUpgrade ? (
              <div>
                <div style={{ fontSize: 28, marginBottom: 4 }}>{selectedUpgrade.icon}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: selectedUpgrade.color }}>
                  {selectedUpgrade.name}
                </div>
                <div style={{ fontSize: 11, color: '#6a5a8a', marginTop: 4 }}>
                  {selectedUpgrade.description}
                </div>

                <div style={{ marginTop: 12, fontSize: 11, color: '#7a6a9a' }}>
                  Effects:
                </div>
                {selectedUpgrade.effects.map((eff, i) => {
                  const level = getUpgradeLevel(selectedUpgrade.id)
                  const val = selectedUpgrade.effectValues[i]
                  return (
                    <div key={i} style={{
                      padding: '8px 10px', marginTop: 4, borderRadius: 6,
                      background: '#0f0a1a', border: '1px solid #1a0a2a',
                      fontSize: 12, color: selectedUpgrade.color,
                    }}>
                      {eff} — <strong>Current: +{Math.round(val * level * 100) / 100}{eff.includes('%') ? '%' : ''}</strong>
                      {level < selectedUpgrade.maxLevel && (
                        <span style={{ color: '#6a5a8a' }}>
                          {' → '}Next: +{Math.round(val * (level + 1) * 100) / 100}{eff.includes('%') ? '%' : ''}
                        </span>
                      )}
                    </div>
                  )
                })}

                <div style={{
                  marginTop: 12, padding: '8px 10px', borderRadius: 6,
                  background: '#0f0a1a', border: '1px solid #1a0a2a',
                  fontSize: 11, color: '#5a4a6a',
                }}>
                  Level: {getUpgradeLevel(selectedUpgrade.id)}/{selectedUpgrade.maxLevel}
                  {getUpgradeLevel(selectedUpgrade.id) < selectedUpgrade.maxLevel && (
                    <span style={{ marginLeft: 8, color: shards >= getUpgradeCost(selectedUpgrade) ? '#44ff88' : '#ff4444' }}>
                      Cost: {getUpgradeCost(selectedUpgrade)} 💎
                    </span>
                  )}
                </div>

                {getUpgradeLevel(selectedUpgrade.id) < selectedUpgrade.maxLevel && (
                  <button
                    onClick={() => { buyUpgrade(selectedUpgrade); refresh((n) => n + 1) }}
                    disabled={shards < getUpgradeCost(selectedUpgrade)}
                    style={{
                      marginTop: 12, padding: '10px 24px', borderRadius: 6, width: '100%',
                      fontSize: 13, fontWeight: 700,
                      border: `1px solid ${shards >= getUpgradeCost(selectedUpgrade) ? selectedUpgrade.color : '#2a1a3a'}`,
                      background: shards >= getUpgradeCost(selectedUpgrade) ? `${selectedUpgrade.color}18` : 'transparent',
                      color: shards >= getUpgradeCost(selectedUpgrade) ? selectedUpgrade.color : '#4a3a5a',
                      cursor: shards >= getUpgradeCost(selectedUpgrade) ? 'pointer' : 'default',
                    }}>
                    {shards >= getUpgradeCost(selectedUpgrade) ? 'BUY UPGRADE' : 'Not enough Shards'}
                  </button>
                )}
              </div>
            ) : (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: '100%', color: '#3a2a4a', fontSize: 13,
              }}>
                Select an upgrade to view details<br />
                Double-click to buy
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
