import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { getInfiniteTerrainHeight } from '../world/chunkTerrain'
import { useStore } from '../store'
import { createProjectile, activeProjectiles } from './Combat/ProjectileSystem'

// ── Module-state ────────────────────────────────────
let _hired = true // Auto-hired at game start
let _npcPos = new THREE.Vector3(0, 0, 0)
let _targetEnemy: THREE.Vector3 | null = null
let _lastShot = 0

export function isNPCHired() { return _hired }
export function getNPCPos() { return _npcPos }
export function hireNPC() { _hired = true }
export function releaseNPC() { _hired = false }

const FOLLOW_DIST = 4
const ENEMY_RANGE = 12

// ── Enemy positions lookup (written from HostileEnemyManager) ──
let _enemyPositions: THREE.Vector3[] = []
export function setNPCTargetEnemies(poses: THREE.Vector3[]) { _enemyPositions = poses }

// ── React component ─────────────────────────────────
export const NPCFollower = () => {
  const groupRef = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Mesh>(null)
  const laserRef = useRef<THREE.Mesh>(null)
  const time = useRef(0)

  useFrame((_, delta) => {
    time.current += delta
    if (!_hired || !groupRef.current) return

    const cam = (useThree as any).getState().camera
    const playerPos = new THREE.Vector3()
    cam.getWorldPosition(playerPos)

    // Find nearest enemy
    let nearestDist = Infinity
    _targetEnemy = null
    for (const ep of _enemyPositions) {
      const d = playerPos.distanceTo(ep)
      if (d < ENEMY_RANGE && d < nearestDist) {
        nearestDist = d
        _targetEnemy = ep.clone()
      }
    }

    const targetPos = new THREE.Vector3()
    if (_targetEnemy) {
      // Position between player and enemy
      targetPos.copy(playerPos).add(_targetEnemy.clone().sub(playerPos).normalize().multiplyScalar(FOLLOW_DIST))
    } else {
      // Follow behind player
      const dir = new THREE.Vector3()
      cam.getWorldDirection(dir)
      targetPos.copy(playerPos).add(dir.clone().multiplyScalar(-FOLLOW_DIST))
    }

    // Clamp to terrain
    const terrainY = getInfiniteTerrainHeight(targetPos.x, targetPos.z)
    targetPos.y = terrainY + 1.5

    // Smooth movement
    groupRef.current.position.lerp(targetPos, delta * 3)

    // Face target or enemy
    const lookTarget = _targetEnemy || playerPos
    const lookDir = new THREE.Vector3().subVectors(lookTarget, groupRef.current.position)
    if (lookDir.length() > 0.1) {
      const angle = Math.atan2(lookDir.x, lookDir.z)
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, angle, delta * 5)
    }

    // Bob
    if (bodyRef.current) {
      bodyRef.current.position.y = Math.sin(time.current * 2) * 0.08
    }

    // Shoot at enemy — fires actual projectile
    if (_targetEnemy && performance.now() - _lastShot > 500) {
      _lastShot = performance.now()
      if (laserRef.current) {
        laserRef.current.visible = true
        setTimeout(() => { if (laserRef.current) laserRef.current.visible = false }, 50)
      }
      const projPos = groupRef.current.position.clone()
      projPos.y += 0.8
      const projDir = new THREE.Vector3().subVectors(_targetEnemy, projPos).normalize()
      const proj = createProjectile(projPos, projDir, 'energyPistol')
      if (proj) {
        proj.damage = Math.round(proj.damage * 0.5)
        activeProjectiles.push(proj)
      }
    }

    // Update position
    _npcPos.copy(groupRef.current.position)
  })

  if (!_hired) return null

  return (
    <group ref={groupRef} position={[5, 0, 5]}>
      {/* Glow ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[0.5, 0.7, 16]} />
        <meshBasicMaterial color="#4488ff" transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Body */}
      <mesh ref={bodyRef} position={[0, 0.5, 0]}>
        <capsuleGeometry args={[0.3, 0.5, 4, 8]} />
        <meshStandardMaterial color="#224488" metalness={0.6} roughness={0.4} emissive="#4488ff" emissiveIntensity={0.15} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1, 0]}>
        <sphereGeometry args={[0.2, 12, 12]} />
        <meshStandardMaterial color="#4488ff" metalness={0.8} roughness={0.2} emissive="#4488ff" emissiveIntensity={0.3} />
      </mesh>

      {/* Eye */}
      <mesh position={[0, 1, 0.2]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* Laser pointer */}
      <mesh ref={laserRef} position={[0, 0.8, 0.3]} visible={false}>
        <cylinderGeometry args={[0.01, 0.01, 1, 4]} />
        <meshBasicMaterial color="#ff4488" transparent opacity={0.6} />
      </mesh>
    </group>
  )
}
