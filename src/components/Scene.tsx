import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  EffectComposer, Bloom, Noise,
  ChromaticAberration, Vignette, ToneMapping, FXAA,
} from '@react-three/postprocessing'
import { Vector2 } from 'three'
import * as THREE from 'three'
import { World } from './World'
import { PlayerController } from './PlayerController'
import { InteractionScanner } from './InteractionScanner'
import { Starfield } from './Starfield'
import { AmbientParticles } from './AmbientParticles'
import { DayNightCycle } from './DayNightCycle'
import { MovementParticles } from './MovementParticles'
import { BoundaryRunestones } from './BoundaryRunestones'
import { RefineVFXManager } from './RefineVFX'
import { HarvestVFX } from './HarvestVFX'
import { BlockPlaceEffectManager } from './BlockPlaceEffect'
import { FormulaCelebrationManager } from './FormulaCelebration'
import { BlockDecayVFXManager } from './BlockDecayVFX'
import { FootstepSystem } from './FootstepSystem'
import { SpawnBurst } from './SpawnBurst'
import { EnvironmentSystem } from './EnvironmentSystem'
import { BuildGrid } from './Building/BuildGrid'
import { useStore } from '../store'
import { tickShake, isShaking, triggerShake } from '../hooks/useScreenShake'
import { ErrorBoundary } from './ErrorBoundary'
import { TimeManager } from './TimeManager'
import {
  getQualityLevel,
  getBloomIntensity,
  getChromaticAberrationOffset,
  shouldDisableEffects,
} from '../utils/performance'

/**
 * Gates decorative/advanced 3D effects behind showAdvancedHUD.
 * New players see core world + lighting only. Effects unlock with progression.
 */
const SceneEffectGate = ({ children }: { children: React.ReactNode }) => {
  const show = useStore((s) => s.showAdvancedHUD)
  if (!show) return null
  return <>{children}</>
}

/**
 * Applies screen shake to the camera only when shake is active.
 * Saves ~0.5µs per frame when idle (no camera vec3 math).
 */
const ShakeHandler = () => {
  const { camera } = useThree()
  const posOffset = useRef(new THREE.Vector3())

  // Listen for block-place-shake and block-remove-shake custom events
  useEffect(() => {
    const placeHandler = () => triggerShake(0.06, 5, 0.1)
    const removeHandler = () => triggerShake(0.04, 4, 0.08)
    window.addEventListener('block-place-shake', placeHandler)
    window.addEventListener('block-remove-shake', removeHandler)
    return () => {
      window.removeEventListener('block-place-shake', placeHandler)
      window.removeEventListener('block-remove-shake', removeHandler)
    }
  }, [])

  useFrame((_, delta) => {
    if (!isShaking()) return // Fast-path: no shake active

    const [sx, sy, sz] = tickShake(delta)

    camera.position.x -= posOffset.current.x
    camera.position.y -= posOffset.current.y
    camera.position.z -= posOffset.current.z
    camera.position.x += sx
    camera.position.y += sy
    camera.position.z += sz
    posOffset.current.set(sx, sy, sz)
  })

  return null
}

/**
 * Quality-aware post-processing that adapts to the current graphics preset.
 * - Low (0):  no effects at all — helps the weakest hardware
 * - Medium (1): Bloom + Noise only
 * - High (2):  Bloom + Noise + ToneMapping + Vignette + mild ChromaticAberration
 * - Ultra (3): Bloom + Noise + ToneMapping + Vignette + ChromaticAberration + FXAA
 */
const PostProcessingEffects = () => {
  const quality = getQualityLevel()
  const bloomIntensity = getBloomIntensity()
  const chromaOffset = getChromaticAberrationOffset()
  const disabled = shouldDisableEffects()

  // Memoize offset vector to avoid Vector2 allocation per render
  const offsetVec = useMemo(() => new Vector2(chromaOffset, chromaOffset), [chromaOffset])

  if (disabled || quality < 1) return null

  return (
    <EffectComposer>
      <Bloom
        luminanceThreshold={quality >= 3 ? 0.1 : 0.2}
        luminanceSmoothing={0.08}
        intensity={bloomIntensity}
        mipmapBlur
      />
      {quality >= 2 && (
        <ToneMapping adaptive luminanceThreshold={0.8} middleGrey={0.6} />
      ) as any}
      {quality >= 2 && chromaOffset > 0 && (
        <ChromaticAberration offset={offsetVec} radialModulation={false} modulationOffset={0} />
      ) as any}
      {quality >= 2 && (
        <Vignette eskil={false} offset={0.15} darkness={0.6} />
      ) as any}
      {quality >= 3 && (
        <FXAA />
      ) as any}
      <Noise opacity={quality >= 3 ? 0.025 : 0.015} />
    </EffectComposer>
  )
}

// Track WebGL context loss globally so other components can check
let _contextLost = false
export function isContextLost(): boolean { return _contextLost }

/**
 * Recover the canvas after WebGL context loss by forcing a full page reload.
 * This is the only reliable recovery — the WebGL state is unrecoverable.
 */
function handleContextLost(event: Event) {
  event.preventDefault()
  _contextLost = true
  console.warn('[WebGL] Context lost — showing recovery overlay')
  window.dispatchEvent(new CustomEvent('webgl-context-lost'))
}

function handleContextRestored() {
  _contextLost = false
  console.log('[WebGL] Context restored')
}

export const Scene = () => {
  return (
    <Canvas
      shadows
      camera={{ fov: 75, near: 0.1, far: 200, position: [0, 5, 10] }}
      onCreated={({ gl }) => {
        gl.setClearColor('#0a1520')
        // Attach WebGL context loss handlers to the canvas DOM element
        // Remove old listeners to prevent duplicates on re-mount
        const canvas = gl.domElement
        canvas.removeEventListener('webglcontextlost', handleContextLost, false)
        canvas.removeEventListener('webglcontextrestored', handleContextRestored, false)
        canvas.addEventListener('webglcontextlost', handleContextLost, false)
        canvas.addEventListener('webglcontextrestored', handleContextRestored, false)
      }}
    >
      <fog attach="fog" args={['#0d1a2a', 30, 150]} />
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
      <ambientLight intensity={0.2} color="#cceeff" />
      <directionalLight
        name="fillLight"
        position={[-20, 20, 20]}
        intensity={0.8}
        color="#88ddee"
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
      <ErrorBoundary name="World">
        <World />
      </ErrorBoundary>
      <PlayerController />
      <InteractionScanner />
      {/* Always-on core systems */}
      <DayNightCycle />
      <ShakeHandler />
      <ErrorBoundary name="FootstepSystem">
        <FootstepSystem />
      </ErrorBoundary>
      <HarvestVFX />
      <RefineVFXManager />
      <BlockPlaceEffectManager />
      <BlockDecayVFXManager />
      <BuildGrid />
      <FormulaCelebrationManager />

      {/* Gated decorative / advanced effects */}
      <SceneEffectGate>
        <Starfield />
        <AmbientParticles />
        <MovementParticles />
        <BoundaryRunestones />
        <ErrorBoundary name="EnvironmentSystem">
          <EnvironmentSystem />
        </ErrorBoundary>
        <SpawnBurst />
      </SceneEffectGate>

      {/* Post-processing pipeline — quality-aware */}
      <PostProcessingEffects />
    </Canvas>
  )
}
