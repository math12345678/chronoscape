import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getEnemyStatusEffects } from '../systems/ChronoCombatSkills'
import { getEnemyMeshes } from './Combat/HostileEnemyManager'
import type { StatusEffectType } from '../systems/ChronoCombatSkills'

interface VFXParticle {
  mesh: THREE.Mesh
  phase: number
  speed: number
}

const EFFECT_CFG: Record<StatusEffectType, { color: string; count: number; scale: number }> = {
  burn: { color: '#ff4400', count: 4, scale: 0.6 },
  freeze: { color: '#44aaff', count: 3, scale: 0.7 },
  stun: { color: '#ffd700', count: 5, scale: 0.4 },
  slow: { color: '#88aaff', count: 3, scale: 0.5 },
  poison: { color: '#88ff44', count: 4, scale: 0.6 },
  void: { color: '#8800ff', count: 3, scale: 0.8 },
  regen: { color: '#44ff88', count: 3, scale: 0.5 },
  shield: { color: '#44aaff', count: 2, scale: 0.9 },
}

const POOL_SIZE = 200

const PARTICLE_GEO = new THREE.SphereGeometry(0.06, 6, 6)

export const StatusEffectVFX = () => {
  const groupRef = useRef<THREE.Group>(null)
  const pool = useRef<VFXParticle[]>([])
  const time = useRef(0)

  const initPool = useMemo(() => {
    const p: VFXParticle[] = []
    for (let i = 0; i < POOL_SIZE; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: '#ffffff',
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
      const mesh = new THREE.Mesh(PARTICLE_GEO, mat)
      mesh.visible = false
      mesh.renderOrder = 999
      p.push({ mesh, phase: Math.random() * Math.PI * 2, speed: 0.8 + Math.random() * 0.6 })
    }
    return p
  }, [])

  // Populate group with pool on first render
  if (pool.current.length === 0) {
    pool.current = initPool
  }

  useFrame((_, delta) => {
    time.current += delta
    const t = time.current
    const group = groupRef.current
    if (!group) return

    const enemyMeshes = getEnemyMeshes()
    const statusMap = getEnemyStatusEffects()

    type Slot = { type: StatusEffectType; pos: THREE.Vector3; subIdx: number }
    const slots: Slot[] = []

    for (const mesh of enemyMeshes) {
      const effects = statusMap.get(mesh.uuid)
      if (!effects || effects.length === 0) continue
      const pos = mesh.position.clone()
      pos.y += 0.6
      for (const effect of effects) {
        const cfg = EFFECT_CFG[effect.type]
        if (!cfg) continue
        for (let i = 0; i < cfg.count; i++) {
          slots.push({ type: effect.type, pos, subIdx: i })
        }
      }
    }

    // Ensure pool meshes are added to group
    for (const p of pool.current) {
      if (!p.mesh.parent && group) group.add(p.mesh)
    }

    let used = 0
    for (let si = 0; si < slots.length && si < POOL_SIZE; si++) {
      const slot = slots[si]
      const p = pool.current[si]
      const mesh = p.mesh
      const cfg = EFFECT_CFG[slot.type]
      mesh.visible = true

      const angle = (slot.subIdx / cfg.count) * Math.PI * 2 + p.phase
      const radius = 0.2 + Math.sin(t * 0.5 + p.phase) * 0.05
      const yOff = Math.sin(t * p.speed + p.phase) * 0.15 + 0.1

      mesh.position.set(
        slot.pos.x + Math.cos(angle + t * 0.5) * radius,
        slot.pos.y + yOff,
        slot.pos.z + Math.sin(angle + t * 0.5) * radius,
      )

      const scale = cfg.scale * (0.7 + Math.sin(t + p.phase) * 0.2)
      mesh.scale.setScalar(scale)

      mesh.rotation.x = t * 0.5 + p.phase
      mesh.rotation.y = t * 0.7 + p.phase

      const mat = mesh.material as THREE.MeshBasicMaterial
      mat.color.set(cfg.color)
      mat.opacity = 0.5 + Math.sin(t * 2.5 + p.phase) * 0.15

      used++
    }

    for (let i = used; i < POOL_SIZE; i++) {
      pool.current[i].mesh.visible = false
    }
  })

  return <group ref={groupRef} />
}
