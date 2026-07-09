import { useRef, useEffect, useMemo } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { PointerLockControls } from '@react-three/drei'
import * as THREE from 'three'
import { PLAYER_SPEED, PLAYER_EYE_HEIGHT, GRAVITY } from '../config/constants'
import { shouldTick } from '../utils/performance'
import { triggerShake } from '../hooks/useScreenShake'
import { useStore } from '../store'
import { getWorldTerrainHeight } from './InfiniteWorld'
import { publishCameraDirection } from './UI/Compass'
import { isPlayerDriving } from './Vehicles/HoverVehicle'
import { getRelicSpeedBonus } from '../systems/RelicForging'
import { getAscensionSpeedBonus } from '../systems/ChronoAscension'
import { getCompanionSpeedBonus } from '../systems/TimeCompanions'
import { getMountSpeedBonus, getMountJumpBonus } from '../systems/MountsSystem'

// ── Landing / Sprint impact particles (pre-allocated pool) ──

interface Impact {
  id: number
  position: THREE.Vector3
  time: number
  intensity: number
  particlesEach: number
}

let nextImpactId = 1
let activeImpacts: Impact[] = []

/** Spawn impact particles at the given world position. Called outside React lifecycle. */
export function spawnImpactParticles(position: THREE.Vector3, intensity: number) {
  const id = nextImpactId++
  activeImpacts.push({
    id,
    position: position.clone(),
    time: performance.now(),
    intensity,
    particlesEach: Math.ceil(intensity * 8),
  }) // useFrame handles cleanup every frame
}

// Pre-allocated buffers (max 200 particles total)
const MAX_PARTICLES = 200
const _posArray = new Float32Array(MAX_PARTICLES * 3)
const _colArray = new Float32Array(MAX_PARTICLES * 3)
const _opArray = new Float32Array(MAX_PARTICLES)

/**
 * Renders active impact particles (landing, sprinting).
 * Uses pre-allocated buffers — zero GC pressure per frame.
 */
export const ImpactParticles = () => {
  const groupRef = useRef<THREE.Group>(null)

  // Pre-built geometry with dynamic buffer attributes
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const BA = THREE.BufferAttribute as any
    geo.setAttribute('position', new BA(_posArray, 3))
    geo.setAttribute('opacity', new BA(_opArray, 1))
    geo.setAttribute('color', new BA(_colArray, 3))
    geo.setDrawRange(0, 0)
    return geo
  }, [])

  useFrame(() => {
    const now = performance.now()
    // Filter in-place to avoid array allocation
    let writeIdx = 0
    for (let i = 0; i < activeImpacts.length; i++) {
      const imp = activeImpacts[i]
      if (now - imp.time >= 800) continue // expired
      activeImpacts[writeIdx++] = imp
    }
    activeImpacts.length = writeIdx

    if (writeIdx === 0) {
      if (groupRef.current) groupRef.current.visible = false
      return
    }
    if (groupRef.current) groupRef.current.visible = true

    // Fill pre-allocated buffers
    let particleIdx = 0
    for (const imp of activeImpacts) {
      const age = (now - imp.time) / 800
      const count = imp.particlesEach
      for (let i = 0; i < count && particleIdx < MAX_PARTICLES; i++) {
        const theta = Math.random() * Math.PI * 2
        const speed = 1 + imp.intensity * 3
        const dist = age * speed * 1.5
        const i3 = particleIdx * 3
        _posArray[i3] = imp.position.x + Math.cos(theta) * dist
        _posArray[i3 + 1] = imp.position.y + Math.random() * 0.5 * (1 - age)
        _posArray[i3 + 2] = imp.position.z + Math.sin(theta) * dist
        _opArray[particleIdx] = Math.max(0, 1 - age * 1.5)
        const shade = 0.4 + Math.random() * 0.3
        _colArray[i3] = shade
        _colArray[i3 + 1] = shade * 0.7
        _colArray[i3 + 2] = shade * 0.5
        particleIdx++
      }
    }

    const geo = geometry
    const pa = geo.attributes.position.array as Float32Array
    const oa = geo.attributes.opacity.array as Float32Array
    const ca = geo.attributes.color.array as Float32Array
    // Copy written portion to geometry arrays — subarray avoids allocation
    pa.set(_posArray.subarray(0, particleIdx * 3))
    oa.set(_opArray.subarray(0, particleIdx))
    ca.set(_colArray.subarray(0, particleIdx * 3))
    geo.attributes.position.needsUpdate = true
    geo.attributes.opacity.needsUpdate = true
    geo.attributes.color.needsUpdate = true
    geo.setDrawRange(0, particleIdx)
  })

  return (
    <group ref={groupRef} visible={false}>
      <points geometry={geometry} frustumCulled={false}>
        <pointsMaterial
          size={0.12}
          transparent
          opacity={0.6}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
          vertexColors
        />
      </points>
    </group>
  )
}

