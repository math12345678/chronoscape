// ── Capacities ──────────────────────────────────────────
// Max stack per resource type before refinement is blocked
export const CAPACITY = {
  raw: 100,
  vapour: 100,
  liquid: 200,
  crystal: 50,
} as const;

// ── Decay Rates ─────────────────────────────────────────
// Fraction of max capacity lost per second (0.02 = 2%/s)
export const DECAY_CONFIG = {
  raw: 0.008,     // 0.8%/s — gives ~2min window to refine before raw is gone
  vapour: 0.02,   // 2%/s — the core tension mechanic
  liquid: 0,      // stable
  crystal: 0,     // permanent
} as const;

// ── Refine Ratios ───────────────────────────────────────
// How many Raw units it costs to produce 1 unit of the target state
export const REFINE_RATIOS = {
  raw: 1,
  vapour: 1,      // 1:1
  liquid: 2,      // 2:1
  crystal: 5,     // 5:1
} as const;

// ── Harvesting ──────────────────────────────────────────
export const HARVEST_AMOUNT = 25;       // Raw units per rift interaction
export const RIFT_RESPAWN_MS = 10_000;  // cooldown before a rift reactivates

// ── Blocks ─────────────────────────────────────────────
export const BLOCK_COST: Record<string, number> = {
  vapour: 5,      // Vapour units per block
  crystal: 3,     // Crystal units per block (cheaper because it's rarer)
} as const;

export const BLOCK_REFUND_RATE = 0.75;  // fraction of cost refunded on manual removal
export const VAPOUR_BLOCK_DECAY_MS = 300_000;  // vapour blocks last 5min before despawning

// ── Rift Types ──────────────────────────────────────────
export type RiftType = 'teal' | 'cyan' | 'gold' | 'purple' | 'crimson' | 'rainbow' | 'void' | 'timeWarp'

/** Visual/behavioral config for each rift type */
export const RIFT_TYPE_CONFIG: Record<RiftType, {
  color: string           // Primary color
  glowColor: string        // Glow/emissive color
  particleMultiplier: number   // Multiplier for particle counts (1 = default)
  yieldMultiplier: number      // 1 = standard HARVEST_AMOUNT
  respawnMultiplier: number    // 1 = standard RIFT_RESPAWN_MS
  scale: number           // Orb size (1 = default 0.6)
  beamHeight: number      // Sky beam height
  ringCount: number       // Energy rings count
  label: string           // UX label
}> = {
  teal: {
    color: '#44ffcc',
    glowColor: '#22ddaa',
    particleMultiplier: 1,
    yieldMultiplier: 1,
    respawnMultiplier: 1,
    scale: 1,
    beamHeight: 40,
    ringCount: 5,
    label: 'Standard Rift',
  },
  cyan: {
    color: '#66ddff',
    glowColor: '#44bbee',
    particleMultiplier: 1.8,
    yieldMultiplier: 1.5,
    respawnMultiplier: 1.2,
    scale: 1.3,
    beamHeight: 55,
    ringCount: 6,
    label: 'Rich Rift',
  },
  gold: {
    color: '#ffd700',
    glowColor: '#ddaa00',
    particleMultiplier: 2.5,
    yieldMultiplier: 3,
    respawnMultiplier: 2.0,
    scale: 1.5,
    beamHeight: 60,
    ringCount: 7,
    label: 'Golden Rift',
  },
  purple: {
    color: '#cc66ff',
    glowColor: '#aa44dd',
    particleMultiplier: 1.5,
    yieldMultiplier: 0.8,
    respawnMultiplier: 0.7,
    scale: 0.9,
    beamHeight: 50,
    ringCount: 4,
    label: 'Anomaly Rift',
  },
  crimson: {
    color: '#ff4466',
    glowColor: '#dd2244',
    particleMultiplier: 2,
    yieldMultiplier: 0.5,
    respawnMultiplier: 0.5,
    scale: 0.8,
    beamHeight: 35,
    ringCount: 3,
    label: 'Unstable Rift',
  },
  rainbow: {
    color: '#ff66ee',
    glowColor: '#ff44cc',
    particleMultiplier: 3,
    yieldMultiplier: 1.5,
    respawnMultiplier: 3,
    scale: 1.4,
    beamHeight: 70,
    ringCount: 8,
    label: 'Rainbow Rift',
  },
  timeWarp: {
    color: '#66ff99',
    glowColor: '#44dd77',
    particleMultiplier: 3.5,
    yieldMultiplier: 1.2,
    respawnMultiplier: 2.5,
    scale: 1.3,
    beamHeight: 55,
    ringCount: 7,
    label: 'Time Warp Rift',
  },
  void: {
    color: '#4411aa',
    glowColor: '#330088',
    particleMultiplier: 2,
    yieldMultiplier: 3,
    respawnMultiplier: 3,
    scale: 1.6,
    beamHeight: 50,
    ringCount: 9,
    label: 'Void Rift',
  },
}

