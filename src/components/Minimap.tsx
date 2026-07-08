import { useEffect, useRef } from 'react'
import { getInfiniteTerrainHeight } from '../world/chunkTerrain'
import { getCameraPosition, getCameraAngle } from '../utils/cameraState'
import { TIME_RIFT_POSITIONS } from '../config/constants'
import type { EnemyType } from '../config/combat'
import { getPOIs } from '../systems/POISystem'
import type { POIType, POIInstance } from '../systems/POISystem'
import { getOutposts, getClaims } from '../systems/ChronoOutposts'
import { getDeployed } from '../systems/AutomationConstructs'
import { getBiomeTierAtDistance } from '../systems/InfiniteWorldGenerator'

const RIFT_POSITIONS = TIME_RIFT_POSITIONS.map(r => r.pos)

let _enemyData: { x: number; z: number; type: EnemyType }[] = []
export function setMinimapEnemyData(data: { x: number; z: number; type: EnemyType }[]) { _enemyData = data }
export function clearMinimapEnemyData() { _enemyData = [] }

const POI_MINI_COLORS: Record<POIType, string> = {
  ruin: '#ff8844',
  crystal_formation: '#aa88ff',
  temporal_shrine: '#44ffcc',
  crash_site: '#ff4444',
  ancient_lab: '#44aaff',
  time_wound: '#ff00ff',
}

const CONSTRUCT_COLORS: Record<string, string> = {
  construct_harvester: '#ffd700',
  construct_sentinel: '#ff4444',
  construct_builder: '#44aaff',
  construct_explorer: '#aa44ff',
}

