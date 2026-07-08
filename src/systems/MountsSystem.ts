// ── Mounts System — rideable creatures with speed bonuses and abilities ──

import { useStore } from '../store'

export type MountId =
  | 'timeStag' | 'voidWolf' | 'crystalSerpent'
  | 'dawnSteed' | 'echoPanther' | 'omegaCharger'

export interface MountDef {
  id: MountId
  name: string
  description: string
  icon: string
  color: string
  baseSpeed: number
  speedBonus: number // percent
  jumpBonus: number // percent
  abilityName: string
  abilityDesc: string
  abilityCooldown: number // seconds
  unlockCost: { raw?: number; liquid?: number; crystal?: number; renown?: number }
  evolveAt: number // distance traveled to evolve
  evolveName: string
  evolveSpeedBonus: number
}

export const ALL_MOUNTS: Record<MountId, MountDef> = {
  timeStag: {
    id: 'timeStag', name: 'Time Stag', icon: '🦌', color: '#44ffcc',
    description: 'A majestic stag with antlers of pure temporal energy.',
    baseSpeed: 8, speedBonus: 10, jumpBonus: 10,
    abilityName: 'Temporal Leap', abilityDesc: 'Teleport forward 10 units',
    abilityCooldown: 15,
    unlockCost: { raw: 200, liquid: 50 },
    evolveAt: 1000, evolveName: 'Eternal Stag', evolveSpeedBonus: 15,
  },
  voidWolf: {
    id: 'voidWolf', name: 'Void Wolf', icon: '🐺', color: '#aa44ff',
    description: 'A wolf from the void between moments. Deadly fast.',
    baseSpeed: 10, speedBonus: 20, jumpBonus: 5,
    abilityName: 'Void Rush', abilityDesc: 'Dash forward at 2x speed for 3s',
    abilityCooldown: 20,
    unlockCost: { raw: 350, liquid: 80, crystal: 15 },
    evolveAt: 1500, evolveName: 'Void Alpha', evolveSpeedBonus: 25,
  },
  crystalSerpent: {
    id: 'crystalSerpent', name: 'Crystal Serpent', icon: '🐍', color: '#aa88ff',
    description: 'A serpent that glides through crystallized time.',
    baseSpeed: 7, speedBonus: 5, jumpBonus: 30,
    abilityName: 'Crystal Glide', abilityDesc: 'Float for 5 seconds',
    abilityCooldown: 25,
    unlockCost: { raw: 500, liquid: 150, crystal: 30, renown: 5 },
    evolveAt: 2000, evolveName: 'Crystal Wyrm', evolveSpeedBonus: 10,
  },
  dawnSteed: {
    id: 'dawnSteed', name: 'Dawn Steed', icon: '🐴', color: '#ff8844',
    description: 'A horse born from the first sunrise of the timeline.',
    baseSpeed: 9, speedBonus: 15, jumpBonus: 15,
    abilityName: 'Solar Burst', abilityDesc: '+50% speed for 5s',
    abilityCooldown: 18,
    unlockCost: { raw: 400, liquid: 100, crystal: 20 },
    evolveAt: 1800, evolveName: 'Solar Charger', evolveSpeedBonus: 20,
  },
  echoPanther: {
    id: 'echoPanther', name: 'Echo Panther', icon: '🐆', color: '#ff66aa',
    description: 'A panther that phases between dimensions.',
    baseSpeed: 11, speedBonus: 25, jumpBonus: 10,
    abilityName: 'Phase Shift', abilityDesc: 'Become intangible for 2s',
    abilityCooldown: 30,
    unlockCost: { raw: 600, liquid: 200, crystal: 40, renown: 10 },
    evolveAt: 2500, evolveName: 'Phase Predator', evolveSpeedBonus: 30,
  },
  omegaCharger: {
    id: 'omegaCharger', name: 'Omega Charger', icon: '⚡', color: '#ff0044',
    description: 'The ultimate mount. A creature of pure speed.',
    baseSpeed: 15, speedBonus: 40, jumpBonus: 25,
    abilityName: 'Omega Rush', abilityDesc: '3x speed for 4s + stun nearby enemies',
    abilityCooldown: 40,
    unlockCost: { raw: 1000, liquid: 500, crystal: 100, renown: 25 },
    evolveAt: 5000, evolveName: 'Omega Prime', evolveSpeedBonus: 50,
  },
}

// ── State ──────────────────────────────────────────────────

