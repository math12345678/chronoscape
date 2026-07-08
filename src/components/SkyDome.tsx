import { useRef, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { useFrameThrottled } from '../hooks/useFrameThrottled'
import * as THREE from 'three'

const DOME_RADIUS = 90
const SEGMENTS = 32
const SUN_SPRITE_SCALE = 4
const SKY_UPDATE_THRESHOLD = 0.015 // only redraw sky when dayFactor shifts this much

/**
 * A dynamic sky dome with:
 * - Hemispherical gradient that changes with day/night cycle
 * - A sun billboard (glowing sprite) that follows the keyLight position
 * - The sun warms at dawn/dusk and cools at noon
 * - Stars peek through more at night
 */
export const SkyDome = () => {
  const { scene } = useThree()
  const skyRef = useRef<THREE.Mesh>(null)
  const sunRef = useRef<THREE.Sprite>(null)
  const time = useRef(0)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Create sky gradient texture procedurally
  const skyTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvasRef.current = canvas
    canvas.width = 1
    canvas.height = 256
    const ctx = canvas.getContext('2d')!
    
    // Initial gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 256)
    gradient.addColorStop(0, '#0a1520')   // zenith (dark)
    gradient.addColorStop(0.4, '#1a2a40')  // upper sky
    gradient.addColorStop(0.7, '#2a3a50')  // mid sky
    gradient.addColorStop(1, '#3a4a60')    // horizon (lighter)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 1, 256)

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    return texture
  }, [])

  // Create sun sprite texture procedurally
  const sunTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const ctx = canvas.getContext('2d')!

    // Outer glow
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    gradient.addColorStop(0, 'rgba(255, 255, 200, 1)')
    gradient.addColorStop(0.2, 'rgba(255, 230, 150, 0.8)')
    gradient.addColorStop(0.4, 'rgba(255, 200, 100, 0.4)')
    gradient.addColorStop(0.7, 'rgba(255, 180, 80, 0.1)')
    gradient.addColorStop(1, 'rgba(255, 180, 80, 0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 128, 128)

    const texture = new THREE.CanvasTexture(canvas)
    return texture
  }, [])

  // Track last day factor to avoid unnecessary canvas redraws
  const lastDayFactor = useRef(-1)

  // Hoisted temporary objects to avoid per-frame allocations
  const tempSunPos = useRef(new THREE.Vector3())
  const tempSkyColor = useRef(new THREE.Color())
  const tempZenith = useRef(new THREE.Color())
  const tempHorizon = useRef(new THREE.Color())
  const tempWarmth = useRef(new THREE.Color())
  const keyLightRef = useRef<THREE.DirectionalLight | null>(null)

  // Update sky colors each frame based on day/night cycle
  useFrameThrottled((_, delta) => {
    time.current += delta

    // Read sun position from the keyLight (cached ref)
    if (!keyLightRef.current) {
      keyLightRef.current = scene.getObjectByName('keyLight') as THREE.DirectionalLight | null
    }
    const keyLight = keyLightRef.current
    if (!keyLight) return

    // No-allocation normalize using refs
    tempSunPos.current.copy(keyLight.position).normalize()
    const height = tempSunPos.current.y // -1 (night) to 1 (noon)

    // Day factor: 0 = night, 1 = noon
    const dayFactor = THREE.MathUtils.smoothstep(height + 0.3, 0, 1)
    
    // Update sky dome material colors
    if (skyRef.current) {
      const mat = skyRef.current.material as THREE.MeshBasicMaterial
      tempSkyColor.current.setHSL(0.58, 0.15 + dayFactor * 0.2, 0.04 + dayFactor * 0.18)
      mat.color.copy(tempSkyColor.current)
      mat.opacity = 0.4 + dayFactor * 0.6
    }

    // Only redraw the texture canvas when day factor shifts significantly
    const shouldRedraw = Math.abs(dayFactor - lastDayFactor.current) > SKY_UPDATE_THRESHOLD
    
    // Update sky texture gradient (throttled to avoid per-frame canvas ops)
    if (canvasRef.current && shouldRedraw) {
      lastDayFactor.current = dayFactor
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')!
      const grad = ctx.createLinearGradient(0, 0, 0, 256)
      
      tempZenith.current.setHSL(0.58, 0.3, 0.02 + dayFactor * 0.1)
      tempHorizon.current.setHSL(0.55, 0.3 + dayFactor * 0.3, 0.04 + dayFactor * 0.25)
      
      // Add warm tones at dawn/dusk
      const isGoldenHour = dayFactor > 0.1 && dayFactor < 0.5
      if (isGoldenHour) {
        const goldStrength = Math.sin(dayFactor * Math.PI) * 0.5
        tempHorizon.current.lerp(new THREE.Color('#ff8844'), goldStrength * 0.6)
      }

      grad.addColorStop(0, tempZenith.current.getStyle())
      grad.addColorStop(0.5, tempHorizon.current.lerp(tempZenith.current, 0.5).getStyle())
      grad.addColorStop(1, tempHorizon.current.getStyle())
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, 1, 256)
      skyTexture.needsUpdate = true
    }

    // Update sun sprite position and scale
    if (sunRef.current && tempSunPos.current.y > -0.2) {
      // Only show sun above horizon
      const sunDist = 70
      const sx = tempSunPos.current.x * sunDist
      const sy = Math.max(0, tempSunPos.current.y) * sunDist * 0.3 + 5
      const sz = tempSunPos.current.z * sunDist
      sunRef.current.position.set(sx, sy, sz)
      sunRef.current.visible = true

      // Scale by height (bigger near horizon)
      const horizonGlow = Math.max(0, 1 - Math.abs(tempSunPos.current.y) * 2)
      const scale = SUN_SPRITE_SCALE * (1 + horizonGlow * 2)
      sunRef.current.scale.setScalar(scale)

      // Color shifts warm at horizon
      const mat = sunRef.current.material as THREE.SpriteMaterial
      tempWarmth.current.setRGB(1, 0.7 + dayFactor * 0.3, 0.4 + dayFactor * 0.6)
      mat.color.copy(tempWarmth.current)
      mat.opacity = 0.7 + horizonGlow * 0.3
    } else if (sunRef.current) {
      sunRef.current.visible = false
    }
  }, 3)

  return (
    <group>
      {/* Sky dome — large sphere with inside-facing gradient material */}
      <mesh ref={skyRef}>
        <sphereGeometry args={[DOME_RADIUS, SEGMENTS, SEGMENTS]} />
        <meshBasicMaterial
          map={skyTexture}
          side={THREE.BackSide}
          transparent
          opacity={0.8}
          depthWrite={false}
        />
      </mesh>

      {/* Sun sprite */}
      <sprite ref={sunRef} scale={[SUN_SPRITE_SCALE, SUN_SPRITE_SCALE, 1]}>
        <spriteMaterial
          map={sunTexture}
          transparent
          opacity={0.9}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
    </group>
  )
}