function drawMinimap(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const playerPos = getCameraPosition()
  const cameraAngle = getCameraAngle()

  ctx.clearRect(0, 0, w, h)

  // Background with biome tint
  const dist = Math.sqrt(playerPos.x * playerPos.x + playerPos.z * playerPos.z)
  const biome = getBiomeTierAtDistance(dist)
  const biomeColor = biome?.color || '#44ff88'

  ctx.fillStyle = 'rgba(5,10,25,0.88)'
  ctx.beginPath()
  ctx.roundRect(0, 0, w, h, 12)
  ctx.fill()

  // Biome-colored border glow
  ctx.shadowColor = biomeColor + '30'
  ctx.shadowBlur = 16
  ctx.strokeStyle = biomeColor + '15'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.roundRect(0, 0, w, h, 12); ctx.stroke()
  ctx.shadowBlur = 0

  const cx = w / 2
  const cy = h / 2
  const scale = 2.8

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(-cameraAngle + Math.PI / 2)

  // ── Distance rings ──
  ctx.strokeStyle = 'rgba(255,255,255,0.04)'
  ctx.lineWidth = 0.5
  const ringDistances = [50, 100, 150]
  ringDistances.forEach(d => {
    const r = d * scale
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke()
    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    ctx.font = '5px monospace'
    ctx.fillText(`${d}m`, r + 2, 2)
  })

  // ── Grid lines ──
  ctx.strokeStyle = 'rgba(255,255,255,0.015)'
  ctx.lineWidth = 0.5
  for (let g = -100; g <= 100; g += 20) {
    const px = g * scale; const pz = g * scale
    ctx.beginPath(); ctx.moveTo(px, -h); ctx.lineTo(px, h); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(-w, pz); ctx.lineTo(w, pz); ctx.stroke()
  }

  // ── Terrain fog ──
  for (let x = -80; x < 80; x += 16) {
    for (let z = -80; z < 80; z += 16) {
      const hgt = getInfiniteTerrainHeight(x, z)
      const dx = x * scale; const dz = z * scale
      if (Math.abs(dx) > w || Math.abs(dz) > h) continue
      const bright = 0.03 + (hgt + 8) / 24 * 0.06
      ctx.fillStyle = `rgba(68,255,204,${bright})`
      ctx.beginPath(); ctx.arc(dx, dz, 1.5, 0, Math.PI * 2); ctx.fill()
    }
  }

  // ── Territory claims ──
  const claims = getClaims()
  if (claims.length > 0) {
    for (const claim of claims) {
      const worldX = claim.chunkX * 32 + 16
      const worldZ = claim.chunkZ * 32 + 16
      const px = worldX * scale; const pz = worldZ * scale
      if (Math.abs(px) > w || Math.abs(pz) > h) continue
      const color = claim.color || '#44ffcc'
      const hasOutpost = claim.outpostId !== null
      ctx.fillStyle = color + (hasOutpost ? '30' : '15')
      ctx.fillRect(px - 12, pz - 12, 24, 24)
      ctx.strokeStyle = color + '40'
      ctx.lineWidth = hasOutpost ? 1.5 : 0.5
      ctx.strokeRect(px - 12, pz - 12, 24, 24)
    }
  }

  // ── Outposts ──
  const outposts = getOutposts().filter(o => o.active)
  for (const outpost of outposts) {
    const px = outpost.worldX * scale; const pz = outpost.worldZ * scale
    if (Math.abs(px) > w || Math.abs(pz) > h) continue
    ctx.save()
    ctx.translate(px, pz)
    // Diamond icon
    ctx.rotate(Math.PI / 4)
    ctx.beginPath(); ctx.roundRect(-4, -4, 8, 8, 1); ctx.closePath()
    ctx.fillStyle = '#44ffcc'
    ctx.shadowColor = '#44ffcc'
    ctx.shadowBlur = 8
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.strokeStyle = '#88ffee'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.restore()
  }

  // ── Constructs ──
  const constructs = getDeployed().filter(c => c.active)
  for (const c of constructs) {
    const px = c.x * scale; const pz = c.z * scale
    if (Math.abs(px) > w || Math.abs(pz) > h) continue
    const color = CONSTRUCT_COLORS[c.defId] || '#ffffff'
    ctx.beginPath(); ctx.arc(px, pz, 2, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.shadowColor = color
    ctx.shadowBlur = 4
    ctx.fill()
    ctx.shadowBlur = 0
  }

  // ── POIs ──
  const pois = getPOIs().filter(p => p.discovered)
  for (const poi of pois) {
    const px = poi.x * scale; const pz = poi.z * scale
    if (Math.abs(px) > w || Math.abs(pz) > h) continue
    const color = POI_MINI_COLORS[poi.type] || '#ffffff'
    // Star shape
    ctx.save()
    ctx.translate(px, pz)
    ctx.beginPath()
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 - Math.PI / 2
      const r = i === 0 ? 3 : 2
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
    }
    ctx.closePath()
    ctx.fillStyle = color
    ctx.shadowColor = color
    ctx.shadowBlur = 6
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.restore()
  }

  // ── Time rifts ──
  RIFT_POSITIONS.forEach(([rx, _, rz]) => {
    const px = rx * scale; const pz = rz * scale
    if (Math.abs(px) > w || Math.abs(pz) > h) return
    ctx.beginPath(); ctx.arc(px, pz, 4, 0, Math.PI * 2)
    ctx.fillStyle = '#44ffcc'; ctx.fill()
    ctx.shadowColor = '#44ffcc'; ctx.shadowBlur = 8
    ctx.beginPath(); ctx.arc(px, pz, 2, 0, Math.PI * 2); ctx.fill()
    ctx.shadowBlur = 0
  })

  // ── Enemies ──
  _enemyData.forEach(({ x: ex, z: ez, type }) => {
    const px = ex * scale; const pz = ez * scale
    if (Math.abs(px) > w || Math.abs(pz) > h) return
    const isBoss = type === 'chronoBehemoth' || type === 'timeTyrant'
    if (isBoss) {
      ctx.save()
      ctx.translate(px, pz)
      ctx.rotate(Math.PI / 4)
      ctx.beginPath(); ctx.roundRect(-4, -4, 8, 8, 1); ctx.closePath()
      ctx.fillStyle = '#ffaa00'
      ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 10
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.strokeStyle = '#ffdd44'
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.restore()
    } else {
      ctx.beginPath(); ctx.arc(px, pz, 3, 0, Math.PI * 2)
      ctx.fillStyle = '#ff4444'; ctx.fill()
      ctx.shadowColor = '#ff4444'; ctx.shadowBlur = 6
      ctx.beginPath(); ctx.arc(px, pz, 1.5, 0, Math.PI * 2); ctx.fill()
      ctx.shadowBlur = 0
    }
  })

  // ── Origin vortex ──
  ctx.beginPath(); ctx.arc(0, 0, 20 * scale, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(68,136,255,0.15)'; ctx.lineWidth = 1
  ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([])
  ctx.beginPath(); ctx.arc(0, 0, 5 * scale, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(68,136,255,0.25)'; ctx.fill()
  ctx.beginPath(); ctx.arc(0, 0, 2 * scale, 0, Math.PI * 2)
  ctx.fillStyle = '#4488ff'; ctx.fill()

  // ── Biome tier label ──
  ctx.restore()
  ctx.save()
  ctx.translate(cx, cy)

  // ── Compass directions ──
  ctx.fillStyle = 'rgba(255,255,255,0.2)'
  ctx.font = '7px monospace'
  ctx.textAlign = 'center'
  ctx.fillText('N', 0, -cy + 10)
  ctx.fillText('S', 0, cy - 4)
  ctx.fillText('E', cx - 8, 3)
  ctx.fillText('W', -cx + 8, 3)

  ctx.restore()

  // ── Legend ──
  ctx.fillStyle = 'rgba(255,255,255,0.15)'
  ctx.font = '6px monospace'
  ctx.fillText(biome?.name || 'UNKNOWN', 10, 14)
  ctx.fillStyle = biomeColor + '50'
  ctx.fillText(`T${BASE_TIERS.indexOf(biome) + 1 || '?'}`, 10, 22)

  // Border glow
  ctx.shadowColor = 'rgba(68,255,204,0.12)'; ctx.shadowBlur = 12
  ctx.strokeStyle = 'rgba(68,255,204,0.08)'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.roundRect(0, 0, w, h, 12); ctx.stroke()
  ctx.shadowBlur = 0

  // Player dot
  ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 12; ctx.fill(); ctx.shadowBlur = 0

  // Direction indicator
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(-cameraAngle + Math.PI / 2)
  ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(-3, -3); ctx.lineTo(3, -3); ctx.closePath()
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fill()
  ctx.restore()
}

export const Minimap = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const size = 200

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let raf = 0
    let running = true

    const loop = () => {
      if (!running) return
      drawMinimap(ctx, size, size)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => { running = false; cancelAnimationFrame(raf) }
  }, [])

  return (
    <div style={{
      position: 'fixed',
      top: 80,
      left: 16,
      zIndex: 1000,
      cursor: 'default',
      userSelect: 'none',
    }}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{
          borderRadius: 12,
          width: size,
          height: size,
          imageRendering: 'pixelated',
        }}
      />
    </div>
  )
}

// ── Local reference to BASE_TIERS ──
const BASE_TIERS = [
  { id: 'tier_safe', name: 'Safe Haven' },
  { id: 'tier_growth', name: 'Growing Lands' },
  { id: 'tier_chaos', name: 'Chaos Stretch' },
  { id: 'tier_void', name: 'Void Frontier' },
  { id: 'tier_omega', name: 'Omega Expanse' },
  { id: 'tier_infinite', name: 'Infinite Void' },
]
