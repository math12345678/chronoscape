import { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useFrameThrottled } from '../hooks/useFrameThrottled'
import { ISLAND_SIZE } from '../config/constants'
import { getTerrainHeight } from '../terrain'

const COUNT = 40

export const GlowingFireflies = () => {
  const groupRef = useRef<THREE.Group>(null)
  const time = useRef(0)

  // Create a procedural glow texture
  const glowTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    gradient.addColorStop(0, 'rgba(255,255,200,1)')
    gradient.addColorStop(0.1, 'rgba(255,255,150,0.8)')
    gradient.addColorStop(0.3, 'rgba(200,255,100,0.3)')
    gradient.addColorStop(1, 'rgba(200,255,100,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 64, 64)
    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    return tex
  }, [])

  const fireflies = useMemo(() => {
    const data: {
      sprite: THREE.Sprite
      phase: number
      speed: number
      yBase: number
      xOff: number
      zOff: number
    }[] = []

    for (let i = 0; i < COUNT; i++) {
      const x = (Math.random() - 0.5) * ISLAND_SIZE * 0.8
      const z = (Math.random() - 0.5) * ISLAND_SIZE * 0.8
      const y = getTerrainHeight(x, z)
      const yOff = 0.3 + Math.random() * 1.0
      const size = 0.15 + Math.random() * 0.2

      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTexture,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          transparent: true,
          opacity: 0,
          color: new THREE.Color(
            0.6 + Math.random() * 0.3,
            0.8 + Math.random() * 0.2,
            0.2 + Math.random() * 0.1
          ),
        })
      )
      sprite.position.set(x, y + yOff, z)
      sprite.scale.set(size, size, 1)

      data.push({
        sprite,
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.5,
        yBase: y + yOff,
        xOff: (Math.random() - 0.5) * 2,
        zOff: (Math.random() - 0.5) * 2,
      })
    }
    return data
  }, [glowTexture])

  // Add sprites to group on mount
  useEffect(() => {
    const group = groupRef.current
    if (!group) return
    fireflies.forEach((f) => group.add(f.sprite))
    return () => {
      fireflies.forEach((f) => group.remove(f.sprite))
    }
  }, [fireflies])

  useFrameThrottled((_, baseDelta) => {
    time.current += baseDelta
    if (!groupRef.current) return

    for (let i = 0; i < COUNT; i++) {
      const f = fireflies[i]
      const t = time.current * f.speed + f.phase

      // Drift
      f.sprite.position.x += Math.sin(t * 0.5) * baseDelta * 0.3
      f.sprite.position.z += Math.cos(t * 0.4) * baseDelta * 0.3
      f.sprite.position.y = f.yBase + Math.sin(t * 1.3) * 0.15

      // Glow flicker
      const flicker = Math.sin(t * 3 + Math.sin(t * 2) * 2) * 0.5 + 0.5
      const glow = 0.2 + flicker * 0.8
      f.sprite.material.opacity = glow * 0.6

      // Scale pulse
      const baseSize = 0.15 + (i % 3) * 0.05
      const scale = baseSize * (0.5 + flicker * 0.8)
      f.sprite.scale.set(scale, scale, 1)
    }
  }, 3) // throttled: fireflies move slowly, every ~3rd frame

  return <group ref={groupRef} />
}
