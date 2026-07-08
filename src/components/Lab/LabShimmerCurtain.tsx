import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { LAB_POSITION } from '../../config/constants'

const PARTICLE_COUNT = 60
const CURTAIN_WIDTH = 3.5
const CURTAIN_HEIGHT = 2.5

/**
 * A shimmering particle curtain that hangs at the Lab entrance.
 * Not a solid door — a veiled energy field of slowly falling,
 * twinkling particles that reveal the lab interior as the player
 * walks through.
 */
export const LabShimmerCurtain = () => {
  const pointsRef = useRef<THREE.Points>(null)
  const time = useRef(0)

  const geometry = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3)
    const sizes = new Float32Array(PARTICLE_COUNT)
    const colors = new Float32Array(PARTICLE_COUNT * 3)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Scattered within the entrance arch
      pos[i * 3] = (Math.random() - 0.5) * CURTAIN_WIDTH
      pos[i * 3 + 1] = Math.random() * CURTAIN_HEIGHT
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.3

      // Shimmer size variation
      sizes[i] = 0.04 + Math.random() * 0.08

      // Violet-to-cyan gradient
      const t = Math.random()
      colors[i * 3] = 0.4 + t * 0.4   // R
      colors[i * 3 + 1] = 0.3 + (1 - t) * 0.3 // G
      colors[i * 3 + 2] = 0.8 + (1 - t) * 0.2 // B
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    return geo
  }, [])

  useFrame((_, delta) => {
    time.current += delta
    if (!pointsRef.current) return

    const pos = geometry.attributes.position.array as Float32Array
    const sizes = geometry.attributes.size.array as Float32Array
    const t = time.current

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Gentle vertical fall with reset
      pos[i * 3 + 1] -= delta * (0.1 + Math.sin(i) * 0.05)
      if (pos[i * 3 + 1] < -0.2) {
        pos[i * 3 + 1] = CURTAIN_HEIGHT + 0.2
        pos[i * 3] = (Math.random() - 0.5) * CURTAIN_WIDTH
        pos[i * 3 + 2] = (Math.random() - 0.5) * 0.3
      }

      // Horizontal sway (breathing motion)
      pos[i * 3] += Math.sin(t * 0.5 + i * 0.3) * delta * 0.05

      // Twinkle size
      const twinkle = Math.sin(t * 2 + i * 1.7) * 0.5 + 0.5
      sizes[i] = (0.02 + twinkle * 0.08) * (0.8 + Math.sin(t * 1.3 + i) * 0.2)
    }

    geometry.attributes.position.needsUpdate = true
    geometry.attributes.size.needsUpdate = true
  })

  return (
    <group position={[LAB_POSITION[0], LAB_POSITION[1] + 0.3, LAB_POSITION[2] + 2.6]}>
      <points ref={pointsRef}>
        <primitive object={geometry} attach="geometry" />
        <pointsMaterial
          size={0.1}
          vertexColors
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
    </group>
  )
}
