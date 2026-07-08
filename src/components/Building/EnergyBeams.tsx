import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../store'

/**
 * Energy beam connections between adjacent blocks.
 * Renders glowing lines connecting blocks that are within 1 unit of each other.
 * Gives the build a crystalline "circuit" look — blocks are connected by energy.
 */
export const EnergyBeams = () => {
  const blocks = useStore((s) => s.blocks)
  const lineRef = useRef<THREE.LineSegments>(null)
  const time = useRef(0)

  // Compute connections between adjacent blocks + build geometry in one pass
  const { positions, geometry } = useMemo(() => {
    const keys = Object.keys(blocks)
    const posMap = new Map<string, [number, number, number]>()
    for (const key of keys) {
      const [x, y, z] = key.split(',').map(Number)
      posMap.set(key, [x, y, z])
    }

    const connections: [number, number, number][] = []
    const seen = new Set<string>()

    for (const [key, pos] of posMap) {
      const [x, y, z] = pos
      const neighbors: [number, number, number][] = [
        [x + 1, y, z], [x - 1, y, z],
        [x, y + 1, z], [x, y - 1, z],
        [x, y, z + 1], [x, y, z - 1],
      ]
      for (const [nx, ny, nz] of neighbors) {
        const nKey = `${nx},${ny},${nz}`
        const connKey = key < nKey ? `${key}-${nKey}` : `${nKey}-${key}`
        if (posMap.has(nKey) && !seen.has(connKey)) {
          seen.add(connKey)
          connections.push([x + 0.5, y + 0.5, z + 0.5])
          connections.push([nx + 0.5, ny + 0.5, nz + 0.5])
        }
      }
    }

    // Build geometry from connections
    const g = new THREE.BufferGeometry()
    const posArray = new Float32Array(connections.length * 3)
    for (let i = 0; i < connections.length; i++) {
      posArray[i * 3] = connections[i][0]
      posArray[i * 3 + 1] = connections[i][1]
      posArray[i * 3 + 2] = connections[i][2]
    }
    g.setAttribute('position', new THREE.BufferAttribute(posArray, 3))

    return { positions: connections, geometry: g }
  }, [blocks])

  // Animate beam opacity and color pulse
  useFrame((_, delta) => {
    time.current += delta
    if (!lineRef.current || positions.length === 0) return
    const mat = lineRef.current.material as THREE.LineBasicMaterial
    const pulse = 0.3 + Math.sin(time.current * 0.8) * 0.2
    mat.opacity = pulse * 0.4
  })

  if (positions.length === 0) return null

  return (
    <lineSegments ref={lineRef} geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial
        color="#44ffcc"
        transparent
        opacity={0.3}
        depthWrite={false}
      />
    </lineSegments>
  )
}
