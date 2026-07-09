import { useState } from 'react'
import { useStore } from '../../store'
import {
  getInventoryItems, searchItems, sortItems,
  bulkSell, bulkRefineAll,
} from '../../systems/InventoryManager'
import type { SortField, SortDir, FilterType } from '../../systems/InventoryManager'

export const InventoryOverhaulUI = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const inv = useStore((s) => s.inventory)
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('type')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [filter, setFilter] = useState<FilterType>('all')

  // `inv` isn't read directly here, but it's the store slice that changes
  // when items are added/removed — re-render (triggered by useStore) picks
  // up fresh results from getInventoryItems()/searchItems() automatically,
  // so a plain computed value (rather than useMemo) is correct here.
  const items = (() => {
    if (!open) return []
    let result = getInventoryItems()
    if (filter !== 'all') result = result.filter((i) => i.type === filter)
    result = searchItems(search)
    if (search.trim()) {
      const lower = search.toLowerCase()
      result = result.filter((i) => i.name.toLowerCase().includes(lower))
    }
    return sortItems(result, sortField, sortDir)
  })()

  const totalItems = !open ? 0 : getInventoryItems().reduce((s, i) => s + i.quantity, 0)

  if (!open) return null

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortDir('asc') }
  }

  const containerStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
  }

  const panelStyle: React.CSSProperties = {
    width: 640, maxHeight: '85vh', display: 'flex', flexDirection: 'column',
    background: 'linear-gradient(180deg, #0d1520, #080e16)',
    border: '1px solid #2a3a50', borderRadius: 12, padding: 24,
    boxShadow: '0 0 60px rgba(68,255,204,0.06)',
  }

  const btnStyle: React.CSSProperties = {
    padding: '4px 10px', borderRadius: 4, fontSize: 11,
    border: '1px solid #3a4a60', color: '#7a8a9a',
    background: 'transparent', cursor: 'pointer',
  }

  const filterBtn = (t: FilterType, label: string) => (
    <button style={{
      ...btnStyle,
      borderColor: filter === t ? '#44aaff' : '#2a3a50',
      color: filter === t ? '#44aaff' : '#5a6a80',
      background: filter === t ? '#44aaff12' : 'transparent',
    }} onClick={() => setFilter(t)}>{label}</button>
  )

  return (
    <div style={containerStyle} onClick={onClose}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>
            📦 Inventory
          </span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#5a6a80' }}>{totalItems.toLocaleString()} items</span>
            <button onClick={onClose} style={{
              background: 'none', border: '1px solid #3a4a60', borderRadius: 6,
              color: '#aaa', padding: '4px 12px', cursor: 'pointer',
            }}>✕</button>
          </div>
        </div>

        {/* Search + Bulk Actions */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items..."
            style={{
              flex: 1, minWidth: 150, padding: '6px 10px', borderRadius: 6,
              border: '1px solid #2a3a50', background: '#0a121c',
              color: '#c0d0e0', fontSize: 12, outline: 'none',
            }}
          />
          <button style={{ ...btnStyle, borderColor: '#44ff88', color: '#44ff88' }} onClick={() => bulkSell('raw')}>
            Sell All Raw
          </button>
          <button style={{ ...btnStyle, borderColor: '#44aaff', color: '#44aaff' }} onClick={() => bulkSell('refined')}>
            Sell All Refined
          </button>
          <button style={{ ...btnStyle, borderColor: '#ff8844', color: '#ff8844' }} onClick={() => bulkSell('crafted')}>
            Sell All Crafted
          </button>
          <button style={{ ...btnStyle, borderColor: '#ff44aa', color: '#ff44aa' }} onClick={() => bulkRefineAll()}>
            Refine All
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          {filterBtn('all', 'All')}
          {filterBtn('raw', '🪨 Raw')}
          {filterBtn('refined', '💧 Refined')}
          {filterBtn('crafted', '⚙️ Crafted')}
          {filterBtn('special', '✨ Special')}
        </div>

        {/* Sort Row */}
        <div style={{ display: 'flex', gap: 12, fontSize: 10, color: '#5a6a80', marginBottom: 8 }}>
          <button style={btnStyle} onClick={() => toggleSort('name')}>
            Name {sortField === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
          </button>
          <button style={btnStyle} onClick={() => toggleSort('type')}>
            Type {sortField === 'type' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
          </button>
          <button style={btnStyle} onClick={() => toggleSort('quantity')}>
            Qty {sortField === 'quantity' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
          </button>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {items.filter((i) => i.quantity > 0).length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#3a4a5a', fontSize: 13 }}>
              {search ? 'No items match your search.' : 'Your inventory is empty.'}
            </div>
          ) : (
            items.filter((i) => i.quantity > 0).map((item) => (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '6px 10px', borderRadius: 6,
                background: '#0a121c', border: '1px solid #1a2a3a',
              }}>
                <div style={{ fontSize: 16, width: 24, textAlign: 'center' }}>{item.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: item.color }}>{item.name}</div>
                  <div style={{ fontSize: 10, color: '#5a6a80' }}>{item.category}</div>
                </div>
                <div style={{
                  fontSize: 15, fontWeight: 700,
                  color: item.quantity > 0 ? item.color : '#3a4a5a',
                  minWidth: 60, textAlign: 'right',
                }}>
                  {item.quantity.toLocaleString()}
                </div>
                {item.canSell && item.id !== 'raw' && item.quantity > 0 && (
                  <button style={{
                    padding: '3px 8px', borderRadius: 4, fontSize: 10,
                    border: '1px solid #44ff8844', color: '#44ff88',
                    background: 'transparent', cursor: 'pointer',
                  }} onClick={() => bulkSell(item.type as any)}>
                    Sell
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Summary */}
        <div style={{
          marginTop: 12, padding: '8px 12px', borderRadius: 6,
          background: '#0a121c', border: '1px solid #1a2a3a',
          display: 'flex', gap: 16, fontSize: 11, color: '#5a6a80',
        }}>
          <span>🪨 {inv.raw.toLocaleString()}</span>
          <span>💨 {inv.vapour.toLocaleString()}</span>
          <span>💧 {inv.liquid.toLocaleString()}</span>
          <span>💎 {inv.crystal.toLocaleString()}</span>
          <span>⭐ {inv.renown.toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}
