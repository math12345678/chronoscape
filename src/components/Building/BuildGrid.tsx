import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useStore } from '../../store'
import * as THREE from 'three'

const GRID_RADIUS = 4 // blocks in each direction from crosshair
const GRID_COLOR = '#44ffaa'

/**
 * Build grid overlay that appears when the player is in build mode.
 * Shows a subtle grid on the ground at the crosshair's aim point,
 * highlighting valid snap positions.
 */
export const BuildGrid = () => {
  const selectedBlockType = useStore((s) => s.selectedBlockType)
  const gridRef = useRef<THREE.Group>(null)
  const pulseRef = useRef(0)

  const isBuilding = selectedBlockType !== null

  useFrame(() => {
    pulseRef.current += 0.03
    if (!gridRef.current) return
    gridRef.current.visible = isBuilding

    if (!isBuilding) return

    // Pulse the grid opacity
    const pulse = 0.3 + Math.sin(pulseRef.current) * 0.1
    gridRef.current.children.forEach((child) => {
      if (child.type === 'LineSegments') {
        const mat = (child as THREE.LineSegments).material as THREE.LineBasicMaterial
        mat.opacity = pulse
      }
    })
  })

  if (!isBuilding) return null

  // Generate grid lines
  const lines = useMemo(() => {
    const points: THREE.Vector3[] = []
    const half = GRID_RADIUS + 0.5

    // X-axis lines
    for (let z = -half; z <= half; z++) {
      points.push(new THREE.Vector3(-half, 0.02, z))
      points.push(new THREE.Vector3(half, 0.02, z))
    }
    // Z-axis lines
    for (let x = -half; x <= half; x++) {
      points.push(new THREE.Vector3(x, 0.02, -half))
      points.push(new THREE.Vector3(x, 0.02, half))
    }

    const geo = new THREE.BufferGeometry().setFromPoints(points)
    return geo
  }, [])

  return (
    <group ref={gridRef}>
      {/* Grid lines */}
      <lineSegments geometry={lines} frustumCulled={false}>
        <lineBasicMaterial color={GRID_COLOR} transparent opacity={0.25} depthWrite={false} />
      </lineSegments>
    </group>
  )
}
