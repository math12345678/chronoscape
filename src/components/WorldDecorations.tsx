import { useMemo } from 'react'
import * as THREE from 'three'
import { getTerrainHeight } from '../terrain'

const ROCK_COUNT = 40
const CRYSTAL_COUNT = 15
const GRASS_COUNT = 80

interface RockData {
  pos: [number, number, number]
  scale: number
  rotY: number
}

interface CrystalData {
  pos: [number, number, number]
  scale: number
  color: string
}

interface GrassData {
  pos: [number, number, number]
  scale: number
  rotY: number
}

/** Procedurally generate positions using a seeded random approach */
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

const rand = seededRandom(42)

function generateRocks(): RockData[] {
  const rocks: RockData[] = []
  for (let i = 0; i < ROCK_COUNT; i++) {
    const x = (rand() - 0.5) * 45
    const z = (rand() - 0.5) * 45
    const y = getTerrainHeight(x, z)
    if (y > 0.2 || y < -0.3) continue // only on gentle slopes
    rocks.push({
      pos: [x, y, z],
      scale: 0.3 + rand() * 0.7,
      rotY: rand() * Math.PI * 2,
    })
  }
  return rocks
}

function generateCrystals(): CrystalData[] {
  const crystals: CrystalData[] = []
  const colors = ['#8866cc', '#aa88ff', '#7744aa', '#9966dd']
  for (let i = 0; i < CRYSTAL_COUNT; i++) {
    const x = (rand() - 0.5) * 40
    const z = (rand() - 0.5) * 40
    const y = getTerrainHeight(x, z)
    if (Math.abs(y) > 0.5) continue // avoid steep areas
    crystals.push({
      pos: [x, y, z],
      scale: 0.2 + rand() * 0.4,
      color: colors[Math.floor(rand() * colors.length)],
    })
  }
  return crystals
}

/** Single rock mesh */
const Rock = ({ data }: { data: RockData }) => (
  <mesh
    position={data.pos}
    rotation={[0, data.rotY, 0]}
    scale={data.scale}
    receiveShadow
    castShadow
  >
    <dodecahedronGeometry args={[0.3, 0]} />
    <meshStandardMaterial color="#6a6a7a" roughness={0.9} />
  </mesh>
)

/** Single crystal cluster */
const Crystal = ({ data }: { data: CrystalData }) => {
  const s = data.scale
  return (
    <group position={data.pos}>
      <mesh position={[0, 0.3 * s, 0]} castShadow>
        <coneGeometry args={[0.08 * s, 0.6 * s, 6]} />
        <meshStandardMaterial
          color={data.color}
          emissive={data.color}
          emissiveIntensity={0.2}
          roughness={0.3}
          metalness={0.2}
        />
      </mesh>
      <mesh position={[0.12 * s, 0.2 * s, 0.08 * s]} castShadow rotation={[0.2, 0.5, 0]}>
        <coneGeometry args={[0.05 * s, 0.4 * s, 6]} />
        <meshStandardMaterial
          color={data.color}
          emissive={data.color}
          emissiveIntensity={0.15}
          roughness={0.3}
          metalness={0.2}
        />
      </mesh>
    </group>
  )
}

/** Single grass tuft */
const Grass = ({ data }: { data: GrassData }) => {
  const s = data.scale
  return (
    <mesh
      position={[data.pos[0], data.pos[1] + 0.05, data.pos[2]]}
      rotation={[0, data.rotY, 0]}
      scale={s}
    >
      <planeGeometry args={[0.04, 0.15]} />
      <meshBasicMaterial
        color="#4a8a4a"
        transparent
        opacity={0.6}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}

/**
 * Renders procedurally generated world decorations:
 * - Rocks (dodecahedrons in grey tones)
 * - Crystal clusters (glowing cones in violet shades)
 * - Grass tufts (simple planes)
 */
export const WorldDecorations = () => {
  const rocks = useMemo(() => generateRocks(), [])
  const crystals = useMemo(() => generateCrystals(), [])
  const grasses = useMemo(() => {
    const g: GrassData[] = []
    for (let i = 0; i < GRASS_COUNT; i++) {
      const x = (rand() - 0.5) * 48
      const z = (rand() - 0.5) * 48
      const y = getTerrainHeight(x, z)
      if (Math.abs(y) > 0.8) continue
      g.push({
        pos: [x, y, z],
        scale: 0.3 + rand() * 0.5,
        rotY: rand() * Math.PI * 2,
      })
    }
    return g
  }, [])

  return (
    <group>
      {rocks.map((r, i) => <Rock key={`rock-${i}`} data={r} />)}
      {crystals.map((c, i) => <Crystal key={`crystal-${i}`} data={c} />)}
      {grasses.map((g, i) => <Grass key={`grass-${i}`} data={g} />)}
    </group>
  )
}
