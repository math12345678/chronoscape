import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { getInfiniteTerrainHeight } from '../../world/chunkTerrain'
import { addVehicleTravel } from '../Quest/QuestGiver'
import { useStore } from '../../store'
import { queueBurst } from '../HarvestVFX'
import { setVehicleSpeedForUI } from '../UI/FuelGauge'
import { pushTrailPoint, clearTrail } from './VehicleTrail'
import { triggerShake } from '../../hooks/useScreenShake'
import {
  getVehicleSpeedBonus,
  getVehicleHandlingBonus,
  getVehicleBoostBonus,
  isRaceActive,
  tickRace,
  mashRaceButton,
  getBoostPickupBonus,
  setBoostPickupBonus,
} from './DragRace'

// ── Boost pickup state ────────────────────────────────
export let _boostPickupActive = false
let _boostPickupEndTime = 0
export function getBoostPickupActive() { return _boostPickupActive }
export function activateBoostPickup(durationMs = 4000) {
  _boostPickupActive = true
  _boostPickupEndTime = performance.now() + durationMs
}

// ── Config ─────────────────────────────────────────────
const BASE_SPEED = 14
const BOOST_SPEED = 24
const BOOST_DRAIN = 2
const FUEL_COST = 0.5
const HOVER_HEIGHT = 0.5
const DRIFT_FACTOR = 0.7
const TILT_AMOUNT = 0.15
const JUMP_FORCE = 5
const GRAVITY_VEHICLE = 12

let _vehicleActive = false
let _vehicleFuel = 100
let _vehiclePosition = new THREE.Vector3(0, 0, 0)
let _vehicleRotation = 0
let _vehicleSpeed = 0
let _driftAngle = 0
let _vehicleVerticalSpeed = 0
let _vehicleAirborne = false
let _jumpCooldown = 0

export function isVehicleActive(): boolean { return _vehicleActive }
export function getVehiclePosition(): THREE.Vector3 { return _vehiclePosition }
export function getVehicleRotation(): number { return _vehicleRotation }
export function getVehicleFuel(): number { return _vehicleFuel }
export function getVehicleSpeed(): number { return _vehicleSpeed }
export function isPlayerDriving(): boolean { return _vehicleActive }
export function isVehicleAirborne(): boolean { return _vehicleAirborne }

