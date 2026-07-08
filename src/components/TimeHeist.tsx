import { useRef, useEffect, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { getInfiniteTerrainHeight } from '../world/chunkTerrain'
import { queueBurst, queueExplosion } from './HarvestVFX'
import { triggerShake } from '../hooks/useScreenShake'
import { useStore } from '../store'
import { glassPanelStrong, labelStyle, valueStyle } from '../utils/uiStyles'

// ── Module state ────────────────────────────────────
let _heistActive = false
let _heistEndTime = 0
let _heistTimer = 0
let _heistKills = 0
let _heistMultiplier = 1
let _heistPos = new THREE.Vector3(20, 0, 20)
let _heistSpawnTimer = 0

export function isHeistActive() { return _heistActive }
export function getHeistTimer() { return _heistTimer }
export function getHeistKills() { return _heistKills }
export function getHeistMultiplier() { return _heistMultiplier }

const HEIST_DURATION = 30
const HEIST_COOLDOWN = 120
const HEIST_RADIUS = 10

export function registerHeistKill() {
  if (!_heistActive) return
  _heistKills++
  _heistMultiplier = 1 + Math.min(9, Math.floor(_heistKills / 3))
}

// ── 3D Heist Portal ─────────────────────────────────
export const HeistPortal = () => {
  const meshRef = useRef<THREE.Mesh>(null)
  const wireRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const time = useRef(0)

  useFrame((_, delta) => {
    time.current += delta
    _heistSpawnTimer -= delta

    const cam = (useThree as any).getState().camera
    const playerPos = cam.position

    // Spawn portal when cooldown expires
    if (!_heistActive && _heistSpawnTimer <= 0) {
      const angle = Math.random() * Math.PI * 2
      const dist = 15 + Math.random() * 15
      _heistPos.set(
        playerPos.x + Math.cos(angle) * dist,
        0,
        playerPos.z + Math.sin(angle) * dist,
      )
      _heistPos.y = getInfiniteTerrainHeight(_heistPos.x, _heistPos.z)
    }

    if (!meshRef.current || !glowRef.current || !ringRef.current || !wireRef.current) return

    const portalY = _heistPos.y + 1

    // Position
    const targetPos = new THREE.Vector3(
      _heistPos.x,
      portalY + Math.sin(time.current * 0.5) * 0.3,
      _heistPos.z,
    )
    meshRef.current.position.lerp(targetPos, delta * 3)
    wireRef.current.position.copy(meshRef.current.position)
    ringRef.current.position.set(meshRef.current.position.x, meshRef.current.position.y - 0.5, meshRef.current.position.z)
    glowRef.current.position.set(meshRef.current.position.x, _heistPos.y + 0.05, meshRef.current.position.z)

    if (!_heistActive) {
      // Idle: float and pulse
      meshRef.current.rotation.y += delta * 0.5
      meshRef.current.rotation.x = Math.sin(time.current * 0.3) * 0.1
      const scale = 0.8 + Math.sin(time.current * 2) * 0.05
      meshRef.current.scale.setScalar(scale)
      wireRef.current.scale.setScalar(scale * 1.06)
      ;(meshRef.current.material as THREE.MeshBasicMaterial).opacity = 0.5 + Math.sin(time.current * 1.5) * 0.2
      ;(meshRef.current.material as THREE.MeshBasicMaterial).color.setHex(0xffcc44)

      // Check player proximity to start heist
      const dist = playerPos.distanceTo(new THREE.Vector3(_heistPos.x, 0, _heistPos.z))
      if (dist < HEIST_RADIUS) {
        _heistActive = true
        _heistEndTime = time.current + HEIST_DURATION
        _heistTimer = HEIST_DURATION
        _heistKills = 0
        _heistMultiplier = 1
        triggerShake(0.3, 4)
        queueExplosion(_heistPos.clone(), '#ffcc44', 'big')
      }
    } else {
      // Active: aggressive pulse
      const remaining = _heistEndTime - time.current
      _heistTimer = Math.max(0, remaining)

      meshRef.current.rotation.y += delta * 2
      const scale = 1 + Math.sin(time.current * 4) * 0.12
      meshRef.current.scale.setScalar(scale)
      wireRef.current.scale.setScalar(scale * 1.06)
      const mat = meshRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.9 + Math.sin(time.current * 6) * 0.1
      mat.color.setHSL(0.12 + Math.sin(time.current * 2) * 0.02, 1, 0.5)

      // End heist
      if (remaining <= 0) {
        _heistActive = false
        _heistSpawnTimer = HEIST_COOLDOWN
        triggerShake(0.5, 6)
        queueExplosion(_heistPos.clone(), '#ffcc44', 'big')
        setTimeout(() => queueExplosion(_heistPos.clone(), '#44ffcc', 'big'), 300)

        const rewardRaw = Math.floor(100 * _heistMultiplier)
        const rewardLiq = Math.floor(50 * _heistMultiplier)
        useStore.setState(s => ({
          inventory: {
            ...s.inventory,
            raw: Math.min(99999, s.inventory.raw + rewardRaw),
            liquid: Math.min(99999, s.inventory.liquid + rewardLiq),
          },
          renown: s.inventory.renown + Math.floor(20 * _heistMultiplier),
        }))
      }
    }

    // Ring
    ringRef.current.rotation.x = -Math.PI / 2
    const rp = _heistActive ? 1.5 : 1
    ringRef.current.scale.setScalar(rp + Math.sin(time.current * 2) * 0.1)
    ;(ringRef.current.material as THREE.MeshBasicMaterial).opacity = _heistActive ? 0.35 : 0.12

    // Ground glow
    ;(glowRef.current.material as THREE.MeshBasicMaterial).opacity = _heistActive ? 0.12 + Math.sin(time.current * 1.5) * 0.03 : 0.04
  })

  return (
    <group>
      <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3, 24]} />
        <meshBasicMaterial color="#ffcc44" transparent opacity={0.04} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[0.8, 1]} />
        <meshBasicMaterial color="#ffcc44" transparent opacity={0.5} />
      </mesh>
      <mesh ref={wireRef}>
        <icosahedronGeometry args={[0.85, 0]} />
        <meshBasicMaterial color="#ffcc44" transparent opacity={0.25} wireframe />
      </mesh>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.4, 1.7, 24]} />
        <meshBasicMaterial color="#ffcc44" transparent opacity={0.12} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  )
}

