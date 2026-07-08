import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { ISLAND_SIZE } from '../config/constants'
import { getTerrainHeight } from '../terrain'
import { getBiomeTerrainColor } from '../world/biome'

const SEGMENTS = 120

export const Terrain = () => {
  const meshRef = useRef<THREE.Mesh>(null)

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(ISLAND_SIZE, ISLAND_SIZE, SEGMENTS, SEGMENTS)
    geo.rotateX(-Math.PI / 2)

    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const y = getTerrainHeight(x, z)
      pos.setY(i, y)
    }
    pos.needsUpdate = true
    geo.computeVertexNormals()

    // Compute biome-aware vertex colors
    const colors = new Float32Array(pos.count * 3)
    const normals = geo.attributes.normal

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const y = pos.getY(i)
      const ny = normals.getY(i)
      const slope = 1 - Math.abs(ny)

      // Get biome-aware color
      const [r, g, b] = getBiomeTerrainColor(x, z, y, slope)

      // Subtle micro-variation using position hash for natural look
      const microVar = (Math.sin(x * 12.7 + z * 9.3) * 0.02 + 0.02)

      colors[i * 3] = r + microVar
      colors[i * 3 + 1] = g + microVar * 0.5
      colors[i * 3 + 2] = b
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    return geo
  }, [])

  return (
    <mesh
      ref={meshRef}
      name="ground"
      geometry={geometry}
      receiveShadow
      frustumCulled={false}
    >
      <meshStandardMaterial
        vertexColors
        roughness={0.9}
        metalness={0}
      />
    </mesh>
  )
}
