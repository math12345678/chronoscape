import { useState, useEffect } from 'react'
import type { FactionId } from '../../config/combat'
import { modifyReputation } from './GangSystem'
import { getTimeCreditBalance, spendTimeCredit } from '../../config/timeCredit'
import { UI } from '../../utils/uiStyles'

// ── Hideout config ──────────────────────────────────
interface HideoutDef {
  id: string
  faction: FactionId
  name: string
  description: string
  buildCost: number
  bonuses: string[]
  color: string
}

const HIDEOUTS: HideoutDef[] = [
  { id: 'hideout_chrono', faction: 'chronoGuard', name: 'Chrono Bastion', description: 'Fortified time-guard outpost', buildCost: 3000, bonuses: ['+2 TC$/s', '+20% harvest yield in territory', 'Safe fast-travel point'], color: '#44aaff' },
  { id: 'hideout_void', faction: 'voidCult', name: 'Void Sanctum', description: 'Worship site in the void rift', buildCost: 3000, bonuses: ['+2 TC$/s', '+15% enemy damage in territory', 'Spawn void minions'], color: '#ff4466' },
  { id: 'hideout_crystal', faction: 'crystalSyndicate', name: 'Crystal Exchange', description: 'Underground crystal trading post', buildCost: 3000, bonuses: ['+2 TC$/s', '-10% shop prices', 'Daily crystal dividend'], color: '#aa88ff' },
  { id: 'hideout_timeless', faction: 'timeless', name: 'Timeless Inn', description: 'Neutral ground for all factions', buildCost: 2500, bonuses: ['+1 TC$/s', 'Free healing', 'Faction reputation boost'], color: '#ffcc44' },
  { id: 'hideout_echo', faction: 'echoReapers', name: 'Echo Workshop', description: 'Harvested timeline fragments forge', buildCost: 3500, bonuses: ['+3 TC$/s', '+25% loot from enemies', 'Rare gear crafting'], color: '#ff66aa' },
  { id: 'hideout_dawn', faction: 'dawnForged', name: 'Dawn Forge', description: 'Builders of tomorrow\'s weapons', buildCost: 2800, bonuses: ['+2 TC$/s', '-15% build costs', 'Free blueprint storage'], color: '#ff8844' },
]

let _ownedHideouts = new Set<string>()

export function getOwnedHideouts(): string[] { return Array.from(_ownedHideouts) }
export function hasHideout(id: string): boolean { return _ownedHideouts.has(id) }

export function buildHideout(id: string): boolean {
  const hideout = HIDEOUTS.find(h => h.id === id)
  if (!hideout || _ownedHideouts.has(id)) return false
  if (!spendTimeCredit(hideout.buildCost)) return false
  _ownedHideouts.add(id)
  modifyReputation(hideout.faction, 20)
  window.dispatchEvent(new CustomEvent('hideout-built', {
    detail: { name: hideout.name, faction: hideout.faction },
  }))
  return true
}

export function getHideoutTCBonus(): number {
  let bonus = 0
  for (const id of _ownedHideouts) {
    const h = HIDEOUTS.find(hh => hh.id === id)
    if (h) {
      const match = h.bonuses[0].match(/\+(\d+) TC/)
      if (match) bonus += parseInt(match[1])
    }
  }
  return bonus
}

export const GangHideoutPanel = () => {
  const [, refresh] = useState(0)

  useEffect(() => {
    const iv = setInterval(() => refresh(n => n + 1), 1000)
    return () => clearInterval(iv)
  }, [])

  const tc = getTimeCreditBalance()

  return (
    <div style={{ ...UI.col(8), marginTop: 12, padding: 12, background: 'rgba(0,0,0,0.3)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700, color: '#ffd700', marginBottom: 8 }}>
        GANG HIDEOUTS — ${tc.toLocaleString()}
      </div>
      {HIDEOUTS.map(h => {
        const owned = _ownedHideouts.has(h.id)
        const canAfford = tc >= h.buildCost
        const color = h.color
        return (
          <div key={h.id} style={{
            padding: '8px 10px',
            marginBottom: 6,
            borderRadius: 6,
            background: owned ? `${color}15` : 'rgba(255,255,255,0.02)',
            border: `1px solid ${owned ? color + '30' : 'rgba(255,255,255,0.04)'}`,
            opacity: owned ? 1 : (canAfford ? 0.9 : 0.4),
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontWeight: 700, fontSize: 12, color: owned ? color : '#667' }}>{h.name}</span>
              {owned ? (
                <span style={{ fontSize: 9, color, fontWeight: 600 }}>OWNED</span>
              ) : (
                <button
                  onClick={() => { if (buildHideout(h.id)) refresh(n => n + 1) }}
                  disabled={!canAfford}
                  style={{
                    ...UI.button(color),
                    padding: '3px 10px',
                    fontSize: 9,
                    opacity: canAfford ? 1 : 0.3,
                  }}
                >
                  ${h.buildCost}
                </button>
              )}
            </div>
            <div style={{ fontSize: 9, color: '#556', marginBottom: 4 }}>{h.description}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {h.bonuses.map((b, i) => (
                <span key={i} style={{ fontSize: 8, color: owned ? color + 'cc' : '#445', background: `${color}08`, padding: '1px 6px', borderRadius: 3 }}>
                  {b}
                </span>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Turf War system ──────────────────────────────────
let _turfWarActive = false
let _turfWarFaction: FactionId | null = null
let _turfWarProgress = 0
let _turfWarTarget = 100
let _turfWarReward = 0

export function isTurfWarActive() { return _turfWarActive }
export function getTurfWarFaction() { return _turfWarFaction }
export function getTurfWarProgress() { return _turfWarProgress }
export function getTurfWarTarget() { return _turfWarTarget }

export function startTurfWar(faction: FactionId): boolean {
  const cost = 1000
  if (!spendTimeCredit(cost)) return false
  _turfWarActive = true
  _turfWarFaction = faction
  _turfWarProgress = 0
  _turfWarTarget = 100
  _turfWarReward = 500
  return true
}

export function contributeToTurfWar(amount: number): void {
  if (!_turfWarActive) return
  _turfWarProgress = Math.min(_turfWarTarget, _turfWarProgress + amount)
  if (_turfWarProgress >= _turfWarTarget) {
    _turfWarActive = false
    modifyReputation(_turfWarFaction!, 30)
    window.dispatchEvent(new CustomEvent('turf-war-won', {
      detail: { faction: _turfWarFaction, reward: _turfWarReward },
    }))
  }
}
