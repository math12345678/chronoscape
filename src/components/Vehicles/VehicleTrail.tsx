import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const TRAIL_POOL_SIZE = 120
const _positions = new Float32Array(TRAIL_POOL_SIZE * 3)
const _colors = new Float32Array(TRAIL_POOL_SIZE * 3)

let _trailQueue: { pos: THREE.Vector3; color: THREE.Color }[] = []

export function pushTrailPoint(pos: THREE.Vector3, color: string) {
  _trailQueue.push({ pos: pos.clone(), color: new THREE.Color(color) })
  if (_trailQueue.length > TRAIL_POOL_SIZE) _trailQueue.shift()
}

export function clearTrail() { _trailQueue = [] }

export const VehicleTrail = () => {
  const pointsRef = useRef<THREE.Points>(null)
  const geoRef = useRef<THREE.BufferGeometry | null>(null)
  const time = useRef(0)

  useFrame((_, delta) => {
    time.current += delta
    if (!pointsRef.current) return

    const len = Math.min(_trailQueue.length, TRAIL_POOL_SIZE)
    for (let i = 0; i < len; i++) {
      const idx = i * 3
      const t = _trailQueue[i]
      const age = (len - i) / len
      _positions[idx] = t.pos.x
      _positions[idx + 1] = t.pos.y + 0.05
      _positions[idx + 2] = t.pos.z
      _colors[idx] = t.color.r * age
      _colors[idx + 1] = t.color.g * age
      _colors[idx + 2] = t.color.b * age
    }

    const geo = pointsRef.current.geometry as THREE.BufferGeometry
    geo.attributes.position.needsUpdate = true
    geo.attributes.color.needsUpdate = true
    geo.setDrawRange(0, len)
  })

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[_positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[_colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.12}
        vertexColors
        transparent
        opacity={0.5}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}
