// ── Evolving Content Engine — LLM-Assisted Procedural Generation ──
// Periodically generates new content: enemy types, world events, resources,
// equipment, and lore fragments. Uses LLM when available, falls back to
// procedural generation.

import { llmGenerateJSON } from '../utils/llmClient'
import { evolveBiomeTiers } from './InfiniteWorldGenerator'

// ── Content Evolution Epochs ─────────────────────────────

export interface EvolutionEpoch {
  number: number
  triggeredAt: number // game time in seconds
  triggerReason: string
  content: {
    newEnemies: GeneratedEnemy[]
    newEvents: GeneratedEvent[]
    newResources: GeneratedResource[]
    newEquipment: GeneratedEquipment[]
    newLore: GeneratedLore[]
  }
}

export interface GeneratedEnemy {
  id: string
  name: string
  icon: string
  description: string
  baseHP: number
  baseDamage: number
  speed: number
  behavior: string
  specialAbility: string
  color: string
  scale: number
  tier: number
}

export interface GeneratedEvent {
  id: string
  name: string
  description: string
  duration: number // seconds
  effect: string
  color: string
  icon: string
}

export interface GeneratedResource {
  id: string
  name: string
  icon: string
  description: string
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary' | 'mythic'
  color: string
}

export interface GeneratedEquipment {
  id: string
  name: string
  icon: string
  description: string
  slot: 'weapon' | 'armor' | 'accessory' | 'tool'
  rarity: string
  statBoosts: Record<string, number>
  color: string
}

export interface GeneratedLore {
  id: string
  title: string
  text: string
  category: string
  discoveredAt: number
}

// ── Procedural Fallback Generators ───────────────────────

let _enemyNames = ['Void Phantom', 'Crystal Revenant', 'Time Shard', 'Echo Wraith', 'Flux Beast', 'Chrono Wyrm', 'Temporal Horror', 'Reality Leech', 'Paradox Golem', 'Time Serpent']
let _eventNames = ['Time Storm', 'Crystal Rain', 'Void Surge', 'Chrono Quake', 'Reality Fracture', 'Temporal Echo', 'Flux Wave', 'Paradox Cascade']
let _resourceNames = ['Chrono Shard', 'Void Essence', 'Crystal Heart', 'Time Dust', 'Flux Pearl', 'Echo Fragment', 'Reality Tear', 'Omega Particle']
let _equipNames = ['Time Blade', 'Void Shield', 'Crystal Staff', 'Flux Ring', 'Chrono Amulet', 'Reality Cloak', 'Paradox Boots', 'Echo Gauntlets']

function proceduralEnemy(tier: number, index: number): GeneratedEnemy {
  const name = _enemyNames[(tier * 10 + index) % _enemyNames.length]
  return {
    id: `enemy_proc_t${tier}_${index}`,
    name: `${name} ${['Mk.I', 'Mk.II', 'Mk.III', 'Alpha', 'Omega', 'X'][tier % 6]}`,
    icon: ['sword', 'skull', 'ghost', 'dragon', 'eye', 'tentacle'][index % 6],
    description: `A tier-${tier} evolved enemy with adaptive combat capabilities.`,
    baseHP: 30 * Math.pow(2, tier) + index * 10,
    baseDamage: 5 * Math.pow(1.5, tier) + index * 2,
    speed: 2 + tier * 0.3 + Math.random(),
    behavior: ['aggressive', 'flanking', 'ambush', 'swarm', 'tank', 'ranged', 'stealth', 'healer'][index % 8],
    specialAbility: ['teleport', 'shield', 'poison', 'slow', 'berserk', 'split', 'heal', 'freeze'][index % 8],
    color: ['#ff4444', '#ff8844', '#ffd700', '#44ff88', '#44aaff', '#aa44ff'][tier % 6],
    scale: 0.8 + tier * 0.15,
    tier,
  }
}

