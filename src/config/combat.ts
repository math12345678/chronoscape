// ── Weapons ─────────────────────────────────────────────
export type WeaponId = 'energyPistol' | 'energyRifle' | 'timeBlaster'

export interface WeaponConfig {
  id: WeaponId
  name: string
  damage: number
  fireRate: number    // shots per second
  range: number       // max distance
  ammoCost: number    // Liquid per shot
  projectileSpeed: number
  projectileColor: string
  unlockFormula: 'crystallization' | 'timelineEcho' | null // formula ID needed, null = always available
  tcCost: number      // Time Credits to purchase
}

export const WEAPONS: Record<WeaponId, WeaponConfig> = {
  energyPistol: {
    id: 'energyPistol',
    name: 'Energy Pistol',
    damage: 15,
    fireRate: 3,
    range: 40,
    ammoCost: 2,
    projectileSpeed: 30,
    projectileColor: '#44ffcc',
    unlockFormula: null,
    tcCost: 0,
  },
  energyRifle: {
    id: 'energyRifle',
    name: 'Energy Rifle',
    damage: 25,
    fireRate: 2,
    range: 60,
    ammoCost: 5,
    projectileSpeed: 45,
    projectileColor: '#ff8844',
    unlockFormula: 'crystallization',
    tcCost: 500,
  },
  timeBlaster: {
    id: 'timeBlaster',
    name: 'Time Blaster',
    damage: 40,
    fireRate: 1,
    range: 50,
    ammoCost: 10,
    projectileSpeed: 35,
    projectileColor: '#cc66ff',
    unlockFormula: 'timelineEcho',
    tcCost: 2000,
  },
}

// ── Enemies ─────────────────────────────────────────────
export type EnemyType = 'wraith' | 'voidWraith' | 'timeCrystalGolem' | 'phaseShifter' | 'temporalSentinel' | 'chronoBehemoth' | 'timeTyrant'

export interface EnemyConfig {
  type: EnemyType
  name: string
  health: number
  speed: number
  damage: number        // damage per hit to player
  attackRange: number   // distance to start attacking
  attackCooldown: number // seconds between attacks
  xpReward: number      // raw resource reward on kill
  renownReward: number
  color: string
  emissive: string
  scale: number
}

export const ENEMIES: Record<EnemyType, EnemyConfig> = {
  wraith: {
    type: 'wraith',
    name: 'Wraith',
    health: 30,
    speed: 2.5,
    damage: 5,
    attackRange: 2,
    attackCooldown: 1.5,
    xpReward: 5,
    renownReward: 1,
    color: '#6644aa',
    emissive: '#4422aa',
    scale: 1,
  },
  voidWraith: {
    type: 'voidWraith',
    name: 'Void Wraith',
    health: 60,
    speed: 3.5,
    damage: 12,
    attackRange: 2.5,
    attackCooldown: 1.0,
    xpReward: 15,
    renownReward: 3,
    color: '#aa2244',
    emissive: '#ff2244',
    scale: 1.3,
  },
  timeCrystalGolem: {
    type: 'timeCrystalGolem',
    name: 'Crystal Golem',
    health: 120,
    speed: 1.5,
    damage: 20,
    attackRange: 3,
    attackCooldown: 2.0,
    xpReward: 30,
    renownReward: 5,
    color: '#8866ff',
    emissive: '#6644dd',
    scale: 1.8,
  },
  phaseShifter: {
    type: 'phaseShifter',
    name: 'Phase Shifter',
    health: 50,
    speed: 4.5,
    damage: 18,
    attackRange: 2.5,
    attackCooldown: 0.8,
    xpReward: 20,
    renownReward: 4,
    color: '#66ddff',
    emissive: '#44aaff',
    scale: 1.1,
  },
  temporalSentinel: {
    type: 'temporalSentinel',
    name: 'Temporal Sentinel',
    health: 80,
    speed: 1.0,
    damage: 25,
    attackRange: 15,
    attackCooldown: 2.5,
    xpReward: 25,
    renownReward: 5,
    color: '#ffdd44',
    emissive: '#ddaa22',
    scale: 1.4,
  },
  chronoBehemoth: {
    type: 'chronoBehemoth',
    name: 'Chrono-Behemoth',
    health: 500,
    speed: 2.0,
    damage: 35,
    attackRange: 4,
    attackCooldown: 1.5,
    xpReward: 100,
    renownReward: 25,
    color: '#ff44aa',
    emissive: '#dd2288',
    scale: 3.0,
  },
  timeTyrant: {
    type: 'timeTyrant',
    name: 'Time Tyrant',
    health: 1500,
    speed: 2.5,
    damage: 50,
    attackRange: 6,
    attackCooldown: 2.0,
    xpReward: 500,
    renownReward: 100,
    color: '#ff8800',
    emissive: '#ff4400',
    scale: 4.5,
  },
}

