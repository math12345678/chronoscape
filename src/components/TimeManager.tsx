import { useFrame } from '@react-three/fiber'
import { useStore } from '../store'
import * as THREE from 'three'

/**
 * Manages the global time dilation effect.
 * Tweens the `timeScale` state towards `targetTimeScale` smoothly.
 */
export const TimeManager = () => {
  useFrame((_, delta) => {
    const { timeScale, targetTimeScale, setTimeScale } = useStore.getState()
    
    if (Math.abs(timeScale - targetTimeScale) > 0.001) {
      // Smoothly interpolate time scale
      const newScale = THREE.MathUtils.lerp(timeScale, targetTimeScale, delta * 5)
      setTimeScale(newScale)
    }
  })

  return null
}
