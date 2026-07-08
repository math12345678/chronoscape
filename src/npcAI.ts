import { useStore } from './store'
import { getTerrainHeight } from './terrain'
import { HARVEST_AMOUNT, LAB_POSITION } from './config/constants'
import { SHRINE_POSITION } from './components/Shrine/TimeShrine'
import { TRADER_POSITION } from './components/Trader'
import { getNearestRiftPos } from './world/riftManager'

// ── Types ───────────────────────────────────────────────

export type NPCState = 'idle' | 'wander' | 'seek_rift' | 'harvest' | 'return' | 'rest' | 'tour' | 'interacting' | 'follow' | 'seek_shelter' | 'seek_build' | 'build'
export type NPCTask = 'idle' | 'harvester' | 'builder' | 'explorer'
export type NPCBodyType = 'thin' | 'stocky' | 'average'
export type NPCAccessory = 'none' | 'backpack' | 'scarf' | 'hat_variant' | 'staff' | 'cape'

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

  // Phase 3: NPC Interaction
  interactingWith: string | null  // ID of NPC they're talking to
  interactionTimer: number        // seconds remaining in interaction

  // Phase 3: Following
  following: boolean              // true if following player
  followingSince: number | null   // timestamp when follow started

  // Phase 3: Variety
  bodyType: NPCBodyType
  accessory: NPCAccessory

  // Phase 3: Gifting
  giftColor: string | null        // override color after gifting crystal
  giftVitalityBonus: number        // bonus vitality from gifting liquid
}

// ── Names for NPCs (50+) ────────────────────────────────

const NAMES = [
  'Kael', 'Mira', 'Thorn', 'Vela', 'Orin', 'Sylva', 'Dorn', 'Lira',
  'Fenn', 'Nyx', 'Brin', 'Zara', 'Corv', 'Lune', 'Ash', 'Pike',
  'Varek', 'Sera', 'Tobin', 'Lyra', 'Gale', 'Nox', 'Riven', 'Eira',
  'Theron', 'Vex', 'Mara', 'Kaelen', 'Soril', 'Dax', 'Lys', 'Fenris',
  'Zeph', 'Cora', 'Bael', 'Nyra', 'Torvin', 'Siv', 'Rook', 'Elara',
  'Darian', 'Vespa', 'Korr', 'Miven', 'Thalia', 'Orin', 'Soren', 'Vayla',
  'Prynn', 'Kaelith', 'Morv', 'Selene', 'Drift', 'Nym', 'Caspian',
]

// ── Colors (20) ─────────────────────────────────────────

const COLORS = [
  '#cc6644', '#44aa88', '#8866cc', '#cc8844', '#4488cc',
  '#66aa44', '#cc4466', '#44ccaa', '#aa66cc', '#ccaa44',
  '#3388aa', '#cc7755', '#55bb66', '#aa5588', '#88aa33',
  '#dd8844', '#44aacc', '#bb66aa', '#66cc88', '#cc6644',
]

// ── Gift bright color variants ──────────────────────────

const GIFT_COLORS = [
  '#ff88cc', '#88ffcc', '#ffcc88', '#88ccff', '#ccff88',
  '#ff88ff', '#88ff88', '#ffaa88', '#88aaff', '#aaff88',
]

// ── Key locations for NPC waypoints ────────────────────

export const WAYPOINTS: { name: string; pos: [number, number, number] }[] = [
  { name: 'Lab', pos: [LAB_POSITION[0], 0, LAB_POSITION[2]] },
  { name: 'Trader', pos: [TRADER_POSITION[0], 0, TRADER_POSITION[2]] },
  { name: 'Shrine', pos: [SHRINE_POSITION[0], 0, SHRINE_POSITION[2]] },
  { name: 'Plaza', pos: [0, 0, 0] },
]

// ── Shelter locations (for night behavior) ──────────────

const SHELTERS: [number, number, number][] = [
  [LAB_POSITION[0], LAB_POSITION[1], LAB_POSITION[2]],
  [SHRINE_POSITION[0], SHRINE_POSITION[1], SHRINE_POSITION[2]],
]

// ── Behavior parameters ─────────────────────────────────