function proceduralEvent(tier: number): GeneratedEvent {
  const name = _eventNames[(tier * 3) % _eventNames.length]
  return {
    id: `event_proc_${tier}_${Date.now()}`,
    name: `${name} Lv.${tier}`,
    description: `A level-${tier} temporal event. ${['Reality bends.', 'Time flows backward.', 'Echoes of the future.', 'The void pulses.', 'Crystals resonate.', 'Shadows deepen.'][tier % 6]}`,
    duration: 30 + tier * 10,
    effect: ['multiply_damage', 'multiply_loot', 'spawn_enemies', 'slow_time', 'speed_time', 'heal_all'][tier % 6],
    color: ['#ff4444', '#ff8844', '#ffd700', '#44ff88', '#44aaff', '#aa44ff'][tier % 6],
    icon: ['storm', 'crystal', 'void', 'quake', 'fracture', 'echo'][tier % 6],
  }
}

function proceduralResource(tier: number): GeneratedResource {
  const name = _resourceNames[(tier * 3) % _resourceNames.length]
  const rarities: ('common' | 'uncommon' | 'rare' | 'legendary' | 'mythic')[] = ['common', 'uncommon', 'rare', 'legendary', 'mythic']
  return {
    id: `res_proc_t${tier}`,
    name: `${name}`,
    icon: ['gem', 'crystal', 'dust', 'pearl', 'shard', 'tear'][tier % 6],
    description: `A tier-${tier} resource discovered in temporal anomalies.`,
    rarity: rarities[Math.min(tier, 4)],
    color: ['#44ff88', '#44aaff', '#aa44ff', '#ffd700', '#ff00ff'][Math.min(tier, 4)],
  }
}

function proceduralEquipment(tier: number): GeneratedEquipment {
  const name = _equipNames[(tier * 2) % _equipNames.length]
  const slots: ('weapon' | 'armor' | 'accessory' | 'tool')[] = ['weapon', 'armor', 'accessory', 'tool']
  const rarities = ['common', 'uncommon', 'rare', 'legendary', 'mythic']
  return {
    id: `equip_proc_t${tier}`,
    name: `${name} +${tier}`,
    icon: ['sword', 'shield', 'ring', 'boot', 'cloak', 'staff'][tier % 6],
    description: `Tier-${tier} equipment forged from chrono-infused materials.`,
    slot: slots[tier % 4],
    rarity: rarities[Math.min(tier, 4)],
    statBoosts: { damage: tier * 5, defense: tier * 3, speed: tier * 0.1 },
    color: ['#44ff88', '#44aaff', '#aa44ff', '#ffd700', '#ff00ff'][Math.min(tier, 4)],
  }
}

// ── State ─────────────────────────────────────────────────

let _epochs: EvolutionEpoch[] = []
let _currentEpoch = 0
let _allGeneratedEnemies: GeneratedEnemy[] = []
let _activeEvents: GeneratedEvent[] = []
let _discoveredResources: GeneratedResource[] = []
let _availableEquipment: GeneratedEquipment[] = []
let _loreFragments: GeneratedLore[] = []
let _totalContentGenerated = 0

// Milestones that trigger evolution epochs
let _totalKills = 0
let _totalDistance = 0
let _totalPrestiges = 0
let _totalAscensions = 0
let _gameTimeSeconds = 0

export function getCurrentEpoch(): number { return _currentEpoch }
export function getEpochs(): EvolutionEpoch[] { return _epochs.map(e => ({ ...e, content: { ...e.content } })) }
export function getAllGeneratedEnemies(): GeneratedEnemy[] { return [..._allGeneratedEnemies] }
export function getActiveEvents(): GeneratedEvent[] { return [..._activeEvents] }
export function getDiscoveredResources(): GeneratedResource[] { return [..._discoveredResources] }
export function getAvailableEquipment(): GeneratedEquipment[] { return [..._availableEquipment] }
export function getLoreFragments(): GeneratedLore[] { return [..._loreFragments] }
export function getTotalContentGenerated(): number { return _totalContentGenerated }

export function recordKill(): void { _totalKills++ }
export function recordDistance(d: number): void { _totalDistance = Math.max(_totalDistance, d) }
export function recordPrestige(): void { _totalPrestiges++ }
export function recordAscension(): void { _totalAscensions++ }

// ── Epoch Trigger Conditions ─────────────────────────────

