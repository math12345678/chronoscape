import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { fireNuke } from '../skills/ChronoNuke'
import { registerNukeEvent } from './ChronoNukeVFX'
import * as THREE from 'three'

export const NukeController = () => {
  const { camera } = useThree()

  useEffect(() => {
    const handler = () => {
      const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
      const pos = camera.position.clone()
      const success = fireNuke(pos, dir)
      if (success) {
        const target = pos.clone().add(dir.clone().multiplyScalar(15))
        target.y = 0
        registerNukeEvent([target.x, target.y, target.z])
      }
    }
    window.addEventListener('chrono-nuke-activate', handler)
    return () => window.removeEventListener('chrono-nuke-activate', handler)
  }, [camera])

  return null
}
