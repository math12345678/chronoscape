// ── Adaptive Difficulty System — Non-Linear Evolution ──
// Analyzes player performance across dimensions, introduces novel challenges
// that counter dominant strategies, creates emergent enemy synergies, and
// scales the world in non-linear ways.

export interface PlayerProfile {
  damageDealt: number
  damageTaken: number
  kills: number
  deaths: number
  blocksPlaced: number
  resourcesHarvested: number
  distanceTraveled: number
  timesPrestiged: number
  timesAscended: number
  favoriteWeapon: string
  avgSpeed: number
  healingDone: number
  criticalHits: number
  timeSpentBuilding: number
  timeSpentCombat: number
  timeSpentExploring: number
}

export interface DifficultyModifier {
  id: string
  name: string
  icon: string
  description: string
  effect: string
  magnitude: number
  color: string
  active: boolean
  appliedAt: number
}

export interface ThreatSynergy {
  id: string
  name: string
  description: string
  requiredModifiers: string[]
  effect: string
  magnitude: number
  color: string
}

// ── Player Tracking ──────────────────────────────────────

let _profile: PlayerProfile = {
  damageDealt: 0, damageTaken: 0, kills: 0, deaths: 0,
  blocksPlaced: 0, resourcesHarvested: 0, distanceTraveled: 0,
  timesPrestiged: 0, timesAscended: 0, favoriteWeapon: '',
  avgSpeed: 4, healingDone: 0, criticalHits: 0,
  timeSpentBuilding: 0, timeSpentCombat: 0, timeSpentExploring: 0,
}

let _activeModifiers: DifficultyModifier[] = []
let _synergies: ThreatSynergy[] = []
let _difficultyScore = 0
let _lastSynergyCheck = 0
let _evolutionStage = 0

export function getPlayerProfile(): PlayerProfile { return { ..._profile } }
export function getActiveModifiers(): DifficultyModifier[] { return _activeModifiers.map(m => ({ ...m })) }
export function getSynergies(): ThreatSynergy[] { return [..._synergies] }
export function getDifficultyScore(): number { return _difficultyScore }
export function getEvolutionStage(): number { return _evolutionStage }

// ── Record Player Actions ────────────────────────────────

export function recordDamageDealt(amount: number): void { _profile.damageDealt += amount }
export function recordDamageTaken(amount: number): void { _profile.damageTaken += amount }
export function recordKill(): void { _profile.kills++ }
export function recordDeath(): void { _profile.deaths++ }
export function recordBlockPlaced(): void { _profile.blocksPlaced++ }
export function recordResourceHarvested(amount: number): void { _profile.resourcesHarvested += amount }
export function recordDistance(d: number): void { _profile.distanceTraveled += d }
export function recordPrestige(): void { _profile.timesPrestiged++ }
export function recordAscension(): void { _profile.timesAscended++ }
export function recordWeaponUse(weapon: string): void { _profile.favoriteWeapon = weapon }
export function recordHealing(amount: number): void { _profile.healingDone += amount }
export function recordCriticalHit(): void { _profile.criticalHits++ }
export function recordTimeBuilding(dt: number): void { _profile.timeSpentBuilding += dt }
export function recordTimeCombat(dt: number): void { _profile.timeSpentCombat += dt }
export function recordTimeExploring(dt: number): void { _profile.timeSpentExploring += dt }

// ── Modifier Definitions ─────────────────────────────────

