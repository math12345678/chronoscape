import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'
import { getInfiniteTerrainHeight } from './chunkTerrain'
import { getRiftPositionsForChunk } from './riftRegistry'
import { playWraithSpawnSound } from '../utils/audio'

const WRAITH_SPEED = 1.5
const PLAYER_DRAIN_DISTANCE = 2.0
const PLAYER_DRAIN_AMOUNT = 2
const MAX_WRAITHS = 50

interface LiveWraith {
  id: string
  mesh: THREE.Mesh
  glow: THREE.Mesh
  cx: number
  cz: number
  targetPos: THREE.Vector3
  phase: number
}

const liveWraiths = new Map<string, LiveWraith>()
let idCounter = 0

const glowGeo = new THREE.SphereGeometry(0.4, 8, 8)
const glowMat = new THREE.MeshBasicMaterial({
  color: '#8866ff',
  transparent: true,
  opacity: 0.15,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
})

const wraithGeo = new THREE.ConeGeometry(0.25, 0.5, 6)
const wraithMat = new THREE.MeshStandardMaterial({
  color: '#6644aa',
  emissive: '#4422aa',
  emissiveIntensity: 0.3,
  transparent: true,
  opacity: 0.8,
  roughness: 0.3,
  metalness: 0.1,
})

export function spawnWraith(x: number, z: number, cx: number, cz: number): string | null {
  if (liveWraiths.size >= MAX_WRAITHS) return null

  const id = `wraith_${idCounter++}`
  const mesh = new THREE.Mesh(wraithGeo, wraithMat.clone())
  const glow = new THREE.Mesh(glowGeo, glowMat.clone())

  const y = getInfiniteTerrainHeight(x, z) + 0.3
  mesh.position.set(x, y, z)
  glow.position.set(x, y, z)

  mesh.userData.interactable = true
  mesh.userData.type = 'wraith'
  mesh.userData.wraithId = id
  mesh.userData.prompt = '[Click] Banish Wraith (5 Liquid)'

  // Find a rift to drift toward
  const rifts = getRiftPositionsForChunk(cx, cz)
  let targetPos: THREE.Vector3
  if (rifts.length > 0) {
    const r = rifts[Math.floor(Math.random() * rifts.length)]
    targetPos = new THREE.Vector3(r.x, r.y, r.z)
  } else {
    // Drift toward center of chunk
    targetPos = new THREE.Vector3(cx * 32 + 16, 0, cz * 32 + 16)
  }

  liveWraiths.set(id, { id, mesh, glow, cx, cz, targetPos, phase: Math.random() * Math.PI * 2 })
  return id
}

export function removeWraith(id: string) {
  const w = liveWraiths.get(id)
  if (w) {
    if (w.mesh.parent) w.mesh.parent.remove(w.mesh)
    if (w.glow.parent) w.glow.parent.remove(w.glow)
    if (w.mesh.geometry) w.mesh.geometry.dispose()
    if (w.mesh.material) (w.mesh.material as THREE.Material).dispose()
    if (w.glow.geometry) w.glow.geometry.dispose()
    if (w.glow.material) (w.glow.material as THREE.Material).dispose()
    liveWraiths.delete(id)
  }
}

export function clearWraithsForChunk(cx: number, cz: number) {
  for (const [id, w] of liveWraiths) {
    if (w.cx === cx && w.cz === cz) {
      removeWraith(id)
    }
  }
}

export function getWraithMeshes(): THREE.Mesh[] {
  return Array.from(liveWraiths.values()).map(w => w.mesh)
}

export const WraithManager = () => {
  const groupRef = useRef<THREE.Group>(null)
  const time = useRef(0)
  const playedSpawnSound = useRef(new Set<string>())

  useEffect(() => {
    return () => {
      for (const w of liveWraiths.values()) {
        if (w.mesh.parent) w.mesh.parent.remove(w.mesh)
        if (w.glow.parent) w.glow.parent.remove(w.glow)
      }
    }
  }, [])

  useFrame((state, delta) => {
    time.current += delta
    if (!groupRef.current) return

    const playerPos = state.camera.position

    for (const w of liveWraiths.values()) {
      // Ensure in scene
      if (!w.mesh.parent) {
        groupRef.current.add(w.mesh)
        // Play spawn sound once per wraith within 30 units
        if (!playedSpawnSound.current.has(w.id)) {
          playedSpawnSound.current.add(w.id)
          if (w.mesh.position.distanceTo(playerPos) < 30) {
            playWraithSpawnSound()
          }
        }
      }
      if (!w.glow.parent) groupRef.current.add(w.glow)

      // Move toward target
      const dx = w.targetPos.x - w.mesh.position.x
      const dz = w.targetPos.z - w.mesh.position.z
      const dist = Math.sqrt(dx * dx + dz * dz)

      if (dist > 0.3) {
        const speed = WRAITH_SPEED * delta
        w.mesh.position.x += (dx / dist) * speed
        w.mesh.position.z += (dz / dist) * speed
      }

      // Stick to terrain
      const terrainY = getInfiniteTerrainHeight(w.mesh.position.x, w.mesh.position.z)
      w.mesh.position.y = terrainY + 0.4
      w.glow.position.copy(w.mesh.position)
      w.glow.position.y = terrainY + 0.1

      // Visual bob
      const bob = Math.sin(time.current * 2 + w.phase) * 0.05
      w.mesh.position.y += bob

      // Facing
      if (dist > 0.1) {
        w.mesh.rotation.y = Math.atan2(dx, dz)
      }

      // Glow pulse
      const gp = 0.1 + Math.sin(time.current * 1.5 + w.phase) * 0.08
      ;(w.glow.material as THREE.MeshBasicMaterial).opacity = gp

      // Cull wraiths far from player (>80 units)
      const pdx = w.mesh.position.x - playerPos.x
      const pdz = w.mesh.position.z - playerPos.z
      const distToPlayer = Math.sqrt(pdx * pdx + pdz * pdz)
      if (distToPlayer > 80) {
        w.mesh.visible = false
        w.glow.visible = false
        continue
      }
      w.mesh.visible = true
      w.glow.visible = true

      // Red glow when within drain range
      const isDraining = distToPlayer < PLAYER_DRAIN_DISTANCE
      const glowMat = w.glow.material as THREE.MeshBasicMaterial
      glowMat.color.set(isDraining ? '#ff4444' : '#8866ff')
      glowMat.opacity = isDraining ? 0.3 + Math.sin(time.current * 4 + w.phase) * 0.15 : 0.1 + Math.sin(time.current * 1.5 + w.phase) * 0.08

      // Drain player
      if (isDraining) {
        const state = useStore.getState()
        const toDrain = Math.min(PLAYER_DRAIN_AMOUNT * delta, state.inventory.liquid)
        if (toDrain > 0.1) {
          useStore.setState((s) => ({
            inventory: { ...s.inventory, liquid: Math.max(0, s.inventory.liquid - toDrain) },
          }))
        }
      }
    }
  })

  return <group ref={groupRef} />
}
