import { useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, Noise } from '@react-three/postprocessing'
import * as THREE from 'three'
import { World } from './World'
import { PlayerController } from './PlayerController'
import { InteractionScanner } from './InteractionScanner'
import { Starfield } from './Starfield'
import { AmbientParticles } from './AmbientParticles'
import { DayNightCycle } from './DayNightCycle'
import { TimeAnomaly } from './TimeAnomaly'
import { AnomalyVisuals } from './AnomalyVisuals'
import { MovementParticles } from './MovementParticles'
import { BoundaryRunestones } from './BoundaryRunestones'
import { RefineVFXManager } from './RefineVFX'
import { BlockPlaceEffectManager } from './BlockPlaceEffect'
import { FormulaCelebrationManager } from './FormulaCelebration'
import { WeatherSystem } from './WeatherSystem'
import { BlockDecayVFXManager } from './BlockDecayVFX'
import { FootstepSystem } from './FootstepSystem'
import { EnvironmentSystem } from './EnvironmentSystem'
import { BuildGrid } from './Building/BuildGrid'
import { applyShake, useShakeStore } from '../hooks/useScreenShake'
import { TimeManager } from './TimeManager'
import { OnboardingCompass } from './OnboardingCompass'

/**
 * Applies screen shake to the camera each frame.
 */
const ShakeHandler = () => {
  const { camera } = useThree()
  const intensity = useShakeStore((s) => s.intensity)
  const decay = useShakeStore((s) => s.decay)
  const time = useRef(0)
  const shakeOffset = useRef(new THREE.Vector3())

  useFrame((_, delta) => {
    time.current += delta

    if (intensity > 0.001) {
      const [sx, sy] = applyShake(intensity, decay, delta, time.current)

      camera.position.x += sx - shakeOffset.current.x
      camera.position.y += sy - shakeOffset.current.y

      shakeOffset.current.set(sx, sy)
    } else if (shakeOffset.current.lengthSq() > 0) {
      camera.position.x -= shakeOffset.current.x
      camera.position.y -= shakeOffset.current.y
      shakeOffset.current.set(0, 0, 0)
    }
  })

  return null
}

export const Scene = () => {
  return (
    <Canvas
      shadows
      camera={{ fov: 75, near: 0.1, far: 200, position: [0, 5, 10] }}
      onPointerDown={() => {
        if (!document.pointerLockElement) {
          document.body.requestPointerLock?.()
        }
      }}
      onCreated={({ gl, scene }) => {
        gl.setClearColor('#0a1520')
      }}
    >
      <fog attach="fog" args={['#0a1520', 20, 100]} />
      {/* Lights */}
      <directionalLight
        name="keyLight"
        position={[20, 40, 30]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-35}
        shadow-camera-right={35}
        shadow-camera-top={35}
        shadow-camera-bottom={-35}
        shadow-bias={-0.001}
      />
      <ambientLight intensity={0.1} color="#ffffff" />
      <directionalLight
        name="fillLight"
        position={[-20, 20, 20]}
        intensity={0.6}
        color="#88aacc"
      />
      <directionalLight
        name="rimLight"
        position={[0, 15, -40]}
        intensity={1.2}
        color="#ccbbff"
      />

      {/* Global Systems */}
      <TimeManager />

      {/* World content */}
      <World />
      <PlayerController />
      <InteractionScanner />
      <OnboardingCompass />

      {/* Visual enhancements */}
      <Starfield />
      <AmbientParticles />
      <DayNightCycle />
      <ShakeHandler />
      <MovementParticles />
      <BoundaryRunestones />

      {/* Time anomaly events */}
      <TimeAnomaly />
      <AnomalyVisuals />

      {/* Refine VFX */}
      <RefineVFXManager />

      {/* Block placement effect */}
      <BlockPlaceEffectManager />

      {/* Formula discovery celebration */}
      <FormulaCelebrationManager />

      {/* Weather system */}
      <WeatherSystem />

      {/* Enhanced environment: fireflies, butterflies, flowers */}
      <EnvironmentSystem />

      {/* Footstep audio */}
      <FootstepSystem />

      {/* Build grid overlay */}
      <BuildGrid />

      {/* Block decay VFX */}
      <BlockDecayVFXManager />

      {/* Post-processing with bloom */}
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.08}
          intensity={1.2}
          mipmapBlur
        />
        <Noise opacity={0.015} />
      </EffectComposer>
    </Canvas>
  )
}
