import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useFrameThrottled } from '../hooks/useFrameThrottled'
import * as THREE from 'three'
import { getInfiniteTerrainHeight } from '../world/chunkTerrain'
import { queueBurst } from './HarvestVFX'

// ── Module state ────────────────────────────────────
let _vortexActive = true
let _vortexPulse = 0
let _playerInVortex = false
export function isPlayerInVortex() { return _playerInVortex }

// ── Vortex Shader ───────────────────────────────────
const vortexVert = `
varying vec2 vUv;
varying vec3 vPos;
void main() {
  vUv = uv;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vPos = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`

const vortexFrag = `
precision highp float;
uniform float uTime;
uniform float uIntensity;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
varying vec2 vUv;
varying vec3 vPos;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float smoothNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0; float a = 0.5;
  mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
  for (int i = 0; i < 4; i++) { v += a * smoothNoise(p); p = rot * p * 2.0; a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = vUv - 0.5;
  float dist = length(uv);
  float angle = atan(uv.y, uv.x);

  // Spiral
  float spiral = sin(angle * 4.0 + dist * 20.0 - uTime * 0.8) * 0.5 + 0.5;
  float spiral2 = sin(angle * 8.0 - dist * 30.0 + uTime * 1.2) * 0.5 + 0.5;

  // Noise distortion
  vec2 noiseUV = uv * 3.0 + uTime * 0.03;
  float noise = fbm(noiseUV);

  // Radial falloff
  float radial = 1.0 - smoothstep(0.0, 0.5, dist);

  // Combine
  float brightness = spiral * spiral2 * radial * (0.6 + noise * 0.4);
  brightness = max(0.0, brightness - 0.1) * 1.5;
  brightness *= uIntensity;

  // Color mix
  vec3 color = mix(uColor1, uColor2, spiral);
  color = mix(color, uColor3, spiral2 * 0.5);
  color *= brightness;

  // Edge glow
  float edge = 1.0 - smoothstep(0.0, 0.5, dist);
  color += vec3(0.3, 0.6, 1.0) * edge * 0.1 * uIntensity;

  // Center glow
  float center = exp(-dist * 20.0) * 0.5 * uIntensity;
  color += vec3(0.8, 0.9, 1.0) * center;

  gl_FragColor = vec4(color, brightness * 0.7);
}
`

// ── Clock ring around vortex ────────────────────────
const ClockRing = () => {
  const ref = useRef<THREE.Mesh>(null)
  const time = useRef(0)
  const terrainY = getInfiniteTerrainHeight(0, 0)

  useFrameThrottled((_, delta) => {
    time.current += delta
    if (!ref.current) return
    ref.current.rotation.y += delta * 0.2
    ref.current.position.y = terrainY + 0.1 + Math.sin(time.current * 0.3) * 0.05
  }, 3)

  return (
    <mesh ref={ref} position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[5, 5.3, 48]} />
      <meshBasicMaterial color="#4488ff" transparent opacity={0.08} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  )
}

// ── Orbiting motes ──────────────────────────────────
const MOTES = 24

const OrbitingMotes = () => {
  const groupRef = useRef<THREE.Group>(null)
  const time = useRef(0)

  useFrameThrottled((_, delta) => {
    time.current += delta
    if (!groupRef.current) return
    groupRef.current.rotation.y += delta * 0.15
    groupRef.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh
      const phase = (i / MOTES) * Math.PI * 2
      const bob = Math.sin(time.current * 0.5 + phase) * 0.5
      const angle = phase + time.current * (0.3 + (i % 3) * 0.1)
      const radius = 3 + Math.sin(time.current * 0.2 + i) * 0.5
      mesh.position.set(Math.cos(angle) * radius, bob, Math.sin(angle) * radius)
      const pulse = 0.3 + Math.sin(time.current * 2 + phase) * 0.3
      ;(mesh.material as THREE.MeshBasicMaterial).opacity = pulse * 0.4
    })
  }, 3)

  return (
    <group ref={groupRef} position={[0, getInfiniteTerrainHeight(0, 0) + 2, 0]}>
      {Array.from({ length: MOTES }, (_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.05, 6, 6]} />
          <meshBasicMaterial
            color={i % 3 === 0 ? '#4488ff' : i % 3 === 1 ? '#44ffcc' : '#ff66aa'}
            transparent
            opacity={0.3}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  )
}