const MODIFIER_POOL: Omit<DifficultyModifier, 'active' | 'appliedAt'>[] = [
  // ── Combat Counters ──
  { id: 'mod_damage_shield', name: 'Adaptive Shielding', icon: 'shield', description: 'Enemies develop shields that reduce damage from your most-used weapon.', effect: 'damage_resist', magnitude: 0.2, color: '#44aaff' },
  { id: 'mod_swarm_tactics', name: 'Swarm Tactics', icon: 'bug', description: 'Enemies begin fighting in coordinated groups, flanking and surrounding you.', effect: 'swarm_count', magnitude: 1.5, color: '#ff8844' },
  { id: 'mod_ambush', name: 'Ambush Predators', icon: 'eye', description: 'Elite enemies hide near resource nodes, waiting to strike.', effect: 'ambush_chance', magnitude: 0.15, color: '#ff4444' },
  { id: 'mod_berserk', name: 'Berserk Fury', icon: 'anger', description: 'Enemies enrage below 20% HP, gaining double damage and speed.', effect: 'berserk_threshold', magnitude: 0.3, color: '#ff0000' },
  { id: 'mod_healer_packs', name: 'Healer Packs', icon: 'heart', description: 'Some enemies now heal nearby allies, requiring focus fire.', effect: 'healer_spawn', magnitude: 1, color: '#44ff88' },
  { id: 'mod_vampiric', name: 'Vampiric Touch', icon: 'vampire', description: 'Hostile mobs heal for 10% of damage dealt to you.', effect: 'life_steal', magnitude: 0.1, color: '#ff4488' },

  // ── Environment Hazards ──
  { id: 'mod_time_tears', name: 'Time Tears', icon: 'tear', description: 'Unstable tears in spacetime appear, damaging and slowing you.', effect: 'tear_density', magnitude: 1, color: '#aa44ff' },
  { id: 'mod_poison_air', name: 'Toxic Atmosphere', icon: 'gas', description: 'The air in some biomes becomes toxic, draining health over time.', effect: 'poison_dps', magnitude: 2, color: '#88ff44' },
  { id: 'mod_gravity_wells', name: 'Gravity Wells', icon: 'gravity', description: 'Random gravity anomalies slow movement and pull you toward enemies.', effect: 'gravity_strength', magnitude: 0.3, color: '#44ffaa' },
  { id: 'mod_crystal_storm', name: 'Crystal Shards', icon: 'crystal', description: 'Falling crystal shards create danger zones that persist for 10 seconds.', effect: 'shard_density', magnitude: 1, color: '#44ddff' },

  // ── Resource Pressure ──
  { id: 'mod_drain_aura', name: 'Drain Aura', icon: 'drain', description: 'Enemies near you drain resources over time.', effect: 'resource_drain', magnitude: 0.5, color: '#ff66aa' },
  { id: 'mod_scarcity', name: 'Resource Scarcity', icon: 'empty', description: 'Harvest yields are reduced in evolved biomes.', effect: 'yield_reduction', magnitude: 0.3, color: '#888888' },
  { id: 'mod_rust', name: 'Temporal Rust', icon: 'corrode', description: 'Blocks decay faster in evolved zones.', effect: 'decay_rate', magnitude: 1.5, color: '#664422' },

  // ── Boss Modifiers ──
  { id: 'mod_boss_arena', name: 'Arena Lock', icon: 'lock', description: 'Boss fights lock you in an arena until one side falls.', effect: 'arena_lock', magnitude: 1, color: '#ffd700' },
  { id: 'mod_boss_phase', name: 'Multi-Phase Bosses', icon: 'phases', description: 'Bosses gain additional phases with new attack patterns.', effect: 'extra_phases', magnitude: 1, color: '#ff8800' },
  { id: 'mod_boss_enrage', name: 'Enrage Timer', icon: 'clock', description: 'Bosses enrage after 60 seconds, becoming nearly unstoppable.', effect: 'enrage_time', magnitude: 60, color: '#ff0000' },
]

// ── Synergy Detection ────────────────────────────────────

