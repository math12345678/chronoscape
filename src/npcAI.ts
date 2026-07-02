import { useStore } from './store'
import { getTerrainHeight } from './terrain'
import { TIME_RIFT_POSITIONS, HARVEST_AMOUNT } from './config/constants'

// ── Types ───────────────────────────────────────────────

export type NPCState = 'idle' | 'wander' | 'seek_rift' | 'harvest' | 'return' | 'rest' | 'tour'
export type NPCTask = 'idle' | 'harvester' | 'builder' | 'explorer'

export interface ExtendedNPC {
  id: string
  name: string
  position: [number, number, number]
  target: [number, number, number] | null
  state: NPCState
  task: NPCTask
  vitality: number        // 0-100 health
  energy: number          // 0-100 stamina
  speed: number           // movement speed
  scale: number           // visual scale
  color: string           // robe color (hex)
  hired: boolean          // true if player hired them
  hiredAt: number | null  // timestamp when hired
  inventory: { raw: number; vapour: number }
  stateTimer: number      // seconds remaining in current state
  targetRiftIndex: number // which rift they're heading to
}

// ── Names for NPCs ──────────────────────────────────────

const NAMES = [
  'Kael', 'Mira', 'Thorn', 'Vela', 'Orin', 'Sylva', 'Dorn', 'Lira',
  'Fenn', 'Nyx', 'Brin', 'Zara', 'Corv', 'Lune', 'Ash', 'Pike',
]

const COLORS = [
  '#cc6644', '#44aa88', '#8866cc', '#cc8844', '#4488cc',
  '#66aa44', '#cc4466', '#44ccaa', '#aa66cc', '#ccaa44',
]

// ── Key locations for NPC waypoints ────────────────────

export const WAYPOINTS: { name: string; pos: [number, number, number] }[] = [
  { name: 'Lab', pos: [0, 0, -15] },
  { name: 'Trader', pos: [0, 0, 18] },
  { name: 'Shrine', pos: [18, 0, -8] },
  { name: 'Plaza', pos: [0, 0, 0] },
]

// ── Behavior parameters ─────────────────────────────────

const WANDER_RADIUS = 15
const HARVEST_DURATION = 3    // seconds to "harvest" at a rift
const REST_DURATION = 5       // seconds to rest
const MAX_ENERGY = 100
const ENERGY_DRAIN_PER_SEC = 1.5
const ENERGY_RESTORE_PER_SEC = 8
const STATE_CHANGE_COOLDOWN = 2
const TOUR_DURATION = 8       // seconds to spend visiting a waypoint

// ── Generate a new NPC ──────────────────────────────────

let nextNpcId = 1

export function generateNPC(hired: boolean = false): ExtendedNPC {
  const theta = Math.random() * Math.PI * 2
  const r = 5 + Math.random() * 10
  const x = Math.cos(theta) * r
  const z = Math.sin(theta) * r
  const y = getTerrainHeight(x, z)

  return {
    id: `npc-${nextNpcId++}`,
    name: NAMES[Math.floor(Math.random() * NAMES.length)],
    position: [x, y, z],
    target: null,
    state: 'idle',
    task: hired ? 'harvester' : 'idle',
    vitality: 80 + Math.random() * 20,
    energy: 60 + Math.random() * 40,
    speed: 2 + Math.random() * 1.5,
    scale: 0.8 + Math.random() * 0.4,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    hired,
    hiredAt: hired ? Date.now() : null,
    inventory: { raw: 0, vapour: 0 },
    stateTimer: 0,
    targetRiftIndex: -1,
  }
}

// ── Spawn initial NPCs ──────────────────────────────────

export function spawnInitialNPCs(count: number = 4): ExtendedNPC[] {
  return Array.from({ length: count }, () => generateNPC(false))
}

// ── AI Behavior Tick ────────────────────────────────────

