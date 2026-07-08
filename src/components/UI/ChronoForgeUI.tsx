import { useState, useEffect } from 'react'
import { useStore } from '../../store'
import {
  getAvailableRecipes, getForgedItems, forgeItem, toggleEquipItem,
  getForgeLevel,
  getEquippedStats,
} from '../../systems/ChronoForge'

interface Props { open: boolean; onClose: () => void }

const RARITY_COLORS: Record<string, string> = {
  common: '#888888', uncommon: '#44ff88', rare: '#44aaff',
  legendary: '#aa44ff', mythic: '#ffd700', transcendent: '#ff00ff',
}

const SLOT_ICONS: Record<string, string> = {
  weapon: '⚔️', armor: '🛡️', accessory: '💍', tool: '🔧', artifact: '🏺',
}

export const ChronoForgeUI = ({ open, onClose }: Props) => {
  const [tab, setTab] = useState<'forge' | 'inventory'>('forge')
  const [, forceUpdate] = useState(0)
  const redraw = () => forceUpdate(n => n + 1)

  useEffect(() => {
    if (!open) return
    const interval = setInterval(() => forceUpdate(n => n + 1), 3000)
    return () => clearInterval(interval)
  }, [open])

  if (!open) return null

  const recipes = getAvailableRecipes()
  const items = getForgedItems()
  const equipStats = getEquippedStats()
  const forgeLevel = getForgeLevel()
  const inv = useStore.getState().inventory
  const equipped = items.filter(i => i.equipped)

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
            🔨 CHRONO FORGE
          </span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', padding: '4px 8px', background: 'rgba(255,215,0,0.1)', borderRadius: 4 }}>
              Lv.{forgeLevel}
            </span>
            {['forge', 'inventory'].map(t => (
              <button key={t} onClick={() => setTab(t as any)} style={{
                padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,215,0,0.2)',
                background: tab === t ? 'rgba(255,215,0,0.2)' : 'transparent',
                color: tab === t ? '#ffd700' : 'rgba(255,255,255,0.4)',
                cursor: 'pointer', fontFamily: 'monospace', fontSize: 10,
              }}>{t === 'forge' ? 'Forge' : 'Inventory'}</button>
            ))}
            <button onClick={onClose} style={{
              background: 'rgba(255,0,0,0.15)', border: '1px solid rgba(255,0,0,0.3)',
              color: '#ff4444', borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
              fontFamily: 'monospace', fontSize: 11,
            }}>✕</button>
          </div>
        </div>

        {tab === 'forge' && (
          <div>
            {equipped.length > 0 && (
              <div style={{ marginBottom: 12, padding: 10, borderRadius: 8, border: '1px solid rgba(255,215,0,0.2)', background: 'rgba(255,215,0,0.05)' }}>
                <div style={{ color: '#ffd700', fontSize: 11, marginBottom: 4 }}>Equipped Bonuses:</div>
                <div style={{ fontSize: 10 }}>
                  {Object.entries(equipStats).length === 0 && <span style={{ color: 'rgba(255,255,255,0.3)' }}>No stat bonuses from equipped items.</span>}
                  {Object.entries(equipStats).map(([k, v]) => (
                    <span key={k} style={{ color: '#44ff88', marginRight: 12 }}>
                      {k}: +{v}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>
              Resources: {inv.raw.toLocaleString()} Raw | {inv.liquid.toLocaleString()} Liq | {inv.crystal.toLocaleString()} Cry | {(inv.shards ?? 0).toLocaleString()} Sha
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recipes.length === 0 && (
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center', padding: 20 }}>
                  No recipes available. Play further to unlock forge recipes.
                </div>
              )}
              {recipes.map(recipe => {
                const canAfford = inv.raw >= recipe.requiredRaw && inv.liquid >= recipe.requiredLiquid &&
                  inv.crystal >= recipe.requiredCrystal && (inv.shards ?? 0) >= recipe.requiredShards
                return (
                  <div key={recipe.id} style={{
                    padding: 10, borderRadius: 8,
                    border: `1px solid ${RARITY_COLORS[recipe.rarity] || '#888'}44`,
                    background: `${RARITY_COLORS[recipe.rarity] || '#888'}08`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: 14, marginRight: 4 }}>{SLOT_ICONS[recipe.slot] || '🔨'}</span>
                        <span style={{ color: RARITY_COLORS[recipe.rarity] || '#fff', fontWeight: 'bold', fontSize: 13 }}>
                          {recipe.name}
                        </span>
                        <span style={{
                          marginLeft: 6, fontSize: 9, padding: '1px 5px', borderRadius: 3,
                          background: `${RARITY_COLORS[recipe.rarity] || '#888'}22`,
                          color: RARITY_COLORS[recipe.rarity] || '#888',
                        }}>
                          {recipe.rarity.toUpperCase()}
                        </span>
                        <span style={{ marginLeft: 6, fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                          ({recipe.slot})
                        </span>
                      </div>
                      <button
                        disabled={!canAfford}
                        onClick={() => {
                          const result = forgeItem(recipe.id)
                          if (result) redraw()
                        }}
                        style={{
                          padding: '4px 12px', borderRadius: 6, border: 'none', cursor: canAfford ? 'pointer' : 'default',
                          fontFamily: 'monospace', fontSize: 10, fontWeight: 'bold',
                          background: canAfford ? 'linear-gradient(135deg, #ffd700, #ff8800)' : 'rgba(255,255,255,0.05)',
                          color: canAfford ? '#000' : 'rgba(255,255,255,0.3)',
                          opacity: canAfford ? 1 : 0.5,
                        }}>
                          Forge
                        </button>
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{recipe.description}</div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                      {Object.entries(recipe.stats).map(([k, v]) => (
                        <span key={k} style={{ color: '#44ff88', marginRight: 8 }}>+{v} {k}</span>
                      ))}
                    </div>
                    <div style={{ fontSize: 9, color: canAfford ? '#44ff88' : '#ff4444', marginTop: 2 }}>
                      Cost: {recipe.requiredRaw.toLocaleString()} Raw | {recipe.requiredLiquid.toLocaleString()} Liq | {recipe.requiredCrystal.toLocaleString()} Cry | {recipe.requiredShards.toLocaleString()} Sha
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {tab === 'inventory' && (
          <div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 8 }}>
              Forged Items: {items.length} ({equipped.length} equipped)
            </div>
            {items.length === 0 && (
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center', padding: 20 }}>
                No forged items yet. Head to the Forge tab!
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {items.map(item => (
                <div key={item.id} style={{
                  padding: 8, borderRadius: 6, fontSize: 11,
                  border: `1px solid ${item.equipped ? `${RARITY_COLORS[item.rarity] || '#888'}66` : 'rgba(255,255,255,0.08)'}`,
                  background: item.equipped ? `${RARITY_COLORS[item.rarity] || '#888'}11` : 'rgba(255,255,255,0.02)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <span style={{ fontSize: 12, marginRight: 4 }}>{SLOT_ICONS[item.slot] || '🔨'}</span>
                    <span style={{ color: RARITY_COLORS[item.rarity] || '#fff', fontWeight: 'bold' }}>{item.name}</span>
                    <span style={{
                      marginLeft: 4, fontSize: 9, padding: '1px 4px', borderRadius: 2,
                      background: `${RARITY_COLORS[item.rarity] || '#888'}22`, color: RARITY_COLORS[item.rarity] || '#888',
                    }}>
                      {item.rarity}
                    </span>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>
                      {Object.entries(item.stats).map(([k, v]) => (
                        <span key={k} style={{ color: '#44ff88', marginRight: 6 }}>+{v} {k}</span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => { toggleEquipItem(item.id); redraw() }}
                    style={{
                      padding: '3px 10px', borderRadius: 4, border: 'none', cursor: 'pointer',
                      fontFamily: 'monospace', fontSize: 10, fontWeight: 'bold',
                      background: item.equipped ? 'rgba(255,68,68,0.2)' : '#44ff88',
                      color: item.equipped ? '#ff4444' : '#000',
                    }}>
                    {item.equipped ? 'Unequip' : 'Equip'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
