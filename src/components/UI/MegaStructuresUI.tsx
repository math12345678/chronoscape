import { useState } from 'react'
import { useStore } from '../../store'
import {
  getAllWonders, getWonderState,
  upgradeWonder, getActiveWondersBonuses,
} from '../../systems/MegaStructures'
import type { WonderWithUI } from '../../systems/MegaStructures'

interface Props { open: boolean; onClose: () => void }

const WONDER_ICONS: Record<string, string> = {
  pyramid: '△', chrono_spire: '⬡', time_obelisk: '⊞',
  void_citadel: '◈', crystal_labyrinth: '◇', astral_beacon: '✦', chrono_nexus: '⊗',
}

export const MegaStructuresUI = ({ open, onClose }: Props) => {
  const [tab, setTab] = useState<'all' | 'bonuses'>('all')
  const wonders = getAllWonders()

  if (!open) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)', fontFamily: 'monospace',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'rgba(5,10,25,0.97)', border: '1px solid rgba(255,215,0,0.3)',
        borderRadius: 12, padding: 24, maxWidth: 700, width: '95%',
        maxHeight: '85vh', overflow: 'auto', color: '#fff',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ color: '#ffd700', fontSize: 18, letterSpacing: 2, fontWeight: 'bold' }}>
            ⬟ MEGA STRUCTURES / WONDERS OF TIME
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setTab(tab === 'all' ? 'bonuses' : 'all')} style={{
              background: 'rgba(255,215,0,0.15)', border: '1px solid rgba(255,215,0,0.3)',
              color: '#ffd700', borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
              fontFamily: 'monospace', fontSize: 11,
            }}>
              {tab === 'all' ? 'Bonuses' : 'All'}
            </button>
            <button onClick={onClose} style={{
              background: 'rgba(255,0,0,0.15)', border: '1px solid rgba(255,0,0,0.3)',
              color: '#ff4444', borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
              fontFamily: 'monospace', fontSize: 11,
            }}>✕</button>
          </div>
        </div>

        {tab === 'bonuses' && <ActiveBonuses />}
        {tab === 'all' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {wonders.map((w) => <WonderCard key={w.id} wonder={w} />)}
          </div>
        )}
      </div>
    </div>
  )
}

function ActiveBonuses() {
  const bonuses = getActiveWondersBonuses()
  const entries = Object.entries(bonuses).filter(([_, v]) => v > 0)
  if (entries.length === 0) return <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center', padding: 20 }}>No active wonder bonuses yet.</div>
  return (
    <div style={{ marginBottom: 12, padding: 12, background: 'rgba(255,215,0,0.05)', borderRadius: 8, border: '1px solid rgba(255,215,0,0.1)' }}>
      <div style={{ color: '#ffd700', fontSize: 12, marginBottom: 8 }}>Active Bonuses:</div>
      {entries.map(([key, val]) => (
        <div key={key} style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', padding: '2px 0' }}>
          +{key === 'regen' ? val.toFixed(1) : `${(val * 100).toFixed(0)}%`} {key}
        </div>
      ))}
    </div>
  )
}

function WonderCard({ wonder }: { wonder: WonderWithUI }) {
  const state = getWonderState(wonder.id)
  const tier = state?.tier ?? 0
  const costStr = (tier: number) => {
    const c = wonder.cost(tier + 1)
    return c ? `${c.raw.toLocaleString()} Raw, ${c.liquid.toLocaleString()} Liq, ${c.crystal.toLocaleString()} Cry, ${c.renown.toLocaleString()} Ren, ${c.shards.toLocaleString()} Sha` : 'MAX'
  }

  const canAfford = () => {
    if (tier >= wonder.maxTier) return false
    const c = wonder.cost(tier + 1)
    if (!c) return false
    const inv = useStore.getState().inventory
    return inv.raw >= c.raw && inv.liquid >= c.liquid && inv.crystal >= c.crystal && inv.renown >= c.renown && (inv.shards ?? 0) >= c.shards
  }

  return (
    <div style={{
      padding: 12, borderRadius: 8, border: `1px solid ${tier > 0 ? 'rgba(255,215,0,0.3)' : 'rgba(255,255,255,0.08)'}`,
      background: tier > 0 ? 'rgba(255,215,0,0.03)' : 'rgba(255,255,255,0.02)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div>
          <span style={{ fontSize: 14, marginRight: 6 }}>{WONDER_ICONS[wonder.id] || '⬟'}</span>
          <span style={{ color: wonder.color, fontWeight: 'bold', fontSize: 13 }}>{wonder.name}</span>
          <span style={{
            marginLeft: 8, fontSize: 10, padding: '1px 6px', borderRadius: 4,
            background: `${wonder.color}22`, color: wonder.color,
          }}>
            Tier {tier}/{wonder.maxTier}
          </span>
        </div>
        <button
          disabled={tier >= wonder.maxTier || !canAfford()}
          onClick={() => { upgradeWonder(wonder); useStore.getState().addRaw(0) }}
          style={{
            padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
            fontFamily: 'monospace', fontSize: 11, fontWeight: 'bold',
            background: tier >= wonder.maxTier ? 'rgba(255,255,255,0.1)' :
              canAfford() ? 'linear-gradient(135deg, #ffd700, #ff8800)' : 'rgba(255,255,255,0.08)',
            color: tier >= wonder.maxTier ? 'rgba(255,255,255,0.3)' :
              canAfford() ? '#000' : 'rgba(255,255,255,0.3)',
            opacity: tier >= wonder.maxTier || canAfford() ? 1 : 0.5,
          }}
        >
          {tier >= wonder.maxTier ? 'MAX' : 'Upgrade'}
        </button>
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>{wonder.description}</div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
        {tier < wonder.maxTier ? <>Cost: {costStr(tier)}</> : <span style={{ color: '#44ff88' }}>▲ Maximum level reached</span>}
      </div>
    </div>
  )
}
