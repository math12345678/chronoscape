import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const PARTICLE_COUNT = 20
const DURATION = 1.0

/**
 * Sparkle burst effect that plays when a player gifts an NPC.
 * Golden/cyan particles burst outward in a sphere and fade.
 */
export const NPCGiftBurst = ({ position, onComplete }: { position: [number, number, number]; onComplete: () => void }) => {
  const groupRef = useRef<THREE.Group>(null)
  const pointsRef = useRef<THREE.Points>(null)
  const elapsed = useRef(0)

  const geoRef = useRef<THREE.BufferGeometry | null>(null)

  useEffect(() => {
    // Create particles programmatically
    const posArray = new Float32Array(PARTICLE_COUNT * 3)
    const colors = new Float32Array(PARTICLE_COUNT * 3)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 0.5 + Math.random() * 2
      posArray[i * 3] = Math.sin(phi) * Math.cos(theta) * r
      posArray[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * r
      posArray[i * 3 + 2] = Math.cos(phi) * r

      // Gold/cyan mix
      colors[i * 3] = 0.6 + Math.random() * 0.4
      colors[i * 3 + 1] = 0.5 + Math.random() * 0.5
      colors[i * 3 + 2] = 0.2 + Math.random() * 0.6
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(posArray, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geoRef.current = geo
  }, [])

  useFrame((_, delta) => {
    elapsed.current += delta
    const t = elapsed.current / DURATION

    if (t >= 1) {
      onComplete()
      return
    }

    if (!pointsRef.current || !geoRef.current) return

    const pos = geoRef.current.attributes.position.array as Float32Array
    for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
      pos[i] *= (1 + delta * 3) // Expand outward
    }
    geoRef.current.attributes.position.needsUpdate = true

    const mat = pointsRef.current.material as THREE.PointsMaterial
    mat.opacity = Math.max(0, 1 - t * 1.5)
    mat.size = 0.12 * (1 + t)
  })

  return (
    <group ref={groupRef} position={position}>
      {geoRef.current && (
        <points ref={pointsRef}>
          <primitive object={geoRef.current} attach="geometry" />
          <pointsMaterial
            size={0.15}
            vertexColors
            transparent
            opacity={1}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            sizeAttenuation
          />
        </points>
      )}
    </group>
  )
}
