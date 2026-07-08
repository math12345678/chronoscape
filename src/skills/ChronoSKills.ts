import * as THREE from 'three'
import { useStore } from '../store'
import { setTimeScaleTarget } from '../components/TimeManager'
import { triggerShake } from '../hooks/useScreenShake'
import { queueBurst } from '../components/HarvestVFX'

// ── Skill definitions ──────────────────────────────
export interface SkillState {
  id: string
  name: string
  key: string
  description: string
  costType: 'liquid' | 'vapour' | 'crystal'
  costAmount: number
  cooldownMs: number
  durationMs: number
  color: string
  cooldownRemaining: number
  active: boolean
  remainingDuration: number
  unlocked: boolean
  unlockFormula: string | null
}

const SKILL_DEFS: Omit<SkillState, 'cooldownRemaining' | 'active' | 'remainingDuration' | 'unlocked'>[] = [
  { id: 'timeFreeze', name: 'Time Freeze', key: 'z', description: 'Slow all enemies 3s', costType: 'liquid', costAmount: 25, cooldownMs: 15000, durationMs: 3000, color: '#4488ff', unlockFormula: null },
  { id: 'temporalDash', name: 'Temporal Dash', key: 'x', description: 'Teleport forward', costType: 'vapour', costAmount: 10, cooldownMs: 8000, durationMs: 0, color: '#44ffcc', unlockFormula: 'crystallization' },
  { id: 'chronoShield', name: 'Chrono Shield', key: 'c', description: 'Block damage 2s', costType: 'crystal', costAmount: 30, cooldownMs: 20000, durationMs: 2000, color: '#ffcc44', unlockFormula: 'detonation' },
  { id: 'timeSurge', name: 'Time Surge', key: 'f', description: '+50% speed 5s', costType: 'vapour', costAmount: 15, cooldownMs: 12000, durationMs: 5000, color: '#ff4488', unlockFormula: 'timelineEcho' },
]

// ── Module state ────────────────────────────────────
const _states: SkillState[] = SKILL_DEFS.map(s => ({
  ...s,
  cooldownRemaining: 0,
  active: false,
  remainingDuration: 0,
  unlocked: s.unlockFormula === null, // Only base skill is unlocked by default
}))

export function getSkillStates() { return _states }
export function getSkill(id: string) { return _states.find(s => s.id === id) }

/** Refresh skill unlock states based on discovered formulas. Call on formula discovery. */
export function refreshSkillUnlocks(): void {
  const store = useStore.getState()
  for (const skill of _states) {
    if (skill.unlocked) continue
    if (!skill.unlockFormula) { skill.unlocked = true; continue }
    if (store.formulas.some(f => f.id === skill.unlockFormula && f.discovered)) {
      skill.unlocked = true
    }
  }
}

// Global flags for integration
export let _timeFrozen = false
export let _chronoShieldActive = false
export let _timeSurgeActive = false

export function isTimeFrozen() { return _timeFrozen }
export function isChronoShieldActive() { return _chronoShieldActive }
export function isTimeSurgeActive() { return _timeSurgeActive }

// ── Camera ref for dash (set from Scene) ────────────
let _camRef: THREE.Camera | null = null
export function setSkillCamera(cam: THREE.Camera) { _camRef = cam }

function hasResources(costType: string, amount: number): boolean {
  const inv = useStore.getState().inventory
  if (costType === 'liquid') return inv.liquid >= amount
  if (costType === 'vapour') return inv.vapour >= amount
  if (costType === 'crystal') return inv.crystal >= amount
  return false
}

function deductCost(costType: string, amount: number) {
  useStore.setState(s => ({
    inventory: { ...s.inventory, [costType]: Math.max(0, (s.inventory[costType as keyof typeof s.inventory] ?? 0) - amount) }
  }))
}

// ── Skill activators ────────────────────────────────
export function activateSkill(id: string): boolean {
  const skill = _states.find(s => s.id === id)
  if (!skill || !skill.unlocked) return false
  if (skill.cooldownRemaining > 0) return false
  if (skill.active) return false
  if (!hasResources(skill.costType, skill.costAmount)) return false

  deductCost(skill.costType, skill.costAmount)
  skill.cooldownRemaining = skill.cooldownMs

  if (skill.durationMs > 0) {
    skill.active = true
    skill.remainingDuration = skill.durationMs
  }

  // Per-skill effects
  switch (id) {
    case 'timeFreeze':
      _timeFrozen = true
      setTimeScaleTarget(0.3)
      triggerShake(0.15, 3)
      break
    case 'temporalDash':
      if (_camRef) {
        const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(_camRef.quaternion)
        const startPos = _camRef.position.clone()
        const endPos = startPos.clone().add(dir.multiplyScalar(10))
        // Raycast check would be ideal, but simple position shift is fine
        _camRef.position.copy(endPos)
        triggerShake(0.1, 2)
        queueBurst(startPos, 12, '#44ffcc', 5)
        queueBurst(endPos, 12, '#44ffcc', 5)
      }
      break
    case 'chronoShield':
      _chronoShieldActive = true
      triggerShake(0.1, 2)
      break
    case 'timeSurge':
      _timeSurgeActive = true
      triggerShake(0.1, 3)
      break
  }

  return true
}

// ── Tick called from game loop ──────────────────────
export function tickSkills(delta: number) {
  const dt = delta * 1000

  for (const skill of _states) {
    if (skill.cooldownRemaining > 0) {
      skill.cooldownRemaining = Math.max(0, skill.cooldownRemaining - dt)
    }
    if (skill.active) {
      skill.remainingDuration -= dt
      if (skill.remainingDuration <= 0) {
        skill.active = false
        skill.remainingDuration = 0
        // Per-skill deactivation
        switch (skill.id) {
          case 'timeFreeze':
            _timeFrozen = false
            setTimeScaleTarget(1.0)
            break
          case 'chronoShield':
            _chronoShieldActive = false
            break
          case 'timeSurge':
            _timeSurgeActive = false
            break
        }
      }
    }
  }
}