// ── Stamina system (module-level like HealthTracker) ───

const MAX_STAMINA = 100
let _stamina = MAX_STAMINA
let _lastStaminaUse = 0
const _STAMINA_DRAIN_RATE = 6
const _STAMINA_REGEN_RATE = 25

export function getStamina(): number { return _stamina }
export function getMaxStamina(): number { return MAX_STAMINA }

// ── Player Controller ──────────────────────────────────

/** How quickly the player accelerates to full speed (seconds) */
const ACCEL_TIME = 0.12
/** How quickly the player decelerates back to 0 (seconds) */
const DECEL_TIME = 0.08
/** How much camera rolls when strafing (radians) */
const STRAFE_TILT_AMOUNT = 0.03
/** How fast camera tilt returns to center */
const TILT_RETURN_SPEED = 4

export const PlayerController = () => {
  const { camera: rawCamera } = useThree()
  const camera = rawCamera as THREE.PerspectiveCamera
  const keys = useRef({ w: false, a: false, s: false, d: false, shift: false, space: false })
  const speedRef = useRef(PLAYER_SPEED)
  const wasGrounded = useRef(true)
  const sprintTimer = useRef(0)
  const forwardVec = useRef(new THREE.Vector3())
  const dashRef = useRef({ cooldown: 0, inProgress: false, progress: 0, startPos: new THREE.Vector3(), dir: new THREE.Vector3() })
  const jumpRef = useRef({ velocity: 0, isJumping: false, wasPressed: false })
  const jumpCooldown = useRef(0)

  // Movement smoothing state
  const moveX = useRef(0)
  const moveZ = useRef(0)
  const targetX = useRef(0)
  const targetZ = useRef(0)
  const cameraTilt = useRef(0)         // roll angle
  const currentFov = useRef(75)
  const targetFov = useRef(75)
  const defaultFov = useRef(75)
  const sprintFovTarget = useRef(75)
  const landingDip = useRef(0)
  const landingDipVelocity = useRef(0)
  const smoothDir = useRef(new THREE.Vector3())
  const smoothEuler = useRef(new THREE.Euler())

  // Store default FOV on first frame
  const initialized = useRef(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (key in keys.current) {
        ;(keys.current as Record<string, boolean>)[key] = e.type === 'keydown'
      }
      // Space → jump alone, or Shift+Space → dash
      if (key === ' ' && e.type === 'keydown' && !e.repeat) {
        const state = useStore.getState()
        if (keys.current.shift) {
          // Shift held → dash
          const dash = dashRef.current
          if (dash.inProgress) return
          if (performance.now() - dash.cooldown < 1500) return
          if (state.selectedBlockType !== null) return
          const dir = new THREE.Vector3()
        camera.getWorldDirection(dir)
        dir.y = 0
        if (dir.lengthSq() < 0.1) return
        dir.normalize()
        dash.dir.copy(dir)
        dash.startPos.copy(camera.position)
        dash.progress = 0
        dash.inProgress = true
        dash.cooldown = performance.now()
        window.dispatchEvent(new CustomEvent('dash-start'))
        // Schedule dash-ready event after cooldown
        setTimeout(() => window.dispatchEvent(new CustomEvent('dash-ready')), 1500)
        // Spawn burst particles at start
        spawnImpactParticles(new THREE.Vector3(camera.position.x, camera.position.y - 1.5, camera.position.z), 1.0)
        // FOV burst
        targetFov.current = 92
      }
      } else {
        // Space alone → jump (only when grounded, not building)
        const state = useStore.getState()
        if (!state.selectedBlockType && !jumpRef.current.isJumping) {
          const j = jumpRef.current
          if (performance.now() - jumpCooldown.current < 200) return
          j.velocity = 4.2 * (1 + getMountJumpBonus() / 100)
          j.isJumping = true
          j.wasPressed = true
          jumpCooldown.current = performance.now()
          // Small FOV punch on jump
          targetFov.current = Math.max(targetFov.current - 2, 70)
        }
      }
    }
    const onBlur = () => {
      keys.current = { w: false, a: false, s: false, d: false, shift: false, space: false }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
      window.removeEventListener('blur', onBlur)
    }
  }, [camera])

  // ── FOV punch listener ──
  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail
      if (d && d.amount) {
        targetFov.current += d.amount
        setTimeout(() => { targetFov.current -= d.amount }, d.duration || 200)
      }
    }
    window.addEventListener('fov-punch', handler)
    return () => window.removeEventListener('fov-punch', handler)
  }, [])

  useFrame((_, delta) => {
    // Store default FOV once
    if (!initialized.current) {
      defaultFov.current = camera.fov
      currentFov.current = camera.fov
      targetFov.current = camera.fov
      sprintFovTarget.current = camera.fov
      initialized.current = true
    }

    // Publish camera direction for compass (throttled)
    if (shouldTick(4)) {
      camera.getWorldDirection(forwardVec.current)
      publishCameraDirection(
        { x: forwardVec.current.x, z: forwardVec.current.z },
        { x: camera.position.x, z: camera.position.z },
      )
    }

    if (!document.pointerLockElement) return

    // Skip player movement when driving a vehicle
    if (isPlayerDriving()) return

    // Speed boost from haste upgrades
    const hasteLevel = useStore.getState().upgrades.haste
    const isSprinting = keys.current.shift
    const canSprint = _stamina > 5
    ;(window as any).__isSprinting = isSprinting && canSprint
    ;(window as any).__selectedBlockType = useStore.getState().selectedBlockType

    // ── Stamina drain / regen ──
    if (isSprinting && (keys.current.w || keys.current.s || keys.current.a || keys.current.d)) {
      _stamina = Math.max(0, _stamina - _STAMINA_DRAIN_RATE * delta)
      _lastStaminaUse = performance.now()
    } else {
      const timeSinceUse = performance.now() - _lastStaminaUse
      if (timeSinceUse > 200) {
        _stamina = Math.min(MAX_STAMINA, _stamina + _STAMINA_REGEN_RATE * delta)
      }
    }
    const sprintMult = (isSprinting && canSprint) ? 2.2 : 1
    const effectiveSpeed = PLAYER_SPEED * (1 + hasteLevel * 0.1) * (1 + getRelicSpeedBonus() + getCompanionSpeedBonus() + getMountSpeedBonus() / 100) * getAscensionSpeedBonus() * sprintMult
    speedRef.current = effectiveSpeed

    // Expose position for UI effects (speed lines, etc.)
    ;(window as any).__playerPos = { x: camera.position.x, z: camera.position.z }

    // ── Movement input (raw direction) ──
    let rawX = 0, rawZ = 0
    if (keys.current.w) rawZ -= 1
    if (keys.current.s) rawZ += 1
    if (keys.current.a) rawX -= 1
    if (keys.current.d) rawX += 1

    // Normalize diagonal movement
    const rawLen = Math.sqrt(rawX * rawX + rawZ * rawZ)
    if (rawLen > 0) {
      rawX /= rawLen
      rawZ /= rawLen
    }

    // ── Smooth acceleration / deceleration ──
    if (rawLen > 0) {
      targetX.current = rawX
      targetZ.current = rawZ
      const accelFactor = 1 - Math.exp(-delta / ACCEL_TIME)
      moveX.current += (targetX.current - moveX.current) * accelFactor
      moveZ.current += (targetZ.current - moveZ.current) * accelFactor
    } else {
      const decelFactor = 1 - Math.exp(-delta / DECEL_TIME)
      targetX.current = 0
      targetZ.current = 0
      moveX.current += (0 - moveX.current) * decelFactor
      moveZ.current += (0 - moveZ.current) * decelFactor
      // Snap to zero when very small
      if (Math.abs(moveX.current) < 0.001) moveX.current = 0
      if (Math.abs(moveZ.current) < 0.001) moveZ.current = 0
    }

    // ── Apply smoothed movement ──
    smoothDir.current.set(moveX.current, 0, moveZ.current)
    if (smoothDir.current.lengthSq() > 0.001) {
      smoothEuler.current.set(0, camera.rotation.y, 0)
      smoothDir.current.applyEuler(smoothEuler.current)
      camera.position.addScaledVector(smoothDir.current, effectiveSpeed * delta)

      // ── Camera tilt from strafe ──
      const strafeAmount = moveX.current // positive = right, negative = left
      const targetTilt = -strafeAmount * STRAFE_TILT_AMOUNT
      cameraTilt.current += (targetTilt - cameraTilt.current) * Math.min(1, delta * 6)
    } else {
      // Return tilt to center
      cameraTilt.current += (0 - cameraTilt.current) * Math.min(1, delta * TILT_RETURN_SPEED)
    }

    // ── Dash ──
    const dash = dashRef.current
    if (dash.inProgress) {
      dash.progress += delta / 0.2
      if (dash.progress >= 1) {
        dash.inProgress = false
        // Dash complete — burst particles
        spawnImpactParticles(new THREE.Vector3(camera.position.x, camera.position.y - 1.5, camera.position.z), 0.8)
        // Trail particles along dash path
        for (let i = 0; i < 3; i++) {
          const t = Math.random()
          const tx = dash.startPos.x + dash.dir.x * t * 8
          const tz = dash.startPos.z + dash.dir.z * t * 8
          spawnImpactParticles(new THREE.Vector3(tx, camera.position.y - 1.5, tz), 0.5)
        }
      } else {
        const eased = dash.progress < 0.5 ? 2 * dash.progress * dash.progress : 1 - Math.pow(-2 * dash.progress + 2, 2) / 2
        const dist = eased * 8
        camera.position.x = dash.startPos.x + dash.dir.x * dist
        camera.position.z = dash.startPos.z + dash.dir.z * dist
        // Ground snap during dash
        const terrainY = getWorldTerrainHeight(camera.position.x, camera.position.z)
        const blockY = getGroundHeightAt(camera.position.x, camera.position.z)
        const groundY = Math.max(terrainY, blockY)
        camera.position.y = groundY + PLAYER_EYE_HEIGHT
        // Spawn trail particles
        if (dash.progress > 0.1 && Math.random() < 3) {
          spawnImpactParticles(new THREE.Vector3(
            camera.position.x + (Math.random() - 0.5) * 1,
            groundY + 0.05,
            camera.position.z + (Math.random() - 0.5) * 1,
          ), 0.4)
        }
      }
    }

    // Apply camera roll
    camera.rotation.z = cameraTilt.current

    // ── Sprint FOV (stamina-aware) + Build Mode FOV ──
    const buildModeActive = useStore.getState().selectedBlockType !== null
    const buildFov = buildModeActive ? 82 : 0
    const fovBoost = (isSprinting && rawLen > 0 && canSprint) ? 86 : (defaultFov.current + Math.max(0, buildFov - defaultFov.current))
    const fovPinch = (!canSprint && isSprinting) ? 69 : 0 // exhaustion pinch
    sprintFovTarget.current = fovPinch || fovBoost
    targetFov.current += (sprintFovTarget.current - targetFov.current) * Math.min(1, delta * 5)
    currentFov.current += (targetFov.current - currentFov.current) * Math.min(1, delta * 8)
    camera.fov = currentFov.current
    camera.updateProjectionMatrix()

    // ── Jetpack check — skip ground snapping when jetpack active ──
    const jetActive = false

    // ── Ground height ──
    const terrainY = getWorldTerrainHeight(camera.position.x, camera.position.z)
    const blockY = getGroundHeightAt(camera.position.x, camera.position.z)
    const groundY = Math.max(terrainY, blockY)

    // ── Jump physics ──
    const j = jumpRef.current
    if (j.isJumping) {
      j.velocity += GRAVITY * delta
      camera.position.y += j.velocity * delta
      if (camera.position.y <= groundY + PLAYER_EYE_HEIGHT) {
        camera.position.y = groundY + PLAYER_EYE_HEIGHT
        j.isJumping = false
        j.velocity = 0
        // Soft landing particles
        if (j.wasPressed) {
          j.wasPressed = false
          spawnImpactParticles(new THREE.Vector3(camera.position.x, groundY + 0.05, camera.position.z), 0.5)
          triggerShake(0.08, 3, 0.15)
        }
      }
      // Skip normal ground snap while jumping
      landingDipVelocity.current = 0
      wasGrounded.current = false
      // Apply camera roll
      camera.rotation.z = cameraTilt.current
      // FOV
      camera.fov = currentFov.current
      camera.updateProjectionMatrix()
      return // Skip rest of ground handling
    }

    const wasFalling = !wasGrounded.current
    const isGrounded = camera.position.y <= groundY + PLAYER_EYE_HEIGHT + 0.01

    // ── Landing anticipation (dip camera before hitting ground) ──
    if (jetActive) {
      // Jetpack active — skip gravity, keep altitude
      landingDipVelocity.current = 0
      wasGrounded.current = false
    } else if (!isGrounded && camera.position.y > groundY + PLAYER_EYE_HEIGHT + 0.1) {
      landingDipVelocity.current += GRAVITY * delta
      wasGrounded.current = false
    } else {
      // LANDING
      if (wasFalling && landingDipVelocity.current < -0.5) {
        const impactIntensity = Math.min(1, Math.abs(landingDipVelocity.current) / 6)

        // Landing dip: quick camera drop and recovery
        landingDip.current = -0.08 * impactIntensity
        // This dip will be applied to camera Y and eased out

        // Spawn impact particles (landing burst)
        spawnImpactParticles(
          new THREE.Vector3(camera.position.x, groundY + 0.05, camera.position.z),
          impactIntensity,
        )
        // Camera shake scales with fall velocity
        triggerShake(impactIntensity * 0.35, 4 + impactIntensity * 2, 0.4)

        // Extra heavy landing FOV punch
        targetFov.current = defaultFov.current + impactIntensity * 6
      }
      landingDipVelocity.current = 0
      camera.position.y = groundY + PLAYER_EYE_HEIGHT + landingDip.current
      // Recover landing dip
      landingDip.current += (0 - landingDip.current) * Math.min(1, delta * 8)
      wasGrounded.current = true
    }

    // ── Sprint particle dust trail ──
    if (isGrounded && smoothDir.current.lengthSq() > 0.01 && isSprinting) {
      sprintTimer.current += delta
      if (sprintTimer.current > 0.08) {
        sprintTimer.current = 0
        const sx = camera.position.x + (Math.random() - 0.5) * 0.8
        const sz = camera.position.z + (Math.random() - 0.5) * 0.8
        spawnImpactParticles(
          new THREE.Vector3(sx, groundY + 0.05, sz),
          0.6 + Math.random() * 0.3,
        )
      }
      // Extra trail every 4th sprint particle (spawned mid-way between main particles)
      if (smoothDir.current.lengthSq() > 0.1 && Math.random() < delta * 3) {
        const tx = camera.position.x + (Math.random() - 0.5) * 1.2
        const tz = camera.position.z + (Math.random() - 0.5) * 1.2
        spawnImpactParticles(new THREE.Vector3(tx, groundY + 0.03, tz), 0.3)
      }
    } else {
      sprintTimer.current = 0
    }

    // ── Head bob (applied INSIDE ground snap to prevent micro-bounce) ──
    if (isGrounded && smoothDir.current.lengthSq() > 0.01) {
      const bobSpeed = 7 + speedRef.current * 1.8
      const bobTime = performance.now() * 0.001 * bobSpeed
      const speedFactor = Math.min(1, speedRef.current / PLAYER_SPEED)
      const bobAmp = 0.035 * speedFactor
      const bobAmpX = 0.008 * speedFactor
      // Only bob upward (abs sin) — never push below eye height
      const vertBob = Math.abs(Math.sin(bobTime)) * bobAmp
      const horzBob = Math.sin(bobTime * 0.5) * bobAmpX

      camera.position.y = groundY + PLAYER_EYE_HEIGHT + landingDip.current + vertBob
      camera.position.x += horzBob
    } else {
      // Ground snap without head bob
      camera.position.y = groundY + PLAYER_EYE_HEIGHT + landingDip.current
    }

    // Apply gravity + landing dip velocity
    camera.position.y += landingDipVelocity.current * delta
  })

  return <PointerLockControls />
}

// Looks up the topmost occupied block at (x, z) from the WorldBlockMap.
function getGroundHeightAt(x: number, z: number): number {
  const gx = Math.round(x)
  const gz = Math.round(z)
  const { blocks } = useStore.getState()
  let highest = 0
  for (const key of Object.keys(blocks)) {
    const [bx, by, bz] = key.split(',').map(Number)
    if (bx === gx && bz === gz) highest = Math.max(highest, by + 1)
  }
  return highest
}
