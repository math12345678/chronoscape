import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getTerrainHeight } from '../terrain'
import { ISLAND_SIZE } from '../config/constants'

const MOTES_COUNT = 300
const SPREAD = ISLAND_SIZE * 0.85

interface MoteData {
  phase: number
  speed: number
  yBase: number
  driftX: number
  driftZ: number
}

export const TimeMotes = () => {
  const pointsRef = useRef<THREE.Points>(null)
  const time = useRef(0)

  const { geometry, data } = useMemo(() => {
    const pos = new Float32Array(MOTES_COUNT * 3)
    const sizes = new Float32Array(MOTES_COUNT)
    const colors = new Float32Array(MOTES_COUNT * 3)
    const d: MoteData[] = []

    for (let i = 0; i < MOTES_COUNT; i++) {
      const x = (Math.random() - 0.5) * SPREAD
      const z = (Math.random() - 0.5) * SPREAD
      const y = getTerrainHeight(x, z)
      const yOff = 0.5 + Math.random() * 3

      pos[i * 3] = x
      pos[i * 3 + 1] = y + yOff
      pos[i * 3 + 2] = z

      sizes[i] = 0.06 + Math.random() * 0.1

      colors[i * 3] = 0.9 + Math.random() * 0.1
      colors[i * 3 + 1] = 1.0
      colors[i * 3 + 2] = 0.6 + Math.random() * 0.3

      d.push({
        phase: Math.random() * Math.PI * 2,
        speed: 0.2 + Math.random() * 0.4,
        yBase: y + yOff,
        driftX: (Math.random() - 0.5) * 0.5,
        driftZ: (Math.random() - 0.5) * 0.5,
      })
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return { geometry: geo, data: d }
  }, [])

  useFrame((_, delta) => {
    time.current += delta
    const t = time.current
    if (!pointsRef.current) return
    const pos = pointsRef.current.geometry.attributes.position.array as Float32Array

    for (let i = 0; i < MOTES_COUNT; i++) {
      const m = data[i]
      pos[i * 3] += Math.sin(t * 0.5 + m.phase) * delta * m.driftX * 0.3
      pos[i * 3 + 1] = m.yBase + Math.sin(t * m.speed + m.phase) * 0.4
      pos[i * 3 + 2] += Math.cos(t * 0.4 + m.phase * 1.2) * delta * m.driftZ * 0.3
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <primitive object={geometry} attach="geometry" />
      <pointsMaterial
        size={0.14}
        vertexColors
        transparent
        opacity={0.7}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}
