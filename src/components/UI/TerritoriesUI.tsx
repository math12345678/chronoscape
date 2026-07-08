import { useState, useEffect } from 'react'
import { useStore } from '../../store'
import {
  getAllTerritories, getTerritoryState, getOwnedTerritories,
  getTerritoryIncomePerSec, canClaimTerritory, claimTerritory,
} from '../../systems/WorldTerritories'
import { getThreatLevel } from '../../systems/EnemyEvolution'

export const TerritoriesUI = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const inv = useStore((s) => s.inventory)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    if (!open) return
    const id = setInterval(() => setRefresh((n) => n + 1), 500)
    return () => clearInterval(id)
  }, [open])

  if (!open) return null

  const all = getAllTerritories()
  const threat = getThreatLevel()
  const income = getTerritoryIncomePerSec()
  const owned = getOwnedTerritories().length

  const contStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
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
          <span style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>🗺 World Territories</span>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid #3a4a60', borderRadius: 6, color: '#aaa', padding: '4px 12px', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ fontSize: 11, color: '#5a6a80', marginBottom: 12 }}>
          Owned: {owned}/{all.length} · Income: 🪨 {income.raw.toFixed(1)}/s {income.liquid > 0 ? '💧 ' + income.liquid.toFixed(1) + '/s' : ''} {income.crystal > 0 ? '💎 ' + income.crystal.toFixed(1) + '/s' : ''}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {all.map((t) => {
            const state = getTerritoryState(t.id)
            const owned = !!state?.owned
            const affordable = canClaimTerritory(t.id)
            const meetsThreat = threat >= t.threatRequired

            return (
              <div key={t.id} style={{
                padding: 12, borderRadius: 8,
                border: `1px solid ${owned ? t.color : affordable ? t.color + '44' : '#1a1a2a'}`,
                background: owned ? `${t.color}0a` : affordable ? `${t.color}04` : '#0a0e14',
                opacity: owned || affordable ? 1 : 0.5,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 20 }}>{t.icon}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: owned ? t.color : '#7a8a9a' }}>{t.name}</div>
                      <div style={{ fontSize: 10, color: '#5a6a80' }}>{t.description}</div>
                    </div>
                  </div>
                  {owned ? (
                    <div style={{ fontSize: 10, color: t.color, fontWeight: 600 }}>✓ OWNED</div>
                  ) : affordable ? (
                    <button style={{
                      padding: '6px 12px', borderRadius: 6, fontSize: 11,
                      border: `1px solid ${t.color}`, color: t.color,
                      background: `${t.color}12`, cursor: 'pointer',
                    }} onClick={() => { claimTerritory(t.id); setRefresh((r) => r + 1) }}>
                      Claim
                    </button>
                  ) : (
                    <div style={{ fontSize: 10, color: '#3a4a5a' }}>
                      {!meetsThreat ? `Need Threat ${t.threatRequired}` : 'Adjacency required'}
                    </div>
                  )}
                </div>

                {owned && state && (
                  <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 10, color: '#5a6a80', flexWrap: 'wrap' }}>
                    {Object.entries(t.incomePerSec).map(([res, val]) => (
                      <span key={res}>+{val}/s {res}</span>
                    ))}
                    {t.bonuses.map((b, i) => (
                      <span key={b} style={{ color: t.color }}>+{Math.round(t.bonusValues[i] * 100)}% {b}</span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
