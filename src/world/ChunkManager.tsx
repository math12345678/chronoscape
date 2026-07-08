import * as THREE from 'three'
import { CHUNK_SIZE, LOAD_RADIUS, getChunkCoord, chunkKey } from './chunkContent'
import { getOrGenerateChunk } from './chunkCache'
import { getInfiniteTerrainHeight } from './chunkTerrain'

export interface LoadedChunk {
  group: THREE.Group
  cx: number
  cz: number
}

function buildChunkScene(cx: number, cz: number): THREE.Group {
  const group = new THREE.Group()
  group.name = `chunk-${cx},${cz}`

  const data = getOrGenerateChunk(cx, cz)

  // ── Terrain mesh ──
  const segs = 24
  const geo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, segs, segs)
  geo.rotateX(-Math.PI / 2)

  const pos = geo.attributes.position
  const worldMinX = cx * CHUNK_SIZE
  const worldMinZ = cz * CHUNK_SIZE

  for (let i = 0; i < pos.count; i++) {
    const lx = pos.getX(i)
    const lz = pos.getZ(i)
    const wx = worldMinX + lx + CHUNK_SIZE / 2
    const wz = worldMinZ + lz + CHUNK_SIZE / 2
    const y = getInfiniteTerrainHeight(wx, wz)
    pos.setY(i, y)
  }
  pos.needsUpdate = true
  geo.computeVertexNormals()

  // Vertex colors with biome blending + slope-based detail
  const colors = new Float32Array(pos.count * 3)
  const nx = geo.attributes.normal
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i)
    const hf = THREE.MathUtils.clamp((y + 0.5) / 2.5, 0, 1)
    const slope = nx ? 1 - nx.getY(i) : 0

    // Richer biome palette
    const sand = new THREE.Color('#d4c090')
    const grass = new THREE.Color('#5a9e6a')
    const grassDark = new THREE.Color('#3d7a4d')
    const rock = new THREE.Color('#7a7a8a')
    const moss = new THREE.Color('#6a9a5a')
    const gold = new THREE.Color('#b8a060')

    let color: THREE.Color
    if (slope > 0.35) {
      color = rock.clone().lerp(moss, (1 - slope) / 0.65)
      color.lerp(gold, slope * 0.1)
    } else if (hf < 0.2) {
      color = sand.clone().lerp(grass, hf / 0.2)
    } else if (hf < 0.65) {
      const t = (hf - 0.2) / 0.45
      color = grass.clone().lerp(grassDark, t)
      color.lerp(gold, t * 0.08)
    } else {
      color = grassDark.clone().lerp(rock, (hf - 0.65) / 0.35)
      color.lerp(gold, (hf - 0.65) / 0.35 * 0.15)
    }
    // Tiny hash-based variation per vertex for organic feel
    const v = ((i * 16807) % 2147483647) / 2147483647 * 0.06 - 0.03
    color.r = THREE.MathUtils.clamp(color.r + v, 0, 1)
    color.g = THREE.MathUtils.clamp(color.g + v * 0.5, 0, 1)
    color.b = THREE.MathUtils.clamp(color.b + v * 1.2, 0, 1)
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.9,
    metalness: 0,
  })

  const terrainMesh = new THREE.Mesh(geo, terrainMat)
  terrainMesh.position.set(worldMinX + CHUNK_SIZE / 2, 0, worldMinZ + CHUNK_SIZE / 2)
  terrainMesh.receiveShadow = true
  terrainMesh.name = 'ground'
  group.add(terrainMesh)

  // ── Trees ──
  for (const t of data.trees) {
    const treeGroup = buildTree(t.x, t.z, t.scale, t.hue, t.variant)
    group.add(treeGroup)
  }

  // ── Decorations ──
  for (const d of data.decorations) {
    const mesh = buildDecoration(d.type, d.scale)
    mesh.position.set(d.x, getInfiniteTerrainHeight(d.x, d.z), d.z)
    group.add(mesh)
  }

  return group
}