export const HoverVehicle = () => {
  const { camera } = useThree()
  const groupRef = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const exhaustRef = useRef<THREE.Mesh>(null)
  const forwardSpeed = useRef(0)
  const sideSpeed = useRef(0)
  const wasActive = useRef(false)
  const driftSmokeTimer = useRef(0)
  const initialFov = useRef(75)
  const camPos = useRef(new THREE.Vector3())
  const camLookAt = useRef(new THREE.Vector3())
  const camRoll = useRef(0)
  const justActivated = useRef(false)
  const wasAirborne = useRef(false)
  const wasBoosting = useRef(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'v' || e.key === 'V') {
        e.preventDefault()
        if (_vehicleActive) deactivateVehicle(camera)
        else {
          activateVehicle(camera)
          justActivated.current = true
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [camera])

  useFrame((_, delta) => {
    const cam = camera as THREE.PerspectiveCamera
    if (!_vehicleActive) {
      if (wasActive.current) {
        wasActive.current = false
        cam.fov = initialFov.current
        cam.updateProjectionMatrix()
      }
      if (groupRef.current) groupRef.current.visible = false
      return
    }
    wasActive.current = true
    if (!groupRef.current) return
    groupRef.current.visible = true

    const state = useStore.getState()
    const keys = getKeys()
    const isMoving = keys.w || keys.s
    const isTurning = keys.a || keys.d
    const boosting = keys.shift && isMoving && _vehicleFuel > 10

    // Fuel
    if (isMoving && _vehicleFuel > 0) {
      const burn = boosting ? FUEL_COST * 3 : FUEL_COST
      _vehicleFuel -= burn * delta
      if (state.inventory.liquid >= burn * delta * 0.1) {
        useStore.setState((s) => ({
          inventory: { ...s.inventory, liquid: Math.max(0, s.inventory.liquid - burn * delta * 0.1) },
        }))
      }
    } else if (!isMoving && _vehicleFuel < 100 && state.inventory.liquid >= 1) {
      _vehicleFuel = Math.min(100, _vehicleFuel + 15 * delta)
      useStore.setState((s) => ({
        inventory: { ...s.inventory, liquid: Math.max(0, s.inventory.liquid - 0.5 * delta) },
      }))
    }

    // Boost drain
    if (boosting) {
      _vehicleFuel -= BOOST_DRAIN * delta
    }

    // Boost pickup timer check
    if (_boostPickupActive && performance.now() > _boostPickupEndTime) {
      _boostPickupActive = false
    }

    // DragRace bonuses
    const speedBonus = 1 + getVehicleSpeedBonus() * 0.05
    const handlingBonus = 1 + getVehicleHandlingBonus()
    const boostBonus = 1 + getVehicleBoostBonus()

    // Acceleration
    const maxSpeed = ((boosting || _boostPickupActive) ? BOOST_SPEED : BASE_SPEED) * speedBonus
    const accel = boosting ? 12 : 8
    const decel = 10
    const targetForward = keys.w ? 1 : keys.s ? -0.6 : 0
    forwardSpeed.current += (targetForward - forwardSpeed.current) * (targetForward !== 0 ? accel : decel) * delta

    // Steering — slower at high speed, faster at low
    const steerRate = (2.5 - Math.abs(forwardSpeed.current) * 0.06) * handlingBonus
    const targetTurn = keys.d ? 1 : keys.a ? -1 : 0
    _vehicleRotation += targetTurn * Math.max(0.5, steerRate) * delta

    // Drift: side speed when turning at speed
    const driftTarget = (isTurning && Math.abs(forwardSpeed.current) > 0.3) ? targetTurn * forwardSpeed.current * DRIFT_FACTOR : 0
    sideSpeed.current += (driftTarget - sideSpeed.current) * 4 * delta
    _driftAngle = sideSpeed.current * 0.3

    // Movement
    const speed = Math.abs(forwardSpeed.current)
    _vehicleSpeed = speed * maxSpeed
    setVehicleSpeedForUI(_vehicleSpeed)
    const moveX = (Math.sin(_vehicleRotation) * forwardSpeed.current * maxSpeed + Math.cos(_vehicleRotation) * sideSpeed.current) * delta
    const moveZ = (Math.cos(_vehicleRotation) * forwardSpeed.current * maxSpeed - Math.sin(_vehicleRotation) * sideSpeed.current) * delta
    _vehiclePosition.x += moveX
    _vehiclePosition.z += moveZ

    const dist = Math.sqrt(moveX * moveX + moveZ * moveZ)
    if (dist > 0.01) addVehicleTravel(dist * 3)

    // Jump (Q key for jump, separate from brake)
    _jumpCooldown -= delta
    if (keys.q && _jumpCooldown <= 0 && !_vehicleAirborne) {
      _vehicleVerticalSpeed = JUMP_FORCE
      _vehicleAirborne = true
      _jumpCooldown = 0.5
      queueBurst(_vehiclePosition.clone(), 6, '#88ddff', 2)
    }

    // Gravity while airborne
    if (_vehicleAirborne) {
      _vehicleVerticalSpeed -= GRAVITY_VEHICLE * delta
    }

    // Terrain
    const terrainY = getInfiniteTerrainHeight(_vehiclePosition.x, _vehiclePosition.z)
    const targetY = terrainY + HOVER_HEIGHT

    if (_vehicleAirborne) {
      _vehiclePosition.y += _vehicleVerticalSpeed * delta
      if (_vehiclePosition.y <= targetY) {
        _vehiclePosition.y = targetY
        _vehicleVerticalSpeed = 0
        _vehicleAirborne = false
        queueBurst(_vehiclePosition.clone(), 4, '#66ffcc', 1)
      }
    } else {
      _vehiclePosition.y = targetY
    }

    // Mesh transform
    groupRef.current.position.copy(_vehiclePosition)
    groupRef.current.rotation.y = _vehicleRotation

    // Body tilt
    if (bodyRef.current) {
      const tiltZ = _vehicleAirborne ? 0.1 : (-targetTurn * TILT_AMOUNT * Math.min(1, speed / 0.8))
      const tiltX = _vehicleAirborne ? 0.15 : (-Math.sin(performance.now() * 0.005) * 0.02 * speed)
      bodyRef.current.rotation.z = tiltZ * 0.5
      bodyRef.current.rotation.x = tiltX
    }

    // Hover bob (disabled while airborne)
    if (!_vehicleAirborne) {
      const hoverBob = Math.sin(performance.now() * 0.003 + speed * 2) * (0.03 + speed * 0.02)
      groupRef.current.position.y += hoverBob
    }

    // ── Third-person chase camera ──
    // Forward unit vector matches the movement basis used above (sin, 0, cos).
    const fwdX = Math.sin(_vehicleRotation)
    const fwdZ = Math.cos(_vehicleRotation)
    const chaseDistance = 3.4 + speed * 1.1
    const chaseHeight = 1.5 + speed * 0.35 + (_vehicleAirborne ? 0.6 : 0)
    const desiredX = _vehiclePosition.x - fwdX * chaseDistance
    const desiredY = _vehiclePosition.y + chaseHeight
    const desiredZ = _vehiclePosition.z - fwdZ * chaseDistance

    if (justActivated.current) {
      // Snap instantly on entry so there's no first-frame sweep across the map
      camPos.current.set(desiredX, desiredY, desiredZ)
      camLookAt.current.copy(_vehiclePosition)
      camRoll.current = 0
      justActivated.current = false
    } else {
      const posLerp = 1 - Math.exp(-8 * delta)
      camPos.current.x += (desiredX - camPos.current.x) * posLerp
      camPos.current.y += (desiredY - camPos.current.y) * posLerp
      camPos.current.z += (desiredZ - camPos.current.z) * posLerp
    }
    cam.position.copy(camPos.current)

    // Look slightly ahead of the vehicle in its direction of travel, biased up a touch
    const lookAheadX = _vehiclePosition.x + fwdX * 4
    const lookAheadZ = _vehiclePosition.z + fwdZ * 4
    const lookAheadY = _vehiclePosition.y + 0.4
    const lookLerp = 1 - Math.exp(-10 * delta)
    camLookAt.current.x += (lookAheadX - camLookAt.current.x) * lookLerp
    camLookAt.current.y += (lookAheadY - camLookAt.current.y) * lookLerp
    camLookAt.current.z += (lookAheadZ - camLookAt.current.z) * lookLerp
    cam.lookAt(camLookAt.current)

    // Bank the camera into drifts/turns for an arcade racer feel
    const targetRoll = THREE.MathUtils.clamp(-sideSpeed.current * 0.35, -0.35, 0.35)
    camRoll.current += (targetRoll - camRoll.current) * Math.min(1, delta * 6)
    cam.rotateZ(camRoll.current)

    // FOV shift — punches out with speed, snappier under boost
    const targetFov = initialFov.current + speed * 9 + (boosting ? 6 : 0)
    cam.fov += (targetFov - cam.fov) * Math.min(1, delta * 6)
    cam.updateProjectionMatrix()

    // Impact feedback: landing thump + boost kick
    if (wasAirborne.current && !_vehicleAirborne) {
      triggerShake(0.18, 8, 0.25)
    }
    wasAirborne.current = _vehicleAirborne
    if (boosting && !wasBoosting.current) {
      triggerShake(0.12, 10, 0.2)
    }
    wasBoosting.current = boosting

    // Deceleration
    if (!isMoving) {
      forwardSpeed.current *= (1 - decel * delta * 3)
      sideSpeed.current *= (1 - decel * delta * 3)
      if (Math.abs(forwardSpeed.current) < 0.01) forwardSpeed.current = 0
      if (Math.abs(sideSpeed.current) < 0.01) sideSpeed.current = 0
    }

    // Glow & body color
    if (glowRef.current) {
      const intensity = 0.3 + speed * 0.5
      ;(glowRef.current.material as THREE.MeshBasicMaterial).opacity = Math.min(0.4, intensity * 0.15)
      const glowColor = boosting || _boostPickupActive ? '#ff8844' : _vehicleAirborne ? '#66ffcc' : '#4488ff'
      ;(glowRef.current.material as THREE.MeshBasicMaterial).color.set(glowColor)
    }
    if (bodyRef.current) {
      const mat = bodyRef.current.material as THREE.MeshStandardMaterial
      const bodyColor = boosting || _boostPickupActive ? '#ff7722' : _vehicleAirborne ? '#44ddaa' : '#336688'
      mat.color.set(bodyColor)
      mat.emissive.set(_boostPickupActive ? '#ff8800' : boosting ? '#ff6611' : _vehicleAirborne ? '#44ddaa' : '#4488cc')
      mat.emissiveIntensity = _boostPickupActive ? 0.6 : boosting ? 0.5 : _vehicleAirborne ? 0.3 : 0.1
    }

    // Exhaust particles
    if (isMoving && exhaustRef.current) {
      driftSmokeTimer.current += delta
      if (driftSmokeTimer.current > 0.08) {
        driftSmokeTimer.current = 0
        const backDir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), _vehicleRotation)
        const exhaustPos = _vehiclePosition.clone().add(backDir.multiplyScalar(0.8))
        exhaustPos.y += 0.05
        queueBurst(exhaustPos, 3, boosting ? '#ff8844' : '#88ccff', 1.5)
      }
    }

    // Emergency brake — also mash race button during DragRace
    if (keys.space && isMoving) {
      forwardSpeed.current *= (1 - 8 * delta)
      sideSpeed.current *= (1 - 8 * delta)
      queueBurst(_vehiclePosition.clone(), 8, '#ffaa44', 3)
      if (isRaceActive()) mashRaceButton()
    }

    // Tick drag race each frame
    tickRace(delta)

    // Trail
    if (isMoving && speed > 0.3) {
      const trailColor = boosting || _boostPickupActive ? '#ff8844' : _vehicleAirborne ? '#66ffcc' : '#44ccff'
      pushTrailPoint(_vehiclePosition, trailColor)
    }
  })

  return (
    <group ref={groupRef} visible={false}>
      <mesh ref={bodyRef} castShadow>
        <boxGeometry args={[0.9, 0.18, 1.6]} />
        <meshStandardMaterial color="#336688" roughness={0.2} metalness={0.7} emissive="#4488cc" emissiveIntensity={0.1} />
      </mesh>
      <mesh position={[0, 0.18, -0.3]}>
        <sphereGeometry args={[0.28, 8, 8]} />
        <meshStandardMaterial color="#66aacc" roughness={0.1} metalness={0.3} transparent opacity={0.5} />
      </mesh>
      {/* Wing fins */}
      <mesh position={[-0.5, 0.05, 0]} rotation={[0, 0, -0.3]}>
        <boxGeometry args={[0.05, 0.3, 0.8]} />
        <meshStandardMaterial color="#225577" roughness={0.3} metalness={0.5} />
      </mesh>
      <mesh position={[0.5, 0.05, 0]} rotation={[0, 0, 0.3]}>
        <boxGeometry args={[0.05, 0.3, 0.8]} />
        <meshStandardMaterial color="#225577" roughness={0.3} metalness={0.5} />
      </mesh>
      {/* Tail fin */}
      <mesh position={[0, 0.2, 0.8]}>
        <boxGeometry args={[0.02, 0.35, 0.25]} />
        <meshStandardMaterial color="#225577" roughness={0.3} metalness={0.5} />
      </mesh>
      {/* Hover glow */}
      <mesh ref={glowRef} position={[0, -0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.7, 16]} />
        <meshBasicMaterial color="#4488ff" transparent opacity={0.12} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* Engine exhaust glow */}
      <mesh ref={exhaustRef} position={[0, -0.05, -0.85]}>
        <circleGeometry args={[0.1, 8]} />
        <meshBasicMaterial color="#88ccff" transparent opacity={0.6} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* Weapon cannons — fire along +Z (vehicle forward) */}
      <mesh position={[-0.25, 0.12, 0.7]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.06, 0.2, 6]} />
        <meshStandardMaterial color="#225577" roughness={0.3} metalness={0.7} />
      </mesh>
      <mesh position={[-0.25, 0.12, 0.8]}>
        <sphereGeometry args={[0.045, 6, 6]} />
        <meshStandardMaterial color="#44aaff" emissive="#44aaff" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0.25, 0.12, 0.7]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.06, 0.2, 6]} />
        <meshStandardMaterial color="#225577" roughness={0.3} metalness={0.7} />
      </mesh>
      <mesh position={[0.25, 0.12, 0.8]}>
        <sphereGeometry args={[0.045, 6, 6]} />
        <meshStandardMaterial color="#44aaff" emissive="#44aaff" emissiveIntensity={0.4} />
      </mesh>
    </group>
  )
}

