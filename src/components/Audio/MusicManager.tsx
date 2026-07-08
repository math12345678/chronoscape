import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { initMusic, tickMusic, setCombatIntensity, setBossActive, stopMusic } from '../../utils/music'
import { getAllEnemyPositions } from '../Combat/HostileEnemyManager'
import { getBossInfo } from '../Combat/HostileEnemyManager'

/**
 * Procedural music manager.
 * Initializes music on first mouse click (to comply with autoplay policy).
 * Ticks music each frame with combat intensity based on nearby enemies.
 */
export const MusicManager = () => {
  const initialized = useRef(false)
  const { camera } = useThree()

  // Init on first click
  useEffect(() => {
    const handler = () => {
      if (!initialized.current) {
        try {
          initMusic()
          initialized.current = true
        } catch {}
      }
    }
    window.addEventListener('click', handler, { once: true })
    return () => {
      window.removeEventListener('click', handler)
      stopMusic()
    }
  }, [])

  // Tick each frame
  useFrame((_, delta) => {
    if (!initialized.current) return

    // Check boss active
    const boss = getBossInfo()
    setBossActive(boss !== null)

    // Check enemy proximity for combat intensity
    const enemies = getAllEnemyPositions()
    if (enemies.length > 0) {
      const playerPos = camera.position
      let closestDist = Infinity
      for (const e of enemies) {
        const dx = e.x - playerPos.x
        const dz = e.z - playerPos.z
        const d = Math.sqrt(dx * dx + dz * dz)
        if (d < closestDist) closestDist = d
      }
      // Intensity based on distance (closer = more intense)
      const intensity = Math.max(0, 1 - closestDist / 50) * Math.min(1, enemies.length / 10)
      setCombatIntensity(intensity)
    } else {
      setCombatIntensity(0)
    }

    tickMusic(delta)
  })

  return null
}
