import { useRef, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { ROAD_BLOCK_COST, ROAD_COLOR } from '../../config/combat'
import { getInfiniteTerrainHeight } from '../../world/chunkTerrain'
import { useStore } from '../../store'

// Module-level road data
interface RoadSegment {
  id: string
  x: number, z: number
  mesh: THREE.Mesh
}

let _roadSegments: RoadSegment[] = []
let _nextRoadId = 0

export function getRoadCount(): number { return _roadSegments.length }

const roadGeo = new THREE.BoxGeometry(1, 0.08, 1)
const roadMat = (color: string = ROAD_COLOR) => new THREE.MeshStandardMaterial({
  color,
  roughness: 0.8,
  metalness: 0.1,
})

/**
 * Road tool — press R to toggle road building mode.
 * Left-click places a road segment at the crosshair position.
 * Roads snap to terrain height.
 */
export const RoadTool = () => {
  const { camera, scene } = useThree()
  const [active, setActive] = useState(false)
  const [ghostPos, setGhostPos] = useState<[number, number] | null>(null)
  const ghostRef = useRef<THREE.Mesh>(null)
  const raycaster = useRef(new THREE.Raycaster())

  // Toggle with Y key (R conflicts with refine button in UI)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'y' && !e.ctrlKey && !e.metaKey) {
        // Only toggle if not already building
        const isBuilding = useStore.getState().selectedBlockType !== null
        if (!isBuilding) {
          setActive((a) => !a)
        }
      }
      if (e.key === 'Escape') setActive(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Raycast for ghost position
  useFrame(() => {
    if (!active) {
      if (ghostPos) setGhostPos(null)
      return
    }

    raycaster.current.setFromCamera(new THREE.Vector2(0, 0), camera)
    const targets: THREE.Object3D[] = []
    scene.traverse((child) => {
      if (child.name === 'ground') targets.push(child)
    })
    const hits = raycaster.current.intersectObjects(targets, false)
    if (hits.length > 0) {
      const p = hits[0].point
      const gx = Math.round(p.x)
      const gz = Math.round(p.z)
      setGhostPos([gx, gz])
    } else {
      setGhostPos(null)
    }
  })

  // Click to place
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (e.button !== 0 || !active || !ghostPos || !document.pointerLockElement) return
      const [gx, gz] = ghostPos

      // Check if already a road here
      const key = `road_${gx}_${gz}`
      if (_roadSegments.find(r => r.id === key)) return

      // Check resources
      const state = useStore.getState()
      if (state.inventory.liquid < ROAD_BLOCK_COST) return

      useStore.setState((s) => ({
        inventory: { ...s.inventory, liquid: s.inventory.liquid - ROAD_BLOCK_COST },
      }))

      const y = getInfiniteTerrainHeight(gx, gz)
      const mesh = new THREE.Mesh(roadGeo, roadMat())
      mesh.position.set(gx + 0.5, y + 0.04, gz + 0.5)
      mesh.receiveShadow = true
      mesh.rotation.x = 0

      scene.add(mesh)
      _roadSegments.push({ id: key, x: gx, z: gz, mesh })
    }

    window.addEventListener('mousedown', handleClick)
    return () => window.removeEventListener('mousedown', handleClick)
  }, [active, ghostPos, camera, scene])

  // Ghost preview material
  useEffect(() => {
    if (!ghostRef.current) return
    const mat = ghostRef.current.material as THREE.MeshBasicMaterial
    if (ghostPos) {
      const key = `road_${ghostPos[0]}_${ghostPos[1]}`
      const occupied = _roadSegments.find(r => r.id === key)
      mat.color.set(occupied ? '#ff4444' : '#44ff88')
      mat.opacity = occupied ? 0.2 : 0.3
    }
  }, [ghostPos])

  return (
    <group>
      {/* Ghost preview */}
      {active && ghostPos && (
        <mesh ref={ghostRef} position={[ghostPos[0] + 0.5, getInfiniteTerrainHeight(ghostPos[0], ghostPos[1]) + 0.04, ghostPos[1] + 0.5]}>
          <boxGeometry args={[1, 0.08, 1]} />
          <meshBasicMaterial color="#44ff88" transparent opacity={0.3} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}
