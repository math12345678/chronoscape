import { useRef, useCallback, useState, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../store'
import { BLOCK_COST, EXPLOSION_RADIUS } from '../../config/constants'
import { ExplosionEffect } from './ExplosionEffect'
import { useSoundEngine } from '../../hooks/useSoundEngine'

interface Explosion {
  id: number
  position: [number, number, number]
}

let explId = 0

/**
 * Ghost preview block + click-to-place/remove system + detonation.
 * Lives inside the R3F Canvas.
 *
 * Building mode (block type selected):
 * - Ghost preview follows crosshair
 * - Left-click places, right-click removes
 *
 * Detonation (formula discovered + no block selected):
 * - Right-click on a vapour block triggers an explosion
 */
export const BuildPreview = () => {
  const { camera, scene } = useThree()
  const selectedBlockType = useStore((s) => s.selectedBlockType)
  const blocks = useStore((s) => s.blocks)
  const inventory = useStore((s) => s.inventory)
  const formulaDiscovered = useStore((s) => s.formulaDiscovered)
  const placeBlock = useStore((s) => s.placeBlock)
  const removeBlock = useStore((s) => s.removeBlock)
  const triggerExplosion = useStore((s) => s.triggerExplosion)

  const [ghostPos, setGhostPos] = useState<THREE.Vector3 | null>(null)
  const [canPlace, setCanPlace] = useState(false)
  const [explosions, setExplosions] = useState<Explosion[]>([])
  const raycaster = useRef(new THREE.Raycaster())
  const ghostRef = useRef<THREE.Mesh>(null)
  const sounds = useSoundEngine()

  const isBuilding = selectedBlockType !== null
  const canDetonate = formulaDiscovered('detonation')

  const findGroundAndBlocks = useCallback(() => {
    const meshes: THREE.Object3D[] = []
    scene.traverse((child) => {
      if (
        (child as THREE.Mesh).isMesh &&
        (child.name === 'ground' || child.type === 'InstancedMesh')
      ) {
        meshes.push(child)
      }
    })
    return meshes
  }, [scene])

  // Raycast each frame when in build mode
  useFrame(() => {
    if (!isBuilding) {
      if (ghostPos) setGhostPos(null)
      return
    }

    raycaster.current.setFromCamera(new THREE.Vector2(0, 0), camera)
    const targets = findGroundAndBlocks()
    const intersects = raycaster.current.intersectObjects(targets, false)

    if (intersects.length > 0) {
      const hit = intersects[0]
      const point = hit.point
      const normal = hit.face?.normal ?? new THREE.Vector3(0, 1, 0)

      const gx = Math.floor(point.x + normal.x * 0.5)
      const gy = Math.floor(point.y + normal.y * 0.5)
      const gz = Math.floor(point.z + normal.z * 0.5)
      const pos = new THREE.Vector3(gx + 0.5, gy + 0.5, gz + 0.5)

      const gridKey = `${gx},${gy},${gz}`
      const isOccupied = !!blocks[gridKey]
      const cost = BLOCK_COST[selectedBlockType!] ?? 5
      const resourceKey = selectedBlockType === 'vapour' ? 'vapour' : 'crystal'
      const hasResources = inventory[resourceKey as keyof typeof inventory] as number >= cost
      const valid = !isOccupied && hasResources

      setGhostPos(pos)
      setCanPlace(valid)
    } else {
      if (ghostPos) setGhostPos(null)
      setCanPlace(false)
    }
  })

  useEffect(() => {
    if (!ghostRef.current) return
    const mat = ghostRef.current.material as THREE.MeshBasicMaterial
    mat.color.set(canPlace ? '#44ff88' : '#ff4444')
    mat.opacity = canPlace ? 0.35 : 0.2
  }, [canPlace])

  // Find the block under the crosshair from InstancedMesh
  const findBlockAtCrosshair = useCallback(() => {
    raycaster.current.setFromCamera(new THREE.Vector2(0, 0), camera)
    const targets = findGroundAndBlocks()
    const intersects = raycaster.current.intersectObjects(targets, false)

    for (const hit of intersects) {
      const mesh = hit.object as THREE.InstancedMesh
      if (mesh.type === 'InstancedMesh' && hit.instanceId !== undefined) {
        const matrix = new THREE.Matrix4()
        mesh.getMatrixAt(hit.instanceId, matrix)
        const position = new THREE.Vector3()
        position.setFromMatrixPosition(matrix)
        const gx = Math.round(position.x - 0.5)
        const gy = Math.round(position.y - 0.5)
        const gz = Math.round(position.z - 0.5)
        const id = `${gx},${gy},${gz}`
        const block = useStore.getState().blocks[id]
        if (block) return { id, pos: [gx, gy, gz] as [number, number, number], block }
      }
    }
    return null
  }, [camera, findGroundAndBlocks])

  // Mouse click handlers
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (!document.pointerLockElement) return

      // Left click → place (building mode)
      if (e.button === 0 && isBuilding && ghostPos && canPlace) {
        const gx = Math.round(ghostPos.x - 0.5)
        const gy = Math.round(ghostPos.y - 0.5)
        const gz = Math.round(ghostPos.z - 0.5)
        const success = placeBlock(gx, gy, gz, selectedBlockType!)
        if (success) sounds.placeBlock()
        return
      }

      // Right click
      if (e.button === 2) {
        e.preventDefault()

        const hit = findBlockAtCrosshair()
        if (!hit) return

        // If building mode: remove the block
        if (isBuilding) {
          removeBlock(hit.id)
          sounds.removeBlock()
          return
        }

        // If detonation discovered + block is vapour: explode
        if (canDetonate && hit.block.type === 'vapour') {
          const removed = triggerExplosion(hit.pos, EXPLOSION_RADIUS)
          if (removed.length > 0) {
            const id = ++explId
            setExplosions((prev) => [...prev, { id, position: [hit.pos[0] + 0.5, hit.pos[1] + 0.5, hit.pos[2] + 0.5] }])
          }
          return
        }

        // Otherwise just remove single block
        removeBlock(hit.id)
        sounds.removeBlock()
      }
    }

    const handleContextMenu = (e: Event) => {
      e.preventDefault()
    }

    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('contextmenu', handleContextMenu)
    return () => {
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [isBuilding, ghostPos, canPlace, selectedBlockType, canDetonate, placeBlock, removeBlock, triggerExplosion, findBlockAtCrosshair])

  return (
    <>
      {ghostPos && isBuilding && (
        <mesh ref={ghostRef} position={ghostPos} renderOrder={999}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial
            color={canPlace ? '#44ff88' : '#ff4444'}
            transparent
            opacity={0.35}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Explosion effects */}
      {explosions.map((exp) => (
        <ExplosionEffect
          key={exp.id}
          position={exp.position}
          onComplete={() => {
            setExplosions((prev) => prev.filter((e) => e.id !== exp.id))
          }}
        />
      ))}
    </>
  )
}
