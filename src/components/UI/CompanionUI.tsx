import { useState, useEffect } from 'react'
import { useStore } from '../../store'
import {
  ALL_COMPANIONS, getCompanions, getActiveCompanion,
  unlockCompanion, summonCompanion, dismissCompanion,
  getCompanionDamage,
} from '../../systems/TimeCompanions'
import type { CompanionId } from '../../systems/TimeCompanions'

export const CompanionUI = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const inventory = useStore((s) => s.inventory)
  const [companions, setCompanions] = useState(getCompanions())
  const [activeId, setActiveId] = useState(getActiveCompanion())
  const [, setRefresh] = useState(0)

  useEffect(() => {
    if (!open) return
    const id = setInterval(() => {
      setCompanions(getCompanions())
      setActiveId(getActiveCompanion())
      setRefresh((r) => r + 1)
    }, 500)
    return () => clearInterval(id)
  }, [open])

  if (!open) return null

  const canUnlock = (def: typeof ALL_COMPANIONS[CompanionId]) => {
    const inv = inventory
    if (def.unlockCost.raw && inv.raw < def.unlockCost.raw) return false
    if (def.unlockCost.liquid && inv.liquid < def.unlockCost.liquid) return false
    if (def.unlockCost.crystal && inv.crystal < def.unlockCost.crystal) return false
    if (def.unlockCost.renown && inv.renown < def.unlockCost.renown) return false
    return true
  }

  const containerStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
  }

  const panelStyle: React.CSSProperties = {
    width: 580, maxHeight: '85vh', overflow: 'auto',
    background: 'linear-gradient(180deg, #0d1520, #080e16)',
    border: '1px solid #2a3a50', borderRadius: 12, padding: 24,
    boxShadow: '0 0 60px rgba(68,255,204,0.08)',
  }

  const btnStyle = (color: string, disabled = false): React.CSSProperties => ({
    padding: '6px 14px', borderRadius: 6,
    border: `1px solid ${disabled ? '#3a4a50' : color}`,
    background: disabled ? 'transparent' : color + '18',
    color: disabled ? '#3a4a5a' : color,
    fontWeight: 600, fontSize: 12, cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.4 : 1,
  })

  return (
    <div style={containerStyle} onClick={onClose}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>
            🐾 Time Companions
          </span>
          <button onClick={onClose} style={{
            background: 'none', border: '1px solid #3a4a60', borderRadius: 6,
            color: '#aaa', padding: '4px 12px', cursor: 'pointer', fontSize: 14,
          }}>✕</button>
        </div>

        <div style={{ fontSize: 13, color: '#7a8a9a', marginBottom: 16 }}>
          {activeId
            ? `Active: ${ALL_COMPANIONS[activeId]?.name ?? activeId}`
            : 'No companion summoned. Unlock and summon one below!'}
        </div>

        {/* Companion grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Object.values(ALL_COMPANIONS).map((def) => {
            const owned = !!companions[def.id]
            const inst = owned ? companions[def.id] : null
            const isActive = activeId === def.id
            const afford = canUnlock(def)

            return (
              <div key={def.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: 12, borderRadius: 8,
                border: `1px solid ${isActive ? def.color : owned ? '#2a3a50' : '#1a1a2a'}`,
                background: isActive ? def.color + '12' : owned ? '#0f1622' : '#0a0e14',
                opacity: owned ? 1 : 0.6,
              }}>
                {/* Icon */}
                <div style={{
                  width: 40, height: 40, borderRadius: 8,
                  background: def.color + '22', border: '1px solid ' + def.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20,
                }}>{def.icon}</div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: def.color }}>
                    {def.name}
                    {inst?.evolved && (
                      <span style={{ fontSize: 10, color: '#ffd700', marginLeft: 6 }}>
                        ★ EVOLVED
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#7a8a9a' }}>
                    {def.description}
                  </div>
                  <div style={{ fontSize: 10, color: '#5a6a80', marginTop: 2 }}>
                    DMG: {owned ? getCompanionDamage(def.id) : def.baseDamage} ·
                    HP: {owned ? `${inst?.health ?? def.baseHealth}/${inst?.maxHealth ?? def.baseHealth}` : def.baseHealth} ·
                    Range: {def.range}
                  </div>
                  <div style={{ fontSize: 10, color: def.color, marginTop: 1 }}>
                    ◆ {def.special}
                  </div>
                  {owned && (
                    <div style={{ fontSize: 10, color: '#5a6a80', marginTop: 1 }}>
                      Kills: {inst?.kills ?? 0}/{def.evolveAt} to evolve
                      {inst && inst.kills >= def.evolveAt && !inst.evolved && ' ★ Ready!'}
                    </div>
                  )}
                  {!owned && (
                    <div style={{ fontSize: 10, color: '#5a6a80', marginTop: 1 }}>
                      {Object.entries(def.unlockCost).filter(([, v]) => v > 0).map(([k, v]) => `${v} ${k}`).join(' · ')}
                    </div>
                  )}
                </div>

                {/* Action */}
                {!owned ? (
                  <button style={btnStyle(def.color, !afford)}
                    disabled={!afford}
                    onClick={() => {
                      if (afford && unlockCompanion(def.id)) {
                        setRefresh((r) => r + 1)
                      }
                    }}>
                    Unlock
                  </button>
                ) : isActive ? (
                  <button style={btnStyle('#ff4444')}
                    onClick={() => { dismissCompanion(); setActiveId(null) }}>
                    Dismiss
                  </button>
                ) : (
                  <button style={btnStyle(def.color)}
                    onClick={() => { summonCompanion(def.id); setActiveId(def.id) }}>
                    Summon
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Info footer */}
        <div style={{ marginTop: 16, padding: 12, background: '#0a0e14', borderRadius: 8, border: '1px solid #1a2a3a' }}>
          <div style={{ fontSize: 11, color: '#5a7a90' }}>
            <b style={{ color: '#44ffcc' }}>Companions</b> follow you and attack enemies. They earn kills and can
            evolve into stronger forms. Only one companion can be active at a time.
            Each provides a unique passive bonus while summoned.
          </div>
        </div>
      </div>
    </div>
  )
}
