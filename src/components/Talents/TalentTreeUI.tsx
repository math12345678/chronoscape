import { useState, useEffect, useMemo } from 'react'
import { useStore } from '../../store'
import {
  ALL_TALENTS, getTalentsByTree, getTalentState, purchaseTalent,
  addTalentPoints, calculateTalentPointsFromRenown, getTalentPoints,
  type TalentTree, type TalentId,
} from '../../systems/ChronoTalents'

const TREE_NAMES: Record<TalentTree, string> = {
  combat: 'Chrono Combat',
  economy: 'Time Economy',
  building: 'Temporal Building',
}

const TREE_COLORS: Record<TalentTree, string> = {
  combat: '#ff6644',
  economy: '#ffd700',
  building: '#44aaff',
}

const TIER_LABELS = ['I', 'II', 'III', 'IV']

export const TalentTreeUI = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [activeTree, setActiveTree] = useState<TalentTree>('combat')
  const [, setAnimFrame] = useState(0)
  const renown = useStore((s) => s.inventory.renown)

  // Refresh talent points from renown
  useEffect(() => {
    const earned = calculateTalentPointsFromRenown(renown)
    const current = getTalentPoints()
    if (earned > current) {
      addTalentPoints(earned - current)
    }
  }, [renown])

  // Animate sparkles
  useEffect(() => {
    if (!open) return
    const id = setInterval(() => setAnimFrame((f) => f + 1), 800)
    return () => clearInterval(id)
  }, [open])

  const talents = useMemo(() => {
    if (!open) return [] as ReturnType<typeof getTalentsByTree>
    return getTalentsByTree(activeTree)
  }, [open, activeTree])

  if (!open) return null

  const talentState = getTalentState()

  const handlePurchase = (id: TalentId) => {
    const success = purchaseTalent(id, renown)
    if (success) {
      useStore.getState().addRenown(-(ALL_TALENTS[id].requiresRenownPerRank ?? 0))
    }
  }

  const treeTabStyle = (tree: TalentTree): React.CSSProperties => ({
    padding: '6px 16px',
    borderRadius: 6,
    border: '1px solid ' + TREE_COLORS[tree],
    background: activeTree === tree ? TREE_COLORS[tree] + '22' : 'transparent',
    color: activeTree === tree ? TREE_COLORS[tree] : '#888',
    cursor: 'pointer',
    fontWeight: activeTree === tree ? 700 : 400,
    fontSize: 13,
    transition: 'all 0.2s',
  })

  const talentsByTier = [1, 2, 3, 4].map((tier) =>
    talents.filter((t) => t.tier === tier)
  )

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div style={{
        width: 820,
        maxHeight: '85vh',
        background: 'linear-gradient(180deg, #0d1520 0%, #0a1018 100%)',
        border: '1px solid #2a3a50',
        borderRadius: 12,
        padding: 24,
        overflow: 'auto',
        boxShadow: '0 0 60px rgba(68,170,255,0.15)',
      }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>✦ Chrono Talents</span>
            <span style={{ marginLeft: 16, fontSize: 13, color: '#44ffcc' }}>
              Points: <b>{talentState.talentPoints}</b> &middot; Spent: <b>{talentState.totalSpent}</b>
            </span>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: '1px solid #3a4a60', borderRadius: 6,
            color: '#aaa', padding: '4px 12px', cursor: 'pointer', fontSize: 14,
          }}>✕ Close</button>
        </div>

        {/* Tree tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {(Object.keys(TREE_NAMES) as TalentTree[]).map((tree) => (
            <button key={tree} style={treeTabStyle(tree)} onClick={() => setActiveTree(tree)}>
              {TREE_NAMES[tree]}
            </button>
          ))}
        </div>

        {/* Skill tree grid — 4 tiers */}

        {/* Connection lines (visual only — drawn with CSS borders) */}
        <div style={{ position: 'relative' }}>
          {talentsByTier.map((tierTalents, tierIdx) => (
            <div key={tierIdx} style={{ marginBottom: tierIdx < 3 ? 20 : 0 }}>
              {/* Tier label */}
              <div style={{
                fontSize: 11, color: '#5a6a80', marginBottom: 8,
                textTransform: 'uppercase', letterSpacing: 2,
              }}>
                Tier {TIER_LABELS[tierIdx]}
              </div>
              {/* Talent cards */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {tierTalents.map((talent) => {
              const isMaxed = talent.rank >= talent.maxRank
                  // Use direct check
                  const meetsPrereqs = talent.prerequisites.length === 0 ||
                    talent.prerequisites.every((p) => (talentState.ranks[p] ?? 0) >= 1)
                  const purchasable = talentState.talentPoints > 0 && !isMaxed && meetsPrereqs && (talent.requiresRenownPerRank === undefined || renown >= (talent.requiresRenownPerRank ?? 0))
                  const sparkle = Math.random() > 0.7

                  return (
                    <div key={talent.id} style={{
                      width: 175,
                      padding: 12,
                      borderRadius: 8,
                      border: `1px solid ${isMaxed ? talent.color : meetsPrereqs ? '#2a3a50' : '#1a1a2a'}`,
                      background: isMaxed ? talent.color + '18' : meetsPrereqs ? '#111822' : '#0a0e14',
                      opacity: meetsPrereqs ? 1 : 0.4,
                      cursor: purchasable ? 'pointer' : 'default',
                      transition: 'all 0.25s',
                      position: 'relative',
                      overflow: 'hidden',
                    }} onClick={() => purchasable && handlePurchase(talent.id)}>
                      {/* Sparkle effect on purchasable */}
                      {purchasable && sparkle && (
                        <div style={{
                          position: 'absolute', top: 4, right: 6,
                          fontSize: 10, color: talent.color, opacity: 0.6,
                        }}>✦</div>
                      )}
                      {/* Icon + name row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <span style={{ fontSize: 18 }}>{talent.icon}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#ddd' }}>{talent.name}</span>
                      </div>
                      {/* Description */}
                      <div style={{ fontSize: 11, color: '#8899aa', lineHeight: 1.4, marginBottom: 6, minHeight: 30 }}>
                        {talent.description}
                      </div>
                      {/* Rank dots */}
                      <div style={{ display: 'flex', gap: 3, marginBottom: 4 }}>
                        {Array.from({ length: talent.maxRank }, (_, i) => (
                          <div key={i} style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: i < talent.rank ? talent.color : '#2a3a50',
                            border: '1px solid ' + (i < talent.rank ? talent.color : '#3a4a60'),
                            transition: 'background 0.3s',
                          }} />
                        ))}
                      </div>
                      {/* Cost / status */}
                      <div style={{ fontSize: 10, color: purchasable ? '#44ff88' : isMaxed ? talent.color : '#5a6a80' }}>
                        {isMaxed ? 'MAXED' : purchasable ? `[${talent.requiresRenownPerRank ?? 0} Renown]` : meetsPrereqs ? 'Need points' : 'Locked'}
                      </div>
                      {/* Glow effect when maxed */}
                      {isMaxed && (
                        <div style={{
                          position: 'absolute', inset: 0,
                          boxShadow: `inset 0 0 20px ${talent.color}33`,
                          pointerEvents: 'none',
                        }} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Explanation */}
        <div style={{ marginTop: 20, padding: 12, background: '#0a0e14', borderRadius: 8, border: '1px solid #1a2a3a' }}>
          <div style={{ fontSize: 12, color: '#6a7a90' }}>
            <b style={{ color: '#44ffcc' }}>Earn talent points</b> by accumulating Renown (1 point per 10 Renown, capped at 50).
            Each talent costs 1 point + a Renown fee. Pick wisely — there are <b>36 talents</b> across 3 trees!
          </div>
        </div>
      </div>
    </div>
  )
}
