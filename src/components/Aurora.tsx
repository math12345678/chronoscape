import { useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { useFrameThrottled } from '../hooks/useFrameThrottled'
import * as THREE from 'three'

const auroraVert = `
varying vec2 vUv;
varying vec3 vPos;
void main() {
  vUv = uv;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vPos = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`

const auroraFrag = `
uniform float uTime;
uniform float uIntensity;
varying vec2 vUv;
varying vec3 vPos;

// Simple noise
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
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
  for (int i = 0; i < 5; i++) {
    v += a * smoothNoise(p);
    p = rot * p * 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  // Aurora curtain shape
  float curtain = sin(vUv.x * 3.14 + uTime * 0.05) * 0.3 + 0.7;
  float band = sin(vUv.y * 6.28 + uTime * 0.1) * 0.5 + 0.5;
  float band2 = sin(vUv.y * 4.0 + uTime * 0.07 + vUv.x * 2.0) * 0.3;

  // Noise-based undulation
  vec2 noiseUV = vec2(vUv.x * 4.0 + uTime * 0.02, vUv.y * 2.0 + uTime * 0.015);
  float noise = fbm(noiseUV);

  // Vertical brightness profile: brighter at bottom, fade at top
  float vertical = 1.0 - vUv.y;
  vertical = smoothstep(0.0, 1.0, vertical);

  // Combine
  float brightness = curtain * band * (0.5 + band2) * vertical * (0.5 + noise * 0.5);
  brightness = max(0.0, brightness - 0.2) * 2.0;

  // Colors: deep green at bottom, teal in middle, faint purple at top
  vec3 col1 = vec3(0.0, 0.6, 0.3);   // Deep green
  vec3 col2 = vec3(0.0, 0.8, 0.6);   // Teal
  vec3 col3 = vec3(0.3, 0.4, 0.8);   // Purple-blue

  float mix1 = smoothstep(0.0, 0.4, vUv.y);
  float mix2 = smoothstep(0.3, 0.7, vUv.y);
  vec3 color = mix(col1, col2, mix1);
  color = mix(color, col3, mix2);

  // Flicker
  float flicker = 0.8 + 0.2 * sin(vUv.x * 20.0 + uTime * 0.5);

  float alpha = brightness * uIntensity * flicker;
  alpha = clamp(alpha, 0.0, 0.6);

  gl_FragColor = vec4(color, alpha);
}
`

export const Aurora = () => {
  const { scene } = useThree()
  const meshRef = useRef<THREE.Mesh>(null)
  const time = useRef(0)
  const keyLightRef = useRef<THREE.DirectionalLight | null>(null)

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uIntensity: { value: 0 },
  }), [])

  useFrameThrottled((_, delta) => {
    time.current += delta
    uniforms.uTime.value = time.current

    // Read dayFactor from keyLight elevation (cached ref)
    if (!keyLightRef.current) {
      keyLightRef.current = scene.getObjectByName('keyLight') as THREE.DirectionalLight | null
    }
    const keyLight = keyLightRef.current
    const elev = keyLight ? keyLight.position.y : -1
    const dayFactor = THREE.MathUtils.smoothstep(elev + 0.3, 0, 1)
    // Aurora visible at night (dayFactor < 0.3), brightest at full night
    uniforms.uIntensity.value = Math.max(0, (1 - dayFactor) * 0.8 - 0.2) * 1.5
  }, 3)

  const geo = useMemo(() => {
    // A large curved ribbon high in the sky
    const g = new THREE.PlaneGeometry(120, 40, 64, 32)
    g.rotateX(-Math.PI / 2)
    // Bend it into an arc
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      // Arc the ribbon
      const arcAngle = (x / 120) * Math.PI * 0.6 - Math.PI * 0.3
      const radius = 100 + z * 0.3
      pos.setX(i, Math.sin(arcAngle) * radius)
      pos.setZ(i, Math.cos(arcAngle) * radius - radius * 0.7)
    }
    pos.needsUpdate = true
    g.computeVertexNormals()
    return g
  }, [])

  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms,
    vertexShader: auroraVert,
    fragmentShader: auroraFrag,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  }), [uniforms])

  return (
    <mesh
      ref={meshRef}
      geometry={geo}
      material={mat}
      position={[0, 60, 0]}
      rotation={[0, 0, 0]}
      frustumCulled={false}
    />
  )
}
