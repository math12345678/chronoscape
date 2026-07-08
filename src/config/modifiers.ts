// ── Procedural Weapon Modifiers (ported from Cubyz) ──────
// Each modifier tweaks weapon stats procedurally.
// Weapons roll 0-3 random modifiers on acquire.
// Modifiers with conflicting effects cannot appear together.

export interface ModifierData {
  id: ModifierId
  strength: number // 0.0–1.0, determines magnitude
}

export type ModifierId =
  | 'powerful'
  | 'durable'
  | 'light'
  | 'heavy'
  | 'fragile'
  | 'single_use'
  | 'good_at'
  | 'bad_at'
  | 'weak'

export interface ModifierDef {
  id: ModifierId
  name: string
  priority: number          // higher = applied first
  conflicts: ModifierId[]   // cannot coexist with these
  icon: string              // single-character icon
  color: string             // display color
  /** Apply the modifier effect to a stats object. Returns mutated stats. */
  apply: (stats: ModifiableStats, strength: number) => void
  /** Generate tooltip text (colored). */
  tooltip: (strength: number) => string
  /** Combine two strengths of the same modifier (e.g. when stacking). */
  combine: (a: number, b: number) => number
}

export interface ModifiableStats {
  damage: number
  fireRate: number
  range: number
  ammoCost: number
  projectileSpeed: number
  /** single_use flag: when true, consuming the weapon after firing */
  singleUse: boolean
}

const pct = (v: number) => `${Math.round(v * 100)}%`

export const MODIFIERS: Record<ModifierId, ModifierDef> = {
  powerful: {
    id: 'powerful',
    name: 'Powerful',
    priority: 1,
    conflicts: ['weak'],
    icon: 'P',
    color: '#f84a00',
    apply: (s, str) => { s.damage = Math.round(s.damage * (1 + str * 0.5)) },
    tooltip: (s) => `#f84a00**Powerful**#808080 Increases damage by **${pct(s * 0.5)}**`,
    combine: (a, b) => Math.hypot(a, b),
  },
  durable: {
    id: 'durable',
    name: 'Durable',
    priority: 2,
    conflicts: ['fragile'],
    icon: 'D',
    color: '#44aaff',
    apply: (s, str) => { s.range = Math.round(s.range * (1 + str * 0.4)) },
    tooltip: (s) => `#44aaff**Durable**#808080 Increases range by **${pct(s * 0.4)}**`,
    combine: (a, b) => Math.max(a, b),
  },
  light: {
    id: 'light',
    name: 'Light',
    priority: 3,
    conflicts: ['heavy'],
    icon: 'L',
    color: '#44ff88',
    apply: (s, str) => { s.ammoCost = Math.max(1, Math.round(s.ammoCost * (1 - str * 0.4))) },
    tooltip: (s) => `#44ff88**Light**#808080 Reduces ammo cost by **${pct(s * 0.4)}**`,
    combine: (a, b) => Math.min(1, a + b),
  },
  heavy: {
    id: 'heavy',
    name: 'Heavy',
    priority: 3,
    conflicts: ['light'],
    icon: 'H',
    color: '#ff8844',
    apply: (s, str) => {
      s.damage = Math.round(s.damage * (1 + str * 0.3))
      s.ammoCost = Math.round(s.ammoCost * (1 + str * 0.2))
    },
    tooltip: (s) => `#ff8844**Heavy**#808080 +${pct(s * 0.3)} damage, +${pct(s * 0.2)} ammo cost`,
    combine: (a, b) => Math.min(1, a + b),
  },
  fragile: {
    id: 'fragile',
    name: 'Fragile',
    priority: 2,
    conflicts: ['durable'],
    icon: 'F',
    color: '#ff4466',
    apply: (s, str) => { s.range = Math.round(s.range * (1 - str * 0.3)) },
    tooltip: (s) => `#ff4466**Fragile**#808080 Reduces range by **${pct(s * 0.3)}**`,
    combine: (a, b) => Math.min(a, b),
  },
  single_use: {
    id: 'single_use',
    name: 'Single-Use',
    priority: 0,
    conflicts: [],
    icon: '!',
    color: '#ffdd44',
    apply: (s, str) => {
      s.damage = Math.round(s.damage * (1 + str * 2.0))
      s.singleUse = true
    },
    tooltip: (s) => `#ffdd44**Single-Use**#808080 **${pct(s * 2)}** damage but consumed on fire`,
    combine: () => 0, // cannot stack
  },
  good_at: {
    id: 'good_at',
    name: 'Good At',
    priority: 4,
    conflicts: ['bad_at'],
    icon: 'G',
    color: '#66ddff',
    apply: (s, str) => { s.projectileSpeed = Math.round(s.projectileSpeed * (1 + str * 0.35)) },
    tooltip: (s) => `#66ddff**Good At**#808080 +${pct(s * 0.35)} projectile speed`,
    combine: (a, b) => Math.max(a, b),
  },
  bad_at: {
    id: 'bad_at',
    name: 'Bad At',
    priority: 4,
    conflicts: ['good_at'],
    icon: 'B',
    color: '#aa6688',
    apply: (s, str) => { s.projectileSpeed = Math.round(s.projectileSpeed * (1 - str * 0.3)) },
    tooltip: (s) => `#aa6688**Bad At**#808080 -${pct(s * 0.3)} projectile speed`,
    combine: (a, b) => Math.min(a, b),
  },
  weak: {
    id: 'weak',
    name: 'Weak',
    priority: 1,
    conflicts: ['powerful'],
    icon: 'W',
    color: '#886666',
    apply: (s, str) => { s.damage = Math.round(s.damage * (1 - str * 0.3)) },
    tooltip: (s) => `#886666**Weak**#808080 Reduces damage by **${pct(s * 0.3)}**`,
    combine: (a, b) => Math.min(a, b),
  },
}

export const ALL_MODIFIER_IDS: ModifierId[] = Object.keys(MODIFIERS) as ModifierId[]

/** Build a human-readable weapon name from its modifiers. */
export function buildModifiedName(baseName: string, mods: ModifierData[]): string {
  if (mods.length === 0) return baseName
  const prefix = mods
    .slice()
    .sort((a, b) => MODIFIERS[a.id].priority - MODIFIERS[b.id].priority)
    .map(m => MODIFIERS[m.id].name)
    .join(' ')
  return `${prefix} ${baseName}`
}

/** Check if a set of modifiers is valid (no conflicts). */
export function isValidModifierSet(mods: ModifierData[]): boolean {
  for (let i = 0; i < mods.length; i++) {
    for (let j = i + 1; j < mods.length; j++) {
      const def = MODIFIERS[mods[i].id]
      if (def.conflicts.includes(mods[j].id)) return false
    }
  }
  return true
}