// ── Heist HUD Overlay ───────────────────────────────
export const HeistOverlay = () => {
  const [, refresh] = useState(0)

  useEffect(() => {
    const iv = setInterval(() => refresh(n => n + 1), 100)
    return () => clearInterval(iv)
  }, [])

  if (!_heistActive) return null

  const timer = Math.ceil(_heistTimer)
  const mult = _heistMultiplier
  const kills = _heistKills
  const urgency = timer <= 10 ? '#ff4444' : timer <= 20 ? '#ff8844' : '#ffcc44'

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 9998,
      pointerEvents: 'none',
      textAlign: 'center',
      fontFamily: 'monospace',
    }}>
      {/* Timer */}
      <div style={{
        fontSize: timer <= 10 ? 64 : 48,
        fontWeight: 900,
        color: urgency,
        textShadow: `0 0 40px ${urgency}44, 0 0 80px ${urgency}22`,
        animation: timer <= 10 ? 'countdown-flash 0.5s ease-in-out infinite' : 'none',
        letterSpacing: 4,
      }}>
        {timer}s
      </div>

      {/* Heist info */}
      <div className={glassPanelStrong} style={{
        marginTop: 16,
        padding: '12px 24px',
        display: 'inline-block',
        minWidth: 200,
      }}>
        <div className={labelStyle} style={{ color: '#ffcc44', fontSize: 10, marginBottom: 8 }}>
          ⚡ TIME HEIST ACTIVE
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24 }}>
          <div>
            <div className={labelStyle} style={{ color: '#667', fontSize: 8 }}>KILLS</div>
            <div className={valueStyle} style={{ color: '#bbc', fontSize: 14 }}>{kills}</div>
          </div>
          <div>
            <div className={labelStyle} style={{ color: '#667', fontSize: 8 }}>MULTIPLIER</div>
            <div className={valueStyle} style={{ color: '#ffcc44', fontSize: 14 }}>{mult.toFixed(1)}x</div>
          </div>
        </div>
        <div className={labelStyle} style={{ color: '#556', fontSize: 7, marginTop: 8 }}>
          Kill enemies to increase reward multiplier
        </div>
      </div>
    </div>
  )
}
