import { useState, useEffect } from 'react'
import { useStore } from '../../store'
import {
  getEnchantingState, getAllProperties,
  enchantItem, addEnchantableItem,
} from '../../systems/ChronoEnchanting'

const ENCHANTABLE_ITEMS = [
  { id: 'gear_basic', name: 'Basic Chrono Gear', icon: '⚙️', color: '#88aacc', slots: 1 },
  { id: 'gear_enhanced', name: 'Enhanced Chrono Gear', icon: '⚙️', color: '#44aaff', slots: 2 },
  { id: 'chrono_shield', name: 'Chrono Shield', icon: '🛡️', color: '#44ddff', slots: 2 },
  { id: 'chrono_core', name: 'Chrono Core', icon: '🟊', color: '#ff00aa', slots: 3 },
  { id: 'artifact_temporal', name: 'Temporal Artifact', icon: '🏺', color: '#ffaa44', slots: 3 },
  { id: 'void_core', name: 'Void Core', icon: '🟣', color: '#8822ff', slots: 4 },
  { id: 'titan_heart', name: 'Titan Heart', icon: '❤️', color: '#ff4444', slots: 4 },
  { id: 'omega_fragment', name: 'Omega Fragment', icon: '🔴', color: '#ff0044', slots: 5 },
]

export const EnchantingUI = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const inv = useStore((s) => s.inventory)
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [, setRefresh] = useState(0)

  // Recomputed every render so it reflects the latest state whenever
  // `refresh` ticks or the panel opens/closes.
  const state = getEnchantingState()

  useEffect(() => {
    if (!open) return
    const id = setInterval(() => setRefresh((n) => n + 1), 500)
    return () => clearInterval(id)
  }, [open])

  if (!open) return null

  const selectedDef = ENCHANTABLE_ITEMS.find((i) => i.id === selectedItem)
  const existingItem = state.items.find((i) => i.baseItemId === selectedItem)

  const contStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
  }
  const panelStyle: React.CSSProperties = {
    width: 560, maxHeight: '85vh', overflow: 'auto',
    padding: 24, borderRadius: 12,
    background: 'linear-gradient(180deg, #0d1520, #080e16)',
    border: '1px solid #2a3a50',
  }

  return (
    <div style={contStyle} onClick={onClose}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#aa88ff' }}>🔮 Chrono Enchanting</span>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid #3a4a60', borderRadius: 6, color: '#aaa', padding: '4px 12px', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          {/* Item selection */}
          <div style={{ width: 200, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 10, color: '#5a6a80', marginBottom: 4 }}>Items to Enchant:</div>
            {ENCHANTABLE_ITEMS.map((item) => (
              <div key={item.id} style={{
                padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
                border: `1px solid ${selectedItem === item.id ? item.color : '#1a2a3a'}`,
                background: selectedItem === item.id ? `${item.color}0a` : '#0a121c',
                fontSize: 11,
              }} onClick={() => setSelectedItem(item.id)}>
                <span>{item.icon} {item.name}</span>
                <span style={{ fontSize: 9, color: '#5a6a80', marginLeft: 4 }}>({item.slots} slots)</span>
              </div>
            ))}
          </div>

          {/* Enchant panel */}
          <div style={{ flex: 1 }}>
            {selectedDef ? (
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: selectedDef.color, marginBottom: 8 }}>
                  {selectedDef.icon} {selectedDef.name}
                </div>

                {/* Existing enchants */}
                {existingItem && existingItem.enchantments.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: '#5a6a80', marginBottom: 4 }}>Current Enchants:</div>
                    {existingItem.enchantments.map((ench, i) => {
                      const prop = getAllProperties().find((p) => p.id === ench.propertyId)
                      return (
                        <div key={i} style={{
                          padding: '4px 8px', marginBottom: 2, borderRadius: 4,
                          border: '1px solid #1a2a3a', fontSize: 10, color: prop?.color ?? '#aaa',
                        }}>
                          {prop?.icon ?? '?'} {prop?.name ?? 'Unknown'}: +{ench.value}{prop?.type === 'regen' ? ' HP/s' : prop?.type ? '%' : ''} (quality: {Math.round(ench.rollQuality * 100)}%)
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Enchant button */}
                {(!existingItem || existingItem.enchantments.length < selectedDef.slots) && (
                  <div>
                    {existingItem ? (
                      <div style={{ fontSize: 10, color: '#5a6a80', marginBottom: 4 }}>
                        Enchant {existingItem.enchantments.length + 1}/{selectedDef.slots}
                      </div>
                    ) : (
                      <div style={{ fontSize: 10, color: '#5a6a80', marginBottom: 4 }}>
                        First enchant — click below to start
                      </div>
                    )}
                    <button
                      onClick={() => {
                        if (!existingItem) {
                          addEnchantableItem({
                            baseItemId: selectedDef.id,
                            baseName: selectedDef.name,
                            icon: selectedDef.icon,
                            enchantments: [],
                            slotCount: selectedDef.slots,
                          })
                        }
                        const item = getEnchantingState().items.find((i) => i.baseItemId === selectedDef.id)
                        if (item && enchantItem(item)) setRefresh((r) => r + 1)
                      }}
                      disabled={inv.crystal < 10 || inv.liquid < 50}
                      style={{
                        padding: '10px 20px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                        border: `1px solid ${selectedDef.color}`,
                        background: `${selectedDef.color}18`,
                        color: inv.crystal >= 10 && inv.liquid >= 50 ? selectedDef.color : '#4a3a5a',
                        cursor: inv.crystal >= 10 && inv.liquid >= 50 ? 'pointer' : 'default',
                        opacity: inv.crystal >= 10 && inv.liquid >= 50 ? 1 : 0.4,
                        width: '100%',
                      }}>
                      Enchant (💎10 + 💧50)
                    </button>
                  </div>
                )}

                {existingItem && existingItem.enchantments.length >= selectedDef.slots && (
                  <div style={{ fontSize: 11, color: '#ffd700', padding: 8, textAlign: 'center' }}>
                    ✦ MAX ENCHANTED ✦
                  </div>
                )}

                {/* Last roll result */}
                {state.lastRollResult && (
                  <div style={{
                    marginTop: 12, padding: 8, borderRadius: 6,
                    border: '1px solid #2a3a50', fontSize: 10,
                  }}>
                    <div style={{ color: '#5a6a80' }}>Last enchant:</div>
                    <div style={{ color: '#44ff88' }}>
                      {getAllProperties().find((p) => p.id === state.lastRollResult!.propertyId)?.icon ?? '?'} +
                      {state.lastRollResult!.value}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: '#3a4a5a', fontSize: 12, textAlign: 'center', padding: 24 }}>
                Select an item to enchant
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 16, fontSize: 9, color: '#3a4a5a' }}>
          Costs increase per enchant. Properties are random — quality scales with rarity (1% mythic).
        </div>
      </div>
    </div>
  )
}
