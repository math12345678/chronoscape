import * as THREE from 'three'

/**
 * Creates a beveled/faceted block geometry that looks like a cut time crystal
 * instead of a plain Minecraft cube.
 *
 * The geometry has:
 * - Inset faces with a diamond-like facet pattern
 * - Beveled edges between faces
 * - Subtle asymmetry for organic feel
 *
 * Each face gets a central inset vertex connected to the four corner vertices,
 * creating a pyramid-like faceted appearance on each side.
 * The edges between faces are beveled with an inset strip.
 */
export function createFacetedBlockGeometry(size: number = 0.94): THREE.BufferGeometry {
  const hs = size / 2          // half-size
  const bevel = size * 0.08    // bevel inset amount
  const faceInset = size * 0.06 // face center inset for faceted look

  // We'll build a custom geometry with:
  // - 6 faces, each with a center pyramid point
  // - Bevel strips connecting adjacent faces
  // - All vertices are explicitly positioned
  
  const vertices: number[] = []
  const normals: number[] = []
  const indices: number[] = []

  // Helper to add a triangle
  function addTri(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, normal: THREE.Vector3) {
    const offset = vertices.length / 3
    vertices.push(a.x, a.y, a.z)
    vertices.push(b.x, b.y, b.z)
    vertices.push(c.x, c.y, c.z)
    normals.push(normal.x, normal.y, normal.z)
    normals.push(normal.x, normal.y, normal.z)
    normals.push(normal.x, normal.y, normal.z)
    indices.push(offset, offset + 1, offset + 2)
  }

  // Helper to add a quad as two triangles
  function addQuad(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, normal: THREE.Vector3) {
    addTri(a, b, c, normal)
    addTri(a, c, d, normal)
  }

  // Define corner points of the box (8 corners)
  const corners = {
    fbl: new THREE.Vector3(-hs, -hs, -hs), // front-bottom-left
    fbr: new THREE.Vector3(hs, -hs, -hs),  // front-bottom-right
    ftl: new THREE.Vector3(-hs, hs, -hs),  // front-top-left
    ftr: new THREE.Vector3(hs, hs, -hs),   // front-top-right
    bbl: new THREE.Vector3(-hs, -hs, hs),  // back-bottom-left
    bbr: new THREE.Vector3(hs, -hs, hs),   // back-bottom-right
    btl: new THREE.Vector3(-hs, hs, hs),   // back-top-left
    btr: new THREE.Vector3(hs, hs, hs),    // back-top-right
  }

  // Inner beveled corners (inset by `bevel` amount)
  const innerInset = hs - bevel
  const i = {
    fbl: new THREE.Vector3(-innerInset, -innerInset, -hs),
    fbr: new THREE.Vector3(innerInset, -innerInset, -hs),
    ftl: new THREE.Vector3(-innerInset, innerInset, -hs),
    ftr: new THREE.Vector3(innerInset, innerInset, -hs),
    bbl: new THREE.Vector3(-innerInset, -innerInset, hs),
    bbr: new THREE.Vector3(innerInset, -innerInset, hs),
    btl: new THREE.Vector3(-innerInset, innerInset, hs),
    btr: new THREE.Vector3(innerInset, innerInset, hs),

    // Side/edge bevel vertices
    fl: new THREE.Vector3(-hs, -innerInset, -innerInset),
    fr: new THREE.Vector3(hs, -innerInset, -innerInset),
    ft: new THREE.Vector3(-innerInset, hs, -innerInset),
    fb: new THREE.Vector3(-innerInset, -hs, -innerInset),
    bl: new THREE.Vector3(-hs, -innerInset, innerInset),
    br: new THREE.Vector3(hs, -innerInset, innerInset),
    bt: new THREE.Vector3(-innerInset, hs, innerInset),
    bb: new THREE.Vector3(-innerInset, -hs, innerInset),
  }

  // Face center points (inset by faceInset for faceted look)
  const faceCenter = {
    front: new THREE.Vector3(0, 0, -hs + faceInset * 0.3),
    back: new THREE.Vector3(0, 0, hs - faceInset * 0.3),
    left: new THREE.Vector3(-hs + faceInset * 0.3, 0, 0),
    right: new THREE.Vector3(hs - faceInset * 0.3, 0, 0),
    top: new THREE.Vector3(0, hs - faceInset * 0.3, 0),
    bottom: new THREE.Vector3(0, -hs + faceInset * 0.3, 0),
  }

  // ── FRONT FACE (z = -hs) ──
  // Inner face (pyramid): center connected to 4 inner corners
  // Bevel ring: outer corners connected to inner corners
  
  // Front face pyramid (quad from center to two corners, then back)
  addQuad(faceCenter.front, i.ftl, i.ftr, i.ftl, new THREE.Vector3(0, 0, -1))
  addQuad(faceCenter.front, i.fbr, i.fbl, i.fbr, new THREE.Vector3(0, 0, -1))
  addQuad(faceCenter.front, i.ftl, i.fbl, i.ftl, new THREE.Vector3(0, 0, -1))
  addQuad(faceCenter.front, i.ftr, i.fbr, i.ftr, new THREE.Vector3(0, 0, -1))

  // Front bevel ring
  addQuad(corners.ftl, corners.ftr, i.ftr, i.ftl, new THREE.Vector3(0, 0, -1))
  addQuad(corners.fbl, corners.fbr, i.fbr, i.fbl, new THREE.Vector3(0, 0, -1))
  addQuad(corners.ftl, corners.fbl, i.fbl, i.ftl, new THREE.Vector3(0, 0, -1))
  addQuad(corners.ftr, corners.fbr, i.fbr, i.ftr, new THREE.Vector3(0, 0, -1))

  // ── BACK FACE (z = hs) ──
  addQuad(faceCenter.back, i.btr, i.btl, i.btr, new THREE.Vector3(0, 0, 1))
  addQuad(faceCenter.back, i.bbl, i.bbr, i.bbl, new THREE.Vector3(0, 0, 1))
  addQuad(faceCenter.back, i.btl, i.bbl, i.btl, new THREE.Vector3(0, 0, 1))
  addQuad(faceCenter.back, i.btr, i.bbr, i.btr, new THREE.Vector3(0, 0, 1))

  addQuad(corners.btr, corners.btl, i.btl, i.btr, new THREE.Vector3(0, 0, 1))
  addQuad(corners.bbl, corners.bbr, i.bbr, i.bbl, new THREE.Vector3(0, 0, 1))
  addQuad(corners.btl, corners.bbl, i.bbl, i.btl, new THREE.Vector3(0, 0, 1))
  addQuad(corners.btr, corners.bbr, i.bbr, i.btr, new THREE.Vector3(0, 0, 1))

  // ── LEFT FACE (x = -hs) ──
  addQuad(faceCenter.left, i.fbl, i.ftl, i.fbl, new THREE.Vector3(-1, 0, 0))
  addQuad(faceCenter.left, i.btl, i.bbl, i.btl, new THREE.Vector3(-1, 0, 0))
  addQuad(faceCenter.left, i.fbl, i.bbl, i.fbl, new THREE.Vector3(-1, 0, 0))
  addQuad(faceCenter.left, i.ftl, i.btl, i.ftl, new THREE.Vector3(-1, 0, 0))

  addQuad(corners.ftl, corners.fbl, i.fbl, i.ftl, new THREE.Vector3(-1, 0, 0))
  addQuad(corners.bbl, corners.btl, i.btl, i.bbl, new THREE.Vector3(-1, 0, 0))
  addQuad(corners.fbl, corners.bbl, i.bbl, i.fbl, new THREE.Vector3(-1, 0, 0))
  addQuad(corners.ftl, corners.btl, i.btl, i.ftl, new THREE.Vector3(-1, 0, 0))

  // ── RIGHT FACE (x = hs) ──
  addQuad(faceCenter.right, i.ftr, i.fbr, i.ftr, new THREE.Vector3(1, 0, 0))
  addQuad(faceCenter.right, i.bbr, i.btr, i.bbr, new THREE.Vector3(1, 0, 0))
  addQuad(faceCenter.right, i.fbr, i.bbr, i.fbr, new THREE.Vector3(1, 0, 0))
  addQuad(faceCenter.right, i.ftr, i.btr, i.ftr, new THREE.Vector3(1, 0, 0))

  addQuad(corners.fbr, corners.ftr, i.ftr, i.fbr, new THREE.Vector3(1, 0, 0))
  addQuad(corners.btr, corners.bbr, i.bbr, i.btr, new THREE.Vector3(1, 0, 0))
  addQuad(corners.fbr, corners.bbr, i.bbr, i.fbr, new THREE.Vector3(1, 0, 0))
  addQuad(corners.ftr, corners.btr, i.btr, i.ftr, new THREE.Vector3(1, 0, 0))

  // ── TOP FACE (y = hs) ──
  addQuad(faceCenter.top, i.ftr, i.ftl, i.ftr, new THREE.Vector3(0, 1, 0))
  addQuad(faceCenter.top, i.btl, i.btr, i.btl, new THREE.Vector3(0, 1, 0))
  addQuad(faceCenter.top, i.ftl, i.btl, i.ftl, new THREE.Vector3(0, 1, 0))
  addQuad(faceCenter.top, i.ftr, i.btr, i.ftr, new THREE.Vector3(0, 1, 0))

  addQuad(corners.ftr, corners.ftl, i.ftl, i.ftr, new THREE.Vector3(0, 1, 0))
  addQuad(corners.btl, corners.btr, i.btr, i.btl, new THREE.Vector3(0, 1, 0))
  addQuad(corners.ftl, corners.btl, i.btl, i.ftl, new THREE.Vector3(0, 1, 0))
  addQuad(corners.ftr, corners.btr, i.btr, i.ftr, new THREE.Vector3(0, 1, 0))

  // ── BOTTOM FACE (y = -hs) ──
  addQuad(faceCenter.bottom, i.fbl, i.fbr, i.fbl, new THREE.Vector3(0, -1, 0))
  addQuad(faceCenter.bottom, i.bbr, i.bbl, i.bbr, new THREE.Vector3(0, -1, 0))
  addQuad(faceCenter.bottom, i.fbr, i.bbr, i.fbr, new THREE.Vector3(0, -1, 0))
  addQuad(faceCenter.bottom, i.fbl, i.bbl, i.fbl, new THREE.Vector3(0, -1, 0))

  addQuad(corners.fbl, corners.fbr, i.fbr, i.fbl, new THREE.Vector3(0, -1, 0))
  addQuad(corners.bbr, corners.bbl, i.bbl, i.bbr, new THREE.Vector3(0, -1, 0))
  addQuad(corners.fbr, corners.bbr, i.bbr, i.fbr, new THREE.Vector3(0, -1, 0))
  addQuad(corners.fbl, corners.bbl, i.bbl, i.fbl, new THREE.Vector3(0, -1, 0))

  // ── EDGE BEVEL FACES ──
  // These connect adjacent faces at the edges
  
  // Front-top edge
  addQuad(corners.ftl, corners.ftr, i.ftr, i.ftl, new THREE.Vector3(0, 0.707, -0.707).normalize())
  // Front-bottom edge
  addQuad(corners.fbr, corners.fbl, i.fbl, i.fbr, new THREE.Vector3(0, -0.707, -0.707).normalize())
  // Front-left edge
  addQuad(corners.ftl, corners.fbl, i.fbl, i.ftl, new THREE.Vector3(-0.707, 0, -0.707).normalize())
  // Front-right edge
  addQuad(corners.fbr, corners.ftr, i.ftr, i.fbr, new THREE.Vector3(0.707, 0, -0.707).normalize())

  // Back-top edge
  addQuad(corners.btr, corners.btl, i.btl, i.btr, new THREE.Vector3(0, 0.707, 0.707).normalize())
  // Back-bottom edge
  addQuad(corners.bbl, corners.bbr, i.bbr, i.bbl, new THREE.Vector3(0, -0.707, 0.707).normalize())
  // Back-left edge
  addQuad(corners.btl, corners.bbl, i.bbl, i.btl, new THREE.Vector3(-0.707, 0, 0.707).normalize())
  // Back-right edge
  addQuad(corners.bbr, corners.btr, i.btr, i.bbr, new THREE.Vector3(0.707, 0, 0.707).normalize())

  // Top-left edge
  addQuad(corners.ftl, corners.btl, i.btl, i.ftl, new THREE.Vector3(-0.707, 0.707, 0).normalize())
  // Top-right edge
  addQuad(corners.btr, corners.ftr, i.ftr, i.btr, new THREE.Vector3(0.707, 0.707, 0).normalize())
  // Bottom-left edge
  addQuad(corners.bbl, corners.fbl, i.fbl, i.bbl, new THREE.Vector3(-0.707, -0.707, 0).normalize())
  // Bottom-right edge
  addQuad(corners.fbr, corners.bbr, i.bbr, i.fbr, new THREE.Vector3(0.707, -0.707, 0).normalize())

  // Build the geometry
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()

  return geo
}

/**
 * Cached geometry reference (only create once, share across all blocks)
 */
let cachedGeo: THREE.BufferGeometry | null = null

export function getFacetedBlockGeometry(size: number = 0.94): THREE.BufferGeometry {
  if (!cachedGeo) {
    cachedGeo = createFacetedBlockGeometry(size)
  }
  return cachedGeo
}