function shouldTriggerEpoch(): { trigger: boolean; reason: string } {
  if (_epochs.length === 0 && _gameTimeSeconds > 120) return { trigger: true, reason: 'First evolution — the world awakens.' }
  if (_epochs.length === 1 && _totalKills >= 50) return { trigger: true, reason: `After ${_totalKills} kills, reality begins to shift.` }
  if (_epochs.length === 2 && _totalDistance >= 500) return { trigger: true, reason: `Ventured ${_totalDistance.toFixed(0)} units — new horizons unfold.` }
  if (_epochs.length === 3 && _totalPrestiges >= 2) return { trigger: true, reason: 'Prestige attracts attention from beyond.' }
  if (_epochs.length === 4 && _totalAscensions >= 1) return { trigger: true, reason: 'Ascension breaks the seal on higher dimensions.' }
  if (_epochs.length >= 5 && _epochs.length < 10 && _gameTimeSeconds > 600 * _epochs.length) return { trigger: true, reason: `Epoch ${_epochs.length} — the universe demands evolution.` }
  if (_epochs.length >= 10 && _gameTimeSeconds > 1800 * (_epochs.length - 8)) return { trigger: true, reason: `Epoch ${_epochs.length} — the infinite expands.` }
  return { trigger: false, reason: '' }
}

// ── Generate Epoch Content ───────────────────────────────

export async function triggerEvolutionEpoch(): Promise<EvolutionEpoch | null> {
  if (shouldTriggerEpoch().trigger === false) return null
  const reason = shouldTriggerEpoch().reason
  _currentEpoch++
  const epochNum = _currentEpoch

  // Evolve biome tiers
  evolveBiomeTiers(epochNum)

  // Try LLM generation first
  const systemPrompt = `You are a game content generator for "Chronoscape", an infinite time-travel game.
Generate creative, balanced content for evolution epoch ${epochNum}.
The world is expanding and reality is becoming more unstable.
Make content that fits the game's sci-fi/temporal theme.`

  // Generate enemies
  const llmEnemies = await llmGenerateJSON<{ enemies: GeneratedEnemy[] }>(
    `Generate 2 new enemy types for epoch ${epochNum} of Chronoscape.
Current game state: ${epochNum} epochs completed, enemies scaling with tier.
Each enemy needs: id (unique), name, icon (short word), description, baseHP (30-500), baseDamage (5-80), speed (1-6), behavior (aggressive/flanking/ambush/swarm/tank/ranged/stealth/healer), specialAbility (teleport/shield/poison/slow/berserk/split/heal/freeze/void/corrupt), color (hex), scale (0.5-3.0), tier (${epochNum}).
Respond ONLY with valid JSON.`,
    systemPrompt,
    () => ({ enemies: [proceduralEnemy(epochNum, 0), proceduralEnemy(epochNum, 1)] }),
  )

  // Generate events
  const llmEvents = await llmGenerateJSON<{ events: GeneratedEvent[] }>(
    `Generate 1 world event for epoch ${epochNum}.
Each event: id (unique), name, description, duration (20-120 seconds), effect (multiply_damage/multiply_loot/spawn_enemies/slow_time/speed_time/heal_all), color (hex), icon (short word).`,
    systemPrompt,
    () => ({ events: [proceduralEvent(epochNum)] }),
  )

  // Generate resources
  const llmResources = await llmGenerateJSON<{ resources: GeneratedResource[] }>(
    `Generate 1 new discoverable resource for epoch ${epochNum}.
Each resource: id (unique), name, icon (short word), description, rarity (common/uncommon/rare/legendary/mythic), color (hex).`,
    systemPrompt,
    () => ({ resources: [proceduralResource(epochNum)] }),
  )

  // Generate equipment
  const llmEquip = await llmGenerateJSON<{ equipment: GeneratedEquipment[] }>(
    `Generate 1 new equipment item for epoch ${epochNum}.
Each item: id (unique), name, icon (short word), description, slot (weapon/armor/accessory/tool), rarity (common/uncommon/rare/legendary/mythic), statBoosts (object with damage/defense/speed numbers), color (hex).`,
    systemPrompt,
    () => ({ equipment: [proceduralEquipment(epochNum)] }),
  )

  // Generate lore
  const llmLore = await llmGenerateJSON<{ lore: GeneratedLore[] }>(
    `Generate 1 lore fragment for epoch ${epochNum} of Chronoscape.
The lore should reveal something about the game's time-travel universe.
Each fragment: id (unique), title, text (1-3 sentences), category (evolution/ancient/discovery/prophecy/void).
Add discoveredAt: 0 (will be set later).`,
    systemPrompt,
    () => ({ lore: [{
      id: `lore_epoch_${epochNum}`,
      title: `Epoch ${epochNum}: ${['Awakening', 'Fracture', 'Expansion', 'Convergence', 'Transcendence', 'Infinity'][epochNum % 6]}`,
      text: `The chrono-flow intensifies. Epoch ${epochNum} brings unprecedented change to the world.`,
      category: 'evolution',
      discoveredAt: Date.now(),
    }] }),
  )

  const content: EvolutionEpoch['content'] = {
    newEnemies: llmEnemies?.enemies ?? [proceduralEnemy(epochNum, 0), proceduralEnemy(epochNum, 1)],
    newEvents: llmEvents?.events ?? [proceduralEvent(epochNum)],
    newResources: llmResources?.resources ?? [proceduralResource(epochNum)],
    newEquipment: llmEquip?.equipment ?? [proceduralEquipment(epochNum)],
    newLore: (llmLore?.lore ?? []).map(l => ({ ...l, discoveredAt: Date.now() })),
  }

  // Store generated content
  _allGeneratedEnemies.push(...content.newEnemies)
  _discoveredResources.push(...content.newResources)
  _availableEquipment.push(...content.newEquipment)
  _loreFragments.push(...content.newLore)
  _totalContentGenerated +=
    content.newEnemies.length +
    content.newEvents.length +
    content.newResources.length +
    content.newEquipment.length +
    content.newLore.length

  const epoch: EvolutionEpoch = {
    number: epochNum,
    triggeredAt: _gameTimeSeconds,
    triggerReason: reason,
    content,
  }

  _epochs.push(epoch)

  // Trigger a UI notification event
  try {
    window.dispatchEvent(new CustomEvent('evolution-triggered', { detail: { epoch: epochNum } }))
  } catch {}

  return epoch
}

