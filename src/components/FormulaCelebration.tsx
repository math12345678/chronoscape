import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'
import { useSoundEngine } from '../hooks/useSoundEngine'
import { setTimeScaleTarget } from './TimeManager'
import { triggerShake } from '../hooks/useScreenShake'
import { spawnShockwave } from './ShockwaveRing'
import { spawnDNAHelix } from './DNAHelix'

const PARTICLE_COUNT = 80
const DURATION = 2.0

/**
 * Particle fanfare when a formula is discovered in the Lab.
 * Features:
 * - 80 violet/gold/white particles in a ring eruption
 * - Expanding ring wave
 * - Camera shake + slow-motion
 * - Flash sphere
 * - Sets pendingFormulaPanel for the UI
 */
const FormulaCelebration = () => {
  const groupRef = useRef<THREE.Group>(null)
  const pointsRef = useRef<THREE.Points>(null)
  const elapsed = useRef(0)
  const done = useRef(false)
  const flashRef = useRef<THREE.Mesh>(null)
  const ringWaveRef = useRef<THREE.Mesh>(null)
  const sounds = useSoundEngine()

  useEffect(() => {
    sounds.formulaDiscovered()

    // Trigger slow-motion for 2.5s
    setTimeScaleTarget(0.12)
    setTimeout(() => {
      setTimeScaleTarget(1.0)
    }, 2500)

    // Big camera shake
    triggerShake(0.8, 5)

    // Shockwave + DNA helix + speed lines
    spawnShockwave({ position: [0, 0.1, -15], color: '#aa88ff', duration: 1.5, maxScale: 15, ringCount: 4 })
    spawnDNAHelix({ position: [0, 1, -15], scale: 1.5 })
    if ((window as any).__triggerSpeedLines) (window as any).__triggerSpeedLines(0.8)

    // Screen flash
    const flash = document.getElementById('formula-flash') || (() => {
      const el = document.createElement('div')
      el.id = 'formula-flash'
      el.style.cssText = 'position:fixed;inset:0;background:transparent;pointer-events:none;z-index:9997;transition:opacity 0.3s ease-out'
      document.body.appendChild(el)
      return el
    })()
    flash.style.background = 'radial-gradient(ellipse at center, rgba(170,136,255,0.4) 0%, transparent 70%)'
    flash.style.opacity = '0.8'
    requestAnimationFrame(() => { flash.style.opacity = '0' })
    setTimeout(() => { if (flash.parentNode) flash.parentNode.removeChild(flash) }, 400)
  }, [sounds])

  const { particles, geometry } = useMemo(() => {
    const posArray = new Float32Array(PARTICLE_COUNT * 3)
    const opArray = new Float32Array(PARTICLE_COUNT).fill(1)
    const colArray = new Float32Array(PARTICLE_COUNT * 3)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(posArray, 3))
    geo.setAttribute('opacity', new THREE.BufferAttribute(opArray, 1))
    geo.setAttribute('color', new THREE.BufferAttribute(colArray, 3))

    const palette = [
      new THREE.Color('#aa88ff'),
      new THREE.Color('#ffd700'),
      new THREE.Color('#8844ff'),
      new THREE.Color('#ffffff'),
      new THREE.Color('#44ffcc'),
      new THREE.Color('#ff6644'),
      new THREE.Color('#cc88ff'),
      new THREE.Color('#ffaa44'),
    ]
    const parts: { velocity: THREE.Vector3; maxLife: number }[] = []

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      const speed = 5 + Math.random() * 10
      parts.push({
        velocity: new THREE.Vector3(
          Math.sin(theta) * Math.cos(phi) * speed * 0.8,
          2 + Math.random() * 7 + Math.abs(Math.sin(phi)) * 3,
          Math.cos(theta) * Math.sin(phi) * speed * 0.8,
        ),
        maxLife: DURATION * (0.2 + Math.random() * 0.8),
      })

      const c = palette[Math.floor(Math.random() * palette.length)]
      colArray[i * 3] = c.r
      colArray[i * 3 + 1] = c.g
      colArray[i * 3 + 2] = c.b
    }

    return { particles: parts, geometry: geo }
  }, [])

  useFrame((_, delta) => {
    elapsed.current += delta
    const t = elapsed.current / DURATION

    if (t >= 1 && !done.current) {
      done.current = true
      return
    }

    if (!pointsRef.current) return

    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.8
    }

    // Flash pulse
    if (flashRef.current) {
      const flashMat = flashRef.current.material as THREE.MeshBasicMaterial
      flashMat.opacity = Math.max(0, 0.7 - t * 1.2)
      const s = 1 + t * 8
      flashRef.current.scale.setScalar(s)
    }

    // Ring wave expansion
    if (ringWaveRef.current) {
      const waveScale = 1 + t * 10
      ringWaveRef.current.scale.set(waveScale, waveScale, waveScale)
      const mat = ringWaveRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = Math.max(0, 0.5 * (1 - t))
      mat.color.setHSL(0.75 - t * 0.1, 0.8, 0.4 + t * 0.3)
    }

    const pos = pointsRef.current.geometry.attributes.position.array as Float32Array
    const op = pointsRef.current.geometry.attributes.opacity.array as Float32Array

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = particles[i]
      const lt = Math.min(t / (p.maxLife / DURATION), 1)
      pos[i * 3] = p.velocity.x * lt
      pos[i * 3 + 1] = p.velocity.y * lt - 2 * lt * lt + 1.5
      pos[i * 3 + 2] = p.velocity.z * lt
      op[i] = Math.max(0, (1 - lt) * (1 - lt))
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true
    pointsRef.current.geometry.attributes.opacity.needsUpdate = true
  })

  return (
    <group ref={groupRef} position={[0, 3.5, -15]}>
      {/* Expanding ring wave */}
      <mesh ref={ringWaveRef} position={[0, 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 2.5, 48]} />
        <meshBasicMaterial
          color="#aa88ff"
          transparent
          opacity={0.5}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Expanding flash sphere */}
      <mesh ref={flashRef}>
        <sphereGeometry args={[1.5, 16, 16]} />
        <meshBasicMaterial
          color="#aa88ff"
          transparent
          opacity={0.7}
          depthWrite={false}
        />
      </mesh>

      {/* 33% more particles with richer colors */}
      <points ref={pointsRef} frustumCulled={false}>
        <primitive object={geometry} attach="geometry" />
        <pointsMaterial
          size={0.35}
          vertexColors
          transparent
          opacity={1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
    </group>
  )
}

/**
 * Watches the store for formula discovery events, plays the celebration,
 * and sets the pending formula panel for the UI.
 */
export const FormulaCelebrationManager = () => {
  const lastDiscoveredFormula = useStore((s) => s.lastDiscoveredFormula)
  const lastDiscoveredTime = useStore((s) => s.lastDiscoveredTime)
  const shownFormulaRef = useRef<string | null>(null)

  useEffect(() => {
    if (lastDiscoveredFormula && lastDiscoveredTime) {
      if (shownFormulaRef.current !== lastDiscoveredFormula) {
        shownFormulaRef.current = lastDiscoveredFormula
        useStore.getState().setCompendiumOpen(false)
        useStore.setState({
          pendingFormulaPanel: {
            id: lastDiscoveredFormula,
            discoveredAt: lastDiscoveredTime,
          },
        })
      }
    }
  }, [lastDiscoveredFormula, lastDiscoveredTime])

  if (!lastDiscoveredFormula || !lastDiscoveredTime) return null

  const key = `${lastDiscoveredFormula}-${lastDiscoveredTime}`

  return <FormulaCelebration key={key} />
}
