import { useState, useEffect } from 'react'
import { useStore } from '../../store'
import {
  getRiftTier, getRiftLevel, getRiftHarvestMultiplier,
  getRiftRangeBonus, doesRiftAutoHarvest,
  upgradeRift, getTotalRiftHarvested, getSpecialResourcesFound,
  getRiftColor, RIFT_TIERS,
} from '../../systems/RiftEvolution'

export const RiftEvolutionUI = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const inventory = useStore((s) => s.inventory)
  const [, setRefresh] = useState(0)

  useEffect(() => {
    if (!open) return
    const id = setInterval(() => setRefresh((r) => r + 1), 500)
    return () => clearInterval(id)
  }, [open])

  if (!open) return null

  const tier = getRiftTier()
  const level = getRiftLevel()
  const nextTier = level + 1 < RIFT_TIERS.length ? RIFT_TIERS[level + 1] : null

  const canAfford = (cost: (typeof RIFT_TIERS)[number]['cost']) => {
    if (cost.raw && inventory.raw < cost.raw) return false
    if (cost.liquid && inventory.liquid < cost.liquid) return false
    if (cost.crystal && inventory.crystal < cost.crystal) return false
    if (cost.renown && inventory.renown < cost.renown) return false
    return true
  }

  const containerStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
  }

  const panelStyle: React.CSSProperties = {
    width: 520, maxHeight: '85vh', overflow: 'auto',
    background: 'linear-gradient(180deg, #0d1520, #080e16)',
    border: `1px solid ${getRiftColor()}44`, borderRadius: 12, padding: 24,
    boxShadow: `0 0 60px ${getRiftColor()}15`,
  }

  return (
    <div style={containerStyle} onClick={onClose}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: getRiftColor() }}>
            ⚡ Rift Evolution
          </span>
          <button onClick={onClose} style={{
            background: 'none', border: '1px solid #3a4a60', borderRadius: 6,
            color: '#aaa', padding: '4px 12px', cursor: 'pointer',
          }}>✕</button>
        </div>

        {/* Current Rift */}
        <div style={{
          padding: 16, borderRadius: 8, marginBottom: 16,
          background: getRiftColor() + '0a', border: `1px solid ${getRiftColor()}33`,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 36, marginBottom: 4 }}>🌀</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: getRiftColor() }}>{tier.name}</div>
          <div style={{ fontSize: 12, color: '#7a8a9a', marginTop: 4 }}>{tier.description}</div>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: '#44ff88' }}>+{Math.round((getRiftHarvestMultiplier() - 1) * 100)}% harvest</span>
            <span style={{ fontSize: 11, color: '#44aaff' }}>+{getRiftRangeBonus()} range</span>
            {doesRiftAutoHarvest() && (
              <span style={{ fontSize: 11, color: '#ffd700' }}>⚡ Auto-harvest</span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <div style={{
            flex: 1, padding: 10, borderRadius: 8,
            background: '#0a121c', border: '1px solid #1a2a3a', textAlign: 'center',
          }}>
            <div style={{ fontSize: 10, color: '#5a6a80' }}>Total Harvested</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#44ff88' }}>
              {getTotalRiftHarvested().toLocaleString()}
            </div>
          </div>
          <div style={{
            flex: 1, padding: 10, borderRadius: 8,
            background: '#0a121c', border: '1px solid #1a2a3a', textAlign: 'center',
          }}>
            <div style={{ fontSize: 10, color: '#5a6a80' }}>Special Resources</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#ff8844' }}>
              {getSpecialResourcesFound().toLocaleString()}
            </div>
          </div>
        </div>

        {/* Next Upgrade */}
        {nextTier ? (
          <div style={{
            padding: 16, borderRadius: 8, marginBottom: 16,
            background: '#0a1420', border: '1px solid #1a2a40',
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: nextTier.color }}>
              Next: {nextTier.name}
            </div>
            <div style={{ fontSize: 11, color: '#7a8a9a', marginTop: 4 }}>{nextTier.description}</div>
            <div style={{ fontSize: 11, color: '#5a6a80', marginTop: 4 }}>
              +{Math.round((nextTier.harvestMultiplier - 1) * 100)}% harvest · +{nextTier.rangeBonus} range
              {nextTier.autoHarvest && ' · Auto-harvest'}
              {nextTier.specialResource && ` · ${nextTier.specialResource} (${Math.round(nextTier.specialChance * 100)}%)`}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
              <div style={{ fontSize: 11, color: '#7a8a9a' }}>Cost:</div>
              {nextTier.cost.raw && (
                <div style={{ fontSize: 11, color: inventory.raw >= nextTier.cost.raw ? '#44ff88' : '#ff4444' }}>
                  🪨 {nextTier.cost.raw}
                </div>
              )}
              {nextTier.cost.liquid && (
                <div style={{ fontSize: 11, color: inventory.liquid >= nextTier.cost.liquid ? '#44aaff' : '#ff4444' }}>
                  💧 {nextTier.cost.liquid}
                </div>
              )}
              {nextTier.cost.crystal && (
                <div style={{ fontSize: 11, color: inventory.crystal >= nextTier.cost.crystal ? '#cc88ff' : '#ff4444' }}>
                  💎 {nextTier.cost.crystal}
                </div>
              )}
              {nextTier.cost.renown && (
                <div style={{ fontSize: 11, color: inventory.renown >= nextTier.cost.renown ? '#ffd700' : '#ff4444' }}>
                  ⭐ {nextTier.cost.renown}
                </div>
              )}
            </div>
            <button style={{
              marginTop: 10, padding: '8px 24px', borderRadius: 6,
              border: `1px solid ${nextTier.color}`,
              background: nextTier.color + '22',
              color: nextTier.color, fontWeight: 700, cursor: canAfford(nextTier.cost) ? 'pointer' : 'default',
              opacity: canAfford(nextTier.cost) ? 1 : 0.4,
            }} disabled={!canAfford(nextTier.cost)}
              onClick={() => { if (upgradeRift()) setRefresh((r) => r + 1) }}>
              UPGRADE RIFT
            </button>
          </div>
        ) : (
          <div style={{
            padding: 16, borderRadius: 8, marginBottom: 16,
            background: '#0a1a10', border: '1px solid #ffd70044', textAlign: 'center',
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#ffd700' }}>
              ✨ MAX LEVEL — Omega Rift achieved!
            </div>
          </div>
        )}

        {/* Tier List */}
        <div style={{ fontSize: 11, color: '#5a6a80', marginBottom: 8 }}>All Tiers:</div>
        {RIFT_TIERS.map((t, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 10px', marginBottom: 4, borderRadius: 6,
            background: i === level ? t.color + '18' : 'transparent',
            border: `1px solid ${i === level ? t.color : i < level ? '#2a3a3a' : '#1a1a2a'}`,
            opacity: i <= level ? 1 : 0.4,
          }}>
            <div style={{ fontSize: 14, color: t.color }}>
              {i < level ? '✅' : i === level ? '▶' : '🔒'}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: t.color, width: 120 }}>{t.name}</div>
            <div style={{ fontSize: 10, color: '#5a6a80', flex: 1 }}>
              {t.autoHarvest ? 'Auto · ' : ''}+{Math.round((t.harvestMultiplier - 1) * 100)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