function activateVehicle(camera: THREE.Camera) {
  _vehicleActive = true
  _vehicleFuel = 100
  _vehiclePosition.set(camera.position.x, 0, camera.position.z)
  _vehicleSpeed = 0
  _driftAngle = 0
}

function deactivateVehicle(camera: THREE.Camera) {
  _vehicleActive = false
  const pCam = camera as THREE.PerspectiveCamera
  pCam.position.set(_vehiclePosition.x, _vehiclePosition.y + 1.4, _vehiclePosition.z)
  pCam.fov = 75
  pCam.updateProjectionMatrix()
}

let _vehicleKeys: Record<string, boolean> = { w: false, a: false, s: false, d: false, shift: false, space: false, q: false }
function getKeys() { return _vehicleKeys }

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase()
    if (k === 'shift') { _vehicleKeys.shift = true; return }
    if (k === ' ') { _vehicleKeys.space = true; return }
    if (k in _vehicleKeys && _vehicleActive) _vehicleKeys[k] = true
  })
  window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase()
    if (k === 'shift') { _vehicleKeys.shift = false; return }
    if (k === ' ') { _vehicleKeys.space = false; return }
    if (k in _vehicleKeys) _vehicleKeys[k] = false
  })
  window.addEventListener('blur', () => {
    _vehicleKeys = { w: false, a: false, s: false, d: false, shift: false, space: false, q: false }
  })
}
