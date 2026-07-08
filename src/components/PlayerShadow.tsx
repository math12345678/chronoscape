import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { getTerrainHeight } from '../terrain'
import { useStore } from '../store'
import { shouldTick } from '../utils/performance'

/**
 * Projects a dark circle shadow beneath the camera onto the terrain/blocks.
 * Gives the player a grounded presence in the world.
 */
export const PlayerShadow = () => {
  const { camera } = useThree()
  const meshRef = useRef<THREE.Mesh>(null)
  const opacityRef = useRef(0)

  useFrame(() => {
    if (!meshRef.current) return
    if (!shouldTick(3)) return // throttle shadow update
    const px = camera.position.x
    const pz = camera.position.z
    const py = camera.position.y

    // Find ground height at player position
    const terrainY = getTerrainHeight(px, pz)
    // Check blocks too — use store's worldBlockMap directly (fast lookup by key)
    const { blocks } = useStore.getState()
    let blockY = 0
    const gx = Math.round(px)
    const gz = Math.round(pz)
    // Only check 3 vertical layers around player (cheaper than iterating all blocks)
    for (let by = 0; by <= 3; by++) {
      const key = `${gx},${by},${gz}`
      if (blocks[key]) {
        blockY = by + 1
      }
    }
    const groundY = Math.max(terrainY, blockY)
    const eyeHeight = 1.6

    // Shadow sits on the ground below the player
    meshRef.current.position.x = px
    meshRef.current.position.z = pz
    meshRef.current.position.y = groundY + 0.02

    // Fade shadow based on height above ground
    const heightAbove = py - (groundY + eyeHeight)
    if (Math.abs(heightAbove) < 0.1) {
      // On ground — full shadow
      opacityRef.current += 0.1
    } else {
      // In air — fade out
      opacityRef.current -= 0.05
    }
    opacityRef.current = Math.min(0.25, Math.max(0, opacityRef.current))

    // Scale shadow based on height (higher = smaller/fuzzier)
    const heightScale = Math.max(0.4, 1 - Math.max(0, heightAbove) * 0.05)
    meshRef.current.scale.setScalar(heightScale)

    const mat = meshRef.current.material as THREE.MeshBasicMaterial
    mat.opacity = opacityRef.current
  })

  return (
    <mesh ref={meshRef} position={[0, 0, 0]} renderOrder={-1}>
      <circleGeometry args={[0.35, 16]} />
      <meshBasicMaterial
        color="#000000"
        transparent
        opacity={0}
        depthWrite={false}
      />
    </mesh>
  )
}
