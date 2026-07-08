import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrameThrottled } from '../hooks/useFrameThrottled'
import { ISLAND_SIZE } from '../config/constants'

const CLOUD_COUNT = 30
const ALTITUDE_MIN = 35
const ALTITUDE_MAX = 60

interface CloudData {
  x: number; y: number; z: number
  scale: number; speed: number; phase: number
  puffCount: number
  puffs: { x: number; y: number; z: number; s: number; o: number }[]
}

function generateClouds(): CloudData[] {
  const clouds: CloudData[] = []
  for (let i = 0; i < CLOUD_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2
    const radius = ISLAND_SIZE * 0.3 + Math.random() * ISLAND_SIZE * 0.5
    const phase = Math.random() * Math.PI * 2
    const scale = 3 + Math.random() * 8
    const puffCount = 4 + (i % 4)

    const puffs = []
    for (let j = 0; j < puffCount; j++) {
      const pa = (j / puffCount) * Math.PI * 2 + phase
      puffs.push({
        x: Math.cos(pa) * (0.3 + ((i + j) % 10) * 0.05) * scale * 0.3,
        y: (Math.random() - 0.5) * 0.4,
        z: Math.sin(pa) * (0.3 + ((i + j) % 10) * 0.05) * scale * 0.3,
        s: 0.4 + ((i * 3 + j * 7) % 10) * 0.06,
        o: 0.3 + ((i * 5 + j * 11) % 10) * 0.04,
      })
    }

    clouds.push({
      x: Math.cos(angle) * radius,
      y: ALTITUDE_MIN + Math.random() * (ALTITUDE_MAX - ALTITUDE_MIN),
      z: Math.sin(angle) * radius,
      scale, speed: 0.3 + Math.random() * 0.5,
      phase, puffCount, puffs,
    })
  }
  return clouds
}

export const CloudLayer = () => {
  const groupRef = useRef<THREE.Group>(null)
  const time = useRef(0)
  const clouds = useMemo(() => generateClouds(), [])

  // Store base positions for drift calculation
  const bases = useRef<{ x: number; z: number }[]>([])

  useFrameThrottled((_, delta) => {
    time.current += delta
    if (!groupRef.current) return

    const children = groupRef.current.children
    for (let i = 0; i < clouds.length; i++) {
      const c = clouds[i]
      const child = children[i]
      if (!bases.current[i]) bases.current[i] = { x: c.x, z: c.z }

      const driftX = Math.sin(time.current * c.speed * 0.3 + c.phase) * ISLAND_SIZE * 0.2
      const driftZ = Math.cos(time.current * c.speed * 0.2 + c.phase * 1.3) * ISLAND_SIZE * 0.2
      child.position.x = bases.current[i].x + driftX
      child.position.z = bases.current[i].z + driftZ
    }
  }, 4) // throttled: clouds move slowly, update every ~4th frame

  return (
    <group ref={groupRef}>
      {clouds.map((c, i) => (
        <group key={i} position={[c.x, c.y, c.z]} scale={c.scale}>
          {c.puffs.map((p, j) => (
            <mesh key={j} position={[p.x, p.y, p.z]} scale={p.s}>
              <sphereGeometry args={[1, 6, 6]} />
              <meshBasicMaterial color="#eeeedd" transparent opacity={p.o * 0.5} depthWrite={false} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}