const WANDER_RADIUS = 30
const HARVEST_DURATION = 3
const REST_DURATION = 5
const MAX_ENERGY = 100
const ENERGY_DRAIN_PER_SEC = 1.5
const ENERGY_RESTORE_PER_SEC = 8
const STATE_CHANGE_COOLDOWN = 2
const TOUR_DURATION = 8
const INTERACTION_DISTANCE = 3
const INTERACTION_DURATION = 3   // seconds for NPC chat
const FOLLOW_DISTANCE = 3


// ── Generate a new NPC ──────────────────────────────────

let nextNpcId = 1

export function generateNPC(hired: boolean = false, nearX = 0, nearZ = 0): ExtendedNPC {
  const theta = Math.random() * Math.PI * 2
  const r = 5 + Math.random() * 25
  const x = nearX + Math.cos(theta) * r
  const z = nearZ + Math.sin(theta) * r
  const y = getTerrainHeight(x, z)

  const bodyTypes: NPCBodyType[] = ['thin', 'stocky', 'average']
  const accessories: NPCAccessory[] = ['none', 'none', 'none', 'backpack', 'scarf', 'hat_variant', 'staff', 'cape']

  const tasks: NPCTask[] = ['harvester', 'harvester', 'harvester', 'builder', 'explorer']
  const chosenTask: NPCTask = hired ? tasks[Math.floor(Math.random() * tasks.length)] : 'idle'
  return {
    id: `npc-${nextNpcId++}`,
    name: NAMES[Math.floor(Math.random() * NAMES.length)],
    position: [x, y, z],
    target: null,
    state: 'idle',
    task: chosenTask,
    vitality: 80 + Math.random() * 20,
    energy: 60 + Math.random() * 40,
    speed: 2 + Math.random() * 1.5,
    scale: 0.8 + Math.random() * 0.4,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    hired,
    hiredAt: hired ? Date.now() : null,
    inventory: { raw: 0, vapour: chosenTask === 'builder' ? 20 : 0 },
    stateTimer: 0,
    targetRiftIndex: -1,
    // Phase 3
    interactingWith: null,
    interactionTimer: 0,
    following: false,
    followingSince: null,
    bodyType: bodyTypes[Math.floor(Math.random() * bodyTypes.length)],
    accessory: accessories[Math.floor(Math.random() * accessories.length)],
    giftColor: null,
    giftVitalityBonus: 0,
  }
}

// ── Spawn initial NPCs ──────────────────────────────────

export function spawnInitialNPCs(count: number = 10, nearX = 0, nearZ = 0): ExtendedNPC[] {
  return Array.from({ length: count }, () => generateNPC(false, nearX, nearZ))
}

// ── NPC Interaction mutation request ─────────────────────
export interface NPCMutation {
  npcId: string
  state: NPCState
  interactingWith: string | null
  interactionTimer: number
}

// ── AI Behavior Tick ────────────────────────────────────

