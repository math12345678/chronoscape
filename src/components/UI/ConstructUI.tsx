import { useState, useEffect } from 'react'
import { useStore } from '../../store'
import {
  getConstructDefs, getDeployed, deployConstruct, upgradeConstruct,
  repairConstruct, recallConstruct, getConstructEfficiency,
} from '../../systems/AutomationConstructs'
import type { ConstructType } from '../../systems/AutomationConstructs'

interface Props { open: boolean; onClose: () => void }

const TYPE_COLORS: Record<string, string> = { harvester: '#ffd700', sentinel: '#ff4444', builder: '#44aaff', explorer: '#aa44ff' }
const TYPE_ICONS: Record<string, string> = { harvester: '🔧', sentinel: '🛡️', builder: '🏗️', explorer: '🧭' }

export const ConstructUI = ({ open, onClose }: Props) => {
  const [tab, setTab] = useState<'deploy' | 'active'>('deploy')
  const [, forceUpdate] = useState(0)
  const redraw = () => forceUpdate(n => n + 1)

  useEffect(() => {
    if (!open) return
    const interval = setInterval(redraw, 3000)
    return () => clearInterval(interval)
  }, [open])

  if (!open) return null

  const defs = getConstructDefs()
  const deployed = getDeployed()
  const inv = useStore.getState().inventory
  const active = deployed.filter(c => c.active)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)', fontFamily: 'monospace',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'rgba(5,10,25,0.97)', border: '1px solid rgba(68,255,204,0.3)',
        borderRadius: 12, padding: 24, maxWidth: 650, width: '95%',
        maxHeight: '85vh', overflow: 'auto', color: '#fff',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ color: '#44ffcc', fontSize: 16, letterSpacing: 2, fontWeight: 'bold' }}>
            ⚙️ TIME CONSTRUCTS
          </span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', padding: '4px 8px', background: 'rgba(68,255,204,0.1)', borderRadius: 4 }}>
              {active.length} active
            </span>
            {['deploy', 'active'].map(t => (
              <button key={t} onClick={() => setTab(t as any)} style={{
                padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(68,255,204,0.2)',
                background: tab === t ? 'rgba(68,255,204,0.2)' : 'transparent',
                color: tab === t ? '#44ffcc' : 'rgba(255,255,255,0.4)',
                cursor: 'pointer', fontFamily: 'monospace', fontSize: 10,
              }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
            ))}
            <button onClick={onClose} style={{
              background: 'rgba(255,0,0,0.15)', border: '1px solid rgba(255,0,0,0.3)',
              color: '#ff4444', borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
              fontFamily: 'monospace', fontSize: 11,
            }}>✕</button>
          </div>
        </div>

        {tab === 'deploy' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {defs.map(def => {
              const canAfford = inv.raw >= def.baseCost.raw && inv.liquid >= def.baseCost.liquid &&
                inv.crystal >= def.baseCost.crystal && inv.renown >= def.baseCost.renown
              const typeCount = deployed.filter(c => {
                const d = defs.find(dd => dd.id === c.defId)
                return d?.type === def.type && c.active
              }).length
              return (
                <div key={def.id} style={{
                  padding: 10, borderRadius: 8,
                  border: `1px solid ${TYPE_COLORS[def.type] || '#888'}33`,
                  background: `${TYPE_COLORS[def.type] || '#888'}08`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: 14, marginRight: 4 }}>{TYPE_ICONS[def.type] || '⚙️'}</span>
                      <span style={{ color: TYPE_COLORS[def.type] || '#fff', fontWeight: 'bold', fontSize: 13 }}>{def.name}</span>
                      <span style={{ color: 'rgba(255,255,255,0.3)', marginLeft: 6, fontSize: 10 }}>({typeCount} deployed)</span>
                    </div>
                    <button
                      disabled={!canAfford}
                      onClick={() => {
                        // Deploy at a default position near player
                        const playerPos = (window as any).__PLAYER_POSITION ?? { x: 0, z: 0 }
                        const c = deployConstruct(def.id, playerPos.x + Math.random() * 10 - 5, playerPos.z + Math.random() * 10 - 5)
                        if (c) redraw()
                      }}
                      style={{
                        padding: '4px 12px', borderRadius: 6, border: 'none', cursor: canAfford ? 'pointer' : 'default',
                        fontFamily: 'monospace', fontSize: 10, fontWeight: 'bold',
                        background: canAfford ? 'linear-gradient(135deg, #44ffcc, #44aaff)' : 'rgba(255,255,255,0.05)',
                        color: canAfford ? '#000' : 'rgba(255,255,255,0.3)',
                        opacity: canAfford ? 1 : 0.5,
                      }}>
                      Deploy
                    </button>
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{def.description}</div>
                  <div style={{ fontSize: 9, color: canAfford ? '#44ff88' : '#ff4444', marginTop: 2 }}>
                    Cost: {def.baseCost.raw}R {def.baseCost.liquid}L {def.baseCost.crystal}C {def.baseCost.renown}Ren
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'active' && (
          <div>
            {active.length === 0 && (
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center', padding: 20 }}>
                No constructs deployed. Deploy one from the Deploy tab.
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {active.map(c => {
                const def = defs.find(d => d.id === c.defId)
                if (!def) return null
                return (
                  <div key={c.id} style={{
                    padding: 10, borderRadius: 8,
                    border: `1px solid ${TYPE_COLORS[def.type] || '#888'}33`,
                    background: `${TYPE_COLORS[def.type] || '#888'}08`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ color: TYPE_COLORS[def.type] || '#fff', fontWeight: 'bold', fontSize: 13 }}>
                          {TYPE_ICONS[def.type] || '⚙️'} {def.name} Lv.{c.level}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => { repairConstruct(c.id); redraw() }} style={{
                          padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(68,255,136,0.3)',
                          background: 'rgba(68,255,136,0.1)', color: '#44ff88', cursor: 'pointer',
                          fontFamily: 'monospace', fontSize: 9,
                        }}>Repair</button>
                        <button onClick={() => { upgradeConstruct(c.id); redraw() }} style={{
                          padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(68,255,204,0.3)',
                          background: 'rgba(68,255,204,0.1)', color: '#44ffcc', cursor: 'pointer',
                          fontFamily: 'monospace', fontSize: 9,
                        }}>↑ Lv</button>
                        <button onClick={() => { recallConstruct(c.id); redraw() }} style={{
                          padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(255,68,68,0.3)',
                          background: 'rgba(255,68,68,0.1)', color: '#ff4444', cursor: 'pointer',
                          fontFamily: 'monospace', fontSize: 9,
                        }}>✕</button>
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                      HP: {c.health.toFixed(0)}/{c.maxHealth} | Earned: {c.totalEarned.toFixed(0)}
                      {def.type === 'sentinel' && ` | Kills: ${c.kills.toFixed(0)}`}
                      {def.type === 'explorer' && ` | Explored: ${c.chunksExplored.toFixed(0)}`}
                      {def.type === 'builder' && ` | Built: ${c.blocksPlaced.toFixed(0)}`}
                    </div>
                    <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, marginTop: 4 }}>
                      <div style={{
                        width: `${(c.health / c.maxHealth) * 100}%`, height: '100%',
                        background: c.health / c.maxHealth > 0.5 ? '#44ff88' : c.health / c.maxHealth > 0.25 ? '#ff8844' : '#ff4444',
                        borderRadius: 2,
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
