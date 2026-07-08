// ── Weapon Modifier System ──────────────────────────────
// Manages procedural modifiers on weapons (ported from Cubyz).

import type { WeaponId } from '../config/combat'
import { WEAPONS } from '../config/combat'
import {
  MODIFIERS, ALL_MODIFIER_IDS, isValidModifierSet,
  buildModifiedName,
} from '../config/modifiers'
import type { ModifierData, ModifiableStats, ModifierId } from '../config/modifiers'

// ── Module state ──────────────────────────────────────
const _weaponModifiers = new Map<WeaponId, ModifierData[]>()

/** Get modifiers for a weapon. */
export function getWeaponModifiers(weaponId: WeaponId): ModifierData[] {
  return _weaponModifiers.get(weaponId) ?? []
}

/** Set modifiers for a weapon (e.g. on craft/drop). */
export function setWeaponModifiers(weaponId: WeaponId, mods: ModifierData[]): void {
  if (!isValidModifierSet(mods)) {
    console.warn(`Invalid modifier set for ${weaponId}, filtering conflicts`)
    mods = resolveConflicts(mods)
  }
  _weaponModifiers.set(weaponId, mods)
}

/** Roll random modifiers for a weapon. 0–3 modifiers. */
export function rollWeaponModifiers(weaponId: WeaponId): ModifierData[] {
  const count = weightedModifierCount()
  if (count === 0) {
    _weaponModifiers.set(weaponId, [])
    return []
  }

  const pool = [...ALL_MODIFIER_IDS]
  const chosen: ModifierData[] = []

  for (let i = 0; i < count && pool.length > 0; i++) {
    // Pick random modifier from remaining pool
    const idx = Math.floor(Math.random() * pool.length)
    const id = pool[idx]

    // Remove it and its conflicts from pool
    const def = MODIFIERS[id]
    const toRemove = new Set([id, ...def.conflicts])
    for (let j = pool.length - 1; j >= 0; j--) {
      if (toRemove.has(pool[j])) pool.splice(j, 1)
    }

    const strength = 0.3 + Math.random() * 0.7
    chosen.push({ id, strength })
  }

  _weaponModifiers.set(weaponId, chosen)
  return chosen
}

/** Compute effective weapon stats after applying all modifiers. */
export function getEffectiveWeaponStats(weaponId: WeaponId): ModifiableStats {
  const base = WEAPONS[weaponId]
  const stats: ModifiableStats = {
    damage: base.damage,
    fireRate: base.fireRate,
    range: base.range,
    ammoCost: base.ammoCost,
    projectileSpeed: base.projectileSpeed,
    singleUse: false,
  }

  const mods = _weaponModifiers.get(weaponId) ?? []
  const sorted = [...mods].sort((a, b) => MODIFIERS[a.id].priority - MODIFIERS[b.id].priority)
  for (const m of sorted) {
    MODIFIERS[m.id].apply(stats, m.strength)
  }

  return stats
}

/** Get a display name for the weapon including modifiers. */
export function getModifiedWeaponName(weaponId: WeaponId): string {
  const mods = _weaponModifiers.get(weaponId) ?? []
  return buildModifiedName(WEAPONS[weaponId].name, mods)
}

/** Check if a weapon has the single_use modifier. */
export function isSingleUse(weaponId: WeaponId): boolean {
  const mods = _weaponModifiers.get(weaponId) ?? []
  return mods.some(m => m.id === 'single_use')
}

/** Regenerate modifiers for all weapons (e.g. on prestige reset). */
export function regenerateAllWeaponModifiers(): void {
  const allIds = Object.keys(WEAPONS) as WeaponId[]
  for (const id of allIds) {
    rollWeaponModifiers(id)
  }
}

/** Initialize all weapons with random modifiers on game start. */
export function initWeaponModifiers(): void {
  // Only init if none have been set
  const allIds = Object.keys(WEAPONS) as WeaponId[]
  let anySet = false
  for (const id of allIds) {
    if (_weaponModifiers.has(id)) { anySet = true; break }
  }
  if (!anySet) {
    regenerateAllWeaponModifiers()
  }
}

// ── Helpers ───────────────────────────────────────────

function weightedModifierCount(): number {
  const roll = Math.random()
  if (roll < 0.35) return 0  // 35% no modifiers
  if (roll < 0.65) return 1  // 30% one modifier
  if (roll < 0.88) return 2  // 23% two modifiers
  return 3                    // 12% three modifiers
}

function resolveConflicts(mods: ModifierData[]): ModifierData[] {
  const result: ModifierData[] = []
  const used = new Set<ModifierId>()
  const sorted = [...mods].sort((a, b) => MODIFIERS[a.id].priority - MODIFIERS[b.id].priority)
  for (const m of sorted) {
    const def = MODIFIERS[m.id]
    if (used.has(m.id)) continue
    let hasConflict = false
    for (const c of def.conflicts) {
      if (used.has(c)) { hasConflict = true; break }
    }
    if (!hasConflict) {
      result.push(m)
      used.add(m.id)
    }
  }
  return result
}
