import { useState, useEffect } from 'react'
import { getTechNodes, getSynergyGroups, getTotalUnlocked, canUnlockTech, unlockTech } from '../../systems/TechWeb'
import type { TechNode } from '../../systems/TechWeb'
import { getSkills, getTotalSkillDamage } from '../../systems/ChronoCombatSkills'

const BRANCH_COLORS: Record<string, string> = {
  combat: '#ff4444',
  economy: '#ffd700',
  exploration: '#44ff88',
  building: '#ff8844',
  temporal: '#44ffcc',
}

interface TreeNodeProps {
  node: TechNode
  allNodes: TechNode[]
  onUnlock: (id: string) => void
}

const TreeNode = ({ node, allNodes, onUnlock }: TreeNodeProps) => {
  const canAfford = canUnlockTech(node.id)
  const hasPrereqs = node.prerequisites.every(pid => allNodes.find(n => n.id === pid)?.unlocked)
  const isUnlockable = canAfford && hasPrereqs && !node.unlocked

  return (
    <div
      style={{
        padding: '6px 10px',
        borderRadius: 6,
        backgroundColor: node.unlocked
          ? `${node.color}18`
          : isUnlockable
            ? `${node.color}10`
            : 'rgba(255,255,255,0.03)',
        border: `1px solid ${
          node.unlocked
            ? node.color + '60'
            : isUnlockable
              ? node.color + '30'
              : 'rgba(255,255,255,0.06)'
        }`,
        opacity: node.unlocked ? 1 : hasPrereqs ? 0.8 : 0.35,
        cursor: isUnlockable ? 'pointer' : 'default',
        transition: 'all 0.15s',
        fontSize: 10,
      }}
      onClick={() => {
        if (isUnlockable) {
          unlockTech(node.id)
          onUnlock(node.id)
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 12 }}>{node.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ color: node.unlocked ? node.color : '#888', fontWeight: 600, fontSize: 10, letterSpacing: '0.3px' }}>
            {node.name}
            {node.unlocked && ' ✓'}
          </div>
          <div style={{ color: '#667', fontSize: 8, marginTop: 1 }}>{node.description}</div>
        </div>
        <div style={{
          color: node.color,
          fontSize: 8,
          fontFamily: 'monospace',
          textAlign: 'right',
        }}>
          {node.effect}
        </div>
      </div>
      {!node.unlocked && (
        <div style={{ display: 'flex', gap: 6, marginTop: 4, fontSize: 7, color: '#667', fontFamily: 'monospace' }}>
          <span>{node.cost.raw}₿</span>
          <span>{node.cost.liquid}~</span>
          <span>{node.cost.crystal}◆</span>
          <span>{node.cost.renown}★</span>
          {node.cost.shards && <span style={{ color: '#ff44ff' }}>{node.cost.shards}⬟</span>}
        </div>
      )}
    </div>
  )
}