function checkForSynergies(): ThreatSynergy[] {
  const active = _activeModifiers.filter(m => m.active)
  const activeIds = new Set(active.map(m => m.id))
  const newSynergies: ThreatSynergy[] = []

  // Damage shield + swarm = armored swarms
  if (activeIds.has('mod_damage_shield') && activeIds.has('mod_swarm_tactics')) {
    newSynergies.push({
      id: 'syn_armored_swarm',
      name: 'Armored Swarms',
      description: 'Shielded enemies attack in groups. Devastating combination.',
      requiredModifiers: ['mod_damage_shield', 'mod_swarm_tactics'],
      effect: 'armored_swarm',
      magnitude: 2.0,
      color: '#ff4444',
    })
  }

  // Healer + vampiric = unkillable squads
  if (activeIds.has('mod_healer_packs') && activeIds.has('mod_vampiric')) {
    newSynergies.push({
      id: 'syn_unkillable',
      name: 'Unkillable Squads',
      description: 'Healers keep enemies alive while they drain your life.',
      requiredModifiers: ['mod_healer_packs', 'mod_vampiric'],
      effect: 'unkillable',
      magnitude: 2.5,
      color: '#ff4488',
    })
  }

  // Berserk + swarm = berserk rush
  if (activeIds.has('mod_berserk') && activeIds.has('mod_swarm_tactics')) {
    newSynergies.push({
      id: 'syn_berserk_rush',
      name: 'Berserk Rush',
      description: 'Enraged enemies swarm at double speed.',
      requiredModifiers: ['mod_berserk', 'mod_swarm_tactics'],
      effect: 'berserk_rush',
      magnitude: 2.0,
      color: '#ff6600',
    })
  }

  // Gravity + tears = inescapable void
  if (activeIds.has('mod_gravity_wells') && activeIds.has('mod_time_tears')) {
    newSynergies.push({
      id: 'syn_void_trap',
      name: 'Void Trap',
      description: 'Gravity wells pull you into time tears. Avoid at all costs.',
      requiredModifiers: ['mod_gravity_wells', 'mod_time_tears'],
      effect: 'void_trap',
      magnitude: 3.0,
      color: '#8800ff',
    })
  }

  // Arena + enrage = deadly deadline
  if (activeIds.has('mod_boss_arena') && activeIds.has('mod_boss_enrage')) {
    newSynergies.push({
      id: 'syn_death_arena',
      name: 'Death Arena',
      description: 'Locked in with an enraging boss. No escape. No mercy.',
      requiredModifiers: ['mod_boss_arena', 'mod_boss_enrage'],
      effect: 'death_arena',
      magnitude: 4.0,
      color: '#ff0000',
    })
  }

  return newSynergies
}

// ── Analyze Player Strategy ──────────────────────────────

function analyzeStrategy(): { dominantStyle: string; weaknesses: string[] } {
  const combatTime = _profile.timeSpentCombat
  const buildingTime = _profile.timeSpentBuilding
  const exploreTime = _profile.timeSpentExploring

  if (combatTime > buildingTime && combatTime > exploreTime) {
    return {
      dominantStyle: 'combat',
      weaknesses: combatTime > exploreTime * 3 ? ['exploration', 'building'] : ['building'],
    }
  } else if (buildingTime > combatTime && buildingTime > exploreTime) {
    return {
      dominantStyle: 'building',
      weaknesses: buildingTime > combatTime * 2 ? ['combat'] : ['exploration'],
    }
  } else {
    return {
      dominantStyle: 'exploration',
      weaknesses: exploreTime > combatTime * 2 ? ['combat'] : ['building'],
    }
  }
}

function chooseCounterModifiers(): DifficultyModifier[] {
  const analysis = analyzeStrategy()
  const pool = MODIFIER_POOL.filter(m => !_activeModifiers.some(a => a.id === m.id))
  const chosen: DifficultyModifier[] = []

  if (analysis.dominantStyle === 'combat') {
    // Counter combat-heavy players
    const combatCounters = pool.filter(m => ['mod_damage_shield', 'mod_swarm_tactics', 'mod_healer_packs', 'mod_vampiric', 'mod_berserk'].includes(m.id))
    if (combatCounters.length > 0) chosen.push({ ...combatCounters[Math.floor(Math.random() * combatCounters.length)], active: true, appliedAt: Date.now() })
    // Also apply environmental pressure
    const env = pool.filter(m => ['mod_time_tears', 'mod_drain_aura', 'mod_gravity_wells'].includes(m.id))
    if (env.length > 0 && Math.random() < 0.4) chosen.push({ ...env[Math.floor(Math.random() * env.length)], active: true, appliedAt: Date.now() })
  } else if (analysis.dominantStyle === 'building') {
    // Counter builders
    const buildingCounters = pool.filter(m => ['mod_scarcity', 'mod_rust', 'mod_crystal_storm', 'mod_poison_air'].includes(m.id))
    if (buildingCounters.length > 0) chosen.push({ ...buildingCounters[Math.floor(Math.random() * buildingCounters.length)], active: true, appliedAt: Date.now() })
    // Force combat engagement
    const combat = pool.filter(m => ['mod_ambush', 'mod_swarm_tactics'].includes(m.id))
    if (combat.length > 0 && Math.random() < 0.5) chosen.push({ ...combat[Math.floor(Math.random() * combat.length)], active: true, appliedAt: Date.now() })
  } else {
    // Counter explorers
    const exploreCounters = pool.filter(m => ['mod_ambush', 'mod_drain_aura', 'mod_gravity_wells', 'mod_time_tears'].includes(m.id))
    if (exploreCounters.length > 0) chosen.push({ ...exploreCounters[Math.floor(Math.random() * exploreCounters.length)], active: true, appliedAt: Date.now() })
  }

  // If player has died recently, ease up slightly
  if (_profile.deaths > 3 && _profile.deaths > _profile.kills / 3) {
    return []
  }

  // If player has high kill/death ratio, add extra challenge
  if (_profile.kills > 100 && _profile.deaths < 5) {
    const extra = pool.filter(m => ['mod_boss_arena', 'mod_boss_enrage', 'mod_boss_phase'].includes(m.id))
    if (extra.length > 0 && Math.random() < 0.3) chosen.push({ ...extra[Math.floor(Math.random() * extra.length)], active: true, appliedAt: Date.now() })
  }

  return chosen
}

