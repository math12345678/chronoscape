import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'
import { getNPCs } from './NPC/NPCTick'
import { forceNPCRender } from './NPC/NPCSpawner'
import type { InteractionTarget } from '../store'
import { HARVEST_AMOUNT } from '../config/constants'
import { handleRiftClick } from '../world/riftManager'
import { playHarvestSound, playClickSound, playGiftSound } from '../utils/audio'
import { queueBurst } from './HarvestVFX'
import { harvestNode } from '../world/oreGeneration'
import type { ResourceNode } from '../world/oreGeneration'
import { fireProjectile, cycleWeapon } from './Combat/ProjectileSystem'
import { isPlayerDriving } from './Vehicles/HoverVehicle'
import { getEquippedWeapon } from './Combat/HostileEnemyManager'
import { playRefineSound } from '../utils/audio'
import { getRelicHarvestBonus, getRelicDoubleHarvestChance } from '../systems/RelicForging'

// Import the shared WORLD_NODES instance from ResourceNode.tsx
// to avoid duplicating the terrain generation calls
import { WORLD_NODES } from './ResourceNode'
import { triggerFancyRiftHarvest } from './TimeRift'
import { setTimeScaleTarget } from './TimeManager'
import { triggerShake } from '../hooks/useScreenShake'

/**
 * Global DOM-level click handler that works RELIABLY even when R3F's event
 * system breaks under pointer lock.
 *
 * Strategy:
 * - The InteractionScanner already raycasts from screen center every frame and
 *   writes the target to the Zustand store.
 * - This component adds a real DOM `mousedown` listener on the window so it
 *   fires even when pointer is locked.
 * - On left-click, it reads the current interactionTarget from the store and
 *   dispatches the appropriate game action.
 * - On right-click, it handles gifting resources to follower NPCs.
 *
 * Every interactable action is handled here as a reliable fallback.
 */
// Harvest cooldown to prevent infinite-time exploit when R3F events fail
const RIFT_HARVEST_COOLDOWN = 300 // ms
// Module-level cooldown tracker (handleLeftClick is at module scope, can't access refs)
let lastHarvestTime = 0

export const InteractionHandler = () => {
  const lastClickTime = useRef(0)
  const { camera } = useThree()

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      // Only handle clicks while pointer is locked (R3F events work otherwise)
      if (!document.pointerLockElement) return

      const target = useStore.getState().interactionTarget
      if (!target) return

      // Debounce rapid clicks (100ms)
      const now = Date.now()
      if (now - lastClickTime.current < 100) return
      lastClickTime.current = now

      // ── Left Click (button 0) ──
      if (e.button === 0) {
        // While driving, always fire (regardless of target)
        if (isPlayerDriving()) {
          fireProjectile()
        } else {
          handleLeftClick(target, camera)
        }
      }

      // ── Right Click (button 2) ──
      if (e.button === 2) {
        handleRightClick(target, camera)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!document.pointerLockElement) return

      // Shift+R — quick-refine all raw into liquid (2 raw → 1 liquid)
      if ((e.key === 'R' || e.key === 'r') && e.shiftKey) {
        e.preventDefault()
        const state = useStore.getState()
        const maxAfford = Math.floor(state.inventory.raw / 2)
        if (maxAfford > 0 && state.refine('liquid', maxAfford)) {
          playRefineSound()
          // Screen shake for satisfaction
          triggerShake(0.08, 4, 0.1)
          // Toast for large refinements
          if (maxAfford >= 10) {
            window.dispatchEvent(new CustomEvent('toast-event', {
              detail: {
                title: `⟡ Refined ${maxAfford} Flux`,
                description: `Converted ${maxAfford * 2} Epoch into ${maxAfford} Flux`,
                color: '#4488ff',
                icon: '≈',
              },
            }))
          }
        }
        return
      }
    }

    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('keydown', handleKeyDown)
    // Prevent context menu when right-clicking in-game
    const preventCtx = (e: Event) => e.preventDefault()
    document.addEventListener('contextmenu', preventCtx)

    return () => {
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('contextmenu', preventCtx)
    }
  }, [camera])

  return null
}

