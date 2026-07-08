import { useRef, useCallback, useState, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../store'

/**
 * Multi-block selection system.
 * Hold left-click in build mode and drag to define a rectangular volume.
 * Short click (< 0.5 units drag) = place block (handled by BuildPreview).
 * Long drag (>= 0.5 units) = select volume for copy/blueprint.
 * Selected blocks are highlighted with a semi-transparent wireframe box.
 * Ctrl+C copies selection to clipboard.
 * Ctrl+V pastes clipboard blocks at crosshair position with ghost preview.
 */
export const BuildSelection = () => {
  const { camera, scene } = useThree()
  const selectedBlockType = useStore((s) => s.selectedBlockType)
  const selectionBox = useStore((s) => s.selectionBox)
  const setSelectionBox = useStore((s) => s.setSelectionBox)
  const copySelectionToClipboard = useStore((s) => s.copySelectionToClipboard)
  const pasteClipboard = useStore((s) => s.pasteClipboard)
  const blocks = useStore((s) => s.blocks)
  const ghostClipboard = useStore((s) => s.clipboard)

  const isDragging = useRef(false)
  const dragStart = useRef<[number, number, number] | null>(null)
  const dragEnd = useRef<[number, number, number] | null>(null)
  const [selectionActive, setSelectionActive] = useState(false)
  const [showGhost, setShowGhost] = useState(false)
  const [pasteGhostPos, setPasteGhostPos] = useState<[number, number, number] | null>(null)
  const [showPasteGhost, setShowPasteGhost] = useState(false)

  const raycaster = useRef(new THREE.Raycaster())

  // Find ground/block position at crosshair
  const getGridPoint = useCallback((): [number, number, number] | null => {
    raycaster.current.setFromCamera(new THREE.Vector2(0, 0), camera)
    const targets: THREE.Object3D[] = []
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && (child.name === 'ground' || child.type === 'InstancedMesh')) {
        targets.push(child)
      }
    })
    const intersects = raycaster.current.intersectObjects(targets, false)
    if (intersects.length > 0) {
      const hit = intersects[0]
      const p = hit.point
      const n = hit.face?.normal ?? new THREE.Vector3(0, 1, 0)
      return [Math.floor(p.x + n.x * 0.5), Math.floor(p.y + n.y * 0.5), Math.floor(p.z + n.z * 0.5)]
    }
    return null
  }, [camera, scene])

  // Update paste ghost position each frame when clipboard is loaded
  useFrame(() => {
    if (ghostClipboard && ghostClipboard.length > 0 && showPasteGhost) {
      const point = getGridPoint()
      if (point) {
        setPasteGhostPos(point)
      }
    }
  })

  // Mouse handlers
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0 || !selectedBlockType) return
      if (!document.pointerLockElement) return
      const point = getGridPoint()
      if (point) {
        dragStart.current = point
        dragEnd.current = point
        isDragging.current = true
      }
    }

    const handleMouseMove = () => {
      if (!isDragging.current || !dragStart.current) return
      const point = getGridPoint()
      if (point) {
        dragEnd.current = point
        // Check if drag distance exceeds threshold (0.5 units)
        const dx = point[0] - dragStart.current[0]
        const dz = point[2] - dragStart.current[2]
        if (Math.abs(dx) >= 1 || Math.abs(dz) >= 1) {
          setSelectionActive(true)
        }
      }
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button !== 0 || !isDragging.current) return
      isDragging.current = false

      if (selectionActive && dragStart.current && dragEnd.current) {
        // Find tallest block in the selected XZ area for Y range
        let maxY = 0
        for (const key of Object.keys(blocks)) {
          const [bx, , bz] = key.split(',').map(Number)
          const minX = Math.min(dragStart.current[0], dragEnd.current[0])
          const maxX = Math.max(dragStart.current[0], dragEnd.current[0])
          const minZ = Math.min(dragStart.current[2], dragEnd.current[2])
          const maxZ = Math.max(dragStart.current[2], dragEnd.current[2])
          if (bx >= minX && bx <= maxX && bz >= minZ && bz <= maxZ) {
            const [, by] = key.split(',').map(Number)
            maxY = Math.max(maxY, by + 1)
          }
        }

        setSelectionBox({
          start: [dragStart.current[0], 0, dragStart.current[2]],
          end: [dragEnd.current[0], Math.max(maxY, 3), dragEnd.current[2]],
        })
        setShowGhost(true)
      } else {
        // Short click (< threshold) → clear selection (block placement handled by BuildPreview)
        setSelectionBox(null)
        setShowGhost(false)
      }
      dragStart.current = null
      dragEnd.current = null
      setSelectionActive(false)
    }

    // Keyboard handler
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        copySelectionToClipboard()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault()
        if (ghostClipboard && ghostClipboard.length > 0) {
          const point = getGridPoint()
          if (point) {
            const success = pasteClipboard(point)
            if (success) {
              setShowPasteGhost(false)
              setPasteGhostPos(null)
            }
          }
        }
      }

      if (e.key === 'Escape' && selectionBox) {
        setSelectionBox(null)
        setShowGhost(false)
      }
    }

    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedBlockType, getGridPoint, selectionBox, setSelectionBox, copySelectionToClipboard, pasteClipboard, blocks, selectionActive, ghostClipboard])

  // Selection wireframe
  if (!selectionBox && !(ghostClipboard && ghostClipboard.length > 0 && showPasteGhost && pasteGhostPos)) return null

  return (
    <group>
      {/* Selection volume wireframe */}
      {selectionBox && (() => {
        const minX = Math.min(selectionBox.start[0], selectionBox.end[0])
        const maxX = Math.max(selectionBox.start[0], selectionBox.end[0])
        const minY = Math.min(selectionBox.start[1], selectionBox.end[1])
        const maxY = Math.max(selectionBox.start[1], selectionBox.end[1])
        const minZ = Math.min(selectionBox.start[2], selectionBox.end[2])
        const maxZ = Math.max(selectionBox.start[2], selectionBox.end[2])
        const cx = (minX + maxX) / 2
        const cy = (minY + maxY) / 2
        const cz = (minZ + maxZ) / 2
        const w = maxX - minX + 1
        const h = maxY - minY + 1
        const d = maxZ - minZ + 1

        return (
          <group>
            <mesh position={[cx + 0.5, cy + 0.5, cz + 0.5]}>
              <boxGeometry args={[w, h, d]} />
              <meshBasicMaterial color="#44aaff" transparent opacity={0.06} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
            <lineSegments position={[cx + 0.5, cy + 0.5, cz + 0.5]}>
              <edgesGeometry args={[new THREE.BoxGeometry(w, h, d)]} />
              <lineBasicMaterial color="#44aaff" transparent opacity={0.5} depthWrite={false} />
            </lineSegments>

            {/* Clipboard ghost preview at selection origin */}
            {ghostClipboard && ghostClipboard.length > 0 && showGhost && (
              <group position={[minX, minY, minZ]}>
                {ghostClipboard.map((b, i) => (
                  <mesh key={i} position={[b.pos[0] + 0.5, b.pos[1] + 0.5, b.pos[2] + 0.5]}>
                    <boxGeometry args={[1, 1, 1]} />
                    <meshBasicMaterial
                      color={b.type === 'vapour' ? '#ffaa00' : '#aa88ff'}
                      transparent
                      opacity={0.2}
                      depthWrite={false}
                    />
                  </mesh>
                ))}
              </group>
            )}
          </group>
        )
      })()}

      {/* Paste ghost — follows crosshair when Ctrl+V is pressed */}
      {ghostClipboard && ghostClipboard.length > 0 && showPasteGhost && pasteGhostPos && (
        <group position={[pasteGhostPos[0], pasteGhostPos[1], pasteGhostPos[2]]}>
          {ghostClipboard.map((b, i) => {
            const key = `${pasteGhostPos[0] + b.pos[0]},${pasteGhostPos[1] + b.pos[1]},${pasteGhostPos[2] + b.pos[2]}`
            const occupied = !!blocks[key]
            return (
              <mesh key={i} position={[b.pos[0] + 0.5, b.pos[1] + 0.5, b.pos[2] + 0.5]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshBasicMaterial
                  color={occupied ? '#ff4444' : (b.type === 'vapour' ? '#ffaa00' : '#aa88ff')}
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
    </group>
  )
}
