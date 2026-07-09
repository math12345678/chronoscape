// ── Chrono Combat 2.0 — Active Skills + Status Effects ──
// Adds active abilities with cooldowns, elemental damage types,
// and status effects that apply to enemies and the player.

import { getEnemyMeshes } from '../components/Combat/HostileEnemyManager'
import { damagePlayer, healPlayer, getPlayerHealth } from '../components/Combat/HealthTracker'
import { useStore } from '../store'
import * as THREE from 'three'

// ── Elemental Damage Types ──────────────────────────────

export type DamageType = 'chrono' | 'void' | 'crystal' | 'temporal' | 'physical'

const DAMAGE_MULTIPLIERS: Record<DamageType, Record<string, number>> = {
  chrono: { wraith: 1.5, voidWraith: 0.8, timeCrystalGolem: 1.2, phaseShifter: 0.9, temporalSentinel: 1.0, chronoBehemoth: 1.0, timeTyrant: 0.8 },
  void: { wraith: 0.5, voidWraith: 2.0, timeCrystalGolem: 1.0, phaseShifter: 1.5, temporalSentinel: 0.7, chronoBehemoth: 1.2, timeTyrant: 0.9 },
  crystal: { wraith: 1.0, voidWraith: 0.7, timeCrystalGolem: 0.3, phaseShifter: 1.2, temporalSentinel: 1.5, chronoBehemoth: 1.5, timeTyrant: 1.0 },
  temporal: { wraith: 1.2, voidWraith: 1.3, timeCrystalGolem: 1.5, phaseShifter: 0.5, temporalSentinel: 1.2, chronoBehemoth: 0.8, timeTyrant: 1.5 },
  physical: { wraith: 1.0, voidWraith: 1.0, timeCrystalGolem: 1.0, phaseShifter: 1.0, temporalSentinel: 1.0, chronoBehemoth: 1.0, timeTyrant: 1.0 },
}

// ── Status Effects ──────────────────────────────────────

export type StatusEffectType = 'burn' | 'freeze' | 'stun' | 'slow' | 'poison' | 'void' | 'regen' | 'shield'

export interface StatusEffect {
  id: string
  type: StatusEffectType
  name: string
  icon: string
  color: string
  damagePerTick: number
  duration: number // seconds
  tickInterval: number
  slowAmount: number // 0-1 fraction
  stacks: boolean
  maxStacks: number
  remainingDuration: number
  tickTimer: number
  sourceId: string
}

const STATUS_DEFS: Record<StatusEffectType, Omit<StatusEffect, 'id' | 'remainingDuration' | 'tickTimer' | 'sourceId'>> = {
  burn: { type: 'burn', name: 'Burn', icon: '🔥', color: '#ff4400', damagePerTick: 5, duration: 6, tickInterval: 1, slowAmount: 0, stacks: true, maxStacks: 5 },
  freeze: { type: 'freeze', name: 'Freeze', icon: '❄️', color: '#44aaff', damagePerTick: 0, duration: 3, tickInterval: 1, slowAmount: 0.8, stacks: false, maxStacks: 1 },
  stun: { type: 'stun', name: 'Stun', icon: '⚡', color: '#ffd700', damagePerTick: 0, duration: 2, tickInterval: 1, slowAmount: 1.0, stacks: false, maxStacks: 1 },
  slow: { type: 'slow', name: 'Slow', icon: '🐌', color: '#88aaff', damagePerTick: 0, duration: 5, tickInterval: 1, slowAmount: 0.5, stacks: true, maxStacks: 3 },
  poison: { type: 'poison', name: 'Poison', icon: '☠️', color: '#88ff44', damagePerTick: 8, duration: 8, tickInterval: 0.5, slowAmount: 0, stacks: true, maxStacks: 10 },
  void: { type: 'void', name: 'Void Mark', icon: '🌀', color: '#8800ff', damagePerTick: 0, duration: 10, tickInterval: 1, slowAmount: 0, stacks: false, maxStacks: 1 },
  regen: { type: 'regen', name: 'Regen', icon: '💚', color: '#44ff88', damagePerTick: -3, duration: 8, tickInterval: 0.5, slowAmount: 0, stacks: true, maxStacks: 5 },
  shield: { type: 'shield', name: 'Shield', icon: '🛡️', color: '#44aaff', damagePerTick: 0, duration: 5, tickInterval: 1, slowAmount: 0, stacks: false, maxStacks: 1 },
}

// ── Active Skills ───────────────────────────────────────

export interface CombatSkill {
  id: string
  name: string
  description: string
  icon: string
  color: string
  damageType: DamageType
  baseDamage: number
  cooldown: number // seconds
  currentCooldown: number
  resourceCost: { raw?: number; liquid?: number; crystal?: number }
  statusEffect: StatusEffectType | null
  statusDuration: number
  aoe: boolean
  aoeRadius: number
  unlocksAtLevel: number
  slot: number // 1-4
}

