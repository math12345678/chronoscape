import { useState, useEffect } from 'react'
import { useStore } from '../../store'
import {
  getAllMutations, getActiveMutations, getDiscoveredMutations,
  getMutationState, toggleMutation, canAddMutation, addMutationSlot,
  getMutationSlots, getMutationModifier, checkMutations,
  discoverMutation, serializeMutations, loadMutations,
} from '../../systems/ChronoGenetics'
import type { MutationDef } from '../../systems/ChronoGenetics'

interface Props { open: boolean; onClose: () => void }

const RARITY_COLORS: Record<string, string> = { common: '#44ff88', uncommon: '#44aaff', rare: '#aa44ff', legendary: '#ffd700', mythic: '#ff00ff' }
const RARITY_ORDER: Record<string, number> = { common: 0, uncommon: 1, rare: 2, legendary: 3, mythic: 4 }

export const ChronoGeneticsUI = ({ open, onClose }: Props) => {
  const [tab, setTab] = useState<'all' | 'active' | 'discovery'>('all')
  const [, forceUpdate] = useState(0)
  const redraw = () => forceUpdate(n => n + 1)

  const allMutations = getAllMutations()
  const active = getActiveMutations()
  const discovered = getDiscoveredMutations()
  const slots = getMutationSlots()

  if (!open) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)', fontFamily: 'monospace',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'rgba(5,10,25,0.97)', border: '1px solid rgba(170,68,255,0.3)',
        borderRadius: 12, padding: 24, maxWidth: 650, width: '95%',
        maxHeight: '85vh', overflow: 'auto', color: '#fff',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ color: '#aa44ff', fontSize: 18, letterSpacing: 2, fontWeight: 'bold' }}>
            🧬 CHRONO GENETICS
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', padding: '4px 8px', background: 'rgba(170,68,255,0.1)', borderRadius: 4, border: '1px solid rgba(170,68,255,0.2)' }}>
              Slots: {active.length}/{slots}
            </span>
            {['all', 'active', 'discovery'].map(t => (
              <button key={t} onClick={() => setTab(t as any)} style={{
                padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(170,68,255,0.2)',
                background: tab === t ? 'rgba(170,68,255,0.2)' : 'transparent',
                color: tab === t ? '#aa44ff' : 'rgba(255,255,255,0.4)',
                cursor: 'pointer', fontFamily: 'monospace', fontSize: 10,
              }}>{t === 'all' ? 'All' : t === 'active' ? 'Active' : 'Discovery'}</button>
            ))}
            <button onClick={onClose} style={{
              background: 'rgba(255,0,0,0.15)', border: '1px solid rgba(255,0,0,0.3)',
              color: '#ff4444', borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
              fontFamily: 'monospace', fontSize: 11,
            }}>✕</button>
          </div>
        </div>

        {tab === 'discovery' && <DiscoveryPanel redraw={redraw} />}
        {tab === 'active' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {active.length === 0 && <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center', padding: 20 }}>No active mutations.</div>}
            {allMutations.filter(m => discovered.some(d => d.mutationId === m.id)).map((m) => (
              <MutationCard key={m.id} def={m} redraw={redraw} showToggle />
            ))}
          </div>
        )}
        {tab === 'all' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {allMutations.sort((a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]).map((m) => (
              <MutationCard key={m.id} def={m} redraw={redraw} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MutationCard({ def, redraw, showToggle }: { def: MutationDef; redraw: () => void; showToggle?: boolean }) {
  const state = getMutationState(def.id)
  const discovered = !!state
  const active = state?.active ?? false

  return (
    <div style={{
      padding: 10, borderRadius: 8,
      border: `1px solid ${active ? RARITY_COLORS[def.rarity] + '44' : discovered ? RARITY_COLORS[def.rarity] + '22' : 'rgba(255,255,255,0.05)'}`,
      background: active ? `${RARITY_COLORS[def.rarity]}08` : discovered ? `${RARITY_COLORS[def.rarity]}04` : 'rgba(255,255,255,0.02)',
      opacity: discovered ? 1 : 0.4,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
        <div>
          <span style={{ color: RARITY_COLORS[def.rarity], fontWeight: 'bold', fontSize: 13 }}>
            {def.icon} {def.name}
          </span>
          <span style={{ marginLeft: 6, fontSize: 9, padding: '1px 5px', borderRadius: 3, background: `${RARITY_COLORS[def.rarity]}22`, color: RARITY_COLORS[def.rarity] }}>
            {def.rarity.toUpperCase()}
          </span>
        </div>
        {discovered && showToggle && (
          <button onClick={() => { toggleMutation(def.id); redraw() }} style={{
            padding: '2px 10px', borderRadius: 4, border: 'none', cursor: 'pointer',
            fontFamily: 'monospace', fontSize: 10, fontWeight: 'bold',
            background: active ? '#44ff88' : 'rgba(255,255,255,0.1)',
            color: active ? '#000' : 'rgba(255,255,255,0.5)',
          }}>
            {active ? 'ON' : 'OFF'}
          </button>
        )}
      </div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>{def.description}</div>
      <div style={{ fontSize: 10 }}>
        <span style={{ color: '#44ff88' }}>+ {def.positiveEffect}</span>
        {def.negativeValue !== 0 && <span style={{ color: '#ff4444', marginLeft: 8 }}>- {def.negativeEffect}</span>}
      </div>
    </div>
  )
}

function DiscoveryPanel({ redraw }: { redraw: () => void }) {
  const discovered = getDiscoveredMutations()
  const allMutations = getAllMutations()
  const [, forceUpdate] = useState(0)

  const randomDiscovery = () => {
    const m = discoverMutation()
    if (m) { redraw(); forceUpdate(n => n + 1) }
  }

  return (
    <div>
      <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={randomDiscovery} style={{
          padding: '6px 16px', borderRadius: 6, border: '1px solid rgba(170,68,255,0.3)',
          background: 'linear-gradient(135deg, #aa44ff33, #44aaff33)',
          color: '#aa44ff', cursor: 'pointer', fontFamily: 'monospace', fontSize: 11, fontWeight: 'bold',
        }}>
          🧬 Discover Random Mutation
        </button>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
          {discovered.length}/{allMutations.length} discovered
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {allMutations.map(m => {
          const found = discovered.some(d => d.mutationId === m.id)
          return (
            <div key={m.id} style={{
              padding: 8, borderRadius: 6, fontSize: 11,
              border: `1px solid ${found ? RARITY_COLORS[m.rarity] + '33' : 'rgba(255,255,255,0.05)'}`,
              background: found ? `${RARITY_COLORS[m.rarity]}08` : 'transparent',
              opacity: found ? 1 : 0.4,
            }}>
              <span style={{ color: found ? RARITY_COLORS[m.rarity] : 'rgba(255,255,255,0.3)' }}>
                {found ? '🔓' : '🔒'} {m.icon} {m.name}
              </span>
              {found && <span style={{ fontSize: 9, color: '#44ff88', marginLeft: 6 }}>DISCOVERED</span>}
              {!found && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', marginLeft: 6 }}>{m.unlockCondition}</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
