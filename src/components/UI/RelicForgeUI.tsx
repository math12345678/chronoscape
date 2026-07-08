import { useState, useEffect } from 'react'
import { useStore } from '../../store'
import {
  getRelics, forgeRelic, toggleEquipRelic, getEquippedRelics,
  canForge, RELIC_PASSIVES,
} from '../../systems/RelicForging'

export const RelicForgeUI = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const inv = useStore((s) => s.inventory)
  const [refresh, setRefresh] = useState(0)
  const [lastForge, setLastForge] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const id = setInterval(() => setRefresh((n) => n + 1), 500)
    return () => clearInterval(id)
  }, [open])

  if (!open) return null

  const relics = getRelics()
  const equipped = getEquippedRelics()

  const cont: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)',
  }
  const panel: React.CSSProperties = {
    width: 660, maxHeight: '85vh', overflow: 'auto',
    padding: 24, borderRadius: 12,
    background: 'linear-gradient(180deg, #0d1520, #080e16)',
    border: '1px solid #ffd70044',
    boxShadow: '0 0 60px rgba(255,215,0,0.06)',
  }

  return (
    <div style={cont} onClick={onClose}>
      <div style={panel} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#ffd700' }}>Relic Forge</span>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid #3a4a60', borderRadius: 6, color: '#aaa', padding: '4px 12px', cursor: 'pointer' }}>X</button>
        </div>
        <div style={{ fontSize: 11, color: '#5a6a80', marginBottom: 4 }}>
          Relics survive Ascension. Equip up to 4 for permanent bonuses.
        </div>

        {/* Forge button */}
        <div style={{
          padding: 12, borderRadius: 8, marginBottom: 16, textAlign: 'center',
          border: '1px solid #ffd70033', background: '#ffd70006',
        }}>
          <button
            onClick={() => {
              const result = forgeRelic()
              if (result) { setLastForge(result.id); setRefresh((r) => r + 1) }
            }}
            disabled={!canForge()}
            style={{
              padding: '10px 32px', borderRadius: 8, fontSize: 14, fontWeight: 700,
              border: `2px solid ${canForge() ? '#ffd700' : '#3a3a4a'}`,
              background: canForge() ? '#ffd70018' : 'transparent',
              color: canForge() ? '#ffd700' : '#4a4a5a',
              cursor: canForge() ? 'pointer' : 'default',
            }}>
            FORGE RELIC ({relics.length}/12)
          </button>
          <div style={{ fontSize: 10, color: '#5a6a80', marginTop: 4 }}>
            Cost: varies by rarity (1 void core - 2 omega fragments)
          </div>
        </div>

        {/* Equipped bar */}
        <div style={{
          padding: 8, borderRadius: 6, marginBottom: 12,
          border: '1px solid #1a2a3a', background: '#0a121c',
          display: 'flex', gap: 8, alignItems: 'center', fontSize: 11, color: '#5a6a80',
        }}>
          <span>Equipped: {equipped.length}/4</span>
          {equipped.map((r) => (
            <span key={r.id} style={{
              padding: '2px 6px', borderRadius: 4,
              border: `1px solid ${r.color}44`, color: r.color, fontSize: 10,
            }}>{r.icon}{r.name}</span>
          ))}
        </div>

        {/* Relic grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {relics.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: '#3a4a5a', fontSize: 12 }}>
              No relics forged yet. Defeat world bosses and raid bosses to get materials.
            </div>
          )}
          {relics.map((r) => {
            const passive = RELIC_PASSIVES.find((p) => p.id === r.passiveId)
            return (
              <div key={r.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 8,
                border: `1px solid ${r.borderColor}`,
                background: r.equipped ? `${r.color}0a` : '#0a121c',
              }}>
                <span style={{ fontSize: 24 }}>{r.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: r.color }}>
                    {r.name} <span style={{ fontSize: 9, color: '#5a6a80' }}>({r.rarity})</span>
                  </div>
                  {passive && (
                    <div style={{ fontSize: 10, color: passive.color }}>
                      {passive.icon} {passive.name}: {passive.description}
                    </div>
                  )}
                  <div style={{ fontSize: 9, color: '#5a6a80', marginTop: 2 }}>
                    {r.bonusStats.map((s) => `${s.type} +${Math.round(s.value * 100)}%`).join(' \u00B7 ')}
                  </div>
                </div>
                <button
                  onClick={() => { toggleEquipRelic(r.id); setRefresh((n) => n + 1) }}
                  disabled={!r.equipped && equipped.length >= 4}
                  style={{
                    padding: '6px 14px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                    border: `1px solid ${r.equipped ? '#ff4444' : r.color}`,
                    background: r.equipped ? '#ff444418' : `${r.color}18`,
                    color: r.equipped ? '#ff4444' : r.color,
                    cursor: (!r.equipped && equipped.length >= 4) ? 'default' : 'pointer',
                    opacity: (!r.equipped && equipped.length >= 4) ? 0.4 : 1,
                  }}>
                  {r.equipped ? 'Unequip' : 'Equip'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
