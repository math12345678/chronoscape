import { useState, useEffect } from 'react'
import { useStore } from '../../store'
import {
  ALL_RESEARCH, getResearchState, getActiveResearch, getResearchProgress,
  startResearch, cancelResearch, isResearchCompleted,
} from '../../systems/ResearchLab'
import type { ResearchId } from '../../systems/ResearchLab'

export const ResearchLabUI = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const inventory = useStore((s) => s.inventory)
  const [research, setResearch] = useState(getResearchState())
  const [active, setActive] = useState(getActiveResearch())
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    if (!open) return
    const id = setInterval(() => {
      setResearch(getResearchState())
      setActive(getActiveResearch())
      setRefresh((r) => r + 1)
    }, 200)
    return () => clearInterval(id)
  }, [open])

  if (!open) return null

  const canStart = (id: ResearchId) => {
    if (active) return false
    const def = ALL_RESEARCH[id]
    const state = research[id]
    if (!def || !state || state.completed) return false
    // Check prereqs
    for (const prereq of def.prerequisites) {
      if (!research[prereq]?.completed) return false
    }
    // Check costs
    const inv = inventory
    if (def.cost.raw && inv.raw < def.cost.raw) return false
    if (def.cost.liquid && inv.liquid < def.cost.liquid) return false
    if (def.cost.crystal && inv.crystal < def.cost.crystal) return false
    if (def.cost.renown && inv.renown < def.cost.renown) return false
    return true
  }

  const TIER_LABELS = ['I', 'II', 'III', 'IV']

  const containerStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
  }

  const panelStyle: React.CSSProperties = {
    width: 650, maxHeight: '85vh', overflow: 'auto',
    background: 'linear-gradient(180deg, #0a1218, #080e16)',
    border: '1px solid #2a3a50', borderRadius: 12, padding: 24,
    boxShadow: '0 0 60px rgba(68,170,255,0.1)',
  }

  const btnStyle = (color: string, disabled = false): React.CSSProperties => ({
    padding: '5px 12px', borderRadius: 6, fontSize: 11,
    border: `1px solid ${disabled ? '#3a4a50' : color}`,
    background: disabled ? 'transparent' : color + '18',
    color: disabled ? '#3a4a5a' : color,
    fontWeight: 600, cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.4 : 1,
  })

  const researchByTier = [1, 2, 3, 4].map((tier) =>
    Object.values(ALL_RESEARCH).filter((r) => r.tier === tier)
  )

  return (
    <div style={containerStyle} onClick={onClose}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>
            🔬 Research Lab
          </span>
          <button onClick={onClose} style={{
            background: 'none', border: '1px solid #3a4a60', borderRadius: 6,
            color: '#aaa', padding: '4px 12px', cursor: 'pointer', fontSize: 14,
          }}>✕</button>
        </div>

        {/* Active research progress */}
        {active && (
          <div style={{
            padding: 12, borderRadius: 8, marginBottom: 16,
            background: '#0a1a20', border: '1px solid #1a3a2a',
          }}>
            <div style={{ fontSize: 13, color: '#44ffcc', marginBottom: 6 }}>
              Researching: {ALL_RESEARCH[active]?.name ?? active}
            </div>
            <div style={{
              height: 8, borderRadius: 4, background: '#1a2a3a',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${getResearchProgress(active) * 100}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #44ffcc, #44aaff)',
                borderRadius: 4,
                transition: 'width 1s linear',
              }} />
            </div>
            <button style={{ ...btnStyle('#ff4444'), marginTop: 8 }}
              onClick={() => { cancelResearch(); setActive(null) }}>
              Cancel (50% refund)
            </button>
          </div>
        )}

        {/* Research tiers */}
        {researchByTier.map((tierRes, tierIdx) => (
          <div key={tierIdx} style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 11, color: '#5a6a80', marginBottom: 6,
              textTransform: 'uppercase', letterSpacing: 2,
            }}>
              Tier {TIER_LABELS[tierIdx]}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {tierRes.map((def) => {
                const state = research[def.id]
                if (!state) return null
                const completed = state.completed
                const canAffordPrereqs = def.prerequisites.length === 0 ||
                  def.prerequisites.every((p) => research[p]?.completed)
                const canStartResearch = canStart(def.id)

                return (
                  <div key={def.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: 10, borderRadius: 8,
                    border: `1px solid ${completed ? def.color : canAffordPrereqs ? '#2a3a50' : '#1a1a2a'}`,
                    background: completed ? def.color + '10' : '#0e1622',
                    opacity: canAffordPrereqs || completed ? 1 : 0.4,
                  }}>
                    <span style={{ fontSize: 18 }}>{def.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: completed ? def.color : '#ccc' }}>
                        {def.name}
                        {completed && <span style={{ fontSize: 10, marginLeft: 6, color: '#44ff88' }}>✓ Complete</span>}
                      </div>
                      <div style={{ fontSize: 11, color: '#7a8a9a' }}>{def.description}</div>
                      <div style={{ fontSize: 10, color: def.color, marginTop: 1 }}>
                        ◆ {def.effect}
                      </div>
                      {!completed && (
                        <div style={{ fontSize: 10, color: '#5a6a80', marginTop: 1 }}>
                          {Object.entries(def.cost).filter(([, v]) => v > 0).map(([k, v]) => `${v} ${k}`).join(' · ')}
                          &nbsp;· {def.researchTime}s research time
                        </div>
                      )}
                    </div>
                    {!completed && (
                      <button style={btnStyle(def.color, !canStartResearch)}
                        disabled={!canStartResearch}
                        onClick={() => {
                          if (canStartResearch && startResearch(def.id)) {
                            setActive(getActiveResearch())
                          }
                        }}>
                        {canAffordPrereqs ? 'Research' : 'Locked'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* Info */}
        <div style={{ fontSize: 11, color: '#4a5a6a', marginTop: 8 }}>
          12 research projects across 4 tiers. Unlock permanent upgrades.
          Research takes time (30-300s) to complete. One at a time.
        </div>
      </div>
    </div>
  )
}
