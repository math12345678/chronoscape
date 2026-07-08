// ── Expeditions System — procedurally generated pocket dimension dungeons ──

import { useStore } from '../store'

export type ExpeditionDifficulty = 'easy' | 'medium' | 'hard' | 'legendary'

export interface ExpeditionObjective {
  type: 'killAll' | 'collectCrystal' | 'survive' | 'destroyCore'
  description: string
  targetCount: number
}

export interface ExpeditionDef {
  id: string
  name: string
  difficulty: ExpeditionDifficulty
  enemyTypes: string[]
  enemyCount: number
  objectives: ExpeditionObjective[]
  rewards: { raw: number; vapour: number; liquid: number; crystal: number; renown: number }
  timeLimit: number // seconds, 0 = no limit
  entranceFee: { raw?: number; liquid?: number; renown?: number }
}

export interface ExpeditionInstance {
  def: ExpeditionDef
  startTime: number
  progress: number[] // progress per objective
  completed: boolean
  failed: boolean
  enemiesRemaining: number
  enemiesKilled: number
}

const DIFFICULTY_COLORS: Record<ExpeditionDifficulty, string> = {
  easy: '#44ff88',
  medium: '#ffcc44',
  hard: '#ff6644',
  legendary: '#ff44ff',
}

const DIFFICULTY_MULT: Record<ExpeditionDifficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 4,
  legendary: 8,
}

function generateExpedition(seed: number): ExpeditionDef {
  const rng = () => {
    seed = (seed * 16807 + 0) % 2147483647
    return (seed - 1) / 2147483646
  }

  const diffRoll = rng()
  const difficulty: ExpeditionDifficulty =
    diffRoll < 0.4 ? 'easy' :
    diffRoll < 0.7 ? 'medium' :
    diffRoll < 0.9 ? 'hard' : 'legendary'

  const mult = DIFFICULTY_MULT[difficulty]

  const enemyPool = difficulty === 'easy' ? ['wraith'] :
    difficulty === 'medium' ? ['wraith', 'voidWraith'] :
    difficulty === 'hard' ? ['wraith', 'voidWraith', 'timeCrystalGolem', 'phaseShifter'] :
    ['voidWraith', 'timeCrystalGolem', 'phaseShifter', 'temporalSentinel']

  const enemyCount = Math.floor((3 + rng() * 7) * mult)
  const objTypeRoll = rng()
  const objectives: ExpeditionObjective[] = []

  if (objTypeRoll < 0.35) {
    objectives.push({ type: 'killAll', description: `Eliminate ${enemyCount} enemies`, targetCount: enemyCount })
  } else if (objTypeRoll < 0.6) {
    objectives.push({ type: 'collectCrystal', description: `Collect ${Math.floor(5 * mult)} time crystals`, targetCount: Math.floor(5 * mult) })
    objectives.push({ type: 'killAll', description: `Defeat ${enemyCount} guardians`, targetCount: enemyCount })
  } else if (objTypeRoll < 0.8) {
    objectives.push({ type: 'destroyCore', description: 'Destroy the temporal core', targetCount: 1 })
  } else {
    objectives.push({ type: 'survive', description: `Survive ${Math.floor(30 * mult)} seconds`, targetCount: Math.floor(30 * mult) })
  }

  const rewardBase = Math.floor(10 * mult)
  const names = [
    'The Fractured Spire', 'Echo Chamber', 'Void Nexus',
    'Crystal Depths', 'Timeless Sanctum', 'Omega Rift',
    'Shattered Timeline', 'Chrono Abyss', 'Paradox Core',
  ]
  const name = names[Math.floor(rng() * names.length)]

  return {
    id: `exp-${Date.now()}-${Math.floor(rng() * 9999)}`,
    name,
    difficulty,
    enemyTypes: enemyPool,
    enemyCount,
    objectives,
    rewards: {
      raw: rewardBase * 3,
      vapour: rewardBase * 2,
      liquid: rewardBase * 2,
      crystal: rewardBase,
      renown: Math.floor(rewardBase / 2) + 1,
    },
    timeLimit: objectives.some((o) => o.type === 'survive') ? Math.floor(30 * mult) + 10 : 0,
    entranceFee: difficulty === 'easy' ? { raw: 20 } :
      difficulty === 'medium' ? { raw: 50, liquid: 10 } :
      difficulty === 'hard' ? { raw: 100, liquid: 25, renown: 5 } :
      { raw: 200, liquid: 50, renown: 15 },
  }
}

// ── State ──────────────────────────────────────────────────

let _activeExpedition: ExpeditionInstance | null = null
let _completedExpeditions: number = 0
let _expeditionSeed: number = Date.now()

export function getActiveExpedition(): ExpeditionInstance | null {
  return _activeExpedition
}

