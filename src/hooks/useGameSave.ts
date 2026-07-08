import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import type { GameState } from '../store'
import { cloudSaveGame, cloudLoadGame } from '../utils/api'
import { getQuestSaveData, loadQuestSaveData } from '../components/Quest/QuestGiver'
import { serializeMounts, loadMounts } from '../systems/MountsSystem'
import { serializeRift, loadRift } from '../systems/RiftEvolution'
import { serializeItems, loadItems } from '../systems/InventoryManager'
import { serializeLore, loadLore } from '../systems/EnvironmentLore'
import { serializeAchievementPerks, loadAchievementPerks } from '../systems/AchievementPerks'
import { serializeAscension, loadAscension } from '../systems/ChronoAscension'
import { serializeThreat, loadThreat } from '../systems/EnemyEvolution'
import { serializeAutoPrestige, loadAutoPrestige } from '../systems/AutoPrestige'
import { serializeTomes, loadTomes } from '../systems/TimeLibrary'
import { serializeTerritories, loadTerritories } from '../systems/WorldTerritories'
import { serializeRaids, loadRaids } from '../systems/TemporalRaids'
import { serializeEnchanting, loadEnchanting } from '../systems/ChronoEnchanting'
import { serializeRelics, loadRelics } from '../systems/RelicForging'
import { serializeAnomaly, loadAnomaly } from '../systems/TemporalAnomalies'
import { serializeClones, loadClones } from '../systems/ParallelSelves'
import { serializeDimensions, loadDimensions } from '../systems/DimensionalGates'
import { serializeMegaStructures, loadMegaStructures } from '../systems/MegaStructures'
import { serializeMutations, loadMutations } from '../systems/ChronoGenetics'
import { serializeProphecies, loadProphecies } from '../systems/TemporalProphecy'
import { serializeFusion, loadFusion } from '../systems/CompanionFusion'
import { serializeWorldGen, loadWorldGen } from '../systems/InfiniteWorldGenerator'
import { serializeEvolution, loadEvolution } from '../systems/EvolvingContentEngine'
import { serializeDifficulty, loadDifficulty } from '../systems/AdaptiveDifficultySystem'
import { serializeProgression, loadProgression } from '../systems/InfiniteProgression'
import { serializeIntegration, loadIntegration } from '../systems/EvolutionIntegration'
import { serializeForge, loadForge } from '../systems/ChronoForge'
import { serializeWorldEvents, loadWorldEvents } from '../systems/DynamicWorldEvents'
import { serializeChronovate, loadChronovate } from '../systems/ChronovateAI'
import { serializeConstructs, loadConstructs } from '../systems/AutomationConstructs'
import { serializeOutposts, loadOutposts } from '../systems/ChronoOutposts'

// ── Types ──────────────────────────────────────────────

interface SaveData {
  version: number
  timestamp: number
  playerId: string
  inventory: GameState['inventory']
  blocks: GameState['blocks']
  formulas: GameState['formulas']
  upgrades: GameState['upgrades']
  shopPurchases: GameState['shopPurchases']
  marketState: GameState['marketState']
  timeBonds: GameState['timeBonds']
  selectedBlockColor: GameState['selectedBlockColor']
  proudestBuildSize: GameState['proudestBuildSize']
  proudestBuildBlockIds: GameState['proudestBuildBlockIds']
  hiddenChamberRevealed: GameState['hiddenChamberRevealed']
  chronoCrystalClaimed: GameState['chronoCrystalClaimed']
  devNpcFound: GameState['devNpcFound']
  shootingStarSeen: GameState['shootingStarSeen']
  questData: ReturnType<typeof getQuestSaveData>
  mounts: ReturnType<typeof serializeMounts>
  rift: ReturnType<typeof serializeRift>
  inventoryItems: ReturnType<typeof serializeItems>
  lore: ReturnType<typeof serializeLore>
  achievementPerks: ReturnType<typeof serializeAchievementPerks>
  ascension: ReturnType<typeof serializeAscension>
  threat: ReturnType<typeof serializeThreat>
  autoPrestige: ReturnType<typeof serializeAutoPrestige>
  tomes: ReturnType<typeof serializeTomes>
  territories: ReturnType<typeof serializeTerritories>
  raids: ReturnType<typeof serializeRaids>
  enchanting: ReturnType<typeof serializeEnchanting>
  relics: ReturnType<typeof serializeRelics>
  anomaly: ReturnType<typeof serializeAnomaly>
  clones: ReturnType<typeof serializeClones>
  dimensions: ReturnType<typeof serializeDimensions>
  megaStructures: ReturnType<typeof serializeMegaStructures>
  mutations: ReturnType<typeof serializeMutations>
  prophecies: ReturnType<typeof serializeProphecies>
  fusion: ReturnType<typeof serializeFusion>
  worldGen: ReturnType<typeof serializeWorldGen>
  evolution: ReturnType<typeof serializeEvolution>
  difficulty: ReturnType<typeof serializeDifficulty>
  progression: ReturnType<typeof serializeProgression>
  integration: ReturnType<typeof serializeIntegration>
  forge: ReturnType<typeof serializeForge>
  worldEvents: ReturnType<typeof serializeWorldEvents>
  chronovate: ReturnType<typeof serializeChronovate>
  constructs: ReturnType<typeof serializeConstructs>
  outposts: ReturnType<typeof serializeOutposts>
}