export function tickNPC(npc: ExtendedNPC, dt: number): ExtendedNPC {
  // Clone to avoid mutation
  const n = { ...npc, position: [...npc.position] as [number, number, number] }
  if (n.target) n.target = [...n.target] as [number, number, number]

  // Energy management
  if (n.state === 'rest' || n.state === 'idle') {
    n.energy = Math.min(MAX_ENERGY, n.energy + ENERGY_RESTORE_PER_SEC * dt)
  } else {
    n.energy = Math.max(0, n.energy - ENERGY_DRAIN_PER_SEC * dt)
  }

  // Vitality slowly decays (tie-in to time theme)
  n.vitality = Math.max(50, n.vitality - 0.02 * dt)

  // State timer
  n.stateTimer -= dt

  // Behavior decision
  switch (n.state) {
    case 'idle': {
      if (n.stateTimer <= 0) {
        if (n.energy < 30) {
          n.state = 'rest'
          n.stateTimer = REST_DURATION
        } else if (n.task === 'harvester') {
          n.state = 'seek_rift'
          n.targetRiftIndex = pickNearestRift(n.position)
          if (n.targetRiftIndex >= 0) {
            const riftPos = TIME_RIFT_POSITIONS[n.targetRiftIndex]
            n.target = [riftPos[0], getTerrainHeight(riftPos[0], riftPos[2]), riftPos[2]]
          } else {
            n.state = 'wander'
            n.target = randomPoint(n.position)
            n.stateTimer = STATE_CHANGE_COOLDOWN
          }
        } else {
          // Wander to key locations with some randomness
          if (Math.random() < 0.35) {
            // Pick a random waypoint to visit
            const wp = WAYPOINTS[Math.floor(Math.random() * WAYPOINTS.length)]
            n.state = 'tour'
            n.target = [wp.pos[0], getTerrainHeight(wp.pos[0], wp.pos[2]), wp.pos[2]]
            n.stateTimer = TOUR_DURATION
          } else {
            n.state = 'wander'
            n.target = randomPoint(n.position)
            n.stateTimer = STATE_CHANGE_COOLDOWN
          }
        }
      }
      break
    }

    case 'wander': {
      if (n.target && moveToward(n, n.target, dt)) {
        n.state = 'idle'
        n.stateTimer = 2 + Math.random() * 3
        n.target = null
      }
      break
    }

    case 'tour': {
      if (n.target && moveToward(n, n.target, dt)) {
        // Arrived at destination — linger a moment
        n.state = 'idle'
        n.stateTimer = 3 + Math.random() * 4
        n.target = null
      } else if (n.stateTimer <= 0) {
        // Time's up, go idle
        n.state = 'idle'
        n.stateTimer = 1
        n.target = null
      }
      break
    }

    case 'seek_rift': {
      if (n.target && moveToward(n, n.target, dt)) {
        // Close enough to rift — start harvesting
        n.state = 'harvest'
        n.stateTimer = HARVEST_DURATION
      } else if (n.stateTimer <= 0 && !n.target) {
        // Lost target, go idle
        n.state = 'idle'
        n.stateTimer = 1
      }
      break
    }

    case 'harvest': {
      if (n.stateTimer <= 0) {
        // Done harvesting — gain resources
        n.inventory.raw += HARVEST_AMOUNT
        if (n.hired) {
          // Hired NPC gives resources to player automatically
          const state = useStore.getState()
          state.addRaw(HARVEST_AMOUNT)
        }
        n.state = 'idle'
        n.stateTimer = 1
      }
      break
    }

    case 'rest': {
      if (n.stateTimer <= 0 || n.energy >= MAX_ENERGY) {
        n.state = 'idle'
        n.stateTimer = 1
      }
      break
    }

    case 'return': {
      // Future: return to a designated point
      n.state = 'idle'
      n.stateTimer = 1
      break
    }
  }

  return n
}

// ── Helpers ─────────────────────────────────────────────

function randomPoint(from: [number, number, number]): [number, number, number] {
  const theta = Math.random() * Math.PI * 2
  const r = 2 + Math.random() * WANDER_RADIUS
  const x = from[0] + Math.cos(theta) * r
  const z = from[2] + Math.sin(theta) * r
  const y = getTerrainHeight(x, z)
  return [x, y, z]
}

function pickNearestRift(pos: [number, number, number]): number {
  let best = -1
  let bestDist = Infinity
  for (let i = 0; i < TIME_RIFT_POSITIONS.length; i++) {
    const r = TIME_RIFT_POSITIONS[i]
    const d = Math.sqrt((pos[0] - r[0]) ** 2 + (pos[2] - r[2]) ** 2)
    if (d < bestDist) {
      bestDist = d
      best = i
    }
  }
  return best
}

function moveToward(
  npc: ExtendedNPC,
  target: [number, number, number],
  dt: number,
): boolean {
  const dx = target[0] - npc.position[0]
  const dz = target[2] - npc.position[2]
  const dist = Math.sqrt(dx * dx + dz * dz)

  if (dist < 0.3) return true // arrived

  const step = npc.speed * dt
  const ratio = Math.min(step / dist, 1)
  npc.position[0] += dx * ratio
  npc.position[2] += dz * ratio
  npc.position[1] = getTerrainHeight(npc.position[0], npc.position[2])

  return false
}

/** How many NPCs the player can hire based on Liquid reserves */
export function maxHirableNPCs(liquid: number): number {
  return Math.floor(liquid / 15)
}