// ── Rising particles from the vortex ────────────────
const VortexParticles = () => {
  const pointsRef = useRef<THREE.Points>(null)
  const count = 80
  const time = useRef(0)

  const { positions } = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const r = Math.random() * 5
      pos[i * 3] = Math.cos(angle) * r
      pos[i * 3 + 1] = Math.random() * 8
      pos[i * 3 + 2] = Math.sin(angle) * r
    }
    return { positions: pos }
  }, [])

  useFrameThrottled((_, delta) => {
    time.current += delta
    if (!pointsRef.current) return
    const pos = pointsRef.current.geometry.attributes.position.array as Float32Array
    for (let i = 0; i < count; i++) {
      const angle = Math.atan2(pos[i * 3 + 2], pos[i * 3]) + delta * 0.5
      const r = Math.sqrt(pos[i * 3] * pos[i * 3] + pos[i * 3 + 2] * pos[i * 3 + 2])
      const newR = r + delta * 0.2 * (1 - r / 6)
      pos[i * 3] = Math.cos(angle) * newR
      pos[i * 3 + 2] = Math.sin(angle) * newR
      pos[i * 3 + 1] += delta * (0.5 + Math.random() * 0.3)
      if (pos[i * 3 + 1] > 8) { pos[i * 3 + 1] = 0 }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true
  }, 3)

  return (
    <points ref={pointsRef} position={[0, getInfiniteTerrainHeight(0, 0), 0]} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.08} color="#4488ff" transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  )
}

// ── Main Vortex Component ───────────────────────────
export const TimeVortex = () => {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const time = useRef(0)
  const terrainY = getInfiniteTerrainHeight(0, 0)

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uIntensity: { value: 0.6 },
    uColor1: { value: new THREE.Color('#4488ff') },
    uColor2: { value: new THREE.Color('#44ffcc') },
    uColor3: { value: new THREE.Color('#ff66aa') },
  }), [])

  const vortexMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms,
    vertexShader: vortexVert,
    fragmentShader: vortexFrag,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  }), [])

  useFrame((_, delta) => {
    time.current += delta
    uniforms.uTime.value = time.current
    uniforms.uIntensity.value = 0.4 + Math.sin(time.current * 0.2) * 0.2

    // Check player proximity for interaction
    const camera = (useThree as any).getState().camera
    const dx = camera.position.x
    const dz = camera.position.z
    const dist = Math.sqrt(dx * dx + dz * dz)
    _playerInVortex = dist < 6

    if (_playerInVortex && Math.random() < 0.02) {
      queueBurst(new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        terrainY + 0.5,
        (Math.random() - 0.5) * 3,
      ), 5, '#44ffcc', 2)
    }

    if (meshRef.current) {
      meshRef.current.rotation.z += delta * 0.05
      meshRef.current.position.y = terrainY + 1
    }
    if (glowRef.current) {
      const pulse = 0.2 + Math.sin(time.current * 0.5) * 0.15
      ;(glowRef.current.material as THREE.MeshBasicMaterial).opacity = pulse
      glowRef.current.position.y = terrainY + 0.5
    }
  })

  return (
    <group>
      {/* Vortex disc */}
      <mesh ref={meshRef} position={[0, terrainY + 1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[5, 64]} />
        <primitive object={vortexMat} attach="material" />
      </mesh>

      {/* Ground glow */}
      <mesh ref={glowRef} position={[0, terrainY + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[6, 32]} />
        <meshBasicMaterial color="#4488ff" transparent opacity={0.08} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Clock ring */}
      <ClockRing />

      {/* Orbiting motes */}
      <OrbitingMotes />

      {/* Rising particles */}
      <VortexParticles />

      {/* Central spire */}
      <mesh position={[0, terrainY + 3, 0]}>
        <coneGeometry args={[0.15, 3, 6]} />
        <meshBasicMaterial color="#88ccff" transparent opacity={0.3} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}
