import { useState, useEffect } from 'react'
import { useStore } from '../../store'
import {
  ALL_BUILDINGS, getPlacedBuildings, getBuildingCount, getTotalProduction,
  canPlaceBuilding, placeBuilding, removeBuilding,
  getBuildingPlacementPosition,
} from '../../systems/BaseBuildings'
import type { BuildingId } from '../../systems/BaseBuildings'

export const BuildingUI = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const inventory = useStore((s) => s.inventory)
  const [placed, setPlaced] = useState(getPlacedBuildings())
  const [production, setProduction] = useState<Record<string, number>>({})
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    if (!open) return
    const id = setInterval(() => {
      setPlaced([...getPlacedBuildings()])
      setProduction(getTotalProduction())
      setRefresh((r) => r + 1)
    }, 1000)
    return () => clearInterval(id)
  }, [open])

  if (!open) return null

  const canAfford = (b: typeof ALL_BUILDINGS[BuildingId]) => {
    const inv = inventory
    if (b.cost.raw && inv.raw < b.cost.raw) return false
    if (b.cost.vapour && inv.vapour < b.cost.vapour) return false
    if (b.cost.liquid && inv.liquid < b.cost.liquid) return false
    if (b.cost.crystal && inv.crystal < b.cost.crystal) return false
    if (b.cost.renown && inv.renown < b.cost.renown) return false
    return true
  }

  const containerStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
  }

  const panelStyle: React.CSSProperties = {
    width: 600, maxHeight: '85vh', overflow: 'auto',
    background: 'linear-gradient(180deg, #0d1520, #080e16)',
    border: '1px solid #2a3a50', borderRadius: 12, padding: 24,
    boxShadow: '0 0 60px rgba(68,170,255,0.1)',
  }

  const btnStyle = (mainColor: string, disabled = false): React.CSSProperties => ({
    padding: '6px 14px', borderRadius: 6,
    border: `1px solid ${mainColor}`,
    background: mainColor + '18', color: disabled ? '#3a4a5a' : mainColor,
    fontWeight: 600, fontSize: 12, cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.4 : 1,
  })

  return (
    <div style={containerStyle} onClick={onClose}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 16,
        }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>
            ⚙ Temporal Buildings
          </span>
          <button onClick={onClose} style={{
            background: 'none', border: '1px solid #3a4a60', borderRadius: 6,
            color: '#aaa', padding: '4px 12px', cursor: 'pointer', fontSize: 14,
          }}>✕</button>
        </div>

        {/* Active production */}
        {Object.keys(production).length > 0 && (
          <div style={{
            padding: 10, background: '#0a1a20', borderRadius: 8,
            border: '1px solid #1a3a2a', marginBottom: 16,
          }}>
            <div style={{ fontSize: 12, color: '#44ff88', marginBottom: 6 }}>Recent Production</div>
            {Object.entries(production).map(([name, amount]) => (
              <div key={name} style={{ fontSize: 12, color: '#8a9aaa' }}>
                +{amount} from {name}
              </div>
            ))}
          </div>
        )}

        {/* Placed buildings count */}
        <div style={{ fontSize: 12, color: '#5a7a90', marginBottom: 12 }}>
          Placed: {placed.length} &middot; Max: 18 (sum of all maxCounts)
        </div>

        {/* Building catalog */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Object.values(ALL_BUILDINGS).map((b) => {
            const count = getBuildingCount(b.id)
            const atMax = count >= b.maxCount
            const canAffordBuilding = canAfford(b)
            const canPlace = !atMax && canAffordBuilding

            return (
              <div key={b.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: 12, borderRadius: 8,
                border: '1px solid ' + (atMax ? '#3a2a20' : '#1a2a3a'),
                background: atMax ? '#0a0a0e' : '#0f1622',
                opacity: atMax ? 0.5 : 1,
              }}>
                {/* Icon */}
                <div style={{
                  width: 40, height: 40, borderRadius: 8,
                  background: b.color + '22', border: '1px solid ' + b.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20,
                }}>{b.icon}</div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: b.color }}>
                    {b.name}
                    <span style={{ fontSize: 11, color: '#5a6a80', marginLeft: 8 }}>
                      {count}/{b.maxCount}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#7a8a9a', marginTop: 2 }}>
                    {b.description}
                  </div>
                  {b.special && (
                    <div style={{ fontSize: 10, color: b.color, marginTop: 1 }}>
                      ◆ {b.special}
                    </div>
                  )}
                  {/* Cost */}
                  <div style={{ fontSize: 10, color: '#5a6a80', marginTop: 2 }}>
                    {Object.entries(b.cost)
                      .filter(([, v]) => v && v > 0)
                      .map(([k, v]) => `${v} ${k}`)
                      .join(' · ')}
                  </div>
                </div>

                {/* Action */}
                <button style={btnStyle(b.color, !canPlace)}
                  disabled={!canPlace}
                  onClick={() => {
                    if (canPlace && placeBuilding(b.id, [0, 0, 0])) {
                      setPlaced([...getPlacedBuildings()])
                    }
                  }}>
                  {atMax ? 'MAX' : 'Build'}
                </button>
              </div>
            )
          })}
        </div>

        {/* Placed buildings list */}
        {placed.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, color: '#5a7a90', marginBottom: 8 }}>
              Active Structures
            </div>
            {placed.map((b) => {
              const def = ALL_BUILDINGS[b.buildingId]
              return (
                <div key={b.id} style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', padding: '6px 10px',
                  background: '#0a0e14', borderRadius: 6,
                  marginBottom: 4, fontSize: 12, color: '#7a8a9a',
                }}>
                  <span>
                    <span style={{ color: def?.color }}>{def?.icon ?? '?'}</span>
                    {' '}{def?.name ?? 'Unknown'}
                  </span>
                  <button
                    style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: 11 }}
                    onClick={() => { removeBuilding(b.id); setPlaced([...getPlacedBuildings()]) }}>
                    Remove
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
