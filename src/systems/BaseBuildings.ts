// ── Base Buildings — placeable structures that produce resources & defend ──

import { useStore } from '../store'

export type BuildingId =
  | 'autoHarvester' | 'timeWell' | 'guardTower'
  | 'refinery' | 'crystalShrine' | 'chronoGenerator'
  | 'voidBarrier' | 'renownVault'

export interface BuildingDef {
  id: BuildingId
  name: string
  description: string
  cost: { raw?: number; vapour?: number; liquid?: number; crystal?: number; renown?: number }
  production: { type: string; amount: number; interval: number } // per interval ms
  maxCount: number
  color: string
  icon: string
  radius: number // visual radius
  special?: string
}

export const ALL_BUILDINGS: Record<BuildingId, BuildingDef> = {
  autoHarvester: {
    id: 'autoHarvester',
    name: 'Auto-Harvester',
    description: 'Automatically harvests 5 raw every 3 seconds',
    cost: { raw: 50, vapour: 20 },
    production: { type: 'raw', amount: 5, interval: 3000 },
    maxCount: 5,
    color: '#44ff88',
    icon: '⚙',
    radius: 3,
  },
  timeWell: {
    id: 'timeWell',
    name: 'Time Well',
    description: 'Generates 1 liquid every 5 seconds from ambient time energy',
    cost: { raw: 100, liquid: 25 },
    production: { type: 'liquid', amount: 1, interval: 5000 },
    maxCount: 3,
    color: '#44ccff',
    icon: '⏳',
    radius: 4,
  },
  guardTower: {
    id: 'guardTower',
    name: 'Guard Tower',
    description: 'Auto-attacks enemies within 20 units for 15 damage every 2s',
    cost: { raw: 80, vapour: 40, liquid: 15 },
    production: { type: 'combat', amount: 15, interval: 2000 },
    maxCount: 4,
    color: '#ff6644',
    icon: '🏛',
    radius: 20,
    special: 'Auto-attacks enemies',
  },
  refinery: {
    id: 'refinery',
    name: 'Refinery',
    description: 'Auto-refines 3 raw into 1 vapour every 4 seconds',
    cost: { raw: 150, vapour: 60, crystal: 10 },
    production: { type: 'vapour', amount: 1, interval: 4000 },
    maxCount: 2,
    color: '#ffaa44',
    icon: '⟐',
    radius: 4,
  },
  crystalShrine: {
    id: 'crystalShrine',
    name: 'Crystal Shrine',
    description: 'Generates 1 crystal every 10 seconds',
    cost: { raw: 200, liquid: 50, crystal: 20, renown: 5 },
    production: { type: 'crystal', amount: 1, interval: 10000 },
    maxCount: 2,
    color: '#aa88ff',
    icon: '◆',
    radius: 5,
  },
  chronoGenerator: {
    id: 'chronoGenerator',
    name: 'Chrono Generator',
    description: 'Boosts all other building production by 25% within 15 units',
    cost: { raw: 300, crystal: 15, renown: 10 },
    production: { type: 'boost', amount: 25, interval: 0 },
    maxCount: 1,
    color: '#ff44ff',
    icon: '⬡',
    radius: 15,
    special: 'Boosts nearby buildings 25%',
  },
  voidBarrier: {
    id: 'voidBarrier',
    name: 'Void Barrier',
    description: 'Prevents enemy spawns within 25-unit radius',
    cost: { raw: 200, liquid: 40, crystal: 10, renown: 8 },
    production: { type: 'defense', amount: 1, interval: 0 },
    maxCount: 1,
    color: '#aa44ff',
    icon: '🛡',
    radius: 25,
    special: 'No enemy spawns in radius',
  },
  renownVault: {
    id: 'renownVault',
    name: 'Renown Vault',
    description: 'Generates 1 renown every 15 seconds',
    cost: { raw: 500, liquid: 100, crystal: 30, renown: 20 },
    production: { type: 'renown', amount: 1, interval: 15000 },
    maxCount: 1,
    color: '#ffd700',
    icon: '✦',
    radius: 5,
  },
}

// ── State ──────────────────────────────────────────────────

