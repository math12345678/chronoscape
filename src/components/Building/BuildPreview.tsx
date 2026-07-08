import { useRef, useCallback, useState, useEffect, useMemo } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../store'
import { BLOCK_COST } from '../../config/constants'
import { ExplosionEffect } from './ExplosionEffect'
import { useSoundEngine } from '../../hooks/useSoundEngine'
import { getBuildMode, getBuildPositions } from '../../utils/buildModes'
import { unlockBuildAchievement, unlockExplosionAchievement } from '../UI/ToastNotifications'

function triggerRemoveFlash() {
  const el = document.createElement('div')
  el.style.cssText = 'position:fixed;inset:0;background:radial-gradient(circle at 50% 50%, rgba(255,136,68,0.15) 0%, rgba(255,136,68,0.05) 30%, transparent 70%);pointer-events:none;z-index:9999;transition:opacity 0.1s ease-out'
  document.body.appendChild(el)
  requestAnimationFrame(() => { el.style.opacity = '1' })
  requestAnimationFrame(() => { requestAnimationFrame(() => { el.style.opacity = '0' }) })
  setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el) }, 200)
}

interface Explosion {
  id: number
  position: [number, number, number]
}

interface PlacementRingData {
  id: number
  position: [number, number, number]
}

function triggerPlacementFlash() {
  const el = document.createElement('div')
  el.style.cssText = 'position:fixed;inset:0;background:radial-gradient(circle at 50% 50%, rgba(68,255,204,0.25) 0%, rgba(68,255,204,0.08) 30%, transparent 70%);pointer-events:none;z-index:9999;transition:opacity 0.15s ease-out'
  document.body.appendChild(el)
  requestAnimationFrame(() => { el.style.opacity = '1' })
  requestAnimationFrame(() => { requestAnimationFrame(() => { el.style.opacity = '0' }) })
  setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el) }, 350)
}

let explId = 0
let placeRingId = 0

/**
 * Ghost preview block + click-to-place/remove system + detonation.
 * Lives inside the R3F Canvas.
 *
 * Building mode (block type selected):
 * - 'single' mode: click to place one block
 * - 'line' mode: click to set start, move to see line preview, click again to place
 * - 'rect' mode: click to set corner, move to see rect perimeter preview, click again to place
 * - 'fill' mode: click to set corner, move to see fill preview, click again to place
 * - Right-click removes blocks
 */
