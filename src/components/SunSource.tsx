import { forwardRef, useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { getGoldenHourFactor } from './DayNightCycle'

export const SunSource = forwardRef<THREE.Mesh>((_props, ref) => {
  const { scene } = useThree()
  const internalRef = useRef<THREE.Mesh>(null)
  const meshRef = (ref || internalRef) as React.RefObject<THREE.Mesh | null>
  const glowRef = useRef<THREE.Mesh>(null)
  const keyLightRef = useRef<THREE.DirectionalLight | null>(null)
  const scratchColor = useRef(new THREE.Color())

  // Create the glow sprite geometry once
  const glowGeo = useMemo(() => new THREE.CircleGeometry(8, 24), [])

  useFrame(() => {
    if (!keyLightRef.current) {
      keyLightRef.current = scene.getObjectByName('keyLight') as THREE.DirectionalLight | null
    }
    const keyLight = keyLightRef.current
    if (!keyLight || !meshRef.current) return

    meshRef.current.position.copy(keyLight.position)
    if (glowRef.current) {
      glowRef.current.position.copy(keyLight.position)
    }

    const goldenHour = getGoldenHourFactor()

    // Sun visibility: only when above horizon
    const elev = keyLight.position.y
    const visibility = THREE.MathUtils.smoothstep(elev + 0.2, 0, 1)

    // Scale: grows during golden hour, normal during day, hidden at night
    const baseScale = 3
    const goldenScale = baseScale * (1 + goldenHour * 0.6) // 60% bigger during golden hour
    const scale = goldenScale * visibility
    meshRef.current.scale.setScalar(scale)

    // Color: warm orange during golden hour, white during day
    const hue = 0.10 - goldenHour * 0.06 // shift from yellow to orange-red
    const sat = 0.1 + goldenHour * 0.7 // more saturated during golden hour
    const light = 0.9 + goldenHour * 0.1
    const sunColor = scratchColor.current.setHSL(
      Math.max(0.03, Math.min(0.12, hue)),
      Math.min(1, sat),
      Math.min(1, light)
    )

    // Main sun disc
    const mat = meshRef.current.material as THREE.MeshBasicMaterial
    mat.color.copy(sunColor)
    mat.opacity = visibility

    // Glow halo — larger, softer, more visible during golden hour
    if (glowRef.current) {
      const glowMat = glowRef.current.material as THREE.MeshBasicMaterial
      const glowScale = 16 + goldenHour * 12 // grows dramatically during golden hour
      glowRef.current.scale.setScalar(glowScale * visibility)

      // Glow color: warmer and brighter during golden hour
      const glowHue = 0.10 - goldenHour * 0.08
      const glowSat = 0.3 + goldenHour * 0.5
      scratchColor.current.setHSL(
        Math.max(0.02, Math.min(0.12, glowHue)),
        Math.min(1, glowSat),
        0.6 + goldenHour * 0.3
      )
      glowMat.color.copy(scratchColor.current)
      glowMat.opacity = visibility * (0.25 + goldenHour * 0.35)
    }
  })

  return (
    <group>
      {/* Outer glow halo */}
      <mesh ref={glowRef}>
        <primitive object={glowGeo} attach="geometry" />
        <meshBasicMaterial
          color="#ff8844"
          transparent
          opacity={0.3}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* Sun disc */}
      <mesh ref={ref}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color="#ffeecc"
          transparent
          opacity={1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
})
SunSource.displayName = 'SunSource'