// ── Harvest Combo System ───────────────────────────────
let _combo = 0
let _comboLastTime = 0
const COMBO_TIMEOUT = 2000 // ms after last harvest to reset combo
let _comboResetTimer: ReturnType<typeof setTimeout> | null = null

function getComboMultiplier(): number {
  if (_combo <= 0) return 1
  return Math.min(3, 1 + _combo * 0.25)
}

function advanceCombo() {
  const prevCombo = _combo
  _combo++
  _comboLastTime = Date.now()
  if (_comboResetTimer) clearTimeout(_comboResetTimer)
  _comboResetTimer = setTimeout(() => {
    _combo = 0
    window.dispatchEvent(new CustomEvent('combo-update', { detail: { combo: 0, multiplier: 1 } }))
  }, COMBO_TIMEOUT)

  // Screen flash at every combo step for immediate feedback
  if (_combo >= 2) {
    const flash = document.createElement('div')
    const intensity = Math.min(0.08 + _combo * 0.02, 0.3)
    flash.style.cssText = `position:fixed;inset:0;background:radial-gradient(ellipse at 50% 50%, rgba(68,255,204,${intensity}) 0%, transparent 70%);pointer-events:none;z-index:9999;transition:opacity 0.15s ease-out`
    document.body.appendChild(flash)
    const opacity = Math.min(0.6 + _combo * 0.05, 1)
    flash.style.opacity = String(opacity)
    setTimeout(() => { flash.style.opacity = '0'; setTimeout(() => { if (flash.parentNode) flash.parentNode.removeChild(flash) }, 200) }, 80)
  }

  // Time Surge at x3, x5, x10, x15 combo (now starts at x3 instead of x5)
  if (_combo >= 3 && _combo % 2 === 1 && prevCombo < _combo) {
    const surgeAmount = _combo * 8
    useStore.getState().addRaw(surgeAmount)
    useStore.getState().addRenown(1)
    setTimeScaleTarget(0.1)
    setTimeout(() => setTimeScaleTarget(1.0), 300)
    triggerShake(0.5, 10, 0.3, { freqX: _combo >= 10 ? 60 : 40, freqY: _combo >= 10 ? 50 : 30 }, true)
    window.dispatchEvent(new CustomEvent('time-surge'))
    window.dispatchEvent(new CustomEvent('toast-event', {
      detail: {
        title: `✦ SURGE x${_combo} ✦`,
        description: `+${surgeAmount} Epoch · +1 Renown`,
        color: _combo >= 7 ? '#ff44ff' : _combo >= 5 ? '#ff8844' : '#44ffcc',
        icon: '⟐',
      },
    }))
    // Bigger DOM flash at surge
    const flash = document.createElement('div')
    flash.style.cssText = `position:fixed;inset:0;background:radial-gradient(ellipse at 50% 50%, rgba(68,255,204,0.25) 0%, rgba(68,255,204,0.1) 40%, transparent 70%);pointer-events:none;z-index:99999;transition:opacity 0.3s ease-out`
    document.body.appendChild(flash)
    requestAnimationFrame(() => { flash.style.opacity = '1' })
    setTimeout(() => { flash.style.opacity = '0'; setTimeout(() => { if (flash.parentNode) flash.parentNode.removeChild(flash) }, 300) }, 150)

    // FOV punch — camera zooms out briefly
    const punchAmount = _combo >= 7 ? 12 : _combo >= 5 ? 8 : 6
    const punchDuration = _combo >= 7 ? 300 : _combo >= 5 ? 250 : 200
    window.dispatchEvent(new CustomEvent('fov-punch', { detail: { amount: punchAmount, duration: punchDuration } }))

    // Dramatic border glow
    const border = document.createElement('div')
    const borderColor = _combo >= 7 ? '255,68,255' : _combo >= 5 ? '255,136,68' : '68,255,204'
    const borderIntensity = _combo >= 7 ? 0.4 : _combo >= 5 ? 0.3 : 0.2
    border.style.cssText = `position:fixed;inset:0;box-shadow:inset 0 0 ${60 + _combo * 8}px ${15 + _combo * 3}px rgba(${borderColor},${borderIntensity});pointer-events:none;z-index:99998;transition:opacity 0.5s ease-out`
    document.body.appendChild(border)
    requestAnimationFrame(() => { border.style.opacity = '1' })
    setTimeout(() => { border.style.opacity = '0'; setTimeout(() => { if (border.parentNode) border.parentNode.removeChild(border) }, 600) }, 400)

    // Dispatch surge event for the big popup
    window.dispatchEvent(new CustomEvent('harvest-event', {
      detail: { amount: surgeAmount, color: '#ff44ff', isSurge: true, combo: _combo },
    }))
  }

  window.dispatchEvent(new CustomEvent('combo-update', { detail: { combo: _combo, multiplier: getComboMultiplier() } }))
}