const SKILLS: CombatSkill[] = [
  { id: 'skill_time_surge', name: 'Time Surge', description: 'Unleash a wave of temporal energy, damaging and slowing nearby enemies.', icon: '🌊', color: '#44ffcc', damageType: 'temporal', baseDamage: 30, cooldown: 4, currentCooldown: 0, resourceCost: { liquid: 10 }, statusEffect: 'slow', statusDuration: 4, aoe: true, aoeRadius: 8, unlocksAtLevel: 0, slot: 1 },
  { id: 'skill_void_prison', name: 'Void Prison', description: 'Trap an enemy in a void sphere, stunning them and dealing void damage.', icon: '🔮', color: '#8800ff', damageType: 'void', baseDamage: 45, cooldown: 8, currentCooldown: 0, resourceCost: { crystal: 5 }, statusEffect: 'stun', statusDuration: 2.5, aoe: false, aoeRadius: 0, unlocksAtLevel: 0, slot: 2 },
  { id: 'skill_crystal_shield', name: 'Crystal Shield', description: 'Surround yourself with crystal fragments that absorb damage.', icon: '🛡️', color: '#44aaff', damageType: 'crystal', baseDamage: 0, cooldown: 12, currentCooldown: 0, resourceCost: { crystal: 10, liquid: 20 }, statusEffect: 'shield', statusDuration: 5, aoe: false, aoeRadius: 0, unlocksAtLevel: 0, slot: 3 },
  { id: 'skill_chrono_nova', name: 'Chrono Nova', description: 'Detonate chrono energy in a massive blast. High damage, long cooldown.', icon: '💥', color: '#ffd700', damageType: 'chrono', baseDamage: 80, cooldown: 15, currentCooldown: 0, resourceCost: { liquid: 30, crystal: 15 }, statusEffect: 'burn', statusDuration: 6, aoe: true, aoeRadius: 12, unlocksAtLevel: 0, slot: 4 },
  { id: 'skill_temporal_heal', name: 'Temporal Heal', description: 'Rewind your body to a healthier state, healing over time.', icon: '💚', color: '#44ff88', damageType: 'temporal', baseDamage: 0, cooldown: 10, currentCooldown: 0, resourceCost: { liquid: 15 }, statusEffect: 'regen', statusDuration: 6, aoe: false, aoeRadius: 0, unlocksAtLevel: 0, slot: 0 },
  { id: 'skill_void_step', name: 'Void Step', description: 'Teleport a short distance, leaving a void explosion at your origin.', icon: '👻', color: '#aa44ff', damageType: 'void', baseDamage: 25, cooldown: 6, currentCooldown: 0, resourceCost: { crystal: 8 }, statusEffect: 'slow', statusDuration: 3, aoe: true, aoeRadius: 4, unlocksAtLevel: 0, slot: 0 },
  { id: 'skill_time_freeze', name: 'Time Freeze', description: 'Briefly freeze all enemies in place. They cannot act but take reduced damage.', icon: '⏸️', color: '#44ffff', damageType: 'temporal', baseDamage: 0, cooldown: 20, currentCooldown: 0, resourceCost: { crystal: 20, liquid: 30 }, statusEffect: 'freeze', statusDuration: 3, aoe: true, aoeRadius: 25, unlocksAtLevel: 0, slot: 0 },
  { id: 'skill_rewind', name: 'Rewind', description: 'Reverse time for yourself, instantly recovering 50% of recent damage.', icon: '⏪', color: '#ff4488', damageType: 'chrono', baseDamage: 0, cooldown: 30, currentCooldown: 0, resourceCost: { liquid: 50, crystal: 25 }, statusEffect: null, statusDuration: 0, aoe: false, aoeRadius: 0, unlocksAtLevel: 0, slot: 0 },
]

// ── State ─────────────────────────────────────────────────

let _activeStatusEffects: Map<string, StatusEffect[]> = new Map() // entityId -> effects
let _playerStatusEffects: StatusEffect[] = []
let _playerSkills: CombatSkill[] = [...SKILLS]
let _skillSlotMapping: number[] = [0, 1, 2, 3, 4] // maps skill slot to skill index
let _rewindHealthHistory: { health: number; time: number }[] = []
let _totalDamageDealt = 0

export function getSkills(): CombatSkill[] { return _playerSkills.map(s => ({ ...s })) }
export function getActivePlayerEffects(): StatusEffect[] { return _playerStatusEffects.map(e => ({ ...e })) }
export function getTotalSkillDamage(): number { return _totalDamageDealt }
export function getEnemyStatusEffects(): Map<string, StatusEffect[]> { return new Map(_activeStatusEffects) }

