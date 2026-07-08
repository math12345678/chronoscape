import { useState } from 'react'
import { useStore } from '../../store'
import {
  getFusionState, getActiveHybrid, getActiveHybridBonuses,
  fuseCompanions, setActiveHybrid,
} from '../../systems/CompanionFusion'

const SPECIES_COLORS: Record<string, string> = {
  chrono_cat: '#ff8844', void_hound: '#aa44ff', temporal_fox: '#ff6644',
  crystal_drake: '#44aaff', omega_owl: '#ffd700',
}

const SPECIES_ICONS: Record<string, string> = {
  chrono_cat: '🐱', void_hound: '🐕', temporal_fox: '🦊',
  crystal_drake: '🐉', omega_owl: '🦉',
}

interface Props { open: boolean; onClose: () => void }

export const CompanionFusionUI = ({ open, onClose }: Props) => {
  const [tab, setTab] = useState<'fusion' | 'collection'>('fusion')
  const [s1, setS1] = useState('')
  const [s2, setS2] = useState('')
  const [, forceUpdate] = useState(0)
  const redraw = () => forceUpdate(n => n + 1)

  const state = getFusionState()
  const activeHybrid = getActiveHybrid()
  const bonuses = getActiveHybridBonuses()
  const inv = useStore.getState().inventory

  if (!open) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)', fontFamily: 'monospace',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'rgba(5,10,25,0.97)', border: '1px solid rgba(255,0,255,0.3)',
        borderRadius: 12, padding: 24, maxWidth: 600, width: '95%',
        maxHeight: '85vh', overflow: 'auto', color: '#fff',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ color: '#ff00ff', fontSize: 18, letterSpacing: 2, fontWeight: 'bold' }}>
            🧬 COMPANION FUSION 2.0
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {['fusion', 'collection'].map(t => (
              <button key={t} onClick={() => setTab(t as any)} style={{
                padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,0,255,0.2)',
                background: tab === t ? 'rgba(255,0,255,0.2)' : 'transparent',
                color: tab === t ? '#ff00ff' : 'rgba(255,255,255,0.4)',
                cursor: 'pointer', fontFamily: 'monospace', fontSize: 10,
              }}>{t === 'fusion' ? 'Fusion' : 'Collection'}</button>
            ))}
            <button onClick={onClose} style={{
              background: 'rgba(255,0,0,0.15)', border: '1px solid rgba(255,0,0,0.3)',
              color: '#ff4444', borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
              fontFamily: 'monospace', fontSize: 11,
            }}>✕</button>
          </div>
        </div>

        {activeHybrid && (
          <div style={{ marginBottom: 12, padding: 10, borderRadius: 8, border: '1px solid rgba(255,0,255,0.2)', background: 'rgba(255,0,255,0.05)' }}>
            <div style={{ color: '#ff00ff', fontSize: 11, marginBottom: 4 }}>Active Hybrid:</div>
            <div style={{ fontSize: 13, color: '#fff', fontWeight: 'bold' }}>{activeHybrid.name}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{activeHybrid.description}</div>
            <div style={{ fontSize: 10, marginTop: 4 }}>
              <span style={{ color: '#ff4444' }}>⚔ {activeHybrid.damage} dmg</span>
              <span style={{ color: '#44ff88', marginLeft: 12 }}>❤ {activeHybrid.health} HP</span>
              <span style={{ color: '#44aaff', marginLeft: 12 }}>💨 {activeHybrid.speed.toFixed(1)} spd</span>
            </div>
            <div style={{ fontSize: 10, color: '#ffd700', marginTop: 2 }}>✦ {activeHybrid.ability}</div>
            {Object.entries(bonuses).length > 0 && (
              <div style={{ fontSize: 10, color: '#44ff88', marginTop: 2 }}>
                Passives: {Object.entries(bonuses).map(([k, v]) => `${k}+${v}`).join(', ')}
              </div>
            )}
          </div>
        )}

        {tab === 'fusion' && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 6 }}>Select two species to fuse:</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <select value={s1} onChange={e => setS1(e.target.value)} style={{
                  flex: 1, padding: 6, borderRadius: 6, border: '1px solid rgba(255,0,255,0.2)',
                  background: 'rgba(0,0,0,0.5)', color: '#fff', fontFamily: 'monospace', fontSize: 11,
                }}>
                  <option value="">Select parent 1</option>
                  {state.ownedSpecies.map((id) => (
                    <option key={id} value={id}>{id.replace('species_', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                  ))}
                </select>
                <span style={{ color: '#ff00ff', alignSelf: 'center' }}>+</span>
                <select value={s2} onChange={e => setS2(e.target.value)} style={{
                  flex: 1, padding: 6, borderRadius: 6, border: '1px solid rgba(255,0,255,0.2)',
                  background: 'rgba(0,0,0,0.5)', color: '#fff', fontFamily: 'monospace', fontSize: 11,
                }}>
                  <option value="">Select parent 2</option>
                  {state.ownedSpecies.filter(id => id !== s1).map((id) => (
                    <option key={id} value={id}>{id.replace('species_', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                  ))}
                </select>
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>
                Cost: 100 Crystal, 500 Liquid | Current: {inv.crystal.toLocaleString()} Cry, {inv.liquid.toLocaleString()} Liq
              </div>
              <button
                disabled={!s1 || !s2}
                onClick={() => {
                  const h = fuseCompanions(s1, s2)
                  if (h) { setS1(''); setS2(''); redraw() }
                }}
                style={{
                  padding: '8px 20px', borderRadius: 8, border: 'none', width: '100%',
                  background: s1 && s2 ? 'linear-gradient(135deg, #ff00ff, #aa44ff)' : 'rgba(255,255,255,0.05)',
                  color: s1 && s2 ? '#fff' : 'rgba(255,255,255,0.3)',
                  cursor: s1 && s2 ? 'pointer' : 'default', fontFamily: 'monospace', fontSize: 12, fontWeight: 'bold',
                }}>
                🧬 Fuse Companions
              </button>
            </div>

            {state.hybrids.length > 0 && (
              <div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 6 }}>Your Hybrids:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {state.hybrids.map((h) => (
                    <div key={h.id} style={{
                      padding: 8, borderRadius: 6,
                      border: `1px solid ${state.activeHybrid === h.id ? 'rgba(255,0,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
                      background: state.activeHybrid === h.id ? 'rgba(255,0,255,0.08)' : 'rgba(255,255,255,0.02)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <div>
                        <span style={{ color: '#ff00ff', fontSize: 12, fontWeight: 'bold' }}>{h.name}</span>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>
                          ⚔{h.damage} ❤{h.health} 💨{h.speed.toFixed(1)}
                        </div>
                      </div>
                      <button
                        disabled={state.activeHybrid === h.id}
                        onClick={() => { setActiveHybrid(h.id); redraw() }}
                        style={{
                          padding: '3px 10px', borderRadius: 4, border: 'none', cursor: 'pointer',
                          fontFamily: 'monospace', fontSize: 10,
                          background: state.activeHybrid === h.id ? '#ff00ff' : 'rgba(255,255,255,0.1)',
                          color: state.activeHybrid === h.id ? '#fff' : 'rgba(255,255,255,0.5)',
                        }}>
                        {state.activeHybrid === h.id ? 'ACTIVE' : 'Equip'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'collection' && (
          <div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 8 }}>
              Discovered: {state.ownedSpecies.length} / 5 species
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['species_chrono_cat', 'species_void_hound', 'species_temporal_fox', 'species_crystal_drake', 'species_omega_owl'].map(id => {
                const discovered = state.ownedSpecies.includes(id)
                const speciesId = id.replace('species_', '') as keyof typeof SPECIES_COLORS
                return (
                  <div key={id} style={{
                    padding: 8, borderRadius: 6,
                    border: `1px solid ${discovered ? (SPECIES_COLORS[speciesId] || '#888') + '33' : 'rgba(255,255,255,0.05)'}`,
                    background: discovered ? `${SPECIES_COLORS[speciesId] || '#888'}08` : 'transparent',
                    opacity: discovered ? 1 : 0.35,
                  }}>
                    <span style={{ color: discovered ? (SPECIES_COLORS[speciesId] || '#fff') : 'rgba(255,255,255,0.2)', fontSize: 12 }}>
                      {SPECIES_ICONS[speciesId] || '❓'} {id.replace('species_', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                    {!discovered && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', marginLeft: 8 }}>— undiscovered</span>}
                    {discovered && <span style={{ fontSize: 9, color: '#44ff88', marginLeft: 8 }}>✅ discovered</span>}
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
