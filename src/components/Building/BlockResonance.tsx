import { useRef, useState, useCallback, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../store'

interface ResonanceRing {
  id: number
  x: number
  y: number
  z: number
  startTime: number
}

let ringId = 0

export const BlockResonance = () => {
  const [rings, setRings] = useState<ResonanceRing[]>([])
  const ringsRef = useRef<ResonanceRing[]>([])
  const meshRefs = useRef<Map<number, THREE.Mesh>>(new Map())

  const addRing = useCallback((x: number, y: number, z: number) => {
    const ring: ResonanceRing = { id: ringId++, x, y, z, startTime: performance.now() }
    ringsRef.current = [...ringsRef.current, ring]
    setRings(ringsRef.current)
    setTimeout(() => {
      ringsRef.current = ringsRef.current.filter((r) => r.id !== ring.id)
      setRings([...ringsRef.current])
    }, 600)
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail
      if (d) addRing(d.x, d.y, d.z)
    }
    window.addEventListener('block-placed', handler)
    return () => window.removeEventListener('block-placed', handler)
  }, [addRing])

  useFrame(() => {
    const now = performance.now()
    for (const ring of ringsRef.current) {
      const mesh = meshRefs.current.get(ring.id)
      if (!mesh) continue
      const age = (now - ring.startTime) / 600
      if (age >= 1) continue
      const scale = 1 + age * 4
      mesh.scale.setScalar(scale)
      const mat = mesh.material as THREE.MeshBasicMaterial
      mat.opacity = 0.4 * (1 - age)
    }
  })

  if (rings.length === 0) return null

  return (
    <group>
      {rings.map((ring) => (
        <mesh
          key={ring.id}
          ref={(el) => { if (el) meshRefs.current.set(ring.id, el) }}
          position={[ring.x + 0.5, ring.y + 0.55, ring.z + 0.5]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.3, 0.8, 24]} />
          <meshBasicMaterial
            color="#44ffcc"
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  )
}