const SAVE_KEY = 'chronoscape-save'
const SAVE_VERSION = 1
const AUTO_SAVE_INTERVAL = 30_000 // 30 seconds

// ── Player ID ──────────────────────────────────────────

let _playerId: string | null = null

function getOrCreatePlayerId(): string {
  if (_playerId) return _playerId
  try {
    const stored = localStorage.getItem('chronoscape_player_id')
    if (stored) {
      _playerId = stored
      return stored
    }
    const id = `player_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    localStorage.setItem('chronoscape_player_id', id)
    _playerId = id
    return id
  } catch {
    const id = `player_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    _playerId = id
    return id
  }
}

// ── Save / Load ────────────────────────────────────────

/**
 * Serializes only the serializable parts of the game store to localStorage.
 * Functions and computed properties are excluded — they're recreated on load.
 */
function saveToDisk(): SaveData | null {
  try {
    const state = useStore.getState()
    const data: SaveData = {
      version: SAVE_VERSION,
      timestamp: Date.now(),
      playerId: getOrCreatePlayerId(),
      inventory: state.inventory,
      blocks: state.blocks,
      formulas: state.formulas,
      upgrades: state.upgrades,
      shopPurchases: state.shopPurchases,
      marketState: state.marketState,
      timeBonds: state.timeBonds,
      selectedBlockColor: state.selectedBlockColor,
      proudestBuildSize: state.proudestBuildSize,
      proudestBuildBlockIds: state.proudestBuildBlockIds,
      hiddenChamberRevealed: state.hiddenChamberRevealed,
      chronoCrystalClaimed: state.chronoCrystalClaimed,
      devNpcFound: state.devNpcFound,
      shootingStarSeen: state.shootingStarSeen,
      questData: getQuestSaveData(),
      mounts: serializeMounts(),
      rift: serializeRift(),
      inventoryItems: serializeItems(),
      lore: serializeLore(),
      achievementPerks: serializeAchievementPerks(),
      ascension: serializeAscension(),
      threat: serializeThreat(),
      autoPrestige: serializeAutoPrestige(),
      tomes: serializeTomes(),
      territories: serializeTerritories(),
      raids: serializeRaids(),
      enchanting: serializeEnchanting(),
      relics: serializeRelics(),
      anomaly: serializeAnomaly(),
      clones: serializeClones(),
      dimensions: serializeDimensions(),
      megaStructures: serializeMegaStructures(),
      mutations: serializeMutations(),
      prophecies: serializeProphecies(),
      fusion: serializeFusion(),
      worldGen: serializeWorldGen(),
      evolution: serializeEvolution(),
      difficulty: serializeDifficulty(),
      progression: serializeProgression(),
      integration: serializeIntegration(),
      forge: serializeForge(),
      worldEvents: serializeWorldEvents(),
      chronovate: serializeChronovate(),
      constructs: serializeConstructs(),
      outposts: serializeOutposts(),
    }
    localStorage.setItem(SAVE_KEY, JSON.stringify(data))
    return data
  } catch (err) {
    console.warn('[Save] Failed to persist:', err)
    return null
  }
}