// ── Tick ─────────────────────────────────────────────────

/** Tick the adaptive difficulty system */
export function tickAdaptiveDifficulty(dt: number, distance: number): void {
  _profile.distanceTraveled = Math.max(_profile.distanceTraveled, distance)

  // Calculate difficulty score based on player power and distance
  const killScore = Math.min(_profile.kills * 5, 500)
  const distanceScore = Math.min(distance / 10, 500)
  const prestigeScore = _profile.timesPrestiged * 50
  const ascensionScore = _profile.timesAscended * 200
  const deathPenalty = Math.min(_profile.deaths * 20, 200)
  const wealth = Math.min((_profile.resourcesHarvested || 0) / 10000 * 10, 100)

  _difficultyScore = Math.max(0, killScore + distanceScore + prestigeScore + ascensionScore + wealth - deathPenalty)

  // Determine evolution stage
  _evolutionStage = Math.floor(_difficultyScore / 200)

  // Apply new modifiers every 60 seconds of game time
  const shouldCheck = Math.floor(Date.now() / 60000) > _lastSynergyCheck
  if (shouldCheck) {
    _lastSynergyCheck = Math.floor(Date.now() / 60000)
    const newMods = chooseCounterModifiers()
    _activeModifiers.push(...newMods)
    _synergies = checkForSynergies()
  }

  // Cap modifiers (max 8 active)
  if (_activeModifiers.length > 8) {
    _activeModifiers.sort((a, b) => a.appliedAt - b.appliedAt)
    _activeModifiers = _activeModifiers.slice(_activeModifiers.length - 8)
  }
}

/** Get the damage multiplier for enemies based on difficulty */
export function getEnemyDamageMultiplier(): number {
  return 1 + _evolutionStage * 0.3 + _activeModifiers.length * 0.05
}

/** Get the health multiplier for enemies */
export function getEnemyHealthMultiplier(): number {
  return 1 + _evolutionStage * 0.4 + _activeModifiers.length * 0.08
}

/** Get the spawn rate multiplier */
export function getSpawnRateMultiplier(): number {
  return 1 + _evolutionStage * 0.2 + _activeModifiers.filter(m => m.effect === 'swarm_count' || m.effect === 'swarm_tactics').length * 0.3
}

/** Check if a specific modifier is active */
export function hasModifier(id: string): boolean {
  return _activeModifiers.some(m => m.active && m.id === id)
}

/** Get modifier magnitude */
export function getModifierMagnitude(id: string): number {
  const mod = _activeModifiers.find(m => m.active && m.id === id)
  return mod?.magnitude ?? 0
}

export function serializeDifficulty(): {
  profile: PlayerProfile
  modifiers: DifficultyModifier[]
  synergies: ThreatSynergy[]
  score: number
  stage: number
} {
  return {
    profile: { ..._profile },
    modifiers: _activeModifiers.map(m => ({ ...m })),
    synergies: _synergies.map(s => ({ ...s })),
    score: _difficultyScore,
    stage: _evolutionStage,
  }
}

export function loadDifficulty(data: {
  profile: PlayerProfile
  modifiers: DifficultyModifier[]
  synergies: ThreatSynergy[]
  score: number
  stage: number
}): void {
  if (data.profile) _profile = { ...data.profile }
  if (data.modifiers) _activeModifiers = data.modifiers.map(m => ({ ...m }))
  if (data.synergies) _synergies = data.synergies.map(s => ({ ...s }))
  if (data.score) _difficultyScore = data.score
  if (data.stage) _evolutionStage = data.stage
}