export function getCompletedExpeditions(): number {
  return _completedExpeditions
}

/** Generate a new expedition and charge entrance fee */
export function startExpedition(): boolean {
  if (_activeExpedition) return false

  const state = useStore.getState()
  const def = generateExpedition(_expeditionSeed++)
  const fee = def.entranceFee

  // Check fee
  if (fee.raw && state.inventory.raw < fee.raw) return false
  if (fee.liquid && state.inventory.liquid < fee.liquid) return false
  if (fee.renown && state.inventory.renown < fee.renown) return false

  // Pay fee
  state.addRaw(-(fee.raw ?? 0))
  // Liquid/renown deduction via direct set
  useStore.setState((s) => ({
    inventory: {
      ...s.inventory,
      liquid: s.inventory.liquid - (fee.liquid ?? 0),
      renown: s.inventory.renown - (fee.renown ?? 0),
    },
  }))

  _activeExpedition = {
    def,
    startTime: Date.now(),
    progress: def.objectives.map(() => 0),
    completed: false,
    failed: false,
    enemiesRemaining: def.enemyCount,
    enemiesKilled: 0,
  }

  return true
}

/** Record an enemy kill inside expedition */
export function recordExpeditionKill(): void {
  if (!_activeExpedition || _activeExpedition.completed || _activeExpedition.failed) return
  _activeExpedition.enemiesKilled++
  _activeExpedition.enemiesRemaining = Math.max(0, _activeExpedition.enemiesRemaining - 1)

  // Update objectives
  _activeExpedition.progress = _activeExpedition.def.objectives.map((obj, i) => {
    const p = _activeExpedition!.progress[i]
    if (obj.type === 'killAll') return Math.min(obj.targetCount, p + 1)
    return p
  })

  checkExpeditionCompletion()
}

/** Record a crystal collect in expedition */
export function recordExpeditionCollect(): void {
  if (!_activeExpedition || _activeExpedition.completed || _activeExpedition.failed) return
  _activeExpedition.progress = _activeExpedition.def.objectives.map((obj, i) => {
    const p = _activeExpedition!.progress[i]
    if (obj.type === 'collectCrystal') return Math.min(obj.targetCount, p + 1)
    return p
  })
  checkExpeditionCompletion()
}

/** Record core destroyed */
export function recordExpeditionCoreDestroyed(): void {
  if (!_activeExpedition || _activeExpedition.completed || _activeExpedition.failed) return
  _activeExpedition.progress = _activeExpedition.def.objectives.map((obj, i) => {
    if (obj.type === 'destroyCore') return 1
    return _activeExpedition!.progress[i]
  })
  checkExpeditionCompletion()
}

function checkExpeditionCompletion(): void {
  if (!_activeExpedition) return
  const allDone = _activeExpedition.def.objectives.every(
    (obj, i) => _activeExpedition!.progress[i] >= obj.targetCount
  )
  if (allDone) {
    _activeExpedition.completed = true
    // Award rewards
    const reward = _activeExpedition.def.rewards
    const state = useStore.getState()
    state.addRaw(reward.raw)
    if (reward.renown > 0) state.addRenown(reward.renown)
    useStore.setState((s) => ({
      inventory: {
        ...s.inventory,
        vapour: Math.min(s.inventory.vapour + reward.vapour, 9999),
        liquid: Math.min(s.inventory.liquid + reward.liquid, 9999),
        crystal: Math.min(s.inventory.crystal + reward.crystal, 9999),
      },
    }))
    _completedExpeditions++
  }
}

/** Tick expedition (check time limits) */
export function tickExpedition(_dt: number): void {
  if (!_activeExpedition || _activeExpedition.completed) return

  // Check time limit
  if (_activeExpedition.def.timeLimit > 0) {
    const elapsed = (Date.now() - _activeExpedition.startTime) / 1000
    if (elapsed >= _activeExpedition.def.timeLimit) {
      // Survival objective counts time
      _activeExpedition.progress = _activeExpedition.def.objectives.map((obj, i) => {
        if (obj.type === 'survive') return Math.min(obj.targetCount, Math.floor(elapsed))
        return _activeExpedition!.progress[i]
      })
      checkExpeditionCompletion()
      if (!_activeExpedition.completed && elapsed >= _activeExpedition.def.timeLimit + 5) {
        _activeExpedition.failed = true
      }
    }
  }
}

/** End current expedition (fail) */
export function failExpedition(): void {
  if (_activeExpedition) {
    _activeExpedition.failed = true
  }
}

/** Get expedition difficulty color */
export function getExpeditionDifficultyColor(d: ExpeditionDifficulty): string {
  return DIFFICULTY_COLORS[d]
}
