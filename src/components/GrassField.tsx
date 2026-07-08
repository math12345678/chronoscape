import { useMemo, useRef } from 'react'
import { useFrameThrottled } from '../hooks/useFrameThrottled'
import * as THREE from 'three'
import { getTerrainHeight } from '../terrain'

const GRASS_COUNT = 3000
const HALF = 60 // cover a wide radius around origin
let seed = 43
const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 }

const windRef = { phase: 0 }
export const tickGrassWind = (delta: number) => { windRef.phase += delta * 0.8 }

const bladeVert = `
attribute float aPhase;
attribute vec3 instanceColor;
uniform float uWindPhase;
varying vec3 vColor;
void main() {
  vec3 pos = position;
  float ws = 0.3 + 0.7 * abs(pos.y);
  float w1 = sin(uWindPhase * 1.2 + aPhase + pos.x * 0.5) * 0.08 * ws;
  float w2 = sin(uWindPhase * 0.7 + aPhase * 1.3 + pos.z * 0.3) * 0.04 * ws;
  pos.x += w1 + w2;
  pos.z += w2 * 0.6;
  vec4 wp = instanceMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * viewMatrix * wp;
  vColor = instanceColor;
}
`
const bladeFrag = `
varying vec3 vColor;
void main() { gl_FragColor = vec4(vColor, 1.0); }
`

export const GrassField = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null)

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const w = 0.04, h = 0.2
    geo.setAttribute('position', new THREE.BufferAttribute(
      new Float32Array([-w,0,0, w,0,0, -w,h,0, -w,h,0, w,0,0, w,h,0]), 3
    ))

    const colors = new Float32Array(GRASS_COUNT * 3)
    const phases = new Float32Array(GRASS_COUNT)
    let valid = 0
    const dummy = new THREE.Object3D()

    // Pre-generate matrices too
    const matrices = new Float32Array(GRASS_COUNT * 16)
    while (valid < GRASS_COUNT) {
      const x = (rand() - 0.5) * HALF * 2
      const z = (rand() - 0.5) * HALF * 2
      if (Math.abs(x) < 6 && Math.abs(z) < 6) continue
      const y = getTerrainHeight(x, z)
      if (Math.abs(y) > 0.6) continue

      const scale = 0.4 + rand() * 0.8
      const rot = rand() * Math.PI * 2

      dummy.position.set(x, y, z)
      dummy.scale.set(1, scale, 1)
      dummy.rotation.set(0, rot, 0)
      dummy.updateMatrix()
      const m = dummy.matrix.elements
      for (let j = 0; j < 16; j++) matrices[valid * 16 + j] = m[j]

      const shade = 0.3 + rand() * 0.3
      colors[valid * 3] = 0.2 + shade * 0.3
      colors[valid * 3 + 1] = 0.4 + shade * 0.4
      colors[valid * 3 + 2] = 0.1
      phases[valid] = rand() * Math.PI * 2
      valid++
    }

    geo.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(colors, 3))
    geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1))

    // Store on geo for later use
    ;(geo as any).__matrices = matrices

    return geo
  }, [])

  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uWindPhase: { value: 0 } },
    vertexShader: bladeVert,
    fragmentShader: bladeFrag,
    side: THREE.DoubleSide,
  }), [])

  // Set instance matrices once mounted
  const handleRef = useMemo(() => (mesh: THREE.InstancedMesh | null) => {
    if (mesh) {
      const matrices = (geometry as any).__matrices as Float32Array
      for (let i = 0; i < GRASS_COUNT; i++) {
        const m = new THREE.Matrix4().fromArray(matrices, i * 16)
        mesh.setMatrixAt(i, m)
      }
      mesh.instanceMatrix.needsUpdate = true
    }
  }, [geometry])

  useFrameThrottled(() => {
    material.uniforms.uWindPhase.value = windRef.phase
  }, 4)

  return (
    <instancedMesh
      ref={(el) => {
        (meshRef as any).current = el
        handleRef(el)
      }}
      args={[geometry, material, GRASS_COUNT]}
      frustumCulled={false}
    />
  )
}
