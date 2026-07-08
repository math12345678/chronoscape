// ── Evolution Integration Layer — Bridges evolution systems to actual gameplay ──
// Reads generated content from EvolvingContentEngine, applies adaptive difficulty
// modifiers to combat, feeds infinite progression bonuses into player stats,
// and coordinates world-state changes when evolution epochs trigger.

import {
  getAllGeneratedEnemies, getActiveEvents, getDiscoveredResources,
  getAvailableEquipment,
} from './EvolvingContentEngine'
import type { GeneratedEquipment } from './EvolvingContentEngine'
import {
  getEnemyDamageMultiplier, getEnemyHealthMultiplier, getSpawnRateMultiplier,
  hasModifier, getModifierMagnitude, getEvolutionStage, getDifficultyScore,
} from './AdaptiveDifficultySystem'
import {
  getTotalDamageBonus, getTotalHarvestBonus, getTotalSpeedBonus,
  getTotalDefenseBonus, getTotalRegenBonus, getTotalLootBonus,
} from './InfiniteProgression'
import type { EnemyType } from '../config/combat'

// ── Combat Enemy Registry ───────────────────────────────

interface RegisteredEvolvedEnemy {
  id: string
  name: string
  type: EnemyType
  baseType: EnemyType
  health: number
  damage: number
  speed: number
  scale: number
  color: string
  behavior: string
  specialAbility: string
  tier: number
}

let _evolvedEnemyRegistry: RegisteredEvolvedEnemy[] = []
let _lastRegistrySync = 0

/** Sync the evolved enemy registry with the content engine */
function syncEnemyRegistry(): void {
  const generated = getAllGeneratedEnemies()
  const existingIds = new Set(_evolvedEnemyRegistry.map(e => e.id))

  for (const gen of generated) {
    if (existingIds.has(gen.id)) continue
    // Map GeneratedEnemy to a combat-ready registration
    const baseType: EnemyType = gen.tier <= 1 ? 'wraith' :
      gen.tier <= 3 ? 'voidWraith' :
      gen.tier <= 5 ? 'timeCrystalGolem' :
      gen.tier <= 8 ? 'phaseShifter' :
      gen.tier <= 12 ? 'temporalSentinel' :
      'chronoBehemoth'

    _evolvedEnemyRegistry.push({
      id: gen.id,
      name: gen.name,
      type: baseType,
      baseType,
      health: gen.baseHP,
      damage: gen.baseDamage,
      speed: gen.speed,
      scale: gen.scale,
      color: gen.color,
      behavior: gen.behavior,
      specialAbility: gen.specialAbility,
      tier: gen.tier,
    })
  }
  _lastRegistrySync = Date.now()
}

/** Get a random evolved enemy appropriate for the current difficulty */
export function getEvolvedEnemyForSpawn(): RegisteredEvolvedEnemy | null {
  if (Date.now() - _lastRegistrySync > 10000) syncEnemyRegistry()
  if (_evolvedEnemyRegistry.length === 0) return null

  const stage = getEvolutionStage()
  const valid = _evolvedEnemyRegistry.filter(e => e.tier <= stage + 2)
  if (valid.length === 0) return _evolvedEnemyRegistry[0]
  return valid[Math.floor(Math.random() * valid.length)]
}

/** Get evolved enemy stats scaled by current difficulty */
export function getScaledEvolvedStats(base: { health: number; damage: number; speed: number }): {
  health: number; damage: number; speed: number
} {
  const stage = getEvolutionStage()
  return {
    health: Math.floor(base.health * (1 + stage * 0.3)),
    damage: Math.floor(base.damage * (1 + stage * 0.25)),
    speed: base.speed * (1 + stage * 0.1),
  }
}

/** Check if an evolved enemy should spawn instead of a normal one */
export function shouldSpawnEvolvedEnemy(): boolean {
  const stage = getEvolutionStage()
  const score = getDifficultyScore()
  // Higher stages = more evolved enemies
  return Math.random() < Math.min(0.7, stage * 0.1 + score / 2000)
}

// ── Modifier-Aware Enemy Stats ──────────────────────────

/** Get the effective enemy config with all adaptive difficulty modifiers applied */
export function getEffectiveEnemyStats(): {
  damageMult: number
  healthMult: number
  spawnRateMult: number
  lifeSteal: number
  berserkThreshold: number
  hasShields: boolean
  swarmCount: number
  ambushChance: number
} {
  return {
    damageMult: getEnemyDamageMultiplier(),
    healthMult: getEnemyHealthMultiplier(),
    spawnRateMult: getSpawnRateMultiplier(),
    lifeSteal: hasModifier('mod_vampiric') ? getModifierMagnitude('mod_vampiric') : 0,
    berserkThreshold: hasModifier('mod_berserk') ? getModifierMagnitude('mod_berserk') : 0,
    hasShields: hasModifier('mod_damage_shield'),
    swarmCount: hasModifier('mod_swarm_tactics') ? Math.ceil(getModifierMagnitude('mod_swarm_tactics')) : 1,
    ambushChance: hasModifier('mod_ambush') ? getModifierMagnitude('mod_ambush') : 0,
  }
}