// ── Time micro-stop on harvest ─────────────────────────
let _microStopTimer: ReturnType<typeof setTimeout> | null = null
function microStop() {
  if (_microStopTimer) clearTimeout(_microStopTimer)
  setTimeScaleTarget(0.01)
  triggerShake(0.3, 12, 0.2, undefined, true)
  _microStopTimer = setTimeout(() => setTimeScaleTarget(1.0), 80)
}

// ── Left-click dispatch ────────────────────────────────

function handleLeftClick(target: InteractionTarget, camera?: THREE.Camera) {
  const state = useStore.getState()

  const spawnPos = camera ? new THREE.Vector3().copy(camera.position).add(new THREE.Vector3(0, -0.5, -2)) : new THREE.Vector3(0, 1, -2)

  switch (target.type) {
    case 'rift': {
      if (Date.now() - lastHarvestTime < RIFT_HARVEST_COOLDOWN) break
      lastHarvestTime = Date.now()

      // Try fancy rift harvest first (registered in TimeRift.tsx)
      // Fancy rifts handle resources, VFX, cooldown internally
      if (target.riftId && triggerFancyRiftHarvest(target.riftId)) {
        advanceCombo()
        microStop()
        break
      }

      // Fall back to chunk rift handler
      const extraYield = target.riftId ? handleRiftClick(target.riftId) : 0
      if (extraYield <= 0) break

      const baseAmount = HARVEST_AMOUNT + extraYield
      const multiplier = getComboMultiplier() * (1 + getRelicHarvestBonus())
      const doubled = Math.random() < getRelicDoubleHarvestChance() ? 2 : 1
      const finalAmount = Math.round(baseAmount * multiplier) * doubled
      state.addRaw(finalAmount)

      advanceCombo()
      microStop()
      playHarvestSound()
      queueBurst(spawnPos, 20 + _combo * 5, '#44ffcc', 4 + _combo * 0.5)

      // Dispatch harvest event for UI
      window.dispatchEvent(new CustomEvent('harvest-event', {
        detail: { amount: finalAmount, combo: _combo, multiplier, pos: spawnPos },
      }))
      break
    }

    case 'wraith': {
      if (state.inventory.liquid < 5) break
      useStore.setState((s) => ({
        inventory: { ...s.inventory, liquid: s.inventory.liquid - 5 },
      }))
      break
    }

    case 'npc': {
      const npcId = target.npcId
      if (!npcId) break

      const allNPCs = getNPCs()
      const npc = allNPCs.find((n) => n.id === npcId)
      if (!npc) break

      // If player is building, skip NPC interaction
      if (state.selectedBlockType) break

      // If already following → dismiss (immutable update via splice)
      if (npc.following) {
        const nidx = allNPCs.findIndex((n) => n.id === npc.id)
        if (nidx >= 0) {
          allNPCs[nidx] = { ...allNPCs[nidx], following: false, followingSince: null, state: 'idle' as const, stateTimer: 1 }
        }
        if (forceNPCRender) forceNPCRender()
        playClickSound()
        break
      }

      // Check if need heal
      const needHeal = npc.vitality < 100
      if (needHeal && state.inventory.liquid >= (target.healCost ?? 1)) {
        useStore.setState((s) => ({
          inventory: { ...s.inventory, liquid: s.inventory.liquid - (target.healCost ?? 1) },
        }))
        const nidx = allNPCs.findIndex((n) => n.id === npc.id)
        if (nidx >= 0) {
          allNPCs[nidx] = { ...allNPCs[nidx], vitality: 100 }
        }
        if (forceNPCRender) forceNPCRender()
        playHarvestSound()
        break
      }

      // Check max followers
      const followerCount = allNPCs.filter((n) => n.following).length
      if (followerCount >= 2) break // Too many followers

      // Start following (immutable update)
      const nidx = allNPCs.findIndex((n) => n.id === npc.id)
      if (nidx >= 0) {
        allNPCs[nidx] = { ...allNPCs[nidx], following: true, followingSince: Date.now(), state: 'follow' as const }
      }
      if (forceNPCRender) forceNPCRender()
      playClickSound()
      break
    }

    case 'trader': {
      state.requestOpenPanel('trade')
      playClickSound()
      break
    }

    case 'shrine': {
      state.requestOpenPanel('shrine')
      playClickSound()
      break
    }

    case 'lab': {
      if (!state.labOpen) {
        state.openLab()
        playClickSound()
      }
      break
    }

    case 'enemy': {
      // Fire weapon at enemy — auto-equip if none
      if (!getEquippedWeapon()) {
        cycleWeapon(1)
      }
      fireProjectile()
      break
    }

    case 'resource': {
      // Harvest from a resource node — find and deplete it
      if (Date.now() - lastHarvestTime < RIFT_HARVEST_COOLDOWN) break
      lastHarvestTime = Date.now()

      // Find the nearest node to the camera
      const node = findResourceNodeFromTarget(target, camera)
      if (!node) break

      const harvestAmount = target.resourceAmount ?? 5
      const rawYielded = harvestNode(node, harvestAmount)
      const doubled = Math.random() < getRelicDoubleHarvestChance() ? 2 : 1
      const yielded = Math.round(rawYielded * (1 + getRelicHarvestBonus())) * doubled
      if (yielded > 0) {
        state.addRaw(yielded)
        playHarvestSound()
        queueBurst(spawnPos, 15, target.prompt?.includes('Crystal') ? '#aa88ff' : '#ff8844', 4)
      }
      break
    }
  }
}

