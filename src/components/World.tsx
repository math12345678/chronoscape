import { TimeRift } from './TimeRift'
import { WorldBlocks } from './Building/WorldBlocks'
import { BuildPreview } from './Building/BuildPreview'
import { BlockHighlight } from './Building/BlockHighlight'
import { BlockResonance } from './Building/BlockResonance'
import { LabStructure } from './Lab/LabStructure'
import { LabTrigger } from './Lab/LabTrigger'
import { LabShimmerCurtain } from './Lab/LabShimmerCurtain'
import { Terrain } from './Terrain'
import { Water } from './Water'
import { NPCTick } from './NPC/NPCTick'
import { NPCSpawner } from './NPC/NPCSpawner'
import { Trader } from './Trader'
import { TimeShrine } from './Shrine/TimeShrine'
import { SpawnPlatform } from './SpawnPlatform'
import { HoverVehicle } from './Vehicles/HoverVehicle'
import { InfiniteWorld } from './InfiniteWorld'
import { ResourceNodeManager } from './ResourceNode'
import { InteractionHandler } from './InteractionHandler'
import { GrassField } from './GrassField'
import { PlayerShadow } from './PlayerShadow'
import { PlayerTrail } from './PlayerTrail'
import { AtmosphereSky } from './AtmosphereSky'
import { BiomeAtmosphere } from './BiomeAtmosphere'
import { TimeWind } from './TimeWind'
import { GlowingFireflies } from './GlowingFireflies'
import { TimeMotes } from './TimeMotes'
import { HostileEnemyManager } from './Combat/HostileEnemyManager'
import { ProjectileManager } from './Combat/ProjectileSystem'
import { HealthRegen, RespawnCamera } from './Combat/HealthTracker'
import { VehicleTrail } from './Vehicles/VehicleTrail'
import { TIME_RIFT_POSITIONS } from '../config/constants'

export const World = () => {
  return (
    <group>
      {/* Sky & atmosphere */}
      <AtmosphereSky />
      <BiomeAtmosphere />

      {/* Terrain & world */}
      <Terrain />
      <Water />
      <SpawnPlatform />
      <GrassField />
      <InfiniteWorld />

      {/* World structures */}
      <WorldBlocks />
      <BuildPreview />
      <BlockHighlight />
      <BlockResonance />
      <LabStructure />
      <LabTrigger />
      <LabShimmerCurtain />

      {/* Time rifts */}
      {TIME_RIFT_POSITIONS.map((r, i) => (
        <TimeRift key={i} position={r.pos} type={r.type} />
      ))}

      {/* NPCs & characters */}
      <NPCTick />
      <NPCSpawner />
      <Trader />
      <TimeShrine />

      {/* Vehicles */}
      <HoverVehicle />
      <VehicleTrail />

      {/* Player enhancements */}
      <PlayerShadow />
      <PlayerTrail />

      {/* Atmospheric particles */}
      <TimeWind />
      <GlowingFireflies />
      <TimeMotes />

      {/* Combat systems */}
      <HostileEnemyManager />
      <ProjectileManager />
      <HealthRegen />
      <RespawnCamera />

      {/* Interaction handler */}
      <InteractionHandler />

      {/* Resource nodes */}
      <ResourceNodeManager />
    </group>
  )
}