export const PlacementRing = ({ data, onComplete }: { data: PlacementRingData; onComplete: () => void }) => {
  const innerRef = useRef<THREE.Mesh>(null)
  const outerRef = useRef<THREE.Mesh>(null)
  const elapsed = useRef(0)
  const done = useRef(false)

  useFrame((_, delta) => {
    elapsed.current += delta
    const t = elapsed.current / 0.6
    if (t >= 1 && !done.current) { done.current = true; onComplete(); return }

    const scale = 1 + t * 5
    const opacity = 0.6 * (1 - t)

    if (innerRef.current) {
      innerRef.current.scale.set(scale, scale, scale)
      const mat = innerRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = opacity
    }
    if (outerRef.current) {
      const outerScale = 1 + t * 8
      outerRef.current.scale.set(outerScale, outerScale, outerScale)
      const mat = outerRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = opacity * 0.4
    }
  })

  return (
    <group>
      <mesh ref={innerRef} position={[data.position[0], data.position[1] + 0.05, data.position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.1, 0.5, 32]} />
        <meshBasicMaterial color="#44ffcc" transparent opacity={0.6} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={outerRef} position={[data.position[0], data.position[1] + 0.05, data.position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.6, 32]} />
        <meshBasicMaterial color="#44ffcc" transparent opacity={0.25} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

export const BuildPreview = () => {
  const { camera, scene } = useThree()
  const selectedBlockType = useStore((s) => s.selectedBlockType)
  const blocks = useStore((s) => s.blocks)
  const inventory = useStore((s) => s.inventory)
  const [ghostPos, setGhostPos] = useState<THREE.Vector3 | null>(null)
  const [canPlace, setCanPlace] = useState(false)
  const [explosions, setExplosions] = useState<Explosion[]>([])
  const [placementRings, setPlacementRings] = useState<PlacementRingData[]>([])
  const raycaster = useRef(new THREE.Raycaster())
  const ghostRef = useRef<THREE.Mesh>(null)
  const sounds = useSoundEngine()
  const ghostPosRef = useRef<THREE.Vector3 | null>(null)
  const canPlaceRef = useRef(false)

  // Paint mode (hold click to auto-place) state
  const isMouseDown = useRef(false)
  const paintCooldown = useRef(0)

  // Build mode state — multi-block placement
  const modeAnchorRef = useRef<[number, number, number] | null>(null)
  const modeActiveRef = useRef(false)
  const [modeActive, setModeActive] = useState(false)
  const [previewPositions, setPreviewPositions] = useState<[number, number, number][]>([])

  const isBuilding = selectedBlockType !== null

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
      if (ghostPosRef.current) {
        ghostPosRef.current = null
        setGhostPos(null)
      }
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

      ghostPosRef.current = pos
      canPlaceRef.current = valid
      setGhostPos(pos)
      setCanPlace(valid)

      // Paint mode: auto-place when mouse is held
      if (isMouseDown.current && valid && getBuildMode() === 'single') {
        const now = performance.now()
        if (now - paintCooldown.current > 120) {
          paintCooldown.current = now
          const s = useStore.getState()
          if (s.selectedBlockType) {
            const success = s.placeBlock(gx, gy, gz, s.selectedBlockType)
            if (success) {
              sounds.placeBlock()
              triggerPlacementFlash()
              const id = ++placeRingId
              setPlacementRings((prev) => [...prev, { id, position: [gx + 0.5, gy + 0.5, gz + 0.5] }])
              window.dispatchEvent(new CustomEvent('block-placed', { detail: { x: gx, y: gy, z: gz } }))
              window.dispatchEvent(new CustomEvent('block-place-shake'))
            }
          }
        }
      }

      // If mode is active, update preview positions from anchor
      if (modeActiveRef.current && modeAnchorRef.current) {
        const mode = getBuildMode()
        if (mode !== 'single') {
          const end: [number, number, number] = [gx, gy, gz]
          const shapePositions = getBuildPositions(mode, modeAnchorRef.current, end)
          setPreviewPositions(shapePositions)
        }
      }
    } else {
      if (ghostPosRef.current) {
        ghostPosRef.current = null
        setGhostPos(null)
      }
      canPlaceRef.current = false
      setCanPlace(false)
    }
  })

  // Update ghost material color based on canPlace
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

  // Place a single block at ghost position
  const placeSingleBlock = useCallback(() => {
    const curGhost = ghostPosRef.current
    const curCanPlace = canPlaceRef.current
    if (!curGhost || !curCanPlace) return false

    const s = useStore.getState()
    if (!s.selectedBlockType) return false
    const gx = Math.round(curGhost.x - 0.5)
    const gy = Math.round(curGhost.y - 0.5)
    const gz = Math.round(curGhost.z - 0.5)
    const success = s.placeBlock(gx, gy, gz, s.selectedBlockType)
    if (success) {
      sounds.placeBlock()
      triggerPlacementFlash()
      unlockBuildAchievement()
      const id = ++placeRingId
      setPlacementRings((prev) => [...prev, { id, position: [gx + 0.5, gy + 0.5, gz + 0.5] }])
      // Block resonance event
      window.dispatchEvent(new CustomEvent('block-placed', { detail: { x: gx, y: gy, z: gz } }))
      // Camera micro-shake on place
      window.dispatchEvent(new CustomEvent('block-place-shake'))
    }
    return success
  }, [sounds])

  // Check if all positions in a shape are valid
  const allPositionsValid = useCallback((positions: [number, number, number][]) => {
    if (positions.length === 0) return false
    const s = useStore.getState()
    if (!s.selectedBlockType) return false
    const cost = BLOCK_COST[s.selectedBlockType] ?? 5
    const resourceKey = s.selectedBlockType === 'vapour' ? 'vapour' : 'crystal'
    const totalCost = cost * positions.length
    const available = s.inventory[resourceKey as keyof typeof inventory] as number
    if (available < totalCost) return false
    for (const [x, y, z] of positions) {
      const key = `${x},${y},${z}`
      if (s.blocks[key]) return false
    }
    return true
  }, [])

  // Mouse click handlers — stable refs to avoid re-registration
  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (!document.pointerLockElement) return

    const s = useStore.getState()
    const curIsBuilding = s.selectedBlockType !== null
    const curCanDetonate = s.formulaDiscovered('detonation')
    const curBuildMode = curIsBuilding ? getBuildMode() : 'single'

    // Right click: remove block or detonate
    if (e.button === 2) {
      e.preventDefault()

      // If in multi-block mode, cancel it
      if (modeActiveRef.current) {
        modeActiveRef.current = false
        modeAnchorRef.current = null
        setModeActive(false)
        setPreviewPositions([])
        return
      }

      const hit = findBlockAtCrosshair()
      if (!hit) return

      if (curIsBuilding) {
        s.removeBlock(hit.id)
        sounds.removeBlock()
        triggerRemoveFlash()
        window.dispatchEvent(new CustomEvent('block-remove-shake'))
        return
      }

      if (curCanDetonate && hit.block.type === 'vapour') {
        const type = s.lastExplosionType ?? 'standard'
        const removed = s.triggerExplosionType(hit.pos, type)
        if (removed.length > 0) {
          const id = ++explId
          setExplosions((prev) => [...prev, { id, position: [hit.pos[0] + 0.5, hit.pos[1] + 0.5, hit.pos[2] + 0.5] }])
          unlockExplosionAchievement()
        }
        return
      }

      s.removeBlock(hit.id)
      sounds.removeBlock()
      triggerRemoveFlash()
      window.dispatchEvent(new CustomEvent('block-remove-shake'))
      return
    }

    // Left click: build
    if (e.button !== 0 || !curIsBuilding) return
    isMouseDown.current = true
    if (!ghostPosRef.current) return

    const curGhost = ghostPosRef.current
    const gx = Math.round(curGhost.x - 0.5)
    const gy = Math.round(curGhost.y - 0.5)
    const gz = Math.round(curGhost.z - 0.5)

    if (curBuildMode === 'single') {
      // Single block placement (original behavior)
      placeSingleBlock()
      return
    }

    // Multi-block modes (line, rect, fill)
    if (!modeActiveRef.current) {
      // First click — set anchor and activate mode
      modeAnchorRef.current = [gx, gy, gz]
      modeActiveRef.current = true
      setModeActive(true)
      // Initial preview is just the anchor point
      setPreviewPositions(getBuildPositions(curBuildMode, [gx, gy, gz], [gx, gy, gz]))
      return
    }

    // Second click — place the shape
    if (modeActiveRef.current && modeAnchorRef.current) {
      const end: [number, number, number] = [gx, gy, gz]
      const shapePositions = getBuildPositions(curBuildMode, modeAnchorRef.current, end)
      const valid = allPositionsValid(shapePositions)
      if (valid) {
        let placed = 0
        for (const [px, py, pz] of shapePositions) {
          const success = s.placeBlock(px, py, pz, s.selectedBlockType!)
          if (success) placed++
        }
        if (placed > 0) {
          sounds.placeBlock()
          triggerPlacementFlash()
          unlockBuildAchievement()
          // Spawn a placement ring at the center of the shape
          const cx = shapePositions.reduce((a, [x]) => a + x, 0) / shapePositions.length
          const cy = shapePositions.reduce((a, [, y]) => a + y, 0) / shapePositions.length
          const cz = shapePositions.reduce((a, [, , z]) => a + z, 0) / shapePositions.length
          const id = ++placeRingId
          setPlacementRings((prev) => [...prev, { id, position: [cx + 0.5, cy + 0.5, cz + 0.5] }])
        }
      }
      // Reset mode regardless of success
      modeActiveRef.current = false
      modeAnchorRef.current = null
      setModeActive(false)
      setPreviewPositions([])
    }
  }, [sounds, findBlockAtCrosshair, placeSingleBlock, allPositionsValid])

  useEffect(() => {
    const handleContextMenu = (e: Event) => {
      e.preventDefault()
    }
    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) isMouseDown.current = false
    }
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('contextmenu', handleContextMenu)
    return () => {
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [handleMouseDown])

  // Cancel mode on Escape or deselection
  useEffect(() => {
    if (!isBuilding && modeActiveRef.current) {
      modeActiveRef.current = false
      modeAnchorRef.current = null
      setModeActive(false)
      setPreviewPositions([])
    }
  }, [isBuilding])

  // Build the shape preview mesh instances
  const previewMeshData = useMemo(() => {
    if (!modeActive || previewPositions.length === 0) return null
    const positions = previewPositions
    const s = useStore.getState()
    const cost = BLOCK_COST[s.selectedBlockType!] ?? 5
    const resourceKey = s.selectedBlockType === 'vapour' ? 'vapour' : 'crystal'
    const totalCost = cost * positions.length
    const available = s.inventory[resourceKey as keyof typeof inventory] as number
    const allValid = available >= totalCost && positions.every(([x, y, z]) => !s.blocks[`${x},${y},${z}`])

    return { positions, allValid }
  }, [modeActive, previewPositions])

  return (
    <>
      {/* Single ghost block */}
      {ghostPos && isBuilding && !modeActive && (
        <group>
          {/* Glow shell */}
          <mesh position={ghostPos} renderOrder={999}>
            <boxGeometry args={[1.15, 1.15, 1.15]} />
            <meshBasicMaterial
              color={canPlace ? '#44ff88' : '#ff4444'}
              transparent
              opacity={0.08}
              depthWrite={false}
              side={THREE.BackSide}
            />
          </mesh>
          {/* Main ghost */}
          <mesh ref={ghostRef} position={ghostPos} renderOrder={1000}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial
              color={canPlace ? '#44ff88' : '#ff4444'}
              transparent
              opacity={0.45}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Edge wires */}
          <mesh position={ghostPos} renderOrder={1001}>
            <boxGeometry args={[1.01, 1.01, 1.01]} />
            <meshBasicMaterial
              color={canPlace ? '#44ff88' : '#ff4444'}
              transparent
              opacity={0.25}
              depthWrite={false}
              wireframe
            />
          </mesh>
        </group>
      )}

      {/* Multi-block shape preview */}
      {previewMeshData && (
        <group renderOrder={999}>
          {previewMeshData.positions.map(([x, y, z]) => {
            const key = `${x},${y},${z}`
            const occupied = !!blocks[key]
            const color = occupied ? '#ff4444' : (previewMeshData.allValid ? '#44ff88' : '#ff8844')
            return (
              <mesh key={`preview-${x}-${y}-${z}`} position={[x + 0.5, y + 0.5, z + 0.5]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshBasicMaterial
                  color={color}
                  transparent
                  opacity={occupied ? 0.15 : 0.25}
                  depthWrite={false}
                  wireframe={occupied}
                />
              </mesh>
            )
          })}
        </group>
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

      {/* Placement ring effects */}
      {placementRings.map((ring) => (
        <PlacementRing
          key={ring.id}
          data={ring}
          onComplete={() => {
            setPlacementRings((prev) => prev.filter((r) => r.id !== ring.id))
          }}
        />
      ))}
    </>
  )
}
