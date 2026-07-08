import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const vertexShader = `
varying vec2 vUv;
varying vec3 vPos;
void main() {
  vUv = uv;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vPos = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`

const fragmentShader = `
uniform float uTime;
uniform vec3 uPlayerPos;
varying vec2 vUv;
varying vec3 vPos;

void main() {
  vec2 relative = vPos.xz - uPlayerPos.xz;
  float dist = length(relative);

  // Fade at edges
  float edgeFade = smoothstep(20.0, 3.0, dist);

  // Moving shimmer patches
  float patch1 = sin(vPos.x * 2.1 + vPos.z * 1.7 + uTime * 0.6) * 0.5 + 0.5;
  float patch2 = sin(vPos.x * 3.3 - vPos.z * 2.9 + uTime * 0.4 + 1.2) * 0.5 + 0.5;
  float patch3 = cos(vPos.x * 1.5 + vPos.z * 1.1 + uTime * 0.3) * 0.5 + 0.5;

  float shimmer = (patch1 * patch2 * 0.7 + patch3 * 0.3);
  shimmer = pow(shimmer, 1.5);
  shimmer *= 0.15; // Subtle max alpha

  float alpha = shimmer * edgeFade;
  if (alpha < 0.005) discard;

  gl_FragColor = vec4(0.4, 0.9, 0.8, alpha);
}
`

export const GroundShimmer = () => {
  const meshRef = useRef<THREE.Mesh>(null)
  const { camera } = useThree()
  const uniformsRef = useRef({
    uTime: { value: 0 },
    uPlayerPos: { value: new THREE.Vector3(0, 0, 0) },
  })

  const geom = useMemo(() => {
    const g = new THREE.PlaneGeometry(60, 60, 40, 40)
    g.rotateX(-Math.PI / 2)
    return g
  }, [])

  useFrame((_, delta) => {
    uniformsRef.current.uTime.value += delta
    uniformsRef.current.uPlayerPos.value.set(camera.position.x, 0, camera.position.z)
    if (meshRef.current) {
      meshRef.current.position.x = camera.position.x
      meshRef.current.position.z = camera.position.z
    }
  })

  return (
    <mesh ref={meshRef} geometry={geom} renderOrder={-1}>
      <shaderMaterial
        uniforms={uniformsRef.current}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        depthTest={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}