export function tickNPC(npc: ExtendedNPC, dt: number, dayFactor: number = 1.0, playerPos?: [number, number, number], allNPCs?: ExtendedNPC[]): { npc: ExtendedNPC; mutations: NPCMutation[] } {
  // Clone to avoid mutation
  const n = { ...npc, position: [...npc.position] as [number, number, number] }
  if (n.target) n.target = [...n.target] as [number, number, number]
  const mutations: NPCMutation[] = []

  // Energy management
  if (n.state === 'rest' || n.state === 'idle') {
    n.energy = Math.min(MAX_ENERGY, n.energy + ENERGY_RESTORE_PER_SEC * dt)
  } else {
    n.energy = Math.max(0, n.energy - ENERGY_DRAIN_PER_SEC * dt)
  }

  // Vitality slowly decays
  n.vitality = Math.max(50, n.vitality - 0.02 * dt)

  // State timer
  n.stateTimer -= dt

  // Interacting timer
  if (n.interactingWith) {
    n.interactionTimer -= dt
    if (n.interactionTimer <= 0) {
      n.interactingWith = null
      n.state = 'idle'
      n.stateTimer = 1
    }
    return { npc: n, mutations }
  }

  // Follow: check if player stopped moving too long
  if (n.following && n.followingSince !== null && playerPos) {
    n.followingSince = Date.now() // Reset each frame to keep following alive
    // The external system (NPCTick) will check if player moved
  }

  // Behavior decision
  switch (n.state) {
    case 'follow': {
      if (playerPos) {
        // Deterministic offset from NPC id hash (not Math.random — prevents jitter)
        const idHash = n.id.charCodeAt(n.id.length - 1) % 4
        const fx = (idHash % 2 === 0 ? 1 : -1) * (0.3 + (idHash % 3) * 0.2)
        const fz = (idHash % 2 === 0 ? -1 : 1) * (0.3 + ((idHash + 1) % 3) * 0.2)
        const followTarget: [number, number, number] = [
          playerPos[0] - FOLLOW_DISTANCE + fx,
          getTerrainHeight(playerPos[0], playerPos[2]),
          playerPos[2] - FOLLOW_DISTANCE + fz,
        ]
        n.target = followTarget
        moveToward(n, followTarget, dt)
      } else {
        n.state = 'idle'
        n.stateTimer = 1
      }
      break
    }

    case 'idle': {
      if (n.stateTimer <= 0) {
        // Night behavior: seek shelter
        if (dayFactor < 0.3) {
          n.state = 'seek_shelter'
          const shelter = SHELTERS[Math.floor(Math.random() * SHELTERS.length)]
          const sx = shelter[0] + (Math.random() - 0.5) * 3
          const sz = shelter[2] + (Math.random() - 0.5) * 3
          n.target = [sx, getTerrainHeight(sx, sz), sz]
          n.stateTimer = 10
          break
        }

        if (n.following && playerPos) {
          n.state = 'follow'
          break
        }

          if (n.energy < 30) {
          n.state = 'rest'
          n.stateTimer = REST_DURATION
        } else if (n.task === 'harvester') {
          const nearest = getNearestRiftPos(n.position[0], n.position[2])
          if (nearest) {
            n.state = 'seek_rift'
            n.target = [nearest.x, getTerrainHeight(nearest.x, nearest.z), nearest.z]
          } else {
            n.state = 'wander'
            n.target = randomPoint(n.position)
            n.stateTimer = STATE_CHANGE_COOLDOWN
          }
        } else if (n.task === 'builder') {
          const nearest = getNearestRiftPos(n.position[0], n.position[2])
          if (nearest) {
            // Build adjacent to rift
            const angle = Math.random() * Math.PI * 2
            const bx = nearest.x + Math.cos(angle) * 3
            const bz = nearest.z + Math.sin(angle) * 3
            n.state = 'seek_build'
            n.target = [bx, getTerrainHeight(bx, bz), bz]
          } else {
            n.state = 'wander'
            n.target = randomPoint(n.position)
            n.stateTimer = STATE_CHANGE_COOLDOWN
          }
        } else {
          // Check for other NPCs nearby to interact with
          const nearbyNPC = allNPCs ? findNearbyNPC(n, allNPCs) : null
          if (nearbyNPC) {
            n.state = 'interacting'
            n.interactingWith = nearbyNPC.id
            n.interactionTimer = INTERACTION_DURATION
            n.target = nearbyNPC.position
            // Schedule a mutation for the other NPC (applied by NPCTick loop)
            mutations.push({
              npcId: nearbyNPC.id,
              state: 'interacting',
              interactingWith: n.id,
              interactionTimer: INTERACTION_DURATION,
            })
          } else if (Math.random() < 0.35) {
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
        n.state = 'idle'
        n.stateTimer = 3 + Math.random() * 4
        n.target = null
      } else if (n.stateTimer <= 0) {
        n.state = 'idle'
        n.stateTimer = 1
        n.target = null
      }
      break
    }

    case 'seek_shelter': {
      if (n.target && moveToward(n, n.target, dt)) {
        n.state = 'idle'
        n.stateTimer = 4 + Math.random() * 6
        n.target = null
      } else if (stateTimerElapsed(n, dt)) {
        n.state = 'idle'
        n.stateTimer = 1
        n.target = null
      }
      break
    }

    case 'seek_rift': {
      if (n.target && moveToward(n, n.target, dt)) {
        n.state = 'harvest'
        n.stateTimer = HARVEST_DURATION
      } else if (n.stateTimer <= 0 && !n.target) {
        n.state = 'idle'
        n.stateTimer = 1
      }
      break
    }

    case 'harvest': {
      if (n.stateTimer <= 0) {
        n.inventory.raw += HARVEST_AMOUNT
        if (n.hired) {
          useStore.getState().addRaw(HARVEST_AMOUNT)
        }
        n.state = 'idle'
        n.stateTimer = 1
      }
      break
    }

    case 'seek_build': {
      if (n.target && moveToward(n, n.target, dt)) {
        n.state = 'build'
        n.stateTimer = 2
        n.target = null
      } else if (n.stateTimer <= 0 && !n.target) {
        n.state = 'idle'
        n.stateTimer = 1
      }
      break
    }

    case 'build': {
      if (n.stateTimer <= 0) {
        // Place a vapour block at the build site
        const px = n.position[0]
        const pz = n.position[2]
        // Place below the NPC's feet (terrain level)
        const py = getTerrainHeight(px, pz)
        const blockX = Math.floor(px)
        const blockZ = Math.floor(pz)
        const blockY = Math.ceil(py)

        // Only place if not already occupied
        const key = `${blockX},${blockY},${blockZ}`
        const existing = useStore.getState().blocks[key]
        if (!existing) {
          // Draw vapour from NPC inventory if available, otherwise from player store
          if (n.inventory.vapour >= 5) {
            n.inventory.vapour -= 5
          } else if (n.hired) {
            // Draw from player if hired
            useStore.setState((s) => ({
              inventory: { ...s.inventory, vapour: Math.max(0, s.inventory.vapour - 5) },
            }))
          }
          useStore.getState().placeBlock(blockX, blockY, blockZ, 'vapour')
        }

        n.state = 'idle'
        n.stateTimer = 0.5 + Math.random() * 1
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

    case 'interacting': {
      // Interacting is handled by the timer check above
      break
    }

    case 'return': {
      n.state = 'idle'
      n.stateTimer = 1
      break
    }
  }

  return { npc: n, mutations }
}

// ── NPC-to-NPC Interaction ──────────────────────────────

function findNearbyNPC(self: ExtendedNPC, allNPCs: ExtendedNPC[]): ExtendedNPC | null {
  for (const other of allNPCs) {
    if (other.id === self.id) continue
    if (other.interactingWith) continue  // already talking
    const dist = Math.sqrt(
      (self.position[0] - other.position[0]) ** 2 +
      (self.position[2] - other.position[2]) ** 2,
    )
    if (dist < INTERACTION_DISTANCE && Math.random() < 0.3) {
      // Return the other NPC without mutating it — mutations are applied
      // by NPCTick after all clones are safely processed
      return other
    }
  }
  return null
}

// ── Helpers ─────────────────────────────────────────────

function stateTimerElapsed(n: ExtendedNPC, _dt: number): boolean {
  return n.stateTimer <= 0
}

function randomPoint(from: [number, number, number]): [number, number, number] {
  const theta = Math.random() * Math.PI * 2
  const r = 2 + Math.random() * WANDER_RADIUS
  const x = from[0] + Math.cos(theta) * r
  const z = from[2] + Math.sin(theta) * r
  const y = getTerrainHeight(x, z)
  return [x, y, z]
}

function moveToward(
  npc: ExtendedNPC,
  target: [number, number, number],
  dt: number,
): boolean {
  const dx = target[0] - npc.position[0]
  const dz = target[2] - npc.position[2]
  const dist = Math.sqrt(dx * dx + dz * dz)

  if (dist < 0.3) return true

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

/** Gift an NPC liquid — permanently increases vitality */
export function giftLiquidToNPC(npc: ExtendedNPC, amount: number): boolean {
  const state = useStore.getState()
  if (state.inventory.liquid < amount) return false
  useStore.setState((s) => ({
    inventory: { ...s.inventory, liquid: s.inventory.liquid - amount },
  }))
  npc.vitality = Math.min(100, npc.vitality + 5)
  return true
}

/** Gift an NPC crystal — permanently changes their color to a bright variant */
export function giftCrystalToNPC(npc: ExtendedNPC, amount: number): boolean {
  const state = useStore.getState()
  if (state.inventory.crystal < amount) return false
  useStore.setState((s) => ({
    inventory: { ...s.inventory, crystal: s.inventory.crystal - amount },
  }))
  const newColor = GIFT_COLORS[Math.floor(Math.random() * GIFT_COLORS.length)]
  npc.giftColor = newColor
  npc.vitality = Math.min(100, npc.vitality + 3)
  return true
}