// ── Player Stat Integration ─────────────────────────────

/** Apply infinite progression bonuses to the game store */
export function syncProgressionBonuses(): void {
  const damageBonus = getTotalDamageBonus()
  const harvestBonus = getTotalHarvestBonus()
  const speedBonus = getTotalSpeedBonus()
  const defenseBonus = getTotalDefenseBonus()
  const regenBonus = getTotalRegenBonus()
  const lootBonus = getTotalLootBonus()

  // Store progression bonuses on window for other systems to read
  ;(window as any).__PROGRESSION_BONUSES = {
    damage: damageBonus,
    harvest: harvestBonus,
    speed: speedBonus,
    defense: defenseBonus,
    regen: regenBonus,
    loot: lootBonus,
  }
}

/** Get a specific progression bonus */
export function getProgressionBonus(type: string): number {
  const bonuses = (window as any).__PROGRESSION_BONUSES ?? {}
  return bonuses[type] ?? 0
}

// ── Epoch Effect Application ────────────────────────────

let _activeWorldEffects: Map<string, { effect: string; magnitude: number; startedAt: number; duration: number }> = new Map()

/** Apply the effects of a new evolution epoch to the world */
export function applyEpochEffects(epoch: number): void {
  const events = getActiveEvents()
  for (const event of events) {
    _activeWorldEffects.set(event.id, {
      effect: event.effect,
      magnitude: 1 + epoch * 0.2,
      startedAt: Date.now(),
      duration: event.duration * 1000,
    })
  }

  // Apply discovered resources
  const resources = getDiscoveredResources()

  // Apply available equipment
  const equipment = getAvailableEquipment()

  // Sync progression bonuses
  syncProgressionBonuses()

  // Dispatch event for UI
  try {
    window.dispatchEvent(new CustomEvent('epoch-effects-applied', {
      detail: {
        epoch,
        eventCount: events.length,
        resourceCount: resources.length,
        equipmentCount: equipment.length,
      },
    }))
  } catch {}
}

/** Tick active world effects (clean up expired ones) */
export function tickWorldEffects(_dt: number): void {
  const now = Date.now()
  for (const [id, effect] of _activeWorldEffects) {
    if (now - effect.startedAt > effect.duration) {
      _activeWorldEffects.delete(id)
    }
  }
}

/** Get the current world effect multiplier for a given effect type */
export function getWorldEffectMultiplier(effectType: string): number {
  let total = 1.0
  for (const [, effect] of _activeWorldEffects) {
    if (effect.effect === effectType) {
      total += effect.magnitude * 0.1
    }
  }
  return total
}

/** Get all active world effects for HUD display */
export function getActiveWorldEffects(): Array<{ id: string; effect: string; magnitude: number; remainingMs: number }> {
  const now = Date.now()
  const result: Array<{ id: string; effect: string; magnitude: number; remainingMs: number }> = []
  for (const [id, effect] of _activeWorldEffects) {
    result.push({
      id,
      effect: effect.effect,
      magnitude: effect.magnitude,
      remainingMs: Math.max(0, effect.duration - (now - effect.startedAt)),
    })
  }
  return result
}

// ── Resource Integration ────────────────────────────────

/** Get available evolved resources for crafting */
export function getEvolvedResources(): Array<{ id: string; name: string; icon: string; rarity: string; color: string }> {
  return getDiscoveredResources().map(r => ({
    id: r.id,
    name: r.name,
    icon: r.icon,
    rarity: r.rarity,
    color: r.color,
  }))
}

// ── Equipment Integration ───────────────────────────────

/** Get available evolved equipment schematics */
export function getEvolvedEquipment(): GeneratedEquipment[] {
  return getAvailableEquipment()
}

// ─── Master Tick ────────────────────────────────────────

let _lastProgressionSync = 0

/** Main integration tick — call from TimeManager */
export function tickEvolutionIntegration(dt: number): void {
  // Sync evolved enemies periodically
  if (Date.now() - _lastRegistrySync > 15000) {
    syncEnemyRegistry()
  }

  // Sync progression bonuses every 5 seconds
  const now = Math.floor(Date.now() / 5000)
  if (now > _lastProgressionSync) {
    _lastProgressionSync = now
    syncProgressionBonuses()
  }

  // Tick world effects
  tickWorldEffects(dt)
}

// ── Serialization ───────────────────────────────────────

export function serializeIntegration(): {
  activeEffects: Array<{ id: string; effect: string; magnitude: number; startedAt: number; duration: number }>
} {
  return {
    activeEffects: Array.from(_activeWorldEffects.entries()).map(([id, e]) => ({ id, ...e })),
  }
}

export function loadIntegration(data: { activeEffects: Array<{ id: string; effect: string; magnitude: number; startedAt: number; duration: number }> }): void {
  _activeWorldEffects.clear()
  if (data.activeEffects) {
    for (const e of data.activeEffects) {
      _activeWorldEffects.set(e.id, { effect: e.effect, magnitude: e.magnitude, startedAt: e.startedAt, duration: e.duration })
    }
  }
}