export interface PlacedBuilding {
  id: string
  buildingId: BuildingId
  position: [number, number, number]
  placedAt: number
  lastProduced: number
}

let _placedBuildings: PlacedBuilding[] = []
let _totalProduction: Record<string, number> = {}

export function getPlacedBuildings(): PlacedBuilding[] {
  return _placedBuildings
}

export function getBuildingCount(id: BuildingId): number {
  return _placedBuildings.filter((b) => b.buildingId === id).length
}

export function getTotalProduction(): Record<string, number> {
  return { ..._totalProduction }
}

export function canPlaceBuilding(id: BuildingId): boolean {
  const def = ALL_BUILDINGS[id]
  if (!def) return false
  const count = getBuildingCount(id)
  if (count >= def.maxCount) return false

  const state = useStore.getState()
  const inv = state.inventory
  if (def.cost.raw && inv.raw < def.cost.raw) return false
  if (def.cost.vapour && inv.vapour < def.cost.vapour) return false
  if (def.cost.liquid && inv.liquid < def.cost.liquid) return false
  if (def.cost.crystal && inv.crystal < def.cost.crystal) return false
  if (def.cost.renown && inv.renown < def.cost.renown) return false
  return true
}

export function placeBuilding(id: BuildingId, position: [number, number, number]): boolean {
  const def = ALL_BUILDINGS[id]
  if (!def) return false
  if (!canPlaceBuilding(id)) return false

  const state = useStore.getState()
  useStore.setState((s) => ({
    inventory: {
      ...s.inventory,
      raw: s.inventory.raw - (def.cost.raw ?? 0),
      vapour: s.inventory.vapour - (def.cost.vapour ?? 0),
      liquid: s.inventory.liquid - (def.cost.liquid ?? 0),
      crystal: s.inventory.crystal - (def.cost.crystal ?? 0),
      renown: s.inventory.renown - (def.cost.renown ?? 0),
    },
  }))

  const building: PlacedBuilding = {
    id: `bld-${id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    buildingId: id,
    position,
    placedAt: Date.now(),
    lastProduced: Date.now(),
  }

  _placedBuildings.push(building)
  return true
}

export function removeBuilding(buildingId: string): void {
  _placedBuildings = _placedBuildings.filter((b) => b.id !== buildingId)
}

export function tickBuildings(): void {
  const now = Date.now()
  const log: Record<string, number> = {}

  for (const building of _placedBuildings) {
    const def = ALL_BUILDINGS[building.buildingId]
    if (!def || def.production.interval <= 0) continue
    if (def.production.type === 'combat') continue
    if (def.production.type === 'boost') continue
    if (def.production.type === 'defense') continue

    const elapsed = now - building.lastProduced
    if (elapsed >= def.production.interval) {
      const cycles = Math.floor(elapsed / def.production.interval)
      const actualCycles = Math.min(cycles, 5) // cap at 5 to prevent huge batches

      // Check for chronoGenerator boost
      let boostMult = 1
      for (const other of _placedBuildings) {
        if (other.buildingId === 'chronoGenerator') {
          const dx = building.position[0] - other.position[0]
          const dz = building.position[2] - other.position[2]
          const dist = Math.sqrt(dx * dx + dz * dz)
          if (dist <= 15) {
            boostMult += 0.25
          }
        }
      }

      const totalAmount = Math.floor(def.production.amount * actualCycles * boostMult)

      if (totalAmount > 0) {
        const inv = useStore.getState().inventory
        const type = def.production.type as keyof typeof inv
        useStore.setState((s) => ({
          inventory: {
            ...s.inventory,
            [type]: Math.min(9999, (s.inventory[type] ?? 0) + totalAmount),
          },
        }))
        log[def.name] = (log[def.name] ?? 0) + totalAmount
        building.lastProduced = now
      }
    }
  }

  _totalProduction = log
}

/** Get the visual position for a new building (snapped to grid near player) */
export function getBuildingPlacementPosition(
  playerPos: [number, number, number],
  buildingId: BuildingId,
): [number, number, number] {
  const def = ALL_BUILDINGS[buildingId]
  const offset = def ? def.radius : 3
  return [Math.round(playerPos[0] + offset), 0, Math.round(playerPos[2])]
}