/**
 * Loads a saved game from localStorage and applies it to the store.
 * Returns true if a valid save was found and loaded.
 */
function loadFromDisk(): boolean {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return false

    const data: SaveData = JSON.parse(raw)
    if (!data || data.version !== SAVE_VERSION) return false

    // Restore player ID from save
    if (data.playerId) {
      _playerId = data.playerId
    }

    useStore.setState({
      inventory: data.inventory,
      blocks: data.blocks,
      formulas: data.formulas,
      upgrades: data.upgrades,
      shopPurchases: data.shopPurchases,
      marketState: data.marketState,
      timeBonds: data.timeBonds,
      selectedBlockColor: data.selectedBlockColor,
      proudestBuildSize: data.proudestBuildSize ?? 0,
      proudestBuildBlockIds: data.proudestBuildBlockIds ?? [],
      hiddenChamberRevealed: data.hiddenChamberRevealed ?? false,
      chronoCrystalClaimed: data.chronoCrystalClaimed ?? false,
      devNpcFound: data.devNpcFound ?? false,
      shootingStarSeen: data.shootingStarSeen ?? false,
    })

    // Restore quest state
    if (data.questData) {
      loadQuestSaveData(data.questData)
    }

    // Restore new systems
    if (data.mounts) loadMounts(data.mounts)
    if (data.rift) loadRift(data.rift)
    if (data.inventoryItems) loadItems(data.inventoryItems)
    if (data.lore) loadLore(data.lore)
    if (data.achievementPerks) loadAchievementPerks(data.achievementPerks)
    if (data.ascension) loadAscension(data.ascension)
    if (data.threat) loadThreat(data.threat)
    if (data.autoPrestige) loadAutoPrestige(data.autoPrestige)
    if (data.tomes) loadTomes(data.tomes)
    if (data.territories) loadTerritories(data.territories)
    if (data.raids) loadRaids(data.raids)
    if (data.enchanting) loadEnchanting(data.enchanting)
    if (data.relics) loadRelics(data.relics)
    if (data.anomaly) loadAnomaly(data.anomaly)
    if (data.clones) loadClones(data.clones)
    if (data.dimensions) loadDimensions(data.dimensions)
    if (data.megaStructures) loadMegaStructures(data.megaStructures)
    if (data.mutations) loadMutations(data.mutations)
    if (data.prophecies) loadProphecies(data.prophecies)
    if (data.fusion) loadFusion(data.fusion)
    if (data.worldGen) loadWorldGen(data.worldGen)
    if (data.evolution) loadEvolution(data.evolution)
    if (data.difficulty) loadDifficulty(data.difficulty)
    if (data.progression) loadProgression(data.progression)
    if (data.integration) loadIntegration(data.integration)
    if (data.forge) loadForge(data.forge)
    if (data.worldEvents) loadWorldEvents(data.worldEvents)
    if (data.chronovate) loadChronovate(data.chronovate)
    if (data.constructs) loadConstructs(data.constructs)
    if (data.outposts) loadOutposts(data.outposts)

    return true
  } catch (err) {
    console.warn('[Save] Failed to load:', err)
    return false
  }
}

/**
 * Returns a human-readable string of when the last save was made.
 */
function getLastSaveTime(): string {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return 'Never'
    const data: SaveData = JSON.parse(raw)
    if (!data?.timestamp) return 'Never'
    const diff = Date.now() - data.timestamp
    const seconds = Math.floor(diff / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    return `${Math.floor(minutes / 60)}h ago`
  } catch {
    return 'Never'
  }
}

/**
 * Sync save to cloud (fire-and-forget, doesn't block).
 */