export const CombatPassiveTreeUI = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [nodes, setNodes] = useState<TechNode[]>([])
  const [totalUnlocked, setTotalUnlocked] = useState(0)
  const [skillDmg, setSkillDmg] = useState(0)
  const [synergies, setSynergies] = useState<Record<string, { name: string; description: string; bonusEffect: string; bonusValue: number }>>({})

  const refresh = () => {
    setNodes(getTechNodes())
    setTotalUnlocked(getTotalUnlocked())
    setSkillDmg(getTotalSkillDamage())
    setSynergies(getSynergyGroups())
  }

  useEffect(() => {
    if (!open) return
    refresh()
    const interval = setInterval(refresh, 1000)
    return () => clearInterval(interval)
  }, [open])

  if (!open) return null

  const byBranch: Record<string, TechNode[]> = {}
  for (const node of nodes) {
    if (!byBranch[node.branch]) byBranch[node.branch] = []
    byBranch[node.branch].push(node)
  }

  const combatNodes = byBranch['combat'] || []
  const combatUnlocked = combatNodes.filter(n => n.unlocked).length
  const combatTotal = combatNodes.length
  const allCombatUnlocked = combatUnlocked === combatTotal

  const combatSynergy = synergies['combat_mastery']
  const synergyActive = allCombatUnlocked && combatSynergy

  const skills = getSkills()

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 9999,
      backgroundColor: 'rgba(5,10,25,0.95)',
      border: '1px solid rgba(68,255,204,0.15)',
      borderRadius: 12,
      padding: 20,
      minWidth: 480,
      maxWidth: 540,
      maxHeight: '80vh',
      overflowY: 'auto',
      color: '#ccc',
      fontFamily: 'monospace',
      fontSize: 11,
      userSelect: 'none',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <span style={{ color: '#44ffcc', fontSize: 14, fontWeight: 700, letterSpacing: '1px' }}>PASSIVE TREE</span>
          <div style={{ fontSize: 9, color: '#667', marginTop: 2 }}>{totalUnlocked} / {nodes.length} total techs unlocked</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ textAlign: 'right', fontSize: 9, color: '#667' }}>
            <div>Skill Dmg: <span style={{ color: '#ff8844' }}>{Math.floor(skillDmg)}</span></div>
            <div>Combat: <span style={{ color: '#ff4444' }}>{combatUnlocked}/{combatTotal}</span></div>
          </div>
          <div
            onClick={onClose}
            style={{
              cursor: 'pointer',
              color: '#667',
              fontSize: 14,
              padding: '2px 6px',
              borderRadius: 4,
            }}
          >
            ✕
          </div>
        </div>
      </div>

      {synergyActive && (
        <div style={{
          padding: '8px 12px',
          borderRadius: 6,
          backgroundColor: 'rgba(255,68,68,0.1)',
          border: '1px solid rgba(255,68,68,0.3)',
          marginBottom: 12,
          fontSize: 9,
        }}>
          <span style={{ color: '#ff4444', fontWeight: 700, fontSize: 10 }}>⚔ COMBAT MASTERY ACTIVE</span>
          <span style={{ color: '#ff8844', marginLeft: 8 }}>{combatSynergy?.bonusEffect}</span>
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <div style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '1px',
          color: BRANCH_COLORS.combat,
          marginBottom: 6,
          paddingBottom: 4,
          borderBottom: '1px solid ' + BRANCH_COLORS.combat + '30',
        }}>
          COMBAT BRANCH — {combatUnlocked}/{combatTotal}
        </div>
        {combatNodes.map(node => (
          <div key={node.id} style={{ marginBottom: 3 }}>
            <TreeNode node={node} allNodes={nodes} onUnlock={refresh} />
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 12,
        padding: '8px 10px',
        borderRadius: 6,
        backgroundColor: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ fontSize: 9, color: '#667', marginBottom: 4, letterSpacing: '0.5px' }}>PASSIVE STATS</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 16px', fontSize: 9 }}>
          {combatNodes.filter(n => n.unlocked).map(n => (
            <div key={n.id} style={{ color: n.color + 'aa' }}>
              <span style={{ marginRight: 4 }}>{n.icon}</span>
              {n.effect}
            </div>
          ))}
          {combatNodes.filter(n => n.unlocked).length === 0 && (
            <div style={{ color: '#445', fontSize: 8 }}>No combat passives unlocked yet.</div>
          )}
        </div>
      </div>

      <div style={{
        marginTop: 12,
        padding: '8px 10px',
        borderRadius: 6,
        backgroundColor: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ fontSize: 9, color: '#667', marginBottom: 4, letterSpacing: '0.5px' }}>ACTIVE SKILLS</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 8 }}>
          {skills.filter(s => s.slot > 0 || s.id.includes('heal') || s.id.includes('void_step') || s.id.includes('freeze') || s.id.includes('rewind')).map(s => (
            <div key={s.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 4px',
              borderRadius: 4,
              backgroundColor: s.color + '10',
            }}>
              <span style={{ fontSize: 10 }}>{s.icon}</span>
              <div style={{ flex: 1 }}>
                <span style={{ color: s.color }}>{s.name}</span>
                <span style={{ color: '#667', marginLeft: 4 }}>CD: {s.cooldown}s</span>
              </div>
              <span style={{ color: '#888' }}>{s.damageType}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
