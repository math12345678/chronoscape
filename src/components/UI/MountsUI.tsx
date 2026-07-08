import { useState, useEffect } from 'react'
import { useStore } from '../../store'
import {
  ALL_MOUNTS, getMounts, getActiveMount,
  unlockMount, mount, dismount, getMountSpeedBonus,
} from '../../systems/MountsSystem'
import type { MountId } from '../../systems/MountsSystem'

export const MountsUI = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const inventory = useStore((s) => s.inventory)
  const [mounts, setMounts] = useState(getMounts())
  const [activeId, setActiveId] = useState(getActiveMount())
  const [, setRefresh] = useState(0)

  useEffect(() => {
    if (!open) return
    const id = setInterval(() => {
      setMounts(getMounts())
      setActiveId(getActiveMount())
    }, 300)
    return () => clearInterval(id)
  }, [open])

  if (!open) return null

  const canUnlock = (def: typeof ALL_MOUNTS[MountId]) => {
    if (def.unlockCost.raw && inventory.raw < def.unlockCost.raw) return false
    if (def.unlockCost.liquid && inventory.liquid < def.unlockCost.liquid) return false
    if (def.unlockCost.crystal && inventory.crystal < def.unlockCost.crystal) return false
    if (def.unlockCost.renown && inventory.renown < def.unlockCost.renown) return false
    return true
  }

  const containerStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
  }

  const panelStyle: React.CSSProperties = {
    width: 600, maxHeight: '85vh', overflow: 'auto',
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
            🐉 Temporal Mounts
          </span>
          <button onClick={onClose} style={{
            background: 'none', border: '1px solid #3a4a60', borderRadius: 6,
            color: '#aaa', padding: '4px 12px', cursor: 'pointer', fontSize: 14,
          }}>✕</button>
        </div>

        {activeId ? (
          <div style={{
            padding: 12, borderRadius: 8, marginBottom: 16,
            background: '#0a1a20', border: '1px solid #1a3a2a',
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: ALL_MOUNTS[activeId]?.color }}>
              Mounted: {ALL_MOUNTS[activeId]?.name ?? activeId}
              {mounts[activeId]?.evolved && (
                <span style={{ fontSize: 10, color: '#ffd700', marginLeft: 6 }}>★ EVOLVED</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#7a8a9a', marginTop: 4 }}>
              +{getMountSpeedBonus()}% speed bonus
            </div>
            <button style={{ ...btnStyle('#ff4444'), marginTop: 8 }}
              onClick={() => { dismount(); setActiveId(null) }}>
              Dismount
            </button>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: '#5a6a80', marginBottom: 16 }}>
            No mount active. Unlock and mount a creature below.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Object.values(ALL_MOUNTS).map((def) => {
            const owned = !!mounts[def.id]
            const inst = owned ? mounts[def.id] : null
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
                <div style={{
                  width: 40, height: 40, borderRadius: 8,
                  background: def.color + '22', border: '1px solid ' + def.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20,
                }}>{def.icon}</div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: def.color }}>
                    {def.name}
                    {inst?.evolved && <span style={{ fontSize: 10, color: '#ffd700', marginLeft: 6 }}>★</span>}
                  </div>
                  <div style={{ fontSize: 11, color: '#7a8a9a' }}>{def.description}</div>
                  <div style={{ fontSize: 10, color: '#5a6a80', marginTop: 1 }}>
                    Speed: +{def.speedBonus}% · Jump: +{def.jumpBonus}% · Dist: {def.evolveAt.toLocaleString()} to evolve
                  </div>
                  <div style={{ fontSize: 10, color: def.color }}>
                    ◆ {def.abilityName}: {def.abilityDesc}
                  </div>
                  {owned && (
                    <div style={{ fontSize: 10, color: '#5a6a80' }}>
                      Distance: {Math.floor(inst?.distanceTraveled ?? 0)}/{def.evolveAt}
                      {inst && inst.distanceTraveled >= def.evolveAt && !inst.evolved && ' ★ Ready!'}
                    </div>
                  )}
                </div>

                {!owned ? (
                  <button style={btnStyle(def.color, !afford)} disabled={!afford}
                    onClick={() => {
                      if (afford && unlockMount(def.id)) setRefresh((r) => r + 1)
                    }}>
                    Unlock
                  </button>
                ) : isActive ? null : (
                  <button style={btnStyle(def.color)}
                    onClick={() => { mount(def.id); setActiveId(def.id) }}>
                    Mount
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: 12, fontSize: 10, color: '#4a5a6a' }}>
          Mounts replace your vehicle while active. They grant speed bonuses and special abilities.
          Ride them to evolve their form and boost stats.
        </div>
      </div>
    </div>
  )
}