function syncToCloud(data: SaveData): void {
  const state = useStore.getState()
  cloudSaveGame(data.playerId, {
    inventory: data.inventory,
    blocks: data.blocks,
    formulas: data.formulas,
    upgrades: data.upgrades,
    shopPurchases: data.shopPurchases,
    marketState: data.marketState,
    timeBonds: data.timeBonds,
    totalBlocksPlaced: state.totalBlocksPlaced,
    bestTimeTrial: state.bestTimeTrial,
  }).then((success) => {
    if (success) {
      try { localStorage.setItem('chronoscape_cloud_synced', 'true') } catch {}
    }
  })
}

/**
 * Try to load from cloud. Returns true if cloud save was applied.
 */
async function loadFromCloud(): Promise<boolean> {
  try {
    const playerId = getOrCreatePlayerId()
    const cloudData = await cloudLoadGame(playerId) as Record<string, unknown> | null
    if (!cloudData?.inventory) return false

    // Apply cloud data (overwrites local — cloud is source of truth)
    useStore.setState({
      inventory: cloudData.inventory as SaveData['inventory'],
      blocks: cloudData.blocks as SaveData['blocks'],
      formulas: cloudData.formulas as SaveData['formulas'],
      upgrades: cloudData.upgrades as SaveData['upgrades'],
      shopPurchases: cloudData.shopPurchases as SaveData['shopPurchases'],
      marketState: cloudData.marketState as SaveData['marketState'],
      timeBonds: cloudData.timeBonds as SaveData['timeBonds'],
      totalBlocksPlaced: (cloudData.totalBlocksPlaced as number) ?? 0,
      bestTimeTrial: (cloudData.bestTimeTrial as number | null) ?? null,
    })
    // Persist to local disk
    saveToDisk()
    return true
  } catch {
    return false
  }
}

/**
 * Hook that auto-loads on mount and auto-saves on an interval + key events.
 *
 * Usage: call once in App.tsx. It handles everything internally.
 *
 * Returns save indicator state for optional UI display.
 */
export function useGameSave() {
  const [lastSaved, setLastSaved] = useState<string>('')
  const [cloudStatus, setCloudStatus] = useState<'synced' | 'offline' | 'syncing' | ''>('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasLoadedRef = useRef(false)

  // Load existing save on mount
  useEffect(() => {
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true

    const loaded = loadFromDisk()
    if (loaded) {
      setLastSaved(getLastSaveTime())
      // Try cloud sync in background
      let cloudSynced = ''
      try { cloudSynced = localStorage.getItem('chronoscape_cloud_synced') || '' } catch {}
      if (cloudSynced) {
        setCloudStatus('synced')
      }
      loadFromCloud().then((fromCloud) => {
        if (fromCloud) {
          setLastSaved(getLastSaveTime())
          setCloudStatus('synced')
        }
      })
    } else {
      // Try cloud first, then create fresh save
      loadFromCloud().then((fromCloud) => {
        if (fromCloud) {
          setLastSaved(getLastSaveTime())
          setCloudStatus('synced')
        } else {
          // Fresh game — save immediately
          saveToDisk()
          setLastSaved('Just now')
        }
      })
    }
  }, [])

  // Auto-save on interval with cloud sync
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const data = saveToDisk()
      setLastSaved(getLastSaveTime())
      if (data) {
        setCloudStatus('syncing')
        syncToCloud(data)
        setTimeout(() => {
          try {
            const synced = localStorage.getItem('chronoscape_cloud_synced')
            setCloudStatus(synced ? 'synced' : 'offline')
          } catch {}
        }, 2000)
      }
    }, AUTO_SAVE_INTERVAL)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  // Save on window close / tab hide
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        const data = saveToDisk()
        setLastSaved(getLastSaveTime())
        if (data) syncToCloud(data)
      }
    }
    const handleBeforeUnload = () => {
      const data = saveToDisk()
      if (data) syncToCloud(data)
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  return { lastSaved, cloudStatus }
}

// ── Manual save trigger for important events ───────────

/**
 * Call this after important events (purchases, upgrades, etc.) for instant saves.
 */
export function triggerSave() {
  const data = saveToDisk()
  if (data) syncToCloud(data)
}

// ── Delete save (for testing / reset) ──────────────────

/**
 * Clears the saved game. Needs a page refresh to take effect.
 */
export function deleteSave() {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch { /* ignore */ }
}
