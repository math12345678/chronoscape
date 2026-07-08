import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GEAR } from '../../config/economy'
import type { GearId } from '../../config/economy'
import { useStore } from '../../store'

// ── Module-level gear state ────────────────────────────
let _unlockedGear: Set<GearId> = new Set()
let _activeGear: GearId | null = null
let _jetpackActive = false
let _shieldActive = false
let _shieldHealth = 50

export function isGearUnlocked(id: GearId): boolean { return _unlockedGear.has(id) }
export function unlockGear(id: GearId): void { _unlockedGear.add(id) }
export function getActiveGear(): GearId | null { return _activeGear }
export function isJetpackActive(): boolean { return _jetpackActive }
export function getShieldHealth(): number { return _shieldHealth }

/** Cycle active gear — press G */
export function cycleGear(dir: 1 | -1): GearId | null {
  const gearIds: GearId[] = ['jetpack', 'energyShield', 'speedBoots']
  const unlocked = gearIds.filter(id => _unlockedGear.has(id))
  if (unlocked.length === 0) return null

  const currentIdx = unlocked.indexOf(_activeGear!)
  const nextIdx = (currentIdx + dir + unlocked.length) % unlocked.length
  _activeGear = unlocked[nextIdx]
  return _activeGear
}

import { isChronoShieldActive } from '../../skills/ChronoSKills'
import { triggerShieldFlash } from '../SkillVFX'

/** Called when shield absorbs a hit. Returns true if damage blocked. */
export function tryBlockDamage(amount: number): boolean {
  if (isChronoShieldActive()) { triggerShieldFlash(); return true }

  if (!_unlockedGear.has('energyShield') || _activeGear !== 'energyShield') return false
  const state = useStore.getState()
  if (state.inventory.vapour < 3) return false

  useStore.setState((s) => ({
    inventory: { ...s.inventory, vapour: Math.max(0, s.inventory.vapour - 3) },
  }))
  _shieldHealth = Math.max(0, _shieldHealth - amount * 0.5)
  if (_shieldHealth < 50) _shieldHealth = Math.min(50, _shieldHealth + 1)
  return true
}

/**
 * Time Gear system — manages jetpack, shield, speed boots.
 * Renders visual effects for each active gear.
 */
export const TimeGearManager = () => {
  const { camera } = useThree()
  const jetpackFlameRef = useRef<THREE.Mesh>(null)
  const shieldMeshRef = useRef<THREE.Mesh>(null)
  const speedTrailRef = useRef<THREE.Mesh>(null)


  // Global key handler for gear activation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!document.pointerLockElement) return

      // G to cycle gear
      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault()
        cycleGear(1)
        return
      }

      // Space to activate jetpack (when equipped)
      if ((e.key === ' ' || e.code === 'Space') && _activeGear === 'jetpack' && _unlockedGear.has('jetpack')) {
        e.preventDefault()
        _jetpackActive = e.type === 'keydown'
      }
    }
    window.addEventListener('keydown', handleKey)
    window.addEventListener('keyup', handleKey)
    return () => {
      window.removeEventListener('keydown', handleKey)
      window.removeEventListener('keyup', handleKey)
    }
  }, [])

  useFrame((_, delta) => {
    const state = useStore.getState()

    // ── Jetpack ──
    if (_activeGear === 'jetpack' && _unlockedGear.has('jetpack') && _jetpackActive) {
      const cost = GEAR.jetpack.costPerSecond * delta
      if (state.inventory.liquid >= cost) {
        // Lift player
        camera.position.y += 5 * delta

        // Consume fuel
        useStore.setState((s) => ({
          inventory: { ...s.inventory, liquid: Math.max(0, s.inventory.liquid - cost) },
        }))

        // Jetpack flame visual
        if (jetpackFlameRef.current) {
          jetpackFlameRef.current.visible = true
          jetpackFlameRef.current.position.set(
            camera.position.x,
            camera.position.y - 0.3,
            camera.position.z,
          )
          const scale = 0.3 + Math.sin(performance.now() * 0.02) * 0.1
          jetpackFlameRef.current.scale.set(scale, scale * 2, scale)
        }
      } else {
        _jetpackActive = false
        if (jetpackFlameRef.current) jetpackFlameRef.current.visible = false
      }
    } else {
      if (jetpackFlameRef.current) jetpackFlameRef.current.visible = false
    }

    // ── Energy Shield ──
    if (_activeGear === 'energyShield' && _unlockedGear.has('energyShield') && shieldMeshRef.current) {
      shieldMeshRef.current.visible = true
      shieldMeshRef.current.position.set(
        camera.position.x,
        camera.position.y - 0.3,
        camera.position.z,
      )

      // Pulse effect
      const bob = Math.sin(performance.now() * 0.003) * 0.02
      shieldMeshRef.current.position.y += bob
      ;(shieldMeshRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.08 + Math.sin(performance.now() * 0.002) * 0.04

      // Shield health indicator (color changes as shield depletes)
      const healthPct = _shieldHealth / 50
      ;(shieldMeshRef.current.material as THREE.MeshBasicMaterial).color.setHSL(
        0.55 - healthPct * 0.2, 1, 0.4,
      )
    } else if (shieldMeshRef.current) {
      shieldMeshRef.current.visible = false
    }

    // ── Speed Boots ──
    if (_activeGear === 'speedBoots' && _unlockedGear.has('speedBoots')) {
      const speedCost = GEAR.speedBoots.costPerSecond * delta
      // The PlayerController reads the sprint multiplier from upgrades, but we can
      // apply a passive boost here by modifying the player's effective speed.
      // We'll store the active gear in a module-level variable for PlayerController to read.
    }

    // ── Speed trail visual ──
    if (speedTrailRef.current) {
      speedTrailRef.current.visible = _activeGear === 'speedBoots' && _unlockedGear.has('speedBoots')
      if (speedTrailRef.current.visible) {
        speedTrailRef.current.position.set(
          camera.position.x,
          camera.position.y - 0.1,
          camera.position.z,
        )
      }
    }
  })

  return (
    <group>
      {/* Jetpack flame — 3D cone mesh */}
      <mesh ref={jetpackFlameRef} visible={false}>
        <coneGeometry args={[0.1, 0.3, 6]} />
        <meshBasicMaterial color="#44ffcc" transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* Energy shield — translucent sphere */}
      <mesh ref={shieldMeshRef} visible={false}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial color="#44aaff" transparent opacity={0.1} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Speed boots trail */}
      <mesh ref={speedTrailRef} visible={false}>
        <ringGeometry args={[0.15, 0.3, 12]} />
        <meshBasicMaterial color="#ffaa44" transparent opacity={0.15} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
