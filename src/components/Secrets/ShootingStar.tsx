import { useRef, useState, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../store'

/**
 * Shooting Star easter egg.
 * One star in the starfield triggers a shooting star effect
 * when looked at for 5 continuous seconds.
 * The shooting star streaks across the sky with a bright tail.
 */
export const ShootingStar = () => {
  const { camera } = useThree()
  const [active, setActive] = useState(false)
  const lookStartTime = useRef(0)
  const isLooking = useRef(false)
  const trailRef = useRef<THREE.Points>(null)
  const time = useRef(0)
  const shootingStarActive = useRef(false)
  const shootingStarPos = useRef(new THREE.Vector3(-80, 40, -30))
  const shootingStarVel = useRef(new THREE.Vector3(60, -15, 30))

  const specialStarDir = useRef(new THREE.Vector3(0.4, 0.6, 0.3).normalize())

  // Trail geo - pre-allocate
  const trailGeo = useMemo(() => {
    const positions = new Float32Array(20 * 3)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [])

  useFrame((_, delta) => {
    time.current += delta

    // Check if player is looking at the special star
    const lookDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
    const dot = lookDir.dot(specialStarDir.current)

    if (dot > 0.7 && !useStore.getState().shootingStarSeen) {
      if (!isLooking.current) {
        isLooking.current = true
        lookStartTime.current = time.current
      } else if (time.current - lookStartTime.current >= 2 && !shootingStarActive.current) {
        shootingStarActive.current = true
        shootingStarPos.current.set(-80, 40, -30)
        shootingStarVel.current.set(60 + Math.random() * 20, -10 - Math.random() * 15, 20 + Math.random() * 20)
        useStore.setState({ shootingStarSeen: true })
        setActive(true)
      }
    } else {
      isLooking.current = false
      lookStartTime.current = 0
    }

    // Animate shooting star
    if (shootingStarActive.current) {
      shootingStarPos.current.add(shootingStarVel.current.clone().multiplyScalar(delta))
      shootingStarVel.current.y -= delta * 5
      shootingStarVel.current.multiplyScalar(0.98)

      if (shootingStarPos.current.x > 120 || shootingStarPos.current.y < -20) {
        shootingStarActive.current = false
        setActive(false)
      }
    }

    // Update trail positions
    if (active) {
      const positions = trailGeo.attributes.position.array as Float32Array
      for (let i = 0; i < 20; i++) {
        const t = i / 20
        positions[i * 3] = shootingStarPos.current.x - shootingStarVel.current.x * t * 0.3
        positions[i * 3 + 1] = shootingStarPos.current.y - shootingStarVel.current.y * t * 0.3
        positions[i * 3 + 2] = shootingStarPos.current.z - shootingStarVel.current.z * t * 0.3
      }
      trailGeo.attributes.position.needsUpdate = true
    }
  })

  return (
    <group>
      {/* Special indicator star */}
      {!active && (
        <mesh position={specialStarDir.current.clone().multiplyScalar(85)}>
          <sphereGeometry args={[0.15, 6, 6]} />
          <meshBasicMaterial color="#ffdd88" transparent opacity={0.8} />
        </mesh>
      )}

      {/* Shooting star trail */}
      {active && (
        <points ref={trailRef} geometry={trailGeo}>
          <pointsMaterial
            size={0.5}
            color="#ffffff"
            transparent
            opacity={0.6}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            sizeAttenuation
          />
        </points>
      )}

      {/* Shooting star head */}
      {active && (
        <mesh position={shootingStarPos.current}>
          <sphereGeometry args={[0.3, 8, 8]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      )}
    </group>
  )
}
