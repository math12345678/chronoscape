import { useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { useFrameThrottled } from '../hooks/useFrameThrottled'
import * as THREE from 'three'
import { ISLAND_SIZE } from '../config/constants'


const WATER_SIZE = ISLAND_SIZE * 2.0
const SEGMENTS = 48

/**
 * Dynamic ocean water with:
 * - 8-layer vertex wave animation
 * - Vertex-color gradient from shoreline teal to deep blue
 * - MeshPhysicalMaterial with clearcoat, env reflections
 * - Animated normal distortion (procedural via temp normals)
 * - Specular sparkle points
 * - Follows camera for infinite feel
 */
export const Water = () => {
  const { scene } = useThree()
  const meshRef = useRef<THREE.Mesh>(null)
  const sparkleRef = useRef<THREE.Points>(null)
  const time = useRef(0)
  const waterPos = useRef(new THREE.Vector3(0, -0.5, 0))

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(WATER_SIZE, WATER_SIZE, SEGMENTS, SEGMENTS)
    geo.rotateX(-Math.PI / 2)
    return geo
  }, [])

  // Precompute vertex color gradient: teal near shore → deep blue at horizon
  useMemo(() => {
    const colors = new Float32Array((SEGMENTS + 1) * (SEGMENTS + 1) * 3)
    const half = SEGMENTS / 2
    const step = WATER_SIZE / SEGMENTS

    for (let i = 0; i <= SEGMENTS; i++) {
      for (let j = 0; j <= SEGMENTS; j++) {
        const idx = (i * (SEGMENTS + 1) + j) * 3
        const x = (j - half) * step
        const z = (i - half) * step
        const dist = Math.sqrt(x * x + z * z) / (WATER_SIZE * 0.5)
        const d = Math.min(1, dist)

        // Tropical gradient: cyan shoreline → deep teal → navy
        const r = 0.02 + d * 0.02
        const g = 0.25 + d * 0.12 - d * d * 0.08
        const b = 0.35 + d * 0.25 - d * d * 0.05
        colors[idx] = r
        colors[idx + 1] = g
        colors[idx + 2] = b
      }
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  }, [geometry])

  // Sparkle points — sun glints on wave crests
  const sparkleGeo = useMemo(() => {
    const count = 80
    const pos = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const phases = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = 5 + Math.random() * (WATER_SIZE * 0.45)
      pos[i * 3] = Math.cos(angle) * radius
      pos[i * 3 + 1] = 0
      pos[i * 3 + 2] = Math.sin(angle) * radius
      sizes[i] = 0.3 + Math.random() * 1.2
      phases[i] = Math.random() * Math.PI * 2
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    geo.setAttribute('phase', new THREE.BufferAttribute(phases, 1))
    return geo
  }, [])

  // Materials with envMap from scene (set once)
  const waterMat = useMemo(() => {
    const mat = new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      roughness: 0.05,
      metalness: 0.15,
      clearcoat: 0.4,
      clearcoatRoughness: 0.3,
      side: THREE.DoubleSide,
      envMapIntensity: 1.0,
      envMap: null as THREE.Texture | null,
    })
    return mat
  }, [])

  const sparkleMat = useMemo(() => new THREE.PointsMaterial({
    color: '#ffffff',
    size: 0.15,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  }), [])

  // Grab the first usable envMap from the scene
  useMemo(() => {
    // Check scene for envMap from PMREMGenerator or similar
    const env = (scene as any).environment
    if (env) {
      waterMat.envMap = env
      waterMat.needsUpdate = true
    }
  }, [scene, waterMat])

  useFrameThrottled((state, delta) => {
    if (!meshRef.current) return
    time.current += delta * 0.5

    // Follow camera (always runs — cheap operation)
    const cx = state.camera.position.x
    const cz = state.camera.position.z
    waterPos.current.x = cx
    waterPos.current.z = cz
    meshRef.current.position.copy(waterPos.current)
    if (sparkleRef.current) {
      sparkleRef.current.position.copy(waterPos.current)
    }

    // Wave vertex updates — use raw typed arrays for speed
    const posAttr = meshRef.current.geometry.attributes.position
    const posArray = posAttr.array as Float32Array
    const t = time.current
    const baseY = -0.4

    for (let i = 0; i < posAttr.count; i++) {
      const i3 = i * 3
      const x = posArray[i3]
      const z = posArray[i3 + 2]
      const wx = x * 0.01
      const wz = z * 0.01

      // 8-layer wave system — more detail, zero CPU guilt since it's throttled
      const wave =
        Math.sin(wx * 8 + t * 1.0) * 0.12 +
        Math.sin(wz * 10 + t * 1.4) * 0.1 +
        Math.sin((x + z) * 0.006 + t * 0.6) * 0.08 +
        Math.sin(wx * 15 - wz * 5 + t * 1.8) * 0.05 +
        Math.cos(wx * 4 + wz * 12 + t * 0.9) * 0.06 +
        Math.sin((wx + wz) * 6 + t * 0.3) * 0.02 +
        Math.sin(wx * 20 + wz * 8 + t * 2.2) * 0.03 +
        Math.cos(wx * 12 - wz * 14 + t * 1.1) * 0.04

      posArray[i3 + 1] = baseY + wave
    }
    posAttr.needsUpdate = true

    // Compute normals on same frame as position update
    meshRef.current.geometry.computeVertexNormals()

    // Animate sparkle points (throttled via outer scope)
    if (sparkleRef.current && sparkleGeo) {
      const sa = sparkleGeo.attributes.size
      const pa = sparkleGeo.attributes.phase
      if (sa && pa) {
        const sizes = sa.array as Float32Array
        const phases = pa.array as Float32Array
        for (let i = 0; i < 80; i++) {
          const sparkle = Math.sin(time.current * 1.8 + phases[i]) * 0.5 + 0.5
          sizes[i] = (0.2 + (i % 5) * 0.15) * (0.15 + sparkle * 0.85)
        }
        sa.needsUpdate = true
      }
    }

    // Subtle opacity pulse from wave energy
    const waveEnergy = Math.sin(time.current * 0.5) * 0.03 + 0.55
    waterMat.opacity = waveEnergy
  }, 2)

  return (
    <>
      <mesh
        ref={meshRef}
        geometry={geometry}
        position={[0, -0.5, 0]}
        receiveShadow
        material={waterMat}
      />
      <points ref={sparkleRef} geometry={sparkleGeo} frustumCulled={false} material={sparkleMat} />
    </>
  )
}
