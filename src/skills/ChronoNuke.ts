import * as THREE from 'three'
import { useStore } from '../store'
import { setTimeScaleTarget } from '../components/TimeManager'
import { triggerShake } from '../hooks/useScreenShake'
import { applyNukeDamageToAll } from '../components/Combat/HostileEnemyManager'

let _nukeCooldown = 0
let _nukeCharges = 1
let _maxCharges = 3
let _prestigeChecked = false

export function getNukeCooldown() { return _nukeCooldown }
export function getNukeCharges() { return _nukeCharges }
export function getMaxCharges() { return _maxCharges }

export function addNukeCharge() {
  _nukeCharges = Math.min(_maxCharges, _nukeCharges + 1)
}

export function increaseMaxCharges() {
  _maxCharges++
}

const NUKE_COST = { liquid: 200, crystal: 100, renown: 25 }
const NUKE_COOLDOWN_MS = 120000
const NUKE_RADIUS = 25

export function canNuke(): boolean {
  if (_nukeCharges <= 0) return false
  if (_nukeCooldown > 0) return false
  const inv = useStore.getState().inventory
  if (inv.liquid < NUKE_COST.liquid) return false
  if (inv.crystal < NUKE_COST.crystal) return false
  if (inv.renown < NUKE_COST.renown) return false
  return true
}

export function fireNuke(camPosition: THREE.Vector3, camDirection: THREE.Vector3): boolean {
  if (!canNuke()) return false

  _nukeCharges--
  _nukeCooldown = NUKE_COOLDOWN_MS

  useStore.setState((s) => ({
    inventory: {
      ...s.inventory,
      liquid: Math.max(0, s.inventory.liquid - NUKE_COST.liquid),
      crystal: Math.max(0, s.inventory.crystal - NUKE_COST.crystal),
      renown: Math.max(0, s.inventory.renown - NUKE_COST.renown),
    },
  }))

  const target = camPosition.clone().add(camDirection.clone().multiplyScalar(15))
  target.y = 0

  triggerShake(1, 3, 2, { rotAmplitude: 0.01, rotFreq: 40 })
  setTimeScaleTarget(0.1)

  window.dispatchEvent(new CustomEvent('chrono-nuke', {
    detail: { position: target.toArray(), time: Date.now() },
  }))

  setTimeout(() => {
    setTimeScaleTarget(1.0)
    triggerShake(0.5, 4, 1)
  }, 800)

  const destroyed = useStore.getState().triggerExplosion([target.x, target.y, target.z], NUKE_RADIUS)
  applyNukeDamageToAll(NUKE_RADIUS, target)

  const renownGain = destroyed.length * 2
  useStore.setState((s) => ({
    inventory: { ...s.inventory, renown: s.inventory.renown + renownGain },
    blocks: s.blocks,
  }))

  window.dispatchEvent(new CustomEvent('harvest-event', { detail: { amount: renownGain } }))

  return true
}

let _chargeAccumulator = 0

export function tickNukeCooldown(dt: number) {
  // Check prestige for bonus max charges
  if (!_prestigeChecked) {
    _prestigeChecked = true
    import('../components/PrestigeSystem').then(m => {
      const rank = m.getPrestigeRank()
      if (rank >= 10) _maxCharges = 5
      else if (rank >= 9) _maxCharges = 4
      else if (rank >= 6) _maxCharges = 3
    })
  }

  if (_nukeCooldown > 0) {
    _nukeCooldown = Math.max(0, _nukeCooldown - dt * 1000)
  }
  // Regen charges every 120s
  if (_nukeCharges < _maxCharges) {
    _chargeAccumulator += dt * 1000
    if (_chargeAccumulator >= 120000) {
      _chargeAccumulator = 0
      _nukeCharges = Math.min(_maxCharges, _nukeCharges + 1)
    }
  }
}