// ── Factions/Gangs ──────────────────────────────────────
export type FactionId = 'chronoGuard' | 'voidCult' | 'crystalSyndicate' | 'timeless' | 'echoReapers' | 'dawnForged'

export interface FactionConfig {
  id: FactionId
  name: string
  color: string
  description: string
  territoryColor: string
}

export const FACTIONS: Record<FactionId, FactionConfig> = {
  chronoGuard: {
    id: 'chronoGuard',
    name: 'Chrono Guard',
    color: '#44aaff',
    description: 'Protectors of the timeline',
    territoryColor: 'rgba(68,170,255,0.08)',
  },
  voidCult: {
    id: 'voidCult',
    name: 'Void Cult',
    color: '#ff4466',
    description: 'Worshippers of the void between time',
    territoryColor: 'rgba(255,68,102,0.08)',
  },
  crystalSyndicate: {
    id: 'crystalSyndicate',
    name: 'Crystal Syndicate',
    color: '#aa88ff',
    description: 'Merchants of crystallized time',
    territoryColor: 'rgba(170,136,255,0.08)',
  },
  timeless: {
    id: 'timeless',
    name: 'Timeless',
    color: '#ffcc44',
    description: 'Neutral time-keepers',
    territoryColor: 'rgba(255,204,68,0.06)',
  },
  echoReapers: {
    id: 'echoReapers',
    name: 'Echo Reapers',
    color: '#ff66aa',
    description: 'Harvesters of shattered timelines',
    territoryColor: 'rgba(255,102,170,0.08)',
  },
  dawnForged: {
    id: 'dawnForged',
    name: 'Dawn Forged',
    color: '#ff8844',
    description: 'Builders of tomorrow',
    territoryColor: 'rgba(255,136,68,0.08)',
  },
}

// ── Player ──────────────────────────────────────────────
export const PLAYER_MAX_HEALTH = 100
export const PLAYER_ARMOR_CAP = 50
export const HEAL_AMOUNT_PER_LIQUID = 25
export const HEALTH_REGEN_RATE = 3    // per second (was 0.5) — much faster survival regen
export const HEALTH_REGEN_DELAY = 2   // seconds after taking damage before regen starts (was 3)

// ── Quests ──────────────────────────────────────────────
export type QuestId = 'firstBlood' | 'wraithHunter' | 'roadBuilder' | 'gangDiplomat' | 'timeDriver' | 'crystalCollector' | 'voidMenace' | 'timeExplorer' | 'gangWarrior' | 'golemSlayer' | 'zoneHopper' | 'millionMile' | 'phaseMenace' | 'sentinelDown' | 'behemothSlayer'

export interface QuestObjective {
  description: string
  type: 'kill' | 'harvest' | 'build' | 'travel' | 'trade' | 'reputation' | 'explore'
  targetId?: string    // enemy type, resource type, faction, etc.
  targetCount: number
}

export interface QuestDef {
  id: QuestId
  title: string
  description: string
  giver: string           // 'lab' | 'trader' | 'shrine' | 'auto'
  objectives: QuestObjective[]
  rewards: { renown: number; liquid?: number; crystal?: number; raw?: number; weapon?: WeaponId }
  prerequisiteFormula?: string  // formula required to start
  prerequisiteQuest?: QuestId  // quest required to start
}

