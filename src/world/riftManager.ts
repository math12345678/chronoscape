import * as THREE from 'three'
import { getOrGenerateChunk } from './chunkCache'
import { registerRiftsForChunk, unregisterChunk, getRiftPositionsForChunk } from './riftRegistry'
import type { RiftData } from './chunkContent'
import { TIME_RIFT_POSITIONS } from '../config/constants'

const HARVEST_AMOUNT = 10
const RIFT_RESPAWN_MS = 20_000

interface RiftState {
  data: RiftData
  mesh: THREE.Mesh
  glow: THREE.Mesh
  active: boolean
  cooldownUntil: number
}

const riftStates = new Map<string, RiftState>()
let riftIdCounter = 0

const sphereGeo = new THREE.SphereGeometry(0.6, 16, 16)
const glowGeo = new THREE.SphereGeometry(0.85, 12, 12)

export function buildChunkRifts(cx: number, cz: number, group: THREE.Group) {
  const data = getOrGenerateChunk(cx, cz)
  const riftPositions: RiftData[] = []

  for (const r of data.rifts) {
    const id = `rift_${riftIdCounter++}`
    riftPositions.push(r)

    const mesh = new THREE.Mesh(sphereGeo, new THREE.MeshStandardMaterial({
      color: '#22ddaa',
      emissive: '#22ddaa',
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 1,
      roughness: 0.2,
      metalness: 0.1,
    }))
    mesh.position.set(r.x, r.y, r.z)
    mesh.userData.interactable = true
    mesh.userData.type = 'rift'
    mesh.userData.riftId = id
    mesh.userData.prompt = '[Click] Harvest Rift'
    group.add(mesh)

    const glow = new THREE.Mesh(glowGeo, new THREE.MeshBasicMaterial({
      color: '#22ddaa',
      transparent: true,
      opacity: 0.25,
      side: THREE.BackSide,
    }))
    glow.position.copy(mesh.position)
    group.add(glow)

    riftStates.set(id, { data: r, mesh, glow, active: true, cooldownUntil: 0 })
  }

  registerRiftsForChunk(cx, cz, riftPositions)
}

export function getRiftMeshes(): THREE.Mesh[] {
  return Array.from(riftStates.values()).map(r => r.mesh)
}

export function handleRiftClick(riftId: string): number {
  const state = riftStates.get(riftId)
  if (!state || !state.active) return 0

  state.active = false
  state.cooldownUntil = performance.now() + RIFT_RESPAWN_MS

  // Visual feedback — go dormant
  ;(state.mesh.material as THREE.MeshStandardMaterial).color.setHex(0x224444)
  ;(state.mesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000)
  ;(state.mesh.material as THREE.MeshStandardMaterial).opacity = 0.25
  ;(state.glow.material as THREE.MeshBasicMaterial).opacity = 0

  return HARVEST_AMOUNT
}

export function updateRifts(time: number) {
  for (const state of riftStates.values()) {
    if (!state.active && performance.now() > state.cooldownUntil) {
      // Respawn
      state.active = true
      ;(state.mesh.material as THREE.MeshStandardMaterial).color.setHex(0x22ddaa)
      ;(state.mesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x22ddaa)
      ;(state.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.8
      ;(state.mesh.material as THREE.MeshStandardMaterial).opacity = 1
      ;(state.glow.material as THREE.MeshBasicMaterial).opacity = 0.25
    }

    if (state.active) {
      // Animation
      const pulse = 0.6 + Math.sin(time * 2) * 0.25
      ;(state.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse
      const gp = 0.3 + Math.sin(time * 1.5) * 0.2
      ;(state.glow.material as THREE.MeshBasicMaterial).opacity = gp
    }
  }
}

export function getNearestRiftPos(cameraX: number, cameraZ: number): { x: number; z: number } | null {
  let nearest: { x: number; z: number } | null = null
  let nearestDist = Infinity

  // Check chunk rifts
  for (const state of riftStates.values()) {
    if (!state.active) continue
    const dx = state.data.x - cameraX
    const dz = state.data.z - cameraZ
    const d = dx * dx + dz * dz
    if (d < nearestDist) {
      nearestDist = d
      nearest = { x: state.data.x, z: state.data.z }
    }
  }

  // Check fixed fancy rifts from TIME_RIFT_POSITIONS
  for (const r of TIME_RIFT_POSITIONS) {
    const dx = r.pos[0] - cameraX
    const dz = r.pos[2] - cameraZ
    const d = dx * dx + dz * dz
    if (d < nearestDist) {
      nearestDist = d
      nearest = { x: r.pos[0], z: r.pos[2] }
    }
  }

  return nearest
}

export function clearRiftsForChunk(cx: number, cz: number) {
  const rifts = getRiftPositionsForChunk(cx, cz)
  for (const r of rifts) {
    for (const [id, state] of riftStates) {
      if (state.data.x === r.x && state.data.z === r.z) {
        if (state.mesh.parent) state.mesh.parent.remove(state.mesh)
        if (state.glow.parent) state.glow.parent.remove(state.glow)
        // Don't dispose shared geometries
        if (state.mesh.material) (state.mesh.material as THREE.Material).dispose()
        if (state.glow.material) (state.glow.material as THREE.Material).dispose()
        riftStates.delete(id)
        break
      }
    }
  }
  unregisterChunk(cx, cz)
}
