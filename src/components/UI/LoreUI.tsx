import { useState, useMemo } from 'react'
import {
  getAllLore, getDiscoveredLore, getLoreCompletion, getLoreCount,
} from '../../systems/EnvironmentLore'
import type { LoreCategory, LoreEntry } from '../../systems/EnvironmentLore'

const CATEGORIES: { key: LoreCategory | 'all'; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: '📚' },
  { key: 'fragment', label: 'Fragments', icon: '📜' },
  { key: 'ruin', label: 'Ruins', icon: '🏛️' },
  { key: 'echo', label: 'Echoes', icon: '👻' },
  { key: 'diary', label: 'Diaries', icon: '📓' },
  { key: 'artifact', label: 'Artifacts', icon: '💎' },
]

export const LoreUI = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [filter, setFilter] = useState<LoreCategory | 'all'>('all')
  const [selected, setSelected] = useState<LoreEntry | null>(null)

  const discovered = open ? getDiscoveredLore() : []
  const discoveredIds = new Set(discovered.map((l) => l.id))

  const filtered = useMemo(() => {
    if (!open) return []
    const all = getAllLore()
    if (filter === 'all') return all
    return all.filter((l) => l.category === filter)
  }, [filter, open])

  if (!open) return null

  const containerStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
  }

  const panelStyle: React.CSSProperties = {
    width: 680, maxHeight: '85vh', display: 'flex', flexDirection: 'column',
    background: 'linear-gradient(180deg, #0d1520, #080e16)',
    border: '1px solid #2a3a50', borderRadius: 12, padding: 24,
    boxShadow: '0 0 60px rgba(68,255,204,0.06)',
  }

  const { total, discovered: discCount } = getLoreCount()

  return (
    <div style={containerStyle} onClick={onClose}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>
            📖 Chrono Archives
          </span>
          <button onClick={onClose} style={{
            background: 'none', border: '1px solid #3a4a60', borderRadius: 6,
            color: '#aaa', padding: '4px 12px', cursor: 'pointer',
          }}>✕</button>
        </div>

        {/* Progress */}
        <div style={{
          marginBottom: 16, padding: '8px 12px', borderRadius: 6,
          background: '#0a121c', border: '1px solid #1a2a3a',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              height: 6, borderRadius: 3,
              background: '#1a2a3a', overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', borderRadius: 3,
                background: 'linear-gradient(90deg, #44ff88, #44aaff)',
                width: `${Math.round(getLoreCompletion() * 100)}%`,
                transition: 'width 0.5s',
              }} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#7a8a9a' }}>
            {discCount}/{total} discovered
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {CATEGORIES.map((cat) => (
            <button key={cat.key} style={{
              padding: '6px 12px', borderRadius: 6, fontSize: 12,
              border: `1px solid ${filter === cat.key ? '#44aaff' : '#2a3a50'}`,
              background: filter === cat.key ? '#44aaff18' : 'transparent',
              color: filter === cat.key ? '#44aaff' : '#7a8a9a',
              fontWeight: filter === cat.key ? 600 : 400,
              cursor: 'pointer',
            }} onClick={() => setFilter(cat.key)}>
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 16, flex: 1, overflow: 'hidden' }}>
          {/* List */}
          <div style={{
            width: 280, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6,
            paddingRight: 8,
          }}>
            {filtered.map((entry) => {
              const found = discoveredIds.has(entry.id)
              return (
                <div key={entry.id} style={{
                  padding: '8px 10px', borderRadius: 6,
                  border: `1px solid ${selected?.id === entry.id ? entry.color : found ? '#2a3a50' : '#1a1a2a'}`,
                  background: selected?.id === entry.id ? entry.color + '12' : found ? '#0f1622' : '#0a0e14',
                  cursor: 'pointer', opacity: found ? 1 : 0.5,
                  transition: 'opacity 0.2s',
                }} onClick={() => found && setSelected(entry)}>
                  <div style={{ fontSize: 13, color: found ? entry.color : '#3a4a5a', fontWeight: 600 }}>
                    {found ? entry.icon : '❓'} {found ? entry.title : '???'}
                  </div>
                  <div style={{ fontSize: 10, color: found ? '#5a6a80' : '#2a3a40' }}>
                    {found ? entry.author + ' · ' + entry.era : 'Undiscovered'}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Detail */}
          <div style={{
            flex: 1, borderRadius: 8, padding: 16,
            background: '#0a121c', border: '1px solid #1a2a3a',
            overflow: 'auto',
          }}>
            {selected ? (
              <div>
                <div style={{
                  display: 'inline-block', fontSize: 32, marginBottom: 8,
                }}>{selected.icon}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: selected.color }}>
                  {selected.title}
                </div>
                <div style={{ fontSize: 11, color: '#5a6a80', marginTop: 4 }}>
                  {selected.category.charAt(0).toUpperCase() + selected.category.slice(1)} · {selected.author} · {selected.era}
                </div>
                <div style={{ fontSize: 11, color: '#3a5a6a', marginTop: 2 }}>
                  Found in: {selected.location}
                </div>
                <div style={{
                  marginTop: 16, padding: 16, borderRadius: 8,
                  background: '#080e16', border: '1px solid #1a2a3a',
                  fontSize: 13, color: '#b0c0d0', lineHeight: 1.6,
                  fontStyle: 'italic',
                }}>
                  "{selected.text}"
                </div>
              </div>
            ) : (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: '100%', color: '#3a4a5a', fontSize: 13,
              }}>
                Select a discovered entry to read
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
