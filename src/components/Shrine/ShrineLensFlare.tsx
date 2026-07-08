import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { SHRINE_POSITION } from './TimeShrine'

/**
 * A golden lens flare that sits above the Shrine's crystal.
 * Activates when the player looks directly at it (within 30° of center-screen),
 * producing a warm god-ray glow effect.
 */
export const ShrineLensFlare = () => {
  const { camera } = useThree()
  const spriteRef = useRef<THREE.Sprite>(null)
  const time = useRef(0)
  const shrinePos = useRef(new THREE.Vector3())
  const toShrine = useRef(new THREE.Vector3())
  const colorHelper = useRef(new THREE.Color())

  // Create flare texture procedurally
  const flareTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const ctx = canvas.getContext('2d')!

    // Multi-layer glow
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    gradient.addColorStop(0, 'rgba(255, 240, 200, 1)')
    gradient.addColorStop(0.05, 'rgba(255, 220, 150, 0.8)')
    gradient.addColorStop(0.15, 'rgba(255, 200, 100, 0.5)')
    gradient.addColorStop(0.3, 'rgba(255, 180, 80, 0.2)')
    gradient.addColorStop(0.5, 'rgba(255, 150, 50, 0.08)')
    gradient.addColorStop(1, 'rgba(255, 150, 50, 0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 128, 128)

    // Star-like rays
    ctx.save()
    ctx.translate(64, 64)
    for (let i = 0; i < 12; i++) {
      ctx.rotate(Math.PI / 6)
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(-2, 55)
      ctx.lineTo(2, 55)
      ctx.closePath()
      const alpha = 0.03 + Math.sin(i * 2.3) * 0.02
      ctx.fillStyle = `rgba(255, 220, 180, ${alpha})`
      ctx.fill()
    }
    ctx.restore()

    const texture = new THREE.CanvasTexture(canvas)
    return texture
  }, [])

  useFrame((_, delta) => {
    time.current += delta
    if (!spriteRef.current) return

    // Check angle to camera
    shrinePos.current.set(
      SHRINE_POSITION[0],
      SHRINE_POSITION[1] + 1.5,
      SHRINE_POSITION[2],
    )
    toShrine.current.copy(shrinePos.current).sub(camera.position).normalize()
    const lookDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)

    const dot = toShrine.current.dot(lookDir)
    const isLookingAt = dot > 0.87 // ~30° cone

    // Pulse the flare
    const pulse = Math.sin(time.current * 1.2) * 0.15 + 0.85
    const targetOpacity = isLookingAt ? 0.3 * pulse : 0
    const mat = spriteRef.current.material as THREE.SpriteMaterial

    // Smooth transition
    const currentOpacity = mat.opacity
    const newOpacity = currentOpacity + (targetOpacity - currentOpacity) * delta * 3
    mat.opacity = newOpacity

    // Scale with angle (bigger when looking directly)
    if (isLookingAt) {
      const angleFactor = (dot - 0.87) / 0.13 // 0 to 1
      const scale = 1.5 + angleFactor * 3
      spriteRef.current.scale.setScalar(scale)

      // Color shift toward gold
      mat.color.copy(colorHelper.current.setRGB(1, 0.7 + angleFactor * 0.3, 0.3 + angleFactor * 0.3))
    }

    // Position above the shrine crystal
    spriteRef.current.position.set(
      SHRINE_POSITION[0],
      SHRINE_POSITION[1] + 1.5,
      SHRINE_POSITION[2],
    )
  })

  return (
    <sprite ref={spriteRef} scale={[2, 2, 1]}>
      <spriteMaterial
        map={flareTexture}
        transparent
        opacity={0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </sprite>
  )
}
