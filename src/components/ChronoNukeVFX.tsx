import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { triggerShake } from '../hooks/useScreenShake'

interface NukeEvent {
  position: [number, number, number]
  time: number
}

let _activeNuke: NukeEvent | null = null
let _nukePhase: 'charge' | 'explode' | 'fade' = 'charge'
let _phaseTimer = 0
let _shockwaveRadius = 0
let _shockwaveMesh: THREE.Mesh | null = null
let _flashMesh: THREE.Mesh | null = null

export function registerNukeEvent(pos: [number, number, number]) {
  _activeNuke = { position: pos, time: Date.now() }
  _nukePhase = 'charge'
  _phaseTimer = 0
  _shockwaveRadius = 0
}

export const ChronoNukeVFX = () => {
  useThree()
  const groupRef = useRef<THREE.Group>(null)
  const flashRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const particleCount = 200
  const particlesRef = useRef<THREE.Points>(null)

  useEffect(() => {
    if (!groupRef.current) return
    const g = groupRef.current

    // Flash sphere
    const flashGeo = new THREE.SphereGeometry(0.5, 16, 16)
    const flashMat = new THREE.MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const flash = new THREE.Mesh(flashGeo, flashMat)
    flash.name = 'nuke-flash'
    g.add(flash)
    flashRef.current = flash

    // Shockwave ring
    const ringGeo = new THREE.RingGeometry(0.1, 0.3, 48)
    const ringMat = new THREE.MeshBasicMaterial({
      color: '#ff44ff',
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.rotation.x = -Math.PI / 2
    ring.name = 'nuke-ring'
    g.add(ring)
    ringRef.current = ring

    // Particles
    const pGeo = new THREE.BufferGeometry()
    const pos = new Float32Array(particleCount * 3)
    const cols = new Float32Array(particleCount * 3)
    const sizes = new Float32Array(particleCount)
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 0.5 + Math.random() * 1.5
      pos[i * 3] = Math.sin(phi) * Math.cos(theta) * r
      pos[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * r
      pos[i * 3 + 2] = Math.cos(phi) * r
      const c = new THREE.Color().setHSL(0.75 + Math.random() * 0.25, 1, 0.5 + Math.random() * 0.5)
      cols[i * 3] = c.r
      cols[i * 3 + 1] = c.g
      cols[i * 3 + 2] = c.b
      sizes[i] = 0.1 + Math.random() * 0.3
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    pGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3))
    pGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    const pMat = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })
    const particles = new THREE.Points(pGeo, pMat)
    particles.name = 'nuke-particles'
    g.add(particles)
    particlesRef.current = particles // stored in ref but also tracked by name

    return () => {
      g.remove(flash)
      g.remove(ring)
      g.remove(particles)
      flashMat.dispose()
      flashGeo.dispose()
      ringMat.dispose()
      ringGeo.dispose()
      pMat.dispose()
      pGeo.dispose()
    }
  }, [])

  useFrame((_, delta) => {
    if (!_activeNuke) {
      if (groupRef.current) groupRef.current.visible = false
      return
    }

    if (!groupRef.current) return
    groupRef.current.visible = true

    const pos = new THREE.Vector3(_activeNuke.position[0], _activeNuke.position[1] + 0.5, _activeNuke.position[2])
    groupRef.current.position.copy(pos)

    _phaseTimer += delta
    const flash = flashRef.current
    const ring = ringRef.current
    const particles = groupRef.current.getObjectByName('nuke-particles') as THREE.Points

    switch (_nukePhase) {
      case 'charge': {
        const t = _phaseTimer / 1.0
        if (flash) {
          flash.scale.setScalar(1 + t * 5)
          const mat = flash.material as THREE.MeshBasicMaterial
          mat.opacity = t * 0.8
        }
        if (ring) {
          ring.scale.setScalar(t)
          const mat = ring.material as THREE.MeshBasicMaterial
          mat.opacity = t * 0.6
        }
        if (particles) {
          const pMat = particles.material as THREE.PointsMaterial
          pMat.opacity = t * 0.8
          const posAttr = particles.geometry.getAttribute('position') as THREE.BufferAttribute
          const arr = posAttr.array as Float32Array
          for (let i = 0; i < particleCount; i++) {
            arr[i * 3] *= 1 + delta * 2
            arr[i * 3 + 1] *= 1 + delta * 2
            arr[i * 3 + 2] *= 1 + delta * 2
          }
          posAttr.needsUpdate = true
        }
        if (t >= 1) {
          _nukePhase = 'explode'
          _phaseTimer = 0
          _shockwaveRadius = 0
          triggerShake(1, 3, 2, { rotAmplitude: 0.01, rotFreq: 40 })
        }
        break
      }
      case 'explode': {
        const t = _phaseTimer / 0.8
        _shockwaveRadius = t * 25
        if (flash) {
          flash.scale.setScalar(1 + t * 30)
          const mat = flash.material as THREE.MeshBasicMaterial
          mat.opacity = Math.max(0, (1 - t) * 0.9)
        }
        if (ring) {
          ring.scale.setScalar(_shockwaveRadius / 2)
          const mat = ring.material as THREE.MeshBasicMaterial
          mat.opacity = Math.max(0, (1 - t) * 0.8)
        }
        if (particles) {
          const pMat = particles.material as THREE.PointsMaterial
          pMat.opacity = Math.max(0, (1 - t) * 0.9)
          const posAttr = particles.geometry.getAttribute('position') as THREE.BufferAttribute
          const arr = posAttr.array as Float32Array
          for (let i = 0; i < particleCount; i++) {
            arr[i * 3] *= 1 + delta * 8
            arr[i * 3 + 1] *= 1 + delta * 8
            arr[i * 3 + 2] *= 1 + delta * 8
          }
          posAttr.needsUpdate = true
        }
        if (t >= 1) {
          _nukePhase = 'fade'
          _phaseTimer = 0
        }
        break
      }
      case 'fade': {
        const t = _phaseTimer / 0.5
        if (particles) {
          const pMat = particles.material as THREE.PointsMaterial
          pMat.opacity = Math.max(0, (1 - t) * 0.5)
        }
        if (ring) {
          const mat = ring.material as THREE.MeshBasicMaterial
          mat.opacity = Math.max(0, (1 - t) * 0.2)
        }
        if (t >= 1) {
          _activeNuke = null
          _nukePhase = 'charge'
          _phaseTimer = 0
          if (groupRef.current) groupRef.current.visible = false
        }
        break
      }
    }
  })

  return <group ref={groupRef} visible={false} />
}