export const QUESTS: Record<QuestId, QuestDef> = {
  firstBlood: {
    id: 'firstBlood',
    title: 'First Blood',
    description: 'The void stirs. Banish your first enemy.',
    giver: 'auto',
    objectives: [{ description: 'Kill 1 Wraith', type: 'kill', targetId: 'wraith', targetCount: 1 }],
    rewards: { renown: 3, raw: 10 },
  },
  wraithHunter: {
    id: 'wraithHunter',
    title: 'Wraith Hunter',
    description: 'Clear the area of hostile wraiths.',
    giver: 'lab',
    objectives: [{ description: 'Kill 10 Wraiths', type: 'kill', targetId: 'wraith', targetCount: 10 }],
    rewards: { renown: 10, liquid: 25 },
    prerequisiteFormula: 'crystallization',
  },
  roadBuilder: {
    id: 'roadBuilder',
    title: 'Road Builder',
    description: 'Connect the landmarks with roads.',
    giver: 'trader',
    objectives: [
      { description: 'Place 20 road blocks', type: 'build', targetCount: 20 },
    ],
    rewards: { renown: 8, crystal: 5 },
  },
  voidMenace: {
    id: 'voidMenace',
    title: 'Void Menace',
    description: 'A powerful Void Wraith threatens the island. Eliminate it.',
    giver: 'lab',
    objectives: [{ description: 'Kill 3 Void Wraiths', type: 'kill', targetId: 'voidWraith', targetCount: 3 }],
    rewards: { renown: 20, crystal: 10, weapon: 'energyRifle' },
    prerequisiteQuest: 'wraithHunter',
  },
  gangDiplomat: {
    id: 'gangDiplomat',
    title: 'Gang Diplomat',
    description: 'Build reputation with the local factions.',
    giver: 'shrine',
    objectives: [{ description: 'Reach 20 reputation with any faction', type: 'reputation', targetCount: 20 }],
    rewards: { renown: 15, liquid: 30 },
    prerequisiteFormula: 'timelineEcho',
  },
  timeDriver: {
    id: 'timeDriver',
    title: 'Time Driver',
    description: 'Craft a vehicle and ride across the island.',
    giver: 'lab',
    objectives: [{ description: 'Build a vehicle and travel 100 units', type: 'travel', targetCount: 100 }],
    rewards: { renown: 12, raw: 50 },
    prerequisiteQuest: 'roadBuilder',
  },
  crystalCollector: {
    id: 'crystalCollector',
    title: 'Crystal Collector',
    description: 'Gather enough crystal to empower the shrine.',
    giver: 'shrine',
    objectives: [{ description: 'Harvest 50 Crystal', type: 'harvest', targetId: 'crystal', targetCount: 50 }],
    rewards: { renown: 10, liquid: 15 },
    prerequisiteFormula: 'crystallization',
  },
  timeExplorer: {
    id: 'timeExplorer',
    title: 'Time Explorer',
    description: 'Discover the mysterious time zones scattered across the island.',
    giver: 'auto',
    objectives: [{ description: 'Travel 500 units total', type: 'travel', targetCount: 500 }],
    rewards: { renown: 15, liquid: 30 },
    prerequisiteQuest: 'timeDriver',
  },
  gangWarrior: {
    id: 'gangWarrior',
    title: 'Gang Warrior',
    description: 'Prove your strength by defeating enemies near every territory.',
    giver: 'auto',
    objectives: [{ description: 'Kill 30 Wraiths', type: 'kill', targetId: 'wraith', targetCount: 30 }],
    rewards: { renown: 25, raw: 75 },
    prerequisiteQuest: 'wraithHunter',
  },
  golemSlayer: {
    id: 'golemSlayer',
    title: 'Golem Slayer',
    description: 'The Crystal Golems are tough. Show them who\'s boss.',
    giver: 'lab',
    objectives: [{ description: 'Kill 5 Crystal Golems', type: 'kill', targetId: 'timeCrystalGolem', targetCount: 5 }],
    rewards: { renown: 30, crystal: 20, weapon: 'timeBlaster' },
    prerequisiteQuest: 'voidMenace',
  },
  zoneHopper: {
    id: 'zoneHopper',
    title: 'Zone Hopper',
    description: 'Master the time zones by visiting them all — fast and slow.',
    giver: 'shrine',
    objectives: [{ description: 'Travel 1000 units total', type: 'travel', targetCount: 1000 }],
    rewards: { renown: 20, liquid: 50 },
    prerequisiteQuest: 'timeExplorer',
  },
  millionMile: {
    id: 'millionMile',
    title: 'Million Mile',
    description: 'The ultimate traveler — journey across the entire island.',
    giver: 'auto',
    objectives: [{ description: 'Travel 2000 units total', type: 'travel', targetCount: 2000 }],
    rewards: { renown: 50, crystal: 25, raw: 200 },
    prerequisiteQuest: 'zoneHopper',
  },
  phaseMenace: {
    id: 'phaseMenace',
    title: 'Phase Menace',
    description: 'Phase Shifters warp reality itself. Eliminate 5 of them.',
    giver: 'lab',
    objectives: [{ description: 'Kill 5 Phase Shifters', type: 'kill', targetId: 'phaseShifter', targetCount: 5 }],
    rewards: { renown: 35, crystal: 15, liquid: 40 },
    prerequisiteQuest: 'golemSlayer',
  },
  sentinelDown: {
    id: 'sentinelDown',
    title: 'Sentinel Down',
    description: 'Temporal Sentinels guard ancient time crystals. Destroy 3.',
    giver: 'shrine',
    objectives: [{ description: 'Kill 3 Temporal Sentinels', type: 'kill', targetId: 'temporalSentinel', targetCount: 3 }],
    rewards: { renown: 40, liquid: 60, weapon: 'timeBlaster' },
    prerequisiteQuest: 'phaseMenace',
  },
  behemothSlayer: {
    id: 'behemothSlayer',
    title: 'Behemoth Slayer',
    description: 'The Chrono-Behemoth is the greatest threat to the timeline. Defeat it.',
    giver: 'lab',
    objectives: [{ description: 'Kill the Chrono-Behemoth', type: 'kill', targetId: 'chronoBehemoth', targetCount: 1 }],
    rewards: { renown: 100, crystal: 50, raw: 300 },
    prerequisiteQuest: 'sentinelDown',
  },
}

// ── Road block type ─────────────────────────────────────
export const ROAD_BLOCK_COST = 2  // Liquid per road segment
export const ROAD_COLOR = '#445566'