export interface MountInstance {
  mountId: MountId
  owned: boolean
  active: boolean
  distanceTraveled: number
  evolved: boolean
  lastAbilityTime: number
}

let _mounts: Partial<Record<MountId, MountInstance>> = {}
let _activeMount: MountId | null = null
let _currentSpeed: number = 0

export function getMounts(): Partial<Record<MountId, MountInstance>> {
  return { ..._mounts }
}

export function getActiveMount(): MountId | null {
  return _activeMount
}

export function getActiveMountDef(): MountDef | null {
  if (!_activeMount) return null
  return ALL_MOUNTS[_activeMount] ?? null
}

export function getCurrentSpeed(): number {
  return _currentSpeed
}

/** Unlock a mount */
export function unlockMount(id: MountId): boolean {
  const def = ALL_MOUNTS[id]
  if (!def) return false
  if (_mounts[id]) return false

  const state = useStore.getState()
  const inv = state.inventory
  if (def.unlockCost.raw && inv.raw < def.unlockCost.raw) return false
  if (def.unlockCost.liquid && inv.liquid < def.unlockCost.liquid) return false
  if (def.unlockCost.crystal && inv.crystal < def.unlockCost.crystal) return false
  if (def.unlockCost.renown && inv.renown < def.unlockCost.renown) return false

  useStore.setState((s) => ({
    inventory: {
      ...s.inventory,
      raw: s.inventory.raw - (def.unlockCost.raw ?? 0),
      liquid: s.inventory.liquid - (def.unlockCost.liquid ?? 0),
      crystal: s.inventory.crystal - (def.unlockCost.crystal ?? 0),
      renown: s.inventory.renown - (def.unlockCost.renown ?? 0),
    },
  }))

  _mounts[id] = {
    mountId: id,
    owned: true,
    active: false,
    distanceTraveled: 0,
    evolved: false,
    lastAbilityTime: 0,
  }

  return true
}

/** Mount / summon */
export function mount(id: MountId): boolean {
  if (!_mounts[id]) return false
  _activeMount = id
  _mounts[id]!.active = true
  return true
}

/** Dismount */
export function dismount(): void {
  if (_activeMount && _mounts[_activeMount]) {
    _mounts[_activeMount]!.active = false
  }
  _activeMount = null
  _currentSpeed = 0
}

/** Record distance traveled on mount */
export function recordMountDistance(dist: number): void {
  if (!_activeMount || !_mounts[_activeMount]) return
  const inst = _mounts[_activeMount]!
  inst.distanceTraveled += dist
  _currentSpeed = dist

  // Check evolution
  const def = ALL_MOUNTS[_activeMount]
  if (def && inst.distanceTraveled >= def.evolveAt && !inst.evolved) {
    inst.evolved = true
  }
}

/** Use mount ability */
export function useMountAbility(): boolean {
  if (!_activeMount || !_mounts[_activeMount]) return false
  const def = ALL_MOUNTS[_activeMount]
  const inst = _mounts[_activeMount]
  if (!def || !inst) return false

  const elapsed = (Date.now() - inst.lastAbilityTime) / 1000
  if (elapsed < def.abilityCooldown) return false

  inst.lastAbilityTime = Date.now()
  return true
}

/** Check if mount ability is ready */
export function isMountAbilityReady(): boolean {
  if (!_activeMount || !_mounts[_activeMount]) return false
  const def = ALL_MOUNTS[_activeMount]
  const inst = _mounts[_activeMount]
  if (!def || !inst) return false
  const elapsed = (Date.now() - inst.lastAbilityTime) / 1000
  return elapsed >= def.abilityCooldown
}

/** Get total speed bonus from active mount */
export function getMountSpeedBonus(): number {
  if (!_activeMount || !_mounts[_activeMount]) return 0
  const def = ALL_MOUNTS[_activeMount]
  const inst = _mounts[_activeMount]
  if (!def || !inst) return 0
  let bonus = def.speedBonus
  if (inst.evolved) bonus += def.evolveSpeedBonus
  return bonus
}

export function getMountJumpBonus(): number {
  if (!_activeMount || !_mounts[_activeMount]) return 0
  const def = ALL_MOUNTS[_activeMount]
  return def?.jumpBonus ?? 0
}

/** Serialize */
export function serializeMounts(): Partial<Record<MountId, MountInstance>> {
  return { ..._mounts }
}

export function loadMounts(data: Partial<Record<MountId, MountInstance>>): void {
  _mounts = { ...data }
}
