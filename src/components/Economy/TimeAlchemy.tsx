import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ALCHEMY_POSITION, ALCHEMY_RECIPES } from '../../config/economy'
import type { AlchemyRecipeId } from '../../config/economy'

// ── Module-level alchemy state ─────────────────────────
interface ActiveCraft {
  recipeId: AlchemyRecipeId
  startedAt: number
  cookTime: number
  completed: boolean
  claimed: boolean
}

let _activeCrafts: ActiveCraft[] = []
let _lastCraftCount = 0

export function getAlchemyCrafts(): ActiveCraft[] { return _activeCrafts }
export function getLastCraftCount(): number { return _lastCraftCount }

/** Start crafting a recipe. Returns true if slot available. */
export function startCraft(recipeId: AlchemyRecipeId): boolean {
  if (_activeCrafts.length >= 3) return false // max 3 concurrent crafts
  if (_activeCrafts.find(c => c.recipeId === recipeId)) return false

  const recipe = ALCHEMY_RECIPES[recipeId]
  _activeCrafts.push({
    recipeId,
    startedAt: Date.now(),
    cookTime: recipe.cookTime,
    completed: false,
    claimed: false,
  })
  _lastCraftCount = _activeCrafts.length
  return true
}

/** Check if any crafts completed */
export function tickCrafts() {
  const now = Date.now()
  for (const craft of _activeCrafts) {
    if (!craft.completed && now - craft.startedAt >= craft.cookTime) {
      craft.completed = true
    }
  }
}

/** Claim a completed craft. Returns the recipe output or null. */
export function claimCraft(index: number): { recipeId: AlchemyRecipeId } | null {
  const craft = _activeCrafts[index]
  if (!craft || !craft.completed || craft.claimed) return null

  const recipe = ALCHEMY_RECIPES[craft.recipeId]
  craft.claimed = true

  // Remove from active
  _activeCrafts.splice(index, 1)
  return { recipeId: craft.recipeId }
}

/**
 * Alchemy Cauldron — a bubbling pot that crafts items over time.
 * Click to open alchemy UI.
 */
export const TimeAlchemy = () => {
  const groupRef = useRef<THREE.Group>(null)
  const cauldronRef = useRef<THREE.Mesh>(null)
  const bubbleRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const time = useRef(0)
  const pos = ALCHEMY_POSITION

  useFrame((_, delta) => {
    time.current += delta
    if (!groupRef.current) return

    // Gentle bob
    groupRef.current.position.y = pos[1] + Math.sin(time.current * 0.4) * 0.015

    // Bubbling effect
    if (bubbleRef.current) {
      const bob = Math.sin(time.current * 2) * 0.03
      const scale = 0.08 + Math.sin(time.current * 1.5) * 0.02
      bubbleRef.current.position.y = bob
      bubbleRef.current.scale.set(scale, scale, scale)
    }

    // Glow pulse
    if (glowRef.current) {
      ;(glowRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.06 + Math.sin(time.current * 0.8) * 0.03
    }
  })

  return (
    <group ref={groupRef} position={pos}>
      {/* Cauldron body */}
      <mesh ref={cauldronRef} position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.2, 0.4, 12]} />
        <meshStandardMaterial color="#332a1a" roughness={0.9} metalness={0.1} />
      </mesh>

      {/* Liquid inside */}
      <mesh position={[0, 0.32, 0]}>
        <cylinderGeometry args={[0.25, 0.18, 0.1, 12]} />
        <meshStandardMaterial color="#44ffcc" emissive="#44ffcc" emissiveIntensity={0.2} transparent opacity={0.4} />
      </mesh>

      {/* Bubble */}
      <mesh ref={bubbleRef} position={[0.1, 0.42, 0.1]}>
        <sphereGeometry args={[0.08, 6, 6]} />
        <meshBasicMaterial color="#66ffdd" transparent opacity={0.3} />
      </mesh>

      {/* Rim */}
      <mesh position={[0, 0.45, 0]} castShadow>
        <torusGeometry args={[0.25, 0.03, 8, 12]} />
        <meshStandardMaterial color="#554433" roughness={0.8} metalness={0.2} />
      </mesh>

      {/* Steam glow */}
      <mesh ref={glowRef} position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshBasicMaterial color="#44ffcc" transparent opacity={0.08} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Stand legs */}
      {[-0.2, 0.2].map((x, i) => (
        <mesh key={`leg-${i}`} position={[x, 0.05, 0]} castShadow>
          <boxGeometry args={[0.03, 0.1, 0.03]} />
          <meshStandardMaterial color="#443322" />
        </mesh>
      ))}

      {/* Ground glow */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.4, 16]} />
        <meshBasicMaterial color="#44ffcc" transparent opacity={0.04} />
      </mesh>

      {/* Interactive zone */}
      <mesh
        position={[0, 0.4, 0.5]}
        userData={{ interactable: true, type: 'alchemy', prompt: '[Click] Alchemy Cauldron' }}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}
