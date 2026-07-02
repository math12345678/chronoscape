import { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { PointerLockControls } from '@react-three/drei'
import * as THREE from 'three'
import { PLAYER_SPEED, PLAYER_EYE_HEIGHT, GRAVITY } from '../config/constants'
import { useStore } from '../store'
import { getTerrainHeight } from '../terrain'

export const PlayerController = () => {
  const { camera } = useThree()
  const velocityY = useRef(0)
  const keys = useRef({ w: false, a: false, s: false, d: false })
  const speedRef = useRef(PLAYER_SPEED)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (key in keys.current) {
        ;(keys.current as Record<string, boolean>)[key] = e.type === 'keydown'
      }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
    }
  }, [])

  useFrame((_, delta) => {
    // Read haste upgrade level from store and compute effective speed
    const hasteLevel = useStore.getState().upgrades.haste
    const effectiveSpeed = PLAYER_SPEED * (1 + hasteLevel * 0.1)
    speedRef.current = effectiveSpeed

    const dir = new THREE.Vector3()
    if (keys.current.w) dir.z -= 1
    if (keys.current.s) dir.z += 1
    if (keys.current.a) dir.x -= 1
    if (keys.current.d) dir.x += 1

    // Camera-relative movement
    if (dir.lengthSq() > 0) {
      dir
        .normalize()
        .applyEuler(new THREE.Euler(0, camera.rotation.y, 0))
      camera.position.addScaledVector(dir, speedRef.current * delta)
    }

    // Terrain + block-aware ground height
    const terrainY = getTerrainHeight(camera.position.x, camera.position.z)
    const blockY = getGroundHeightAt(camera.position.x, camera.position.z)
    const groundY = Math.max(terrainY, blockY)

    if (camera.position.y > groundY + PLAYER_EYE_HEIGHT) {
      velocityY.current += GRAVITY * delta
    } else {
      velocityY.current = 0
      camera.position.y = groundY + PLAYER_EYE_HEIGHT
    }
    
    // Apply head bob if moving on ground
    if (camera.position.y <= groundY + PLAYER_EYE_HEIGHT + 0.01 && dir.lengthSq() > 0) {
      const bobTime = performance.now() * 0.01 * speedRef.current
      camera.position.y += Math.sin(bobTime) * 0.08
    }
    
    camera.position.y += velocityY.current * delta
  })

  return <PointerLockControls />
}

// Looks up the topmost occupied block at (x, z) from the WorldBlockMap.
function getGroundHeightAt(x: number, z: number): number {
  const gx = Math.round(x)
  const gz = Math.round(z)
  const { blocks } = useStore.getState()
  let highest = 0
  for (const key of Object.keys(blocks)) {
    const [bx, by, bz] = key.split(',').map(Number)
    if (bx === gx && bz === gz) highest = Math.max(highest, by + 1)
  }
  return highest
}