/** Get the damage multiplier against a specific enemy type */
export function getDamageTypeMultiplier(damageType: DamageType, enemyType: string): number {
  return DAMAGE_MULTIPLIERS[damageType]?.[enemyType] ?? 1.0
}

/** Apply a status effect to an enemy */
export function applyStatusToEnemy(enemyId: string, effectType: StatusEffectType, duration: number, sourceId: string): void {
  const def = STATUS_DEFS[effectType]
  if (!def) return

  const existing = _activeStatusEffects.get(enemyId) ?? []
  // Check for stacking
  if (def.stacks) {
    const same = existing.find(e => e.type === effectType && e.sourceId === sourceId)
    if (same) {
      if (same.maxStacks > 1) {
        // Increase stack count (simplified: refresh + extend)
        same.remainingDuration = Math.max(same.remainingDuration, duration)
      }
      return
    }
  } else {
    // Non-stacking: replace
    const idx = existing.findIndex(e => e.type === effectType)
    if (idx >= 0) existing.splice(idx, 1)
  }

  existing.push({
    id: `status_${enemyId}_${effectType}_${Date.now()}`,
    type: effectType,
    name: def.name,
    icon: def.icon,
    color: def.color,
    damagePerTick: def.damagePerTick,
    duration,
    tickInterval: def.tickInterval,
    slowAmount: def.slowAmount,
    stacks: def.stacks,
    maxStacks: def.maxStacks,
    remainingDuration: duration,
    tickTimer: 0,
    sourceId,
  })

  _activeStatusEffects.set(enemyId, existing)
}

/** Apply a status effect to the player */
export function applyStatusToPlayer(effectType: StatusEffectType, duration: number, sourceId: string): void {
  const def = STATUS_DEFS[effectType]
  if (!def) return

  // Same logic as enemy but for player
  if (def.stacks) {
    const same = _playerStatusEffects.find(e => e.type === effectType && e.sourceId === sourceId)
    if (same) {
      same.remainingDuration = Math.max(same.remainingDuration, duration)
      return
    }
  } else {
    const idx = _playerStatusEffects.findIndex(e => e.type === effectType)
    if (idx >= 0) _playerStatusEffects.splice(idx, 1)
  }

  _playerStatusEffects.push({
    id: `status_player_${effectType}_${Date.now()}`,
    type: effectType,
    name: def.name,
    icon: def.icon,
    color: def.color,
    damagePerTick: def.damagePerTick,
    duration,
    tickInterval: def.tickInterval,
    slowAmount: def.slowAmount,
    stacks: def.stacks,
    maxStacks: def.maxStacks,
    remainingDuration: duration,
    tickTimer: 0,
    sourceId,
  })
}

/** Use a combat skill by slot (1-4 or 0 for utility) */
export function useSkill(slot: number): { damage: number; targets: string[]; statusApplied: string | null } | null {
  const skillIdx = _skillSlotMapping[slot]
  if (skillIdx === undefined) return null
  const skill = _playerSkills[skillIdx]
  if (!skill) return null
  if (skill.currentCooldown > 0) return null

  // Check resource cost
  const inv = useStore.getState().inventory
  if ((skill.resourceCost.raw && inv.raw < skill.resourceCost.raw) ||
      (skill.resourceCost.liquid && inv.liquid < skill.resourceCost.liquid) ||
      (skill.resourceCost.crystal && inv.crystal < skill.resourceCost.crystal)) return null

  // Deduct cost
  useStore.setState(s => ({
    inventory: {
      ...s.inventory,
      raw: Math.max(0, s.inventory.raw - (skill.resourceCost.raw ?? 0)),
      liquid: Math.max(0, s.inventory.liquid - (skill.resourceCost.liquid ?? 0)),
      crystal: Math.max(0, s.inventory.crystal - (skill.resourceCost.crystal ?? 0)),
    },
  }))

  // Set cooldown
  skill.currentCooldown = skill.cooldown

  // Handle special skills
  if (skill.id === 'skill_crystal_shield') {
    applyStatusToPlayer('shield', 5, 'skill_crystal_shield')
    return { damage: 0, targets: [], statusApplied: 'shield' }
  }
  if (skill.id === 'skill_temporal_heal') {
    applyStatusToPlayer('regen', 6, 'skill_temporal_heal')
    return { damage: 0, targets: [], statusApplied: 'regen' }
  }
  if (skill.id === 'skill_rewind') {
    // Restore health to 50% of what it was 5 seconds ago
    const now = Date.now()
    const recent = _rewindHealthHistory.filter(h => now - h.time < 5000)
    if (recent.length > 0) {
      // Apply via heal
      for (let i = 0; i < 5; i++) healPlayer()
    }
    return { damage: 0, targets: [], statusApplied: null }
  }

  // Apply damage to enemies in range
  const playerPos = (window as any).__PLAYER_POSITION ?? new THREE.Vector3(0, 0, 0)
  const meshes = getEnemyMeshes()
  const targets: string[] = []
  let totalDamage = 0

  for (const mesh of meshes) {
    const dist = playerPos.distanceTo(mesh.position)
    if (skill.aoe && dist > skill.aoeRadius) continue
    if (!skill.aoe && dist > 5) continue // single target threshold

    // Get enemy type from mesh userData
    const enemyType = (mesh as any).userData?.enemyType ?? 'wraith'
    const typeMult = getDamageTypeMultiplier(skill.damageType, enemyType)
    const damage = Math.floor(skill.baseDamage * typeMult)

    // Apply via custom event (HostileEnemyManager handles actual damage)
    try {
      window.dispatchEvent(new CustomEvent('skill-damage', {
        detail: { meshId: mesh.uuid, damage, skillId: skill.id, statusType: skill.statusEffect, statusDuration: skill.statusDuration },
      }))
    } catch {}

    totalDamage += damage
    _totalDamageDealt += damage
    targets.push(mesh.uuid)

    // Apply status effect
    if (skill.statusEffect) {
      applyStatusToEnemy(mesh.uuid, skill.statusEffect, skill.statusDuration, skill.id)
    }
  }

  // Dispatch for visual effects
  try {
    window.dispatchEvent(new CustomEvent('skill-used', {
      detail: { skillId: skill.id, position: playerPos, targets, aoe: skill.aoe, radius: skill.aoeRadius, color: skill.color },
    }))
  } catch {}

  return { damage: totalDamage, targets, statusApplied: skill.statusEffect }
}

