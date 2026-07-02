import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const STAR_COUNT = 2000
const FIELD_RADIUS = 120

/**
 * A starfield that surrounds the scene.
 * Stars are distributed on a large sphere and slowly rotate to create
 * a sense of being under a night sky.
 * Some stars twinkle subtly via opacity animation.
 */
export const Starfield = () => {
  const groupRef = useRef<THREE.Group>(null)
  const time = useRef(0)

  const { geometry, twinkleIndices } = useMemo(() => {
    const positions = new Float32Array(STAR_COUNT * 3)
    const colors = new Float32Array(STAR_COUNT * 3)
    const sizes = new Float32Array(STAR_COUNT)
    const twinkles: number[] = []

    const colorOptions = [
      new THREE.Color('#ffffff'),
      new THREE.Color('#aaccff'),
      new THREE.Color('#ffddbb'),
      new THREE.Color('#ccddff'),
      new THREE.Color('#ffffcc'),
    ]

    for (let i = 0; i < STAR_COUNT; i++) {
      // Random position on sphere surface
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = FIELD_RADIUS * (0.6 + Math.random() * 0.4)

      positions[i * 3] = Math.sin(phi) * Math.cos(theta) * r
      positions[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * r * 0.6 // flatten vertically
      positions[i * 3 + 2] = Math.cos(phi) * r

      const color = colorOptions[Math.floor(Math.random() * colorOptions.length)]
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b

      sizes[i] = 0.5 + Math.random() * 2.5

      if (Math.random() < 0.3) {
        twinkles.push(i)
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    return { geometry: geo, twinkleIndices: twinkles }
  }, [])

  useFrame((_, delta) => {
    time.current += delta

    if (groupRef.current) {
      // Very slow rotation
      groupRef.current.rotation.y += delta * 0.008
      groupRef.current.rotation.x += delta * 0.003
    }

    // Subtle twinkle via size attribute
    const sizeAttr = geometry.attributes.size
    if (sizeAttr) {
      const array = sizeAttr.array as Float32Array
      for (const idx of twinkleIndices) {
        const twinkle = Math.sin(time.current * 2 + idx * 1.7) * 0.5 + 0.5
        array[idx] = (0.5 + twinkle * 0.5) * (0.5 + ((idx % 5) + 1) * 0.4)
      }
      sizeAttr.needsUpdate = true
    }
  })

  return (
    <group ref={groupRef}>
      <points geometry={geometry} frustumCulled={false}>
        <pointsMaterial
          size={0.4}
          vertexColors
          transparent
          opacity={0.9}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  )
}
