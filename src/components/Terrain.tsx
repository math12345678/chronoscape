import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { ISLAND_SIZE } from '../config/constants'
import { getTerrainHeight } from '../terrain'

const SEGMENTS = 80

/**
 * Rolling hills terrain that replaces the flat ground plane.
 * Vertex displacement using layered sine waves creates organic terrain.
 * Named "ground" so BuildPreview can raycast against it.
 */
export const Terrain = () => {
  const meshRef = useRef<THREE.Mesh>(null)
  const grassColor = useMemo(() => new THREE.Color('#4a7c59'), [])
  const grassColor2 = useMemo(() => new THREE.Color('#5a8c69'), [])

  // Build geometry with displaced vertices
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

    // Color each vertex by height for subtle visual variety
    const colors = new Float32Array(pos.count * 3)
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i)
      const t = THREE.MathUtils.clamp((y + 1) / 3, 0, 1)
      const c = grassColor.clone().lerp(grassColor2, t)
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    return geo
  }, [grassColor, grassColor2])

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
        flatShading={false}
      />
    </mesh>
  )
}
