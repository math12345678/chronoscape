import { useRef, useMemo } from 'react'
import { useFrameThrottled } from '../hooks/useFrameThrottled'
import * as THREE from 'three'
import { ISLAND_SIZE } from '../config/constants'
import { getTerrainHeight } from '../terrain'

const BIRD_COUNT = 20
const FLOCK_SPREAD = ISLAND_SIZE * 0.7

interface BirdData {
  startPos: [number, number, number]
  radius: number
  speed: number
  phase: number
  flapSpeed: number
  tilt: number
  size: number
}

/**
 * Simple ambient birds that circle around the island.
 * Each bird follows a gentle circular path at varying heights and speeds.
 * Uses a simple V-shape geometry for the bird silhouette.
 */
export const AmbientBirds = () => {
  const groupRef = useRef<THREE.Group>(null)
  const time = useRef(0)

  const birds = useMemo(() => {
    const result: BirdData[] = []
    for (let i = 0; i < BIRD_COUNT; i++) {
      const x = (Math.random() - 0.5) * FLOCK_SPREAD
      const z = (Math.random() - 0.5) * FLOCK_SPREAD
      const y = getTerrainHeight(x, z)
      result.push({
        startPos: [x, y + 5 + Math.random() * 15, z],
        radius: 5 + Math.random() * 20,
        speed: 0.3 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        flapSpeed: 8 + Math.random() * 6,
        tilt: (Math.random() - 0.5) * 0.3,
        size: 0.5 + Math.random() * 0.8,
      })
    }
    return result
  }, [])

  useFrameThrottled((_, delta) => {
    time.current += delta
    if (!groupRef.current) return

    groupRef.current.children.forEach((child, i) => {
      if (i >= birds.length) return
      const b = birds[i]
      const t = time.current * b.speed + b.phase

      // Circular path with some vertical oscillation
      const x = b.startPos[0] + Math.cos(t) * b.radius
      const z = b.startPos[2] + Math.sin(t) * b.radius * 0.7
      const y = b.startPos[1] + Math.sin(t * 0.8) * 2

      child.position.set(x, y, z)

      // Face direction of movement
      const dir = Math.atan2(
        -Math.sin(t) * b.radius,
        Math.cos(t) * b.radius * 0.7,
      )
      child.rotation.y = dir

      // Bank into turns
      child.rotation.z = Math.sin(t * 0.5) * b.tilt

      // Wing flap animation via children
      const wingFlap = Math.sin(time.current * b.flapSpeed) * 0.5
      const wing1 = child.children[0]
      const wing2 = child.children[1]
      if (wing1) wing1.rotation.x = wingFlap
      if (wing2) wing2.rotation.x = -wingFlap
    })
  }, 3)

  // Create bird geometries once
  const birdGeos = useMemo(() => {
    return birds.map((b) => {
      const s = b.size
      const group = new THREE.Group()

      // Body
      const bodyGeo = new THREE.BufferGeometry()
      const bodyVerts = new Float32Array([
        0, 0, 0.08 * s,
        -0.02 * s, 0, -0.06 * s,
        0.02 * s, 0, -0.06 * s,
      ])
      bodyGeo.setAttribute('position', new THREE.BufferAttribute(bodyVerts, 3))
      bodyGeo.setIndex([0, 1, 2])
      bodyGeo.computeVertexNormals()
      const body = new THREE.Mesh(bodyGeo, new THREE.MeshBasicMaterial({ color: '#334455' }))
      group.add(body)

      // Left wing
      const wingGeo = new THREE.BufferGeometry()
      const wingVerts = new Float32Array([
        0, 0, 0.04 * s,
        -0.12 * s, 0.02 * s, 0,
        0, 0, 0,
      ])
      wingGeo.setAttribute('position', new THREE.BufferAttribute(wingVerts, 3))
      wingGeo.setIndex([0, 1, 2])
      wingGeo.computeVertexNormals()
      const leftWing = new THREE.Mesh(wingGeo, new THREE.MeshBasicMaterial({ color: '#445566' }))
      group.add(leftWing)

      // Right wing
      const rightWing = new THREE.Mesh(wingGeo.clone(), new THREE.MeshBasicMaterial({ color: '#445566' }))
      rightWing.scale.x = -1
      rightWing.position.x = 0.01 * s
      group.add(rightWing)

      return group
    })
  }, [birds])

  return (
    <group ref={groupRef}>
      {birdGeos.map((geo, i) => (
        <primitive key={i} object={geo} />
      ))}
    </group>
  )
}