// ── Player ──────────────────────────────────────────────
export const PLAYER_SPEED = 8;          // units per second
export const PLAYER_EYE_HEIGHT = 1.6;   // camera height above ground
export const GRAVITY = -9.8;            // units/s²

// ── World ───────────────────────────────────────────────
export const ISLAND_SIZE = 100;          // ground plane width/depth

// Fixed hand-placed rift positions with RiftType — these define the MVP world layout
export const TIME_RIFT_POSITIONS: { pos: [number, number, number]; type: RiftType }[] = [
  { pos: [8, 1, 8], type: 'teal' },   // starter rift — visible from spawn
  { pos: [20, 1, 20], type: 'teal' },
  { pos: [-20, 1, -20], type: 'teal' },
  { pos: [20, 1, -20], type: 'teal' },
  { pos: [-20, 1, 20], type: 'cyan' },
  { pos: [0, 1, 30], type: 'gold' },
  { pos: [35, 1, -10], type: 'purple' },
  { pos: [-30, 1, 25], type: 'crimson' },
  { pos: [40, 1, 35], type: 'rainbow' },
  { pos: [-35, 1, -35], type: 'void' },
  { pos: [50, 1, -25], type: 'timeWarp' },
  { pos: [-45, 1, 30], type: 'timeWarp' },
];

// ── Lab ─────────────────────────────────────────────────
export const LAB_POSITION: [number, number, number] = [0, 0.5, -30];
export const LAB_TRIGGER_RADIUS = 6;  // distance at which the Lab modal opens

// ── Calibration ─────────────────────────────────────────
export const CALIBRATION_TARGETS: Record<string, { start: number; end: number }> = {
  crystallization: { start: 25, end: 55 },
  detonation: { start: 65, end: 85 },
  timelineEcho: { start: 10, end: 30 },
} as const;

export const CALIBRATION_SWEEP_SPEED = 45; // units per second (needle speed)

// ── Explosions ─────────────────────────────────────────
export const EXPLOSION_RADIUS = 3;      // blocks removed within this radius
export const EXPLOSION_RADIUS_FOCUSED = 1.5;
export const CASCADE_CHANCE = 0.3;     // % chance each destroyed block also explodes

// ── Selection ──────────────────────────────────────────
export const SELECTION_DRAG_THRESHOLD = 0.5; // units before a drag starts

// ── Challenge Rifts ────────────────────────────────────
export const CHALLENGE_RIFT_POSITIONS: [number, number, number][] = [
  [40, 1, 30],
  [-35, 1, 25],
  [45, 1, -35],
  [-40, 1, -30],
]
export const CHALLENGE_TYPES = ['harvest', 'build', 'detonate'] as const
export type ChallengeType = typeof CHALLENGE_TYPES[number]

// ── Block Color Palette (12 colors + unlocked color picker) ─────
export const BLOCK_COLOR_PALETTE: Record<string, { vapour: string; crystal: string; label: string }> = {
  default: { vapour: '#ffaa00', crystal: '#aa88ff', label: 'Default' },
  gold: { vapour: '#ffd700', crystal: '#ffaa44', label: 'Gold' },
  ruby: { vapour: '#ff4466', crystal: '#ff6688', label: 'Ruby' },
  sapphire: { vapour: '#44aaff', crystal: '#4488ff', label: 'Sapphire' },
  emerald: { vapour: '#44ff88', crystal: '#22dd66', label: 'Emerald' },
  amethyst: { vapour: '#cc66ff', crystal: '#aa44dd', label: 'Amethyst' },
  topaz: { vapour: '#ffcc44', crystal: '#ffaa22', label: 'Topaz' },
  coral: { vapour: '#ff7788', crystal: '#ff5566', label: 'Coral' },
  sky: { vapour: '#66ccff', crystal: '#44aaff', label: 'Sky' },
  mint: { vapour: '#88ffbb', crystal: '#66ddaa', label: 'Mint' },
  rose: { vapour: '#ff88cc', crystal: '#ff66aa', label: 'Rose' },
  obsidian: { vapour: '#556677', crystal: '#334455', label: 'Obsidian' },
  ivory: { vapour: '#eeddcc', crystal: '#ddccbb', label: 'Ivory' },
}

export const COLOR_PICKER_COST = 10
export const SINGLE_COLOR_COST = 3

// ── Achievements ───────────────────────────────────────
export const ACHIEVEMENT_CATEGORIES = ['Harvesting', 'Refining', 'Building', 'Destruction', 'Economy', 'Exploration', 'Social'] as const

// ── Secrets & Easter Eggs ─────────────────────────────
export const HIDDEN_CHAMBER_POSITION: [number, number, number] = [0, -5, 10]
export const CHRONO_CRYSTAL_POSITION: [number, number, number] = [0, -4.5, 10]

// ── New Game+ ───────────────────────────────────────────
export const NG_DECAY_MULTIPLIER = 1.25

// ── Trading ────────────────────────────────────────────
export const LIQUID_TO_RENOWN_RATE = 10;   // 10 Liquid → 1 Renown
export const CRYSTAL_TO_RENOWN_RATE = 3;   // 3 Crystal → 1 Renown
