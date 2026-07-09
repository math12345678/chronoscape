import { useState, useEffect, useMemo } from 'react'
import { getAllTomes, getDiscoveredTomes, getTomeCount, getTomeModifier } from '../../systems/TimeLibrary'

export const TimeLibraryUI = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [, setRefresh] = useState(0)

  useEffect(() => {
    if (!open) return
    const id = setInterval(() => setRefresh((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [open])

  const allTomes = getAllTomes()
  const byRarity = useMemo(() => {
    if (!open) return {} as Record<string, typeof allTomes>
    const groups: Record<string, typeof allTomes> = {}
    for (const t of allTomes) {
      if (!groups[t.rarity]) groups[t.rarity] = []
      groups[t.rarity].push(t)
    }
    return groups
  }, [open, allTomes])

  if (!open) return null

  const { total, discovered } = getTomeCount()
  const discoveredIds = new Set(getDiscoveredTomes().map((t) => t.id))

  const rarityOrder = ['common', 'uncommon', 'rare', 'legendary', 'mythic']
  const rarityColors: Record<string, string> = {
    common: '#88aacc', uncommon: '#44ff88', rare: '#4488ff', legendary: '#ff8844', mythic: '#ff00ff',
  }

  const contStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)',
  }
  const panelStyle: React.CSSProperties = {
    width: 600, maxHeight: '85vh', overflow: 'auto',
    padding: 24, borderRadius: 12,
    background: 'linear-gradient(180deg, #0d1520, #080e16)',
    border: '1px solid #2a3a50',
  }

  return (
    <div style={contStyle} onClick={onClose}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>📚 Time Library</span>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid #3a4a60', borderRadius: 6, color: '#aaa', padding: '4px 12px', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ fontSize: 11, color: '#5a6a80', marginBottom: 4 }}>{discovered}/{total} tomes discovered</div>
        <div style={{ height: 4, borderRadius: 2, background: '#1a2a3a', marginBottom: 16 }}>
          <div style={{ height: '100%', borderRadius: 2, background: 'linear-gradient(90deg, #44ff88, #44aaff)', width: `${(discovered / total) * 100}%` }} />
        </div>

        {/* Tome modifiers summary */}
        <div style={{
          padding: 10, borderRadius: 8, marginBottom: 16,
          background: '#0a121c', border: '1px solid #1a2a3a',
          display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 10,
        }}>
          {(['damage', 'harvest', 'speed', 'regen', 'loot', 'fireRate', 'defense', 'explosion'] as const).map((type) => {
            const val = getTomeModifier(type)
            if (val === 0) return null
            const color = type === 'damage' ? '#ff4444' : type === 'harvest' ? '#44ff88' : type === 'speed' ? '#44aaff' : type === 'regen' ? '#ff66aa' : type === 'loot' ? '#ffd700' : type === 'fireRate' ? '#ff44ff' : type === 'defense' ? '#44ffcc' : '#ff8844'
            return <span key={type} style={{ color, fontWeight: 600 }}>+{type === 'regen' ? val + 'HP/s' : Math.round(val * 100) + '%'} {type}</span>
          })}
        </div>

        {rarityOrder.map((rarity) => {
          const tomes = byRarity[rarity] ?? []
          if (tomes.length === 0) return null
          return (
            <div key={rarity} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: rarityColors[rarity], fontWeight: 700, letterSpacing: 1, marginBottom: 4, textTransform: 'uppercase' }}>
                {rarity} — {tomes.filter((t) => discoveredIds.has(t.id)).length}/{tomes.length}
              </div>
              {tomes.map((t) => {
                const found = discoveredIds.has(t.id)
                return (
                  <div key={t.id} style={{
                    padding: '6px 10px', marginBottom: 2, borderRadius: 6,
                    border: `1px solid ${found ? t.color + '33' : '#1a1a2a'}`,
                    background: found ? `${t.color}06` : 'transparent',
                    opacity: found ? 1 : 0.4,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <span style={{ fontSize: 16 }}>{found ? t.icon : '❓'}</span>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: found ? t.color : '#3a4a5a' }}>
                        {found ? t.title : '???'}
                      </span>
                      {found && <span style={{ fontSize: 10, color: '#5a6a80', marginLeft: 6 }}>{t.subtitle}</span>}
                    </div>
                    <span style={{ fontSize: 10, color: found ? rarityColors[rarity] : '#2a3a40' }}>
                      {found ? t.effect : `${t.discoveryCondition}`}
                    </span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