// ── Resource node lookup ───────────────────────────────

function findResourceNodeFromTarget(target: InteractionTarget, camera?: THREE.Camera): ResourceNode | undefined {
  if (!camera) return undefined
  // Find the closest non-depleted resource node to the camera
  // (the one the player is looking at)
  const cx = camera.position.x
  const cz = camera.position.z
  let nearest: ResourceNode | undefined
  let nearestDist = Infinity
  for (const n of WORLD_NODES) {
    if (n.depleted) continue
    const dx = n.x - cx
    const dz = n.z - cz
    const dist = dx * dx + dz * dz
    if (dist < nearestDist) {
      nearestDist = dist
      nearest = n
    }
  }
  // Only return if within 5 units (player must be looking at it)
  if (nearest && nearestDist < 25) return nearest
  return undefined
}

// ── Right-click dispatch (gifting) ─────────────────────

function handleRightClick(target: InteractionTarget, _camera?: THREE.Camera) {
  const state = useStore.getState()

  // Only handle gifting for follower NPCs
  if (target.type !== 'npc' || !target.npcId || !target.isFollower) return

  const allNPCs = getNPCs()
  const idx = allNPCs.findIndex((n) => n.id === target.npcId)
  if (idx < 0) return

  // Gift liquid if player has at least 10
  if (state.inventory.liquid >= 10) {
    useStore.setState((s) => ({
      inventory: { ...s.inventory, liquid: s.inventory.liquid - 10 },
    }))
    allNPCs[idx] = { ...allNPCs[idx], vitality: Math.min(100, allNPCs[idx].vitality + 5) }
    if (forceNPCRender) forceNPCRender()
    playGiftSound()
  }
  // Gift crystal if player has at least 5
  else if (state.inventory.crystal >= 5) {
    useStore.setState((s) => ({
      inventory: { ...s.inventory, crystal: s.inventory.crystal - 5 },
    }))
    const brightColors = ['#ff4488', '#ff8844', '#44ff88', '#44aaff', '#ff44cc', '#aaff44', '#44ffcc', '#ff6644', '#88ff44', '#44ffaa']
    allNPCs[idx] = { ...allNPCs[idx], giftColor: brightColors[Math.floor(Math.random() * brightColors.length)] }
    if (forceNPCRender) forceNPCRender()
    playGiftSound()
  }
}
