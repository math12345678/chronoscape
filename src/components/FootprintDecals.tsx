import { useRef, useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { useFrameThrottled } from '../hooks/useFrameThrottled'
import * as THREE from 'three'
import { getTerrainHeight } from '../terrain'

const MAX_FOOTPRINTS = 40
const FOOTPRINT_INTERVAL = 0.35 // seconds between prints
const FOOTPRINT_LIFETIME = 3000 // ms before full fade

interface Footprint {
  position: THREE.Vector3
  rotation: number
  createdAt: number
}

/**
 * Leaves temporary dark circle decals on the ground where the player walks.
 * Each footprint fades over 3 seconds, creating a subtle trail.
 * Only appears when walking (not standing still or airborne).
 * Each footprint is a simple ring mesh with fading opacity.
 */
export const FootprintDecals = () => {
  const { camera } = useThree()
  const groupRef = useRef<THREE.Group>(null)
  const footprintsRef = useRef<(Footprint | undefined)[]>([])
  const activeCountRef = useRef(0)
  const lastPrintTime = useRef(0)
  const lastPosRef = useRef(new THREE.Vector3())

  // Pre-generate footprint meshes for recycling
  const meshPool = useRef<THREE.Mesh[]>([])

  useEffect(() => {
    if (!groupRef.current) return
    // Create pool of footprint meshes
    for (let i = 0; i < MAX_FOOTPRINTS; i++) {
      const geo = new THREE.RingGeometry(0.06, 0.12, 8)
      const mat = new THREE.MeshBasicMaterial({
        color: '#2a3a2a',
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.rotation.x = -Math.PI / 2
      mesh.visible = false
      groupRef.current.add(mesh)
      meshPool.current.push(mesh)
    }
  }, [])

  useFrameThrottled(() => {
    if (!groupRef.current) return
    // Quick exit if no active footprints
    if (activeCountRef.current === 0) return
    const now = Date.now()
    const px = camera.position.x
    const pz = camera.position.z
    const py = camera.position.y
    const groundY = getTerrainHeight(px, pz)
    const heightAbove = py - (groundY + 1.6)

    // Check if player is moving enough to leave prints
    const dx = px - lastPosRef.current.x
    const dz = pz - lastPosRef.current.z
    const distMoved = Math.sqrt(dx * dx + dz * dz)

    // On ground? Actually walking? Enough time since last print?
    if (
      Math.abs(heightAbove) < 0.2 &&
      distMoved > 0.08 &&
      now - lastPrintTime.current > FOOTPRINT_INTERVAL * 1000
    ) {
      lastPrintTime.current = now
      lastPosRef.current.set(px, 0, pz)

      // Find oldest inactive footprint to recycle
      let oldestIdx = 0
      let oldestTime = Infinity
      for (let i = 0; i < MAX_FOOTPRINTS; i++) {
        if (!footprintsRef.current[i]) {
          oldestIdx = i
          break
        }
        if ((footprintsRef.current[i]?.createdAt ?? 0) < oldestTime) {
          oldestTime = footprintsRef.current[i]?.createdAt ?? 0
          oldestIdx = i
        }
      }

      activeCountRef.current++
      const fp: Footprint = {
        position: new THREE.Vector3(px, groundY + 0.02, pz),
        rotation: Math.random() * Math.PI * 2,
        createdAt: now,
      }
      footprintsRef.current[oldestIdx] = fp

      // Update the mesh
      const mesh = meshPool.current[oldestIdx]
      if (mesh) {
        mesh.position.copy(fp.position)
        mesh.rotation.z = fp.rotation
        mesh.visible = true
      }
    }

    // Update all active footprints' opacity based on age
    for (let i = 0; i < MAX_FOOTPRINTS; i++) {
      const fp = footprintsRef.current[i]
      const mesh = meshPool.current[i]
      if (!fp || !mesh) continue

      const age = now - fp.createdAt
      if (age > FOOTPRINT_LIFETIME) {
        mesh.visible = false
        delete footprintsRef.current[i]
        activeCountRef.current--
      } else {
        const life = 1 - age / FOOTPRINT_LIFETIME
        const opacity = life * life * 0.2 // quadratic fade
        const mat = mesh.material as THREE.MeshBasicMaterial
        mat.opacity = opacity
      }
    }
  }, 3)

  return <group ref={groupRef} />
}
