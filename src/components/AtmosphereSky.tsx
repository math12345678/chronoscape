import { useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { useFrameThrottled } from '../hooks/useFrameThrottled'
import * as THREE from 'three'

const vertexShader = `
varying vec3 vWorldPosition;
varying vec3 vNormal;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`

const fragmentShader = `
uniform vec3 uSunDirection;
uniform vec3 uSunColor;
uniform float uSunElevation;
uniform float uTime;
uniform float uStarBrightness;

varying vec3 vWorldPosition;
varying vec3 vNormal;

#define PI 3.14159265359
#define TAU 6.28318530718

// 2D hash for star noise
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float starNoise(vec2 uv) {
  vec2 id = floor(uv);
  vec2 f = fract(uv);
  float star = hash21(id);
  float brightness = smoothstep(0.9992, 0.9998, star);
  float twinkle = sin(uTime * (2.0 + star * 4.0) + hash21(id + 10.0) * TAU) * 0.5 + 0.5;
  return brightness * (0.3 + twinkle * 0.7);
}

void main() {
  vec3 viewDir = normalize(vWorldPosition - cameraPosition);
  float heightFactor = max(0.0, viewDir.y);

  // Sun angle
  float cosTheta = dot(viewDir, normalize(uSunDirection));
  float sunAngle = acos(clamp(cosTheta, -1.0, 1.0));

  // === Rayleigh scattering ===
  // Shorter wavelengths scatter more: blue when looking away from sun, red at horizon
  float rayleighPhase = 3.0 / (16.0 * PI) * (1.0 + cosTheta * cosTheta);

  // Optical depth increases toward horizon
  float opticalDepth = exp(-(1.0 - heightFactor) * 4.0);
  float rayleighAmount = opticalDepth * 0.8;

  vec3 rayleighColor = mix(
    vec3(0.15, 0.35, 0.65),  // Deep blue sky
    vec3(0.9, 0.5, 0.2),     // Warm horizon
    pow(1.0 - heightFactor, 1.5) * 0.7
  );

  // === Mie scattering (sun glow / aureole) ===
  float g = 0.76;
  float miePhase = (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * cosTheta, 1.5);
  miePhase /= 4.0 * PI;

  float mieAmount = opticalDepth * 0.6;
  vec3 mieColor = vec3(1.0, 0.8, 0.5);  // Warm white

  // === Sun elevation color mixing ===
  float elevation = uSunElevation;  // -1 to 1
  float dayFactor = clamp(elevation * 0.5 + 0.5, 0.0, 1.0);

  // Night sky darkening
  vec3 nightColor = vec3(0.005, 0.008, 0.02);
  vec3 daySky = rayleighColor * rayleighPhase * rayleighAmount
              + mieColor * miePhase * mieAmount * 0.5;

  // Golden hour boost
  float goldenHour = exp(-pow((elevation - 0.15) * 8.0, 2.0));
  vec3 goldenTint = vec3(1.0, 0.6, 0.15) * goldenHour * 0.4;

  // Mix day/night
  vec3 skyColor = mix(nightColor, daySky, dayFactor);
  skyColor += goldenTint * dayFactor;

  // Prevent negative
  skyColor = max(skyColor, vec3(0.0));

  // === Sun disc ===
  float sunRadius = 0.0045;
  float sunDisc = smoothstep(sunRadius * 1.5, sunRadius * 0.5, sunAngle);

  // Sun glow (larger, softer)
  float sunGlow = exp(-sunAngle * 60.0) * 0.6;
  float sunGlowWide = exp(-sunAngle * 15.0) * 0.15;

  vec3 sunColorFinal = uSunColor * (sunDisc * 2.0 + sunGlow + sunGlowWide);
  sunColorFinal *= dayFactor;

  skyColor += sunColorFinal;

  // === Stars (only visible at night / twilight) ===
  float starVisibility = 1.0 - smoothstep(0.0, 0.3, dayFactor);
  vec2 starUV = viewDir.xz / viewDir.y * 200.0;
  float stars = starNoise(starUV + vec2(100.0)) * starVisibility * uStarBrightness;

  // Proper star distribution across upper hemisphere
  float stars2 = 0.0;
  if (viewDir.y > 0.0) {
    vec2 uv2 = vec2(
      atan(viewDir.z, viewDir.x) * 2.0,
      acos(viewDir.y)
    ) * 80.0;
    stars2 = starNoise(uv2) * starVisibility * uStarBrightness;
  }

  skyColor += vec3(stars + stars2) * 0.8;

  // === Clamp and output ===
  skyColor = clamp(skyColor, 0.0, 2.0);

  // Tone map (simple Reinhard)
  skyColor = skyColor / (skyColor + vec3(1.0));

  gl_FragColor = vec4(skyColor, 1.0);
}
`

export const AtmosphereSky = () => {
  const meshRef = useRef<THREE.Mesh>(null)
  const { scene } = useThree()
  const keyLightRef = useRef<THREE.DirectionalLight | null>(null)
  const scratchColorRef = useRef(new THREE.Color())
  const dirRef = useRef(new THREE.Vector3())
  const uniforms = useRef({
    uSunDirection: { value: new THREE.Vector3(0, 0.5, 1).normalize() },
    uSunColor: { value: new THREE.Color(1, 0.9, 0.7) },
    uSunElevation: { value: 0.5 },
    uTime: { value: 0 },
    uStarBrightness: { value: 1.0 },
  })

  useFrameThrottled((_, delta) => {
    uniforms.current.uTime.value += delta * 0.3

    // Read sun direction from the keyLight in the scene (cached ref, no allocation)
    if (!keyLightRef.current) {
      keyLightRef.current = scene.getObjectByName('keyLight') as THREE.DirectionalLight | null
    }
    const keyLight = keyLightRef.current
    if (keyLight) {
      const dir = dirRef.current.copy(keyLight.position).normalize()
      uniforms.current.uSunDirection.value.copy(dir)
      uniforms.current.uSunElevation.value = dir.y

      // Sun color based on elevation (reuse scratchColor, no allocation)
      const elev = dir.y
      const dayFactor = THREE.MathUtils.smoothstep(elev + 0.3, 0, 1)
      const color = scratchColorRef.current
      if (elev > 0.1) {
        color.setHSL(0.08, 0.3, 0.7 + dayFactor * 0.3)
      } else if (elev > -0.2) {
        const t = (elev + 0.2) / 0.3
        color.setHSL(0.08, 0.8, 0.3 + t * 0.5)
      } else {
        color.setHSL(0.0, 0.0, 0.05)
      }
      uniforms.current.uSunColor.value.copy(color)

      // Star brightness: inverse of day factor
      uniforms.current.uStarBrightness.value = 1.0 - dayFactor
    }
  }, 3)

  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(180, 64, 48)
    return g
  }, [])

  const mat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: uniforms.current,
      vertexShader,
      fragmentShader,
      side: THREE.BackSide,
      depthWrite: false,
      transparent: true,
    })
  }, [])

  return (
    <mesh ref={meshRef} geometry={geo} material={mat} frustumCulled={false} />
  )
}