function buildTree(x: number, z: number, scale: number, hue = 0.3, variant = 0): THREE.Group {
  const g = new THREE.Group()
  g.position.set(x, getInfiniteTerrainHeight(x, z), z)

  const trunkColor = new THREE.Color().setHSL(0.07 + variant * 0.03, 0.3, 0.2 + variant * 0.05)
  const trunkMat = new THREE.MeshStandardMaterial({ color: trunkColor, roughness: 0.9 })

  const canopyBase = new THREE.Color().setHSL(hue, 0.4, 0.3)
  const canopyLight = new THREE.Color().setHSL(hue + 0.03, 0.35, 0.38)
  const canopyMat = new THREE.MeshStandardMaterial({ color: canopyBase, roughness: 0.8 })
  const canopyMat2 = new THREE.MeshStandardMaterial({ color: canopyLight, roughness: 0.8 })

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08 * scale, 0.15 * scale, 1 * scale, 5),
    trunkMat
  )
  trunk.position.y = 0.5 * scale
  trunk.castShadow = true
  trunk.receiveShadow = true
  g.add(trunk)

  if (variant === 0) {
    // Round canopy
    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(0.55 * scale, 7, 7),
      canopyMat
    )
    canopy.position.y = 1.3 * scale
    canopy.castShadow = true
    canopy.receiveShadow = true
    g.add(canopy)

    const canopy2 = new THREE.Mesh(
      new THREE.SphereGeometry(0.4 * scale, 7, 7),
      canopyMat2
    )
    canopy2.position.set(0.3 * scale, 0.9 * scale, 0.2 * scale)
    canopy2.castShadow = true
    canopy2.receiveShadow = true
    g.add(canopy2)
  } else if (variant === 1) {
    // Tall pine-style
    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry(0.5 * scale, 1.4 * scale, 6),
      canopyMat
    )
    canopy.position.y = 1.4 * scale
    canopy.castShadow = true
    canopy.receiveShadow = true
    g.add(canopy)

    const canopy2 = new THREE.Mesh(
      new THREE.ConeGeometry(0.35 * scale, 1.0 * scale, 6),
      canopyMat2
    )
    canopy2.position.set(0.2 * scale, 0.9 * scale, 0.15 * scale)
    canopy2.castShadow = true
    canopy2.receiveShadow = true
    g.add(canopy2)
  } else {
    // Wide spreading canopy
    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(0.65 * scale, 6, 5),
      canopyMat
    )
    canopy.scale.y = 0.6
    canopy.position.y = 1.1 * scale
    canopy.castShadow = true
    canopy.receiveShadow = true
    g.add(canopy)

    const canopy2 = new THREE.Mesh(
      new THREE.SphereGeometry(0.5 * scale, 6, 5),
      canopyMat2
    )
    canopy2.scale.y = 0.5
    canopy2.position.set(-0.25 * scale, 0.7 * scale, 0.3 * scale)
    canopy2.castShadow = true
    canopy2.receiveShadow = true
    g.add(canopy2)
  }

  // Wind sway phase
  g.userData.swayPhase = Math.random() * Math.PI * 2
  g.userData.swaySpeed = 0.6 + Math.random() * 0.4

  return g
}

