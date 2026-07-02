import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'
import { useSoundEngine } from '../hooks/useSoundEngine'

const PARTICLE_COUNT = 40
const DURATION = 1.2

/**
 * Particle fanfare that plays when a formula is discovered in the Lab.
 * Violet and gold particles erupt in a ring and expand upward.
 * A bright flash accompanies the burst.
 */
const FormulaCelebration = () => {
  const groupRef = useRef<THREE.Group>(null)
  const pointsRef = useRef<THREE.Points>(null)
  const elapsed = useRef(0)
  const done = useRef(false)
  const sounds = useSoundEngine()

  useEffect(() => {
    sounds.formulaDiscovered()
  }, [sounds])

  const { particles, geometry } = useMemo(() => {
    const posArray = new Float32Array(PARTICLE_COUNT * 3)
    const opArray = new Float32Array(PARTICLE_COUNT).fill(1)
    const colArray = new Float32Array(PARTICLE_COUNT * 3)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(posArray, 3))
    geo.setAttribute('opacity', new THREE.BufferAttribute(opArray, 1))
    geo.setAttribute('color', new THREE.BufferAttribute(colArray, 3))

    const colors = [new THREE.Color('#aa88ff'), new THREE.Color('#ffd700'), new THREE.Color('#8844ff'), new THREE.Color('#ffffff')]
    const parts: { velocity: THREE.Vector3; maxLife: number }[] = []

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2
      const speed = 3 + Math.random() * 6
      parts.push({
        velocity: new THREE.Vector3(
          Math.sin(theta) * speed * 0.6,
          2 + Math.random() * 5,
          Math.cos(theta) * speed * 0.6,
        ),
        maxLife: DURATION * (0.2 + Math.random() * 0.8),
      })

      const c = colors[Math.floor(Math.random() * colors.length)]
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
      // Slow rotation
      groupRef.current.rotation.y += delta * 0.5
    }

    const pos = pointsRef.current.geometry.attributes.position.array as Float32Array
    const op = pointsRef.current.geometry.attributes.opacity.array as Float32Array

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = particles[i]
      const lt = Math.min(t / (p.maxLife / DURATION), 1)
      pos[i * 3] = p.velocity.x * lt
      pos[i * 3 + 1] = p.velocity.y * lt - 1.5 * lt * lt + 1
      pos[i * 3 + 2] = p.velocity.z * lt
      op[i] = Math.max(0, 1 - lt * 1.8)
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true
    pointsRef.current.geometry.attributes.opacity.needsUpdate = true
  })

  return (
    <group ref={groupRef} position={[0, 3.5, -15]}>
      {/* Flash */}
      <mesh>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial
          color="#aa88ff"
          transparent
          opacity={0.4}
          depthWrite={false}
        />
      </mesh>

      {/* Particles */}
      <points ref={pointsRef} frustumCulled={false}>
        <primitive object={geometry} attach="geometry" />
        <pointsMaterial
          size={0.25}
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
 * Watches the store for formula discovery events and plays the celebration.
 * The celebration spawns at the Lab position.
 */
export const FormulaCelebrationManager = () => {
  const lastDiscoveredFormula = useStore((s) => s.lastDiscoveredFormula)
  const lastDiscoveredTime = useStore((s) => s.lastDiscoveredTime)

  if (!lastDiscoveredFormula || !lastDiscoveredTime) return null

  const key = `${lastDiscoveredFormula}-${lastDiscoveredTime}`

  return <FormulaCelebration key={key} />
}
