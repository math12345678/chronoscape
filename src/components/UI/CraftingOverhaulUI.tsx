import { useState, useEffect } from 'react'
import { useStore } from '../../store'
import {
  ALL_MATERIALS, ALL_CRAFTABLES, RARITY_COLORS,
  getCraftingInventory, craftMaterial, craftItem,
  equipArmor, toggleAccessory, getMaterialCount, hasCraftedItem,
  getTotalArmorBonus,
} from '../../systems/CraftingSystem'
import type { MaterialId, CraftableItemId } from '../../systems/CraftingSystem'

export const CraftingOverhaulUI = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const inventory = useStore((s) => s.inventory)
  const [tab, setTab] = useState<'materials' | 'items' | 'equipment'>('materials')
  const [refresh, setRefresh] = useState(0)
  const craftInv = getCraftingInventory()

  useEffect(() => {
    if (!open) return
    const id = setInterval(() => setRefresh((r) => r + 1), 500)
    return () => clearInterval(id)
  }, [open])

  if (!open) return null

  const containerStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
  }

  const panelStyle: React.CSSProperties = {
    width: 650, maxHeight: '85vh', overflow: 'auto',
    background: 'linear-gradient(180deg, #0d1520, #080e16)',
    border: '1px solid #2a3a50', borderRadius: 12, padding: 24,
    boxShadow: '0 0 60px rgba(255,170,68,0.1)',
  }

  const tabStyle = (t: string): React.CSSProperties => ({
    padding: '6px 16px', borderRadius: 6, border: '1px solid #3a4a60',
    background: tab === t ? '#2a3a50' : 'transparent',
    color: tab === t ? '#fff' : '#888', cursor: 'pointer', fontSize: 13,
    fontWeight: tab === t ? 700 : 400,
  })

  const btnStyle = (color: string, disabled = false): React.CSSProperties => ({
    padding: '5px 12px', borderRadius: 6,
    border: `1px solid ${disabled ? '#3a4a50' : color}`,
    background: disabled ? 'transparent' : color + '18',
    color: disabled ? '#3a4a5a' : color,
    fontWeight: 600, fontSize: 11, cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.4 : 1,
  })

  return (
    <div style={containerStyle} onClick={onClose}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>
            ⚒ Temporal Crafting
          </span>
          <button onClick={onClose} style={{
            background: 'none', border: '1px solid #3a4a60', borderRadius: 6,
            color: '#aaa', padding: '4px 12px', cursor: 'pointer', fontSize: 14,
          }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          <button style={tabStyle('materials')} onClick={() => setTab('materials')}>Materials</button>
          <button style={tabStyle('items')} onClick={() => setTab('items')}>Craft Items</button>
          <button style={tabStyle('equipment')} onClick={() => setTab('equipment')}>
            Equipment ({craftInv.equippedAccessories.length + (craftInv.equippedArmor ? 1 : 0)}/4)
          </button>
        </div>

        {/* Inventory summary */}
        <div style={{ fontSize: 11, color: '#5a6a80', marginBottom: 12 }}>
          Raw: {inventory.raw} &middot; Materials: {
            Object.entries(craftInv.materials).filter(([, v]) => v > 0).length
          } types
        </div>

        {tab === 'materials' && (
          <div>
            <div style={{ fontSize: 12, color: '#7a8a9a', marginBottom: 8 }}>
              Craft base materials from Raw resources:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {Object.values(ALL_MATERIALS).filter((m) => m.craftable).map((mat) => {
                const have = getMaterialCount(mat.id)
                return (
                  <div key={mat.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: 8, borderRadius: 6, background: '#0e1622',
                    border: '1px solid #1a2a3a',
                  }}>
                    <span style={{ fontSize: 16 }}>{mat.icon}</span>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 13, color: mat.color, fontWeight: 600 }}>
                        {mat.name}
                      </span>
                      <span style={{ fontSize: 11, color: RARITY_COLORS[mat.rarity], marginLeft: 6 }}>
                        [{mat.rarity}]
                      </span>
                      <div style={{ fontSize: 10, color: '#6a7a90', marginTop: 1 }}>
                        {mat.description}
                      </div>
                      <div style={{ fontSize: 10, color: '#5a6a80' }}>
                        {mat.rawCost ? `Raw: ${mat.rawCost}` : ''}
                        {mat.recipe ? Object.entries(mat.recipe).map(([k, v]) => ` ${k}: ${v}`) : ''}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: '#fff', minWidth: 30 }}>x{have}</div>
                    <button style={btnStyle(mat.color, have >= 99 || (mat.rawCost !== undefined && inventory.raw < mat.rawCost))}
                      onClick={() => craftMaterial(mat.id)}>
                      Craft
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {tab === 'items' && (
          <div>
            <div style={{ fontSize: 12, color: '#7a8a9a', marginBottom: 8 }}>
              Craft weapons, armor, and accessories from materials:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Object.values(ALL_CRAFTABLES).map((item) => {
                const have = hasCraftedItem(item.id)
                const canAffordMaterials = Object.entries(item.recipe).every(
                  ([matId, amt]) => (craftInv.materials[matId as MaterialId] ?? 0) >= (amt ?? 0)
                )
                const canAffordRaw = !item.baseCost || inventory.raw >= item.baseCost
                const canCraft = !have && canAffordMaterials && canAffordRaw

                return (
                  <div key={item.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: 10, borderRadius: 8,
                    background: have ? item.color + '10' : '#0e1622',
                    border: '1px solid ' + (have ? item.color : '#1a2a3a'),
                    opacity: have ? 0.7 : 1,
                  }}>
                    <span style={{ fontSize: 20 }}>{item.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div>
                        <span style={{ fontSize: 13, color: item.color, fontWeight: 600 }}>
                          {item.name}
                        </span>
                        <span style={{ fontSize: 10, color: RARITY_COLORS[item.rarity], marginLeft: 6 }}>
                          [{item.rarity}]
                        </span>
                        <span style={{ fontSize: 10, color: '#6a7a90', marginLeft: 6 }}>
                          {item.type}
                        </span>
                      </div>
                      <div style={{ fontSize: 10, color: '#7a8a9a', marginTop: 1 }}>
                        {item.description}
                      </div>
                      <div style={{ fontSize: 10, color: '#5a6a80', marginTop: 1 }}>
                        {Object.entries(item.recipe).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                        {item.baseCost ? ` · Raw: ${item.baseCost}` : ''}
                      </div>
                      {item.effects.length > 0 && (
                        <div style={{ fontSize: 10, color: item.color, marginTop: 1 }}>
                          {item.effects.map((e) => `✦ ${e}`).join(' · ')}
                        </div>
                      )}
                    </div>
                    {have ? (
                      <span style={{ fontSize: 11, color: item.color }}>✓ Crafted</span>
                    ) : (
                      <button style={btnStyle(item.color, !canCraft)}
                        disabled={!canCraft} onClick={() => {
                          if (canCraft && craftItem(item.id)) setRefresh((r) => r + 1)
                        }}>
                        Craft
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {tab === 'equipment' && (
          <div>
            {/* Crafted items */}
            <div style={{ fontSize: 12, color: '#7a8a9a', marginBottom: 8 }}>
              Equip your crafted items:
            </div>
            {craftInv.craftedItems.length === 0 ? (
              <div style={{ fontSize: 13, color: '#5a6a80', padding: 12, textAlign: 'center' }}>
                No crafted items yet. Go to "Craft Items" tab.
              </div>
            ) : (
              craftInv.craftedItems.map((itemId) => {
                const def = ALL_CRAFTABLES[itemId]
                if (!def) return null
                const isArmor = def.type === 'armor'
                const isAccessory = def.type === 'accessory'
                const isEquipped = isArmor && craftInv.equippedArmor === itemId
                const accEquipped = craftInv.equippedAccessories.includes(itemId)

                return (
                  <div key={itemId} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: 8, borderRadius: 6, marginBottom: 4,
                    background: isEquipped || accEquipped ? def.color + '18' : '#0e1622',
                    border: '1px solid ' + (isEquipped || accEquipped ? def.color : '#1a2a3a'),
                  }}>
                    <span style={{ fontSize: 16 }}>{def.icon}</span>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 13, color: def.color }}>{def.name}</span>
                      <span style={{ fontSize: 10, color: '#5a6a80', marginLeft: 6 }}>
                        {def.type}
                      </span>
                    </div>
                    {(isArmor || isAccessory) && (
                      <button style={btnStyle(
                        isEquipped || accEquipped ? '#ff4444' : def.color,
                      )} onClick={() => {
                        if (isArmor) equipArmor(itemId)
                        if (isAccessory) toggleAccessory(itemId)
                        setRefresh((r) => r + 1)
                      }}>
                        {isEquipped || accEquipped ? 'Unequip' : 'Equip'}
                      </button>
                    )}
                  </div>
                )
              })
            )}

            {/* Equipped summary */}
            <div style={{ marginTop: 16, padding: 12, background: '#0a0e14', borderRadius: 8, border: '1px solid #1a2a3a' }}>
              <div style={{ fontSize: 11, color: '#5a7a90', marginBottom: 6 }}>Equipped Bonuses</div>
              <div style={{ fontSize: 11, color: '#8a9aaa' }}>
                Armor: <b style={{ color: '#4488ff' }}>{getTotalArmorBonus()}</b>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
