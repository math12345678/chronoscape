import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { tickFrame } from '../utils/performance'
import { tickTimeCredit, recalcTimeCreditRate } from '../config/timeCredit'

// Module-level time scale — avoids calling useStore.setState every frame
let _timeScale = 1.0
let _targetTimeScale = 1.0

export function getTimeScale(): number {
  return _timeScale
}

export function setTimeScaleTarget(target: number) {
  _targetTimeScale = target
}

/**
 * Manages the global time dilation effect.
 * Tweens the `timeScale` towards `targetTimeScale` smoothly.
 * Also tracks FPS for auto-quality system and ticks the time credit economy.
 */
export const TimeManager = () => {
  useFrame((_, delta) => {
    // Smooth time scale tween
    if (Math.abs(_timeScale - _targetTimeScale) > 0.001) {
      _timeScale = THREE.MathUtils.lerp(_timeScale, _targetTimeScale, delta * 5)
    }
    // Track FPS for auto-quality system
    tickFrame()
    // Tick Time Credit economy (used by shrine upgrades)
    tickTimeCredit(delta)
    recalcTimeCreditRate(0, false, 0) // prestige/industries/territories all removed — base rate only
  })

  return null
}
