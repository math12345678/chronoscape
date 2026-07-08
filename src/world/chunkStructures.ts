import * as THREE from 'three'
import { getOrGenerateChunk } from './chunkCache'
import { CHUNK_SIZE } from './chunkContent'
import { getInfiniteTerrainHeight } from './chunkTerrain'

let labCounter = 0
let traderCounter = 0

export function buildChunkStructures(cx: number, cz: number, group: THREE.Group) {
  const data = getOrGenerateChunk(cx, cz)

  if (data.hasLab) {
    const cxWorld = cx * CHUNK_SIZE + CHUNK_SIZE / 2
    const czWorld = cz * CHUNK_SIZE + CHUNK_SIZE / 2
    const y = getInfiniteTerrainHeight(cxWorld, czWorld)
    const id = `lab_${labCounter++}`

    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.5, 0.5, 6),
      new THREE.MeshStandardMaterial({ color: '#44ffcc', emissive: '#44ffcc', emissiveIntensity: 0.5 })
    )
    beacon.position.set(cxWorld, y + 0.25, czWorld)
    beacon.userData.interactable = true
    beacon.userData.type = 'lab'
    beacon.userData.prompt = '[Click] Enter Lab'
    beacon.userData.labId = id
    group.add(beacon)

    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(0.8, 12),
      new THREE.MeshBasicMaterial({ color: '#44ffcc', transparent: true, opacity: 0.15, side: THREE.DoubleSide })
    )
    glow.position.set(cxWorld, y + 0.05, czWorld)
    glow.rotation.x = -Math.PI / 2
    group.add(glow)
  }

  if (data.hasTrader) {
    const cxWorld = cx * CHUNK_SIZE + CHUNK_SIZE / 2
    const czWorld = cz * CHUNK_SIZE + CHUNK_SIZE / 2
    const y = getInfiniteTerrainHeight(cxWorld, czWorld)
    const id = `trader_${traderCounter++}`

    const booth = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.6, 0.8),
      new THREE.MeshStandardMaterial({ color: '#cc8844', roughness: 0.7 })
    )
    booth.position.set(cxWorld, y + 0.3, czWorld)
    booth.receiveShadow = true
    booth.castShadow = true
    booth.userData.interactable = true
    booth.userData.type = 'trader'
    booth.userData.prompt = '[Click] Trade'
    booth.userData.traderId = id
    group.add(booth)

    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry(0.6, 0.3, 4),
      new THREE.MeshStandardMaterial({ color: '#ffaa44', roughness: 0.5, emissive: '#ffaa44', emissiveIntensity: 0.1 })
    )
    canopy.position.set(cxWorld, y + 0.7, czWorld)
    group.add(canopy)
  }
}