function buildDecoration(type: string, scale: number): THREE.Group {
  const g = new THREE.Group()

  if (type === 'rock') {
    const mesh = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.3, 0),
      new THREE.MeshStandardMaterial({ color: '#6a6a7a', roughness: 0.9 })
    )
    mesh.scale.set(scale, scale, scale)
    mesh.receiveShadow = true
    mesh.castShadow = true
    g.add(mesh)
  } else if (type === 'crystal') {
    const mesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.15, 0.3, 6),
      new THREE.MeshStandardMaterial({
        color: '#8866cc', emissive: '#8866cc', emissiveIntensity: 0.15,
        roughness: 0.3, metalness: 0.2,
      })
    )
    mesh.scale.set(scale, scale, scale)
    g.add(mesh)
  } else if (type === 'bush') {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 5, 5),
      new THREE.MeshStandardMaterial({ color: '#3a7a3a', roughness: 0.9 })
    )
    mesh.scale.set(scale, scale, scale)
    mesh.receiveShadow = true
    mesh.castShadow = true
    g.add(mesh)
  } else if (type === 'flower') {
    const colors = ['#ff6b8a', '#ffd93d', '#c084fc', '#6bcfff']
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.08, 0.12),
      new THREE.MeshStandardMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        roughness: 0.7, side: THREE.DoubleSide, transparent: true, opacity: 0.9,
      })
    )
    mesh.scale.set(scale, scale, scale)
    g.add(mesh)
  } else if (type === 'mushroom') {
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.05, 0.1, 5),
      new THREE.MeshStandardMaterial({ color: '#e8dcc8', roughness: 0.9 })
    )
    stem.position.y = 0.05
    stem.scale.set(scale, scale, scale)
    g.add(stem)
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 5, 5),
      new THREE.MeshStandardMaterial({ color: '#c084fc', roughness: 0.7, emissive: '#c084fc', emissiveIntensity: 0.05 })
    )
    cap.scale.y = 0.4 * scale
    cap.scale.x = scale
    cap.scale.z = scale
    cap.position.y = 0.12 * scale
    g.add(cap)
  } else {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.04, 0.15),
      new THREE.MeshStandardMaterial({ color: '#4a8a4a', roughness: 0.9, side: THREE.DoubleSide })
    )
    mesh.scale.set(scale, scale, scale)
    g.add(mesh)
  }

  const rot = Math.random() * Math.PI * 2
  g.rotation.set(0, rot, 0)
  return g
}

export function updateChunks(
  playerX: number, playerZ: number,
  scene: THREE.Scene,
  chunkRefs: Map<string, LoadedChunk>
) {
  const { cx: pcx, cz: pcz } = getChunkCoord(playerX, playerZ)

  // Compute needed chunks
  const needed = new Set<string>()
  const neededCoords: { cx: number; cz: number }[] = []
  for (let dx = -LOAD_RADIUS; dx <= LOAD_RADIUS; dx++) {
    for (let dz = -LOAD_RADIUS; dz <= LOAD_RADIUS; dz++) {
      const cx = pcx + dx
      const cz = pcz + dz
      const key = chunkKey(cx, cz)
      needed.add(key)
      neededCoords.push({ cx, cz })
    }
  }

  // Load new chunks
  for (const { cx, cz } of neededCoords) {
    const key = chunkKey(cx, cz)
    if (!chunkRefs.has(key)) {
      const group = buildChunkScene(cx, cz)
      scene.add(group)
      chunkRefs.set(key, { group, cx, cz })
    }
  }

  // Unload chunks that are no longer needed
  for (const [key, loaded] of chunkRefs) {
    if (!needed.has(key)) {
      scene.remove(loaded.group)
      disposeChunkGroup(loaded.group)
      chunkRefs.delete(key)
    }
  }
}

function disposeChunkGroup(group: THREE.Group) {
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      if (child.geometry) {
        child.geometry.dispose()
      }
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose())
        } else {
          child.material.dispose()
        }
      }
    }
  })
}

/** Wind sway for trees across all loaded chunks */
let globalWindPhase = 0
export function tickChunkWind(delta: number) {
  globalWindPhase += delta * 0.6
}

export function animateChunkTrees(chunkRefs: Map<string, LoadedChunk>) {
  for (const [, loaded] of chunkRefs) {
    loaded.group.children.forEach((child) => {
      if (child.type === 'Group') {
        const swayP = (child as THREE.Group).userData.swayPhase as number | undefined
        if (swayP !== undefined) {
          const wind = Math.sin(globalWindPhase * 0.8 + swayP) * 0.02
          child.rotation.z = wind
        }
      }
    })
  }
}
