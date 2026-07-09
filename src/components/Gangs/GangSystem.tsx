import { useRef, useEffect, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { FACTIONS } from '../../config/combat'
import type { FactionId } from '../../config/combat'
import { setReputationScore } from '../Quest/QuestGiver'
import { getInfiniteTerrainHeight } from '../../world/chunkTerrain'
import { getPrestigeDamageBonus, getPrestigeHarvestBonus } from '../PrestigeSystem'

// ── Faction reputation state ──────────────────────────
let _reputation: Record<FactionId, number> = {
  chronoGuard: 0,
  voidCult: 0,
  crystalSyndicate: 0,
  timeless: 10,
  echoReapers: 0,
  dawnForged: 0,
}

let _playerKillsByFaction: Record<string, number> = {}
let _playerHelpByFaction: Record<string, number> = {}

export function getReputation(faction: FactionId): number { return _reputation[faction] ?? 0 }
export function getAllReputation(): Record<FactionId, number> { return { ..._reputation } }

/** Modify reputation with a faction. Positive = help, negative = hurt */
export function modifyReputation(faction: FactionId, delta: number): void {
  _reputation[faction] = Math.max(-100, Math.min(100, (_reputation[faction] ?? 0) + delta))
  // Update quest tracking
  const allRep = Object.values(_reputation)
  setReputationScore(Math.max(...allRep))
}

/** Record a kill near a specific faction's territory */
export function recordKillNearFaction(faction: FactionId): void {
  _playerKillsByFaction[faction] = (_playerKillsByFaction[faction] ?? 0) + 1
}

// ── Territory zones ──────────────────────────────────
interface TerritoryZone {
  faction: FactionId
  center: [number, number]
  radius: number
}

const TERRITORY_ZONES: TerritoryZone[] = [
  { faction: 'chronoGuard', center: [25, 20], radius: 20 },
  { faction: 'voidCult', center: [-25, -25], radius: 20 },
  { faction: 'crystalSyndicate', center: [20, -20], radius: 20 },
  { faction: 'timeless', center: [-15, 15], radius: 18 },
  { faction: 'echoReapers', center: [-40, 30], radius: 18 },
  { faction: 'dawnForged', center: [40, -30], radius: 18 },
]

export function getFactionAt(x: number, z: number): FactionId | null {
  for (const zone of TERRITORY_ZONES) {
    const dx = x - zone.center[0]
    const dz = z - zone.center[1]
    if (dx * dx + dz * dz < zone.radius * zone.radius) return zone.faction
  }
  return null
}

/** Get faction reputation tier label */
export function getReputationTier(rep: number): { label: string; color: string } {
  if (rep >= 80) return { label: 'Ally', color: '#44ff88' }
  if (rep >= 40) return { label: 'Friend', color: '#88ff44' }
  if (rep >= 10) return { label: 'Friendly', color: '#aaff44' }
  if (rep >= -10) return { label: 'Neutral', color: '#aaaaaa' }
  if (rep >= -40) return { label: 'Unfriendly', color: '#ff8844' }
  if (rep >= -80) return { label: 'Hostile', color: '#ff6644' }
  return { label: 'Enemy', color: '#ff4444' }
}

// ── Faction reputation bonuses ────────────────────────
/** Get the highest reputation across all factions */
export function getHighestRep(): number {
  return Math.max(...Object.values(_reputation))
}

/** Get damage multiplier based on highest faction rep (for player attacks) */
export function getPlayerDamageBonus(): number {
  const best = getHighestRep()
  let bonus = 1.0
  if (best >= 80) bonus = 1.25
  else if (best >= 40) bonus = 1.12
  else if (best >= 10) bonus = 1.05
  return bonus + (getPrestigeDamageBonus() - 1)
}

/** Get harvest yield bonus based on faction rep */
export function getHarvestYieldBonus(): number {
  const best = getHighestRep()
  let bonus = 1.0
  if (best >= 80) bonus = 1.5
  else if (best >= 40) bonus = 1.2
  else if (best >= 10) bonus = 1.1
  return bonus * getPrestigeHarvestBonus()
}

/** Get damage taken multiplier from enemies (based on negative rep) */
export function getDamageTakenMultiplier(): number {
  const worst = Math.min(...Object.values(_reputation))
  if (worst <= -80) return 1.2
  if (worst <= -40) return 1.1
  if (worst <= -10) return 1.05
  return 1.0
}

/** Get the player's title based on highest reputation tier */
export function getPlayerTitle(): string {
  const best = getHighestRep()
  if (best >= 80) return 'Timelord'
  if (best >= 40) return 'Chronomaster'
  if (best >= 10) return 'Time Walker'
  return 'Drifter'
}

// ── Territory visual overlay ──────────────────────────
export const TerritoryOverlay = () => {
  return (
    <group>
      {TERRITORY_ZONES.map((zone) => (
        <TerritoryRing key={zone.faction} zone={zone} />
      ))}
    </group>
  )
}

/** Watches player position and dispatches territory change events. Mount in Canvas. */
export const TerritoryWatcher = () => {
  const { camera } = useThree()
  useFrame(() => {
    checkTerritoryChange(camera.position.x, camera.position.z)
  })
  return null
}

const TerritoryRing = ({ zone }: { zone: TerritoryZone }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const faction = FACTIONS[zone.faction]
  const time = useRef(0)

  useFrame((_, delta) => {
    time.current += delta
    if (!meshRef.current) return
    const rep = getReputation(zone.faction)
    const visibility = rep >= 20 ? 0.15 : rep >= 0 ? 0.08 : 0.04
    ;(meshRef.current.material as THREE.MeshBasicMaterial).opacity = visibility
  })

  return (
    <mesh
      ref={meshRef}
      position={[zone.center[0], 0.05, zone.center[1]]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <ringGeometry args={[zone.radius - 1, zone.radius, 48]} />
      <meshBasicMaterial
        color={faction.territoryColor}
        transparent
        opacity={0.08}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// ── Module-level territory state ─────────────────────
let _currentTerritory: FactionId | null = null
export function getCurrentTerritory(): FactionId | null { return _currentTerritory }

/** Territory boundary pillar — marks zone edge with faction glow */
const TerritoryPillar = ({ zone, angle }: { zone: TerritoryZone; angle: number }) => {
  const pillarRef = useRef<THREE.Mesh>(null)
  const faction = FACTIONS[zone.faction]
  const px = zone.center[0] + Math.cos(angle) * zone.radius
  const pz = zone.center[1] + Math.sin(angle) * zone.radius
  const py = getInfiniteTerrainHeight(px, pz)

  useFrame(() => {
    if (!pillarRef.current) return
    const rep = getReputation(zone.faction)
    const intensity = rep >= 20 ? 0.6 : rep >= 0 ? 0.3 : rep >= -40 ? 0.15 : 0.08
    ;(pillarRef.current.material as THREE.MeshBasicMaterial).opacity = intensity
  })

  return (
    <group position={[px, py, pz]}>
      {/* Main pillar */}
      <mesh ref={pillarRef}>
        <cylinderGeometry args={[0.08, 0.15, 3.5, 6]} />
        <meshBasicMaterial color={faction.territoryColor} transparent opacity={0.25} />
      </mesh>
      {/* Glow tip */}
      <mesh position={[0, 1.8, 0]}>
        <sphereGeometry args={[0.1, 6, 6]} />
        <meshBasicMaterial color={faction.color} transparent opacity={0.5} />
      </mesh>
    </group>
  )
}

/** Territory boundary pillars — 8 pillars at zone edges */
export const TerritoryPillars = () => {
  return (
    <group>
      {TERRITORY_ZONES.map((zone) =>
        Array.from({ length: 8 }, (_, i) => {
          const angle = (i / 8) * Math.PI * 2 + Math.PI / 8
          return <TerritoryPillar key={`${zone.faction}-${i}`} zone={zone} angle={angle} />
        })
      )}
    </group>
  )
}

/** Export territory waypoints for compass */
export function getTerritoryWaypoints(): { label: string; pos: [number, number, number]; color: string; icon: string }[] {
  return TERRITORY_ZONES.map((zone) => {
    const faction = FACTIONS[zone.faction]
    return {
      label: faction.name,
      pos: [zone.center[0], 0, zone.center[1]] as [number, number, number],
      color: faction.color,
      icon: '◈',
    }
  })
}

// ── Territory entrance/exit detection ────────────────
/** Call every frame from useFrame to detect territory changes */
export function checkTerritoryChange(x: number, z: number) {
  const newTerritory = getFactionAt(x, z)
  if (newTerritory !== _currentTerritory) {
    _currentTerritory = newTerritory
    if (newTerritory) {
      window.dispatchEvent(new CustomEvent('territory-enter', { detail: { faction: newTerritory } }))
    } else {
      window.dispatchEvent(new CustomEvent('territory-exit'))
    }
  }
}

// ── Faction reputation HUD ────────────────────────────
export const FactionHUD = () => {
  // Renders as a DOM overlay (used via FactionHUDOverlay in App.tsx)
  return null
}

export const FactionHUDOverlay = () => {
  const [reps, setReps] = useState<Record<FactionId, number>>({} as Record<FactionId, number>)

  useEffect(() => {
    const interval = setInterval(() => {
      setReps(getAllReputation())
    }, 500)
    return () => clearInterval(interval)
  }, [])

  const factions = Object.entries(reps).filter(([, v]) => v !== 0) as [FactionId, number][]
  if (factions.length === 0) return null

  return (
    <div className="fixed top-24 right-4 z-50 pointer-events-none select-none">
      <div className="bg-gray-950/70 backdrop-blur-sm border border-gray-800/40 rounded-lg px-3 py-2 min-w-[140px]">
        <div className="text-[9px] uppercase tracking-wider text-gray-500 font-medium mb-1.5 text-center">
          Faction Standing
        </div>
        {factions.map(([id, rep]) => {
          const faction = FACTIONS[id]
          const tier = getReputationTier(rep)
          return (
            <div key={id} className="flex items-center justify-between gap-3 py-0.5">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: faction.territoryColor }} />
                <span className="text-[10px] text-gray-300 font-medium">{faction.name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-mono tabular-nums" style={{ color: tier.color }}>
                  {rep}
                </span>
                <span className="text-[7px] uppercase tracking-wider" style={{ color: `${tier.color}99` }}>
                  {tier.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
