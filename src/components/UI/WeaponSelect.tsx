import { useState, useEffect } from 'react'
import { WEAPONS } from '../../config/combat'
import type { WeaponId } from '../../config/combat'
import { getWeapon, cycleWeaponAbsolute, getWeaponAmmo, getOwnedWeapons, purchaseWeapon } from '../Combat/ProjectileSystem'
import { getWeaponModifiers, getModifiedWeaponName } from '../../systems/WeaponModifierSystem'
import { getTimeCreditBalance } from '../../config/timeCredit'
import { ModifierBadges } from './ModifierTooltip'
import { UI } from '../../utils/uiStyles'

const WEAPON_IDS: WeaponId[] = ['energyPistol', 'energyRifle', 'timeBlaster']

export const WeaponSelect = () => {
  const [weapon, setWeapon] = useState<WeaponId | null>(null)
  const [ammo, setAmmo] = useState(0)
  const [showWheel, setShowWheel] = useState(false)
  const [owned, setOwned] = useState<WeaponId[]>(['energyPistol'])
  const [tc, setTc] = useState(0)

  // Poll state
  useEffect(() => {
    const interval = setInterval(() => {
      const w = getWeapon()
      setWeapon(w)
      setAmmo(getWeaponAmmo())
      setOwned(getOwnedWeapons())
      setTc(getTimeCreditBalance())
    }, 200)
    return () => clearInterval(interval)
  }, [])

  // Tab to show weapon wheel, 1/2/3 to select directly
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!document.pointerLockElement) return

      if (e.key === 'Tab') {
        e.preventDefault()
        setShowWheel(s => !s)
        return
      }

      if (e.key === '1') { e.preventDefault(); cycleWeaponAbsolute(WEAPON_IDS[0]); setShowWheel(false) }
      else if (e.key === '2') { e.preventDefault(); cycleWeaponAbsolute(WEAPON_IDS[1]); setShowWheel(false) }
      else if (e.key === '3') { e.preventDefault(); cycleWeaponAbsolute(WEAPON_IDS[2]); setShowWheel(false) }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  if (!showWheel) return null

  return (
    <div style={{
      position: 'fixed', bottom: 60, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', gap: 8, zIndex: 8000,
      fontFamily: 'monospace',
    }}>
      {WEAPON_IDS.map((wid, i) => {
        const selected = wid === weapon
        const cfg = WEAPONS[wid]
        const isOwned = owned.includes(wid)
        const mods = getWeaponModifiers(wid)
        const name = getModifiedWeaponName(wid)
        const keyLabel = (i + 1).toString()
        const canAfford = tc >= cfg.tcCost

        return (
          <div key={wid} style={{
            ...UI.panel({
              border: selected ? 'rgba(68,255,204,0.2)' : 'rgba(255,255,255,0.04)',
              padding: '8px 10px',
            }),
            width: 140,
            cursor: isOwned ? 'pointer' : 'default',
            opacity: selected ? 1 : (isOwned ? 0.6 : 0.35),
            transition: 'all 0.15s ease',
          }}
            onClick={() => {
              if (isOwned) {
                cycleWeaponAbsolute(wid)
              } else if (canAfford) {
                if (purchaseWeapon(wid)) {
                  setOwned(getOwnedWeapons())
                  setTc(getTimeCreditBalance())
                }
              }
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = isOwned ? '1' : '0.5' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = selected ? '1' : (isOwned ? '0.6' : '0.35') }}
          >
            <div style={{
              fontSize: 8, color: selected ? '#44ffcc' : '#556', marginBottom: 4,
              letterSpacing: '0.05em',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span>[{keyLabel}] {name}</span>
              <span style={{
                fontSize: 7, color: '#44ffcc', background: 'rgba(68,255,204,0.1)',
                padding: '1px 4px', borderRadius: 3,
              }}>
                {isOwned ? ammo : '--'}
              </span>
            </div>
            <div style={{ fontSize: 7, color: '#667', marginBottom: 4 }}>
              DMG {cfg.damage} / RNG {cfg.range} / ROF {cfg.fireRate}/s
            </div>
            {mods.length > 0 && <ModifierBadges weaponId={wid} />}
            {isOwned ? (
              cfg.unlockFormula && (
                <div style={{ fontSize: 6, color: '#44ff88', marginTop: 4 }}>
                  Formula: {cfg.unlockFormula}
                </div>
              )
            ) : (
              <div style={{ fontSize: 7, color: canAfford ? '#44ffcc' : '#ff6644', marginTop: 4, fontWeight: 700 }}>
                {cfg.tcCost > 0 ? `$${cfg.tcCost} TC` : 'Free'}
                {cfg.unlockFormula && !canAfford && (
                  <span style={{ color: '#ff8844', marginLeft: 4, fontWeight: 400 }}>
                    (need {cfg.unlockFormula})
                  </span>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}