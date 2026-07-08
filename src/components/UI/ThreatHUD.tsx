import { useState, useEffect } from 'react'
import { getThreatLevel, getThreatStage, getActiveMutations } from '../../systems/EnemyEvolution'

export const ThreatHUD = () => {
  const [level, setLevel] = useState(0)
  const [mutations, setMutations] = useState<string[]>([])

  useEffect(() => {
    const id = setInterval(() => {
      setLevel(getThreatLevel())
      setMutations(getActiveMutations().map((m) => m.icon + m.name))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const stage = getThreatStage()

  return (
    <div style={{
      position: 'fixed', top: 52, left: '50%', transform: 'translateX(-50%)', zIndex: 999,
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '4px 12px', borderRadius: 8,
      background: `${stage.color}08`,
      border: `1px solid ${stage.color}22`,
      fontSize: 10,
    }}>
      <span>{stage.icon}</span>
      <span style={{ color: stage.color, fontWeight: 700, letterSpacing: 1 }}>
        Threat Lv.{level}: {stage.name}
      </span>
      {mutations.length > 0 && (
        <span style={{ color: '#5a6a80', marginLeft: 4, fontSize: 9 }}>
          {mutations.slice(0, 3).join(' · ')}
        </span>
      )}
    </div>
  )
}
