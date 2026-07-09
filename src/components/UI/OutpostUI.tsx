import { useState, useEffect } from 'react'
import { useStore } from '../../store'
import {
  getOutposts, getClaims, getModuleDefs, getMaxClaims,
  claimChunk, buildOutpost, addOutpostModule, repairOutpost,
  abandonOutpost, getOutpostIncome,
} from '../../systems/ChronoOutposts'

interface Props { open: boolean; onClose: () => void }

const MODULE_ICONS: Record<string, string> = {
  storage: '📦', turret: '🔫', teleporter: '🚪',
  extractor: '⛏️', barracks: '🏴', lab: '🔬',
}

export const OutpostUI = ({ open, onClose }: Props) => {
  const [tab, setTab] = useState<'outposts' | 'claim'>('outposts')
  const [, forceUpdate] = useState(0)
  const redraw = () => forceUpdate(n => n + 1)
  const [claimX, setClaimX] = useState(0)
  const [claimZ, setClaimZ] = useState(0)

  useEffect(() => {
    if (!open) return
    const interval = setInterval(redraw, 5000)
    return () => clearInterval(interval)
  }, [open])

  if (!open) return null

  const outposts = getOutposts()
  const claims = getClaims()
  const modDefs = getModuleDefs()
  const maxClaims = getMaxClaims()
  const income = getOutpostIncome()
  const inv = useStore.getState().inventory
  const active = outposts.filter(o => o.active)
  const activeClaims = claims.filter(c => c.outpostId !== null)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)', fontFamily: 'monospace',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'rgba(5,10,25,0.97)', border: '1px solid rgba(68,255,204,0.3)',
        borderRadius: 12, padding: 24, maxWidth: 700, width: '95%',
        maxHeight: '85vh', overflow: 'auto', color: '#fff',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ color: '#44ffcc', fontSize: 16, letterSpacing: 2, fontWeight: 'bold' }}>
            🏰 CHRONO OUTPOSTS
          </span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', padding: '4px 8px', background: 'rgba(68,255,204,0.1)', borderRadius: 4 }}>
              Claims: {activeClaims.length}/{maxClaims}
            </span>
            {['outposts', 'claim'].map(t => (
              <button key={t} onClick={() => setTab(t as any)} style={{
                padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(68,255,204,0.2)',
                background: tab === t ? 'rgba(68,255,204,0.2)' : 'transparent',
                color: tab === t ? '#44ffcc' : 'rgba(255,255,255,0.4)',
                cursor: 'pointer', fontFamily: 'monospace', fontSize: 10,
              }}>{t === 'outposts' ? 'Outposts' : 'Claim'}</button>
            ))}
            <button onClick={onClose} style={{
              background: 'rgba(255,0,0,0.15)', border: '1px solid rgba(255,0,0,0.3)',
              color: '#ff4444', borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
              fontFamily: 'monospace', fontSize: 11,
            }}>✕</button>
          </div>
        </div>

        {/* Income banner */}
        {income.raw > 0 && (
          <div style={{
            marginBottom: 12, padding: '8px 12px', borderRadius: 8,
            border: '1px solid rgba(68,255,136,0.2)', background: 'rgba(68,255,136,0.05)',
            fontSize: 10, color: '#44ff88',
          }}>
            Passive income: +{income.raw.toFixed(1)} Raw/s | +{income.liquid.toFixed(1)} Liq/s | +{income.renown.toFixed(2)} Ren/s
          </div>
        )}

        {tab === 'outposts' && (
          <div>
            {active.length === 0 && (
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center', padding: 20 }}>
                No outposts built. Claim territory first, then build an outpost.
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {active.map(o => (
                <div key={o.id} style={{
                  padding: 12, borderRadius: 8,
                  border: '1px solid rgba(68,255,204,0.2)', background: 'rgba(68,255,204,0.03)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div>
                      <span style={{ color: '#44ffcc', fontWeight: 'bold', fontSize: 13 }}>🏰 {o.name}</span>
                      <span style={{ color: 'rgba(255,255,255,0.3)', marginLeft: 6, fontSize: 10 }}>
                        ({o.worldX.toFixed(0)}, {o.worldZ.toFixed(0)}) Lv.{o.level}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => { repairOutpost(o.id); redraw() }} style={{
                        padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(68,255,136,0.3)',
                        background: 'rgba(68,255,136,0.1)', color: '#44ff88', cursor: 'pointer',
                        fontFamily: 'monospace', fontSize: 9,
                      }}>Repair</button>
                      <button onClick={() => { abandonOutpost(o.id); redraw() }} style={{
                        padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(255,68,68,0.3)',
                        background: 'rgba(255,68,68,0.1)', color: '#ff4444', cursor: 'pointer',
                        fontFamily: 'monospace', fontSize: 9,
                      }}>Abandon</button>
                    </div>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                      <div style={{
                        width: `${(o.health / o.maxHealth) * 100}%`, height: '100%',
                        background: o.health / o.maxHealth > 0.5 ? '#44ff88' : '#ff8844',
                        borderRadius: 2,
                      }} />
                    </div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                      HP: {o.health.toFixed(0)}/{o.maxHealth} | Income generated: {o.incomeGenerated.toFixed(0)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Modules:</div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {modDefs.filter(m => o.modules.includes(m.id)).map(m => (
                        <span key={m.id} style={{
                          fontSize: 9, padding: '2px 6px', borderRadius: 4,
                          background: `${m.color}15`, color: m.color, border: `1px solid ${m.color}33`,
                        }}>
                          {MODULE_ICONS[m.id] || '📦'} {m.name}
                        </span>
                      ))}
                      {modDefs.filter(m => !o.modules.includes(m.id)).map(m => {
                        const canAfford = inv.raw >= m.cost.raw && inv.liquid >= m.cost.liquid &&
                          inv.crystal >= m.cost.crystal && inv.renown >= m.cost.renown
                        return (
                          <button key={m.id} onClick={() => { addOutpostModule(o.id, m.id); redraw() }} style={{
                            fontSize: 9, padding: '2px 6px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)',
                            background: 'transparent', color: canAfford ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)',
                            cursor: canAfford ? 'pointer' : 'default', fontFamily: 'monospace', opacity: canAfford ? 1 : 0.4,
                          }}>
                            +{MODULE_ICONS[m.id] || '📦'} {m.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'claim' && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 6 }}>Claim a chunk (chunk coordinates):</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input value={claimX} onChange={e => setClaimX(Number(e.target.value))} type="number" style={{
                  width: 100, padding: 6, borderRadius: 6, border: '1px solid rgba(68,255,204,0.2)',
                  background: 'rgba(0,0,0,0.5)', color: '#44ffcc', fontFamily: 'monospace', fontSize: 12, textAlign: 'center',
                }} placeholder="X" />
                <input value={claimZ} onChange={e => setClaimZ(Number(e.target.value))} type="number" style={{
                  width: 100, padding: 6, borderRadius: 6, border: '1px solid rgba(68,255,204,0.2)',
                  background: 'rgba(0,0,0,0.5)', color: '#44ffcc', fontFamily: 'monospace', fontSize: 12, textAlign: 'center',
                }} placeholder="Z" />
                <button onClick={() => { claimChunk(claimX, claimZ); redraw() }} style={{
                  padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  fontFamily: 'monospace', fontSize: 11, fontWeight: 'bold',
                  background: 'linear-gradient(135deg, #44ffcc, #44aaff)', color: '#000',
                }}>Claim</button>
              </div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>
                Cost scales with distance. Current chunk: ({Math.floor(((window as any).__PLAYER_POSITION?.x ?? 0) / 32)}, {Math.floor(((window as any).__PLAYER_POSITION?.z ?? 0) / 32)})
              </div>
            </div>

            {claims.length > 0 && (
              <div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 6 }}>Your Claims:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {claims.map(c => (
                    <div key={c.id} style={{
                      padding: 8, borderRadius: 6, fontSize: 11,
                      border: `1px solid ${c.color}33`, background: `${c.color}08`,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <span style={{ color: c.color }}>
                        🏴 Chunk ({c.chunkX}, {c.chunkZ}) {c.outpostId ? '— has outpost' : '— no outpost'}
                      </span>
                      {!c.outpostId && (
                        <button onClick={() => { buildOutpost(c.chunkX, c.chunkZ); redraw() }} style={{
                          padding: '3px 10px', borderRadius: 4, border: 'none', cursor: 'pointer',
                          fontFamily: 'monospace', fontSize: 10,
                          background: 'linear-gradient(135deg, #44ffcc, #44aaff)', color: '#000', fontWeight: 'bold',
                        }}>Build Outpost</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