/** Tick the evolution engine (check for epoch triggers, update active events) */
export function tickEvolutionEngine(dt: number): void {
  _gameTimeSeconds += dt

  // Check for epoch trigger every ~5 seconds
  if (Math.floor(_gameTimeSeconds) % 5 === 0) {
    // Fire and forget - don't await
    triggerEvolutionEpoch().catch(() => {})
  }

  // Tick active event durations
  _activeEvents = _activeEvents.filter(() => {
    // Events from epochs have fixed durations
    return true // would need dedicated duration tracking
  })
}

/** Get a random evolved enemy appropriate for distance */
export function getEvolvedEnemyForDistance(distance: number): GeneratedEnemy {
  const tier = Math.min(Math.floor(distance / 300), _allGeneratedEnemies.length - 1)
  const valid = _allGeneratedEnemies.filter(e => e.tier <= tier + 1)
  if (valid.length === 0) return proceduralEnemy(0, 0)
  return valid[Math.floor(Math.random() * valid.length)]
}

export function serializeEvolution(): {
  epochs: EvolutionEpoch[]
  currentEpoch: number
  totalContent: number
  gameTime: number
} {
  return {
    epochs: _epochs.map(e => ({ ...e, content: { ...e.content } })),
    currentEpoch: _currentEpoch,
    totalContent: _totalContentGenerated,
    gameTime: _gameTimeSeconds,
  }
}

export function loadEvolution(data: {
  epochs: EvolutionEpoch[]
  currentEpoch: number
  totalContent: number
  gameTime: number
}): void {
  _epochs = (data.epochs ?? []).map(e => ({ ...e, content: { ...e.content } }))
  _currentEpoch = data.currentEpoch ?? 0
  _totalContentGenerated = data.totalContent ?? 0
  _gameTimeSeconds = data.gameTime ?? 0

  // Rebuild caches from epochs
  for (const epoch of _epochs) {
    _allGeneratedEnemies.push(...epoch.content.newEnemies)
    _discoveredResources.push(...epoch.content.newResources)
    _availableEquipment.push(...epoch.content.newEquipment)
    _loreFragments.push(...epoch.content.newLore)
  }
}
