import { useState, useEffect } from 'react'
import { getCraftingRecipes, canAffordRecipe, deductRecipeCost } from '../../systems/CraftingSystem'
import type { CraftingRecipe } from '../../systems/CraftingSystem'
import { getEquippedWeapon } from '../Combat/HostileEnemyManager'
import { getWeaponModifiers, getModifiedWeaponName } from '../../systems/WeaponModifierSystem'
import { ModifierTooltip } from './ModifierTooltip'
import { FButton } from './controls/FButton'
import { FLabel } from './controls/FLabel'
import { FSection } from './controls/FSection'
import { UI } from '../../utils/uiStyles'
import type { WeaponId } from '../../config/combat'

export const CraftingBench = () => {
  const [visible, setVisible] = useState(false)
  const [weapon, setWeapon] = useState<WeaponId | null>(null)
  const [message, setMessage] = useState('')
  const [recipes, setRecipes] = useState<CraftingRecipe[]>([])

  useEffect(() => {
    setRecipes(getCraftingRecipes())
    const handler = () => setVisible(v => !v)
    window.addEventListener('toggle-crafting', handler)
    return () => window.removeEventListener('toggle-crafting', handler)
  }, [])

  useEffect(() => {
    if (!visible) return
    const interval = setInterval(() => {
      setWeapon(getEquippedWeapon())
    }, 300)
    return () => clearInterval(interval)
  }, [visible])

  if (!visible) return null

  const mods = weapon ? getWeaponModifiers(weapon) : []
  const modCount = mods.length

  const handleCraft = (recipe: CraftingRecipe) => {
    if (!weapon || !canAffordRecipe(recipe)) return
    if (!recipe.canApply(weapon)) { setMessage('Not applicable to this weapon.'); return }
    deductRecipeCost(recipe)
    const msg = recipe.apply(weapon)
    setMessage(msg)
    setTimeout(() => setMessage(''), 3000)
  }

  return (
    <div style={{
      position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
      zIndex: 9990,
      ...UI.panel({ border: 'rgba(68,255,204,0.08)', padding: '18px 22px' }),
      width: 380, maxHeight: '80vh', overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <FSection title="Crafting Bench" color="#44ffcc" />
        <FButton onClick={() => setVisible(false)} color="#ff4466" size="sm">Close</FButton>
      </div>

      {/* Current weapon display */}
      <div style={{
        ...UI.panel({ border: 'rgba(255,255,255,0.04)', padding: '8px 12px' }),
        marginBottom: 12,
      }}>
        <FLabel label="Equipped Weapon" value={weapon ? getModifiedWeaponName(weapon) : 'None'} />
        {weapon && modCount > 0 && (
          <div style={{ marginTop: 6 }}>
            <ModifierTooltip weaponId={weapon} mode="card" />
          </div>
        )}
        {weapon && modCount === 0 && (
          <div style={{ fontSize: 9, fontFamily: 'monospace', color: '#667', marginTop: 4 }}>
            No modifiers — apply some below.
          </div>
        )}
      </div>

      {/* Recipes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {recipes.map(r => {
          const canApply = weapon && r.canApply(weapon)
          const canAfford = canAffordRecipe(r)
          const enabled = !!weapon && canApply && canAfford

          return (
            <div key={r.id} style={{
              ...UI.panel({ border: canApply ? 'rgba(68,255,204,0.08)' : 'rgba(255,255,255,0.02)', padding: '10px 12px' }),
              opacity: canApply ? 1 : 0.4,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <FLabel label={r.name} valueColor={canApply ? '#44ffcc' : '#556'} />
                  <div style={{ fontSize: 8, fontFamily: 'monospace', color: '#667', marginTop: 2, lineHeight: 1.4 }}>
                    {r.description}
                  </div>
                  {/* Cost display */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    {(['raw', 'liquid', 'vapour', 'crystal'] as const).map((res, i) => {
                      const cost = r.cost[i]
                      if (cost === 0) return null
                      const colors: Record<string, string> = { raw: '#ff8844', liquid: '#44ffcc', vapour: '#66ddff', crystal: '#aa88ff' }
                      return (
                        <div key={res} style={{
                          display: 'flex', alignItems: 'center', gap: 3,
                          fontSize: 8, fontFamily: 'monospace', color: colors[res],
                        }}>
                          <div style={{ width: 4, height: 4, borderRadius: '50%', background: colors[res] }} />
                          {cost}
                        </div>
                      )
                    })}
                  </div>
                </div>
                <FButton
                  onClick={() => handleCraft(r)}
                  disabled={!enabled}
                  color={enabled ? '#44ffcc' : '#556'}
                  size="sm"
                >
                  Craft
                </FButton>
              </div>
            </div>
          )
        })}
      </div>

      {/* Message */}
      {message && (
        <div style={{
          marginTop: 10, padding: '6px 10px', borderRadius: 6,
          background: 'rgba(68,255,204,0.08)', border: '1px solid rgba(68,255,204,0.15)',
          fontSize: 9, fontFamily: 'monospace', color: '#44ffcc', textAlign: 'center',
          transition: 'opacity 0.3s ease',
        }}>
          {message}
        </div>
      )}

      {/* Close hint */}
      <div style={{ fontSize: 7, color: '#445', marginTop: 12, textAlign: 'center', fontFamily: 'monospace' }}>
        Press C to toggle this panel
      </div>
    </div>
  )
}
