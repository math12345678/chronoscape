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
  raw: 0.05,      // 5%/s — forces quick refinement
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
export const HARVEST_AMOUNT = 10;       // Raw units per rift interaction
export const RIFT_RESPAWN_MS = 20_000;  // cooldown before a rift reactivates

// ── Blocks ─────────────────────────────────────────────
export const BLOCK_COST: Record<string, number> = {
  vapour: 5,      // Vapour units per block
  crystal: 3,     // Crystal units per block (cheaper because it's rarer)
} as const;

export const BLOCK_REFUND_RATE = 0.5;  // fraction of cost refunded on manual removal
export const VAPOUR_BLOCK_DECAY_MS = 60_000;  // vapour blocks last 60s before despawning

// ── Player ──────────────────────────────────────────────
export const PLAYER_SPEED = 4;          // units per second
export const PLAYER_EYE_HEIGHT = 1.6;   // camera height above ground
export const GRAVITY = -9.8;            // units/s²

// ── World ───────────────────────────────────────────────
export const ISLAND_SIZE = 50;          // ground plane width/depth

// Fixed hand-placed rift positions — these define the MVP world layout
export const TIME_RIFT_POSITIONS: [number, number, number][] = [
  [10, 1, 10],
  [-10, 1, -10],
  [10, 1, -10],
  [-10, 1, 10],
  [0, 1, 15],
];

// ── Lab ─────────────────────────────────────────────────
export const LAB_POSITION: [number, number, number] = [0, 0.5, -15];
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

// ── Trading ────────────────────────────────────────────
export const LIQUID_TO_RENOWN_RATE = 10;   // 10 Liquid → 1 Renown
export const CRYSTAL_TO_RENOWN_RATE = 3;   // 3 Crystal → 1 Renown