/** Tick all cooldowns and status effects */
export function tickCombatSkills(dt: number): void {
  // Tick cooldowns
  for (const skill of _playerSkills) {
    if (skill.currentCooldown > 0) {
      skill.currentCooldown = Math.max(0, skill.currentCooldown - dt)
    }
  }

  // Track health history for Rewind
  _rewindHealthHistory.push({ health: getPlayerHealth(), time: Date.now() })
  if (_rewindHealthHistory.length > 100) _rewindHealthHistory.splice(0, _rewindHealthHistory.length - 100)

  // Tick player status effects
  for (let i = _playerStatusEffects.length - 1; i >= 0; i--) {
    const e = _playerStatusEffects[i]
    e.tickTimer += dt
    e.remainingDuration -= dt

    // Apply tick damage/healing
    if (e.tickTimer >= e.tickInterval) {
      e.tickTimer = 0
      if (e.damagePerTick > 0) {
        damagePlayer(e.damagePerTick)
      } else if (e.damagePerTick < 0) {
        // Healing
        healPlayer()
      }
    }

    if (e.remainingDuration <= 0) {
      _playerStatusEffects.splice(i, 1)
    }
  }

  // Tick enemy status effects (simplified — actual damage handled by combat system)
  for (const [enemyId, effects] of _activeStatusEffects) {
    for (let i = effects.length - 1; i >= 0; i--) {
      const e = effects[i]
      e.tickTimer += dt
      e.remainingDuration -= dt

      if (e.tickTimer >= e.tickInterval && e.damagePerTick > 0) {
        e.tickTimer = 0
        // Apply damage via custom event or damageEnemy
        try {
          window.dispatchEvent(new CustomEvent('status-tick-damage', {
            detail: { enemyId: enemyId.split('_').pop(), damage: e.damagePerTick, effectType: e.type },
          }))
        } catch {}
      }

      if (e.remainingDuration <= 0) {
        effects.splice(i, 1)
      }
    }
    if (effects.length === 0) _activeStatusEffects.delete(enemyId)
  }
}

/** Get player move speed modifier from status effects */
export function getSpeedModifier(): number {
  let slow = 0
  for (const e of _playerStatusEffects) {
    slow = Math.max(slow, e.slowAmount)
  }
  return 1 - slow
}

/** Check if player is stunned */
export function isStunned(): boolean {
  return _playerStatusEffects.some(e => e.type === 'stun')
}

export function serializeCombatSkills(): { skills: CombatSkill[]; slotMap: number[] } {
  return {
    skills: _playerSkills.map(s => ({ ...s })),
    slotMap: [..._skillSlotMapping],
  }
}

export function loadCombatSkills(data: { skills: CombatSkill[]; slotMap: number[] }): void {
  if (data.skills) _playerSkills = data.skills.map(s => ({ ...s }))
  if (data.slotMap) _skillSlotMapping = [...data.slotMap]
}
