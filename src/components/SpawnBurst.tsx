import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { useStore } from '../store'
import { spawnShockwave } from './ShockwaveRing'
import { triggerShake } from '../hooks/useScreenShake'
import { getTerrainHeight } from '../terrain'

/**
 * Dramatic spawn burst: plays once when the player first enters the game.
 * Creates a large shockwave, screen shake, and flashes the sky.
 */
export const SpawnBurst = () => {
  const { camera } = useThree()
  const hasEntered = useStore((s) => s.hasEnteredGame)
  const played = useRef(false)

  useEffect(() => {
    if (!hasEntered || played.current) return
    played.current = true

    const px = camera.position.x
    const pz = camera.position.z
    const py = getTerrainHeight(px, pz)
    const delay = 600

    setTimeout(() => {
      // Big shockwave
      spawnShockwave({
        position: [px, py + 0.1, pz],
        color: '#44ffcc',
        duration: 2,
        maxScale: 40,
        ringCount: 6,
      })

      triggerShake(0.6, 12)

      // Screen flash
      const flash = document.createElement('div')
      flash.style.cssText =
        'position:fixed;inset:0;background:radial-gradient(ellipse at 50% 50%, rgba(68,255,204,0.4) 0%, rgba(68,255,204,0.12) 40%, transparent 70%);pointer-events:none;z-index:99999;transition:opacity 1s ease-out'
      document.body.appendChild(flash)
      requestAnimationFrame(() => {
        flash.style.opacity = '1'
      })
      setTimeout(() => {
        flash.style.opacity = '0'
        setTimeout(() => {
          if (flash.parentNode) flash.parentNode.removeChild(flash)
        }, 1000)
      }, 400)

      // Second smaller shockwave
      setTimeout(() => {
        spawnShockwave({
          position: [px, py + 0.1, pz],
          color: '#88ffdd',
          duration: 1.2,
          maxScale: 25,
          ringCount: 4,
        })
      }, 500)
    }, delay)
  }, [hasEntered, camera])

  return null
}
