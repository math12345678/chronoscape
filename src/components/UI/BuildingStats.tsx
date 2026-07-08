import { useStore } from '../../store'

/**
 * Building statistics panel shown in the inventory area.
 * Shows total blocks placed, currently alive, decayed, and exploded.
 * Tracks the "Proudest Build" (largest structure ever built).
 */
export const BuildingStats = () => {
  const blocks = useStore((s) => s.blocks)
  const totalBlocksPlaced = useStore((s) => s.totalBlocksPlaced)
  const totalExplosions = useStore((s) => s.totalExplosions)
  const proudestBuildSize = useStore((s) => s.proudestBuildSize)

  const aliveCount = Object.keys(blocks).length
  const vapourCount = Object.values(blocks).filter((b) => b.type === 'vapour').length
  const crystalCount = Object.values(blocks).filter((b) => b.type === 'crystal').length
  const decayedCount = Math.max(0, totalBlocksPlaced - aliveCount - totalExplosions)

  return (
    <div className="mt-3 pt-3 border-t border-gray-800/50">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-mono">
        Building Statistics
      </p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        <Stat label="Placed" value={totalBlocksPlaced} color="#ffaa00" />
        <Stat label="Alive" value={aliveCount} color="#44ff88" />
        <Stat label="Chrono" value={vapourCount} color="#ffaa00" />
        <Stat label="Aeon" value={crystalCount} color="#aa88ff" />
        <Stat label="Decayed" value={decayedCount} color="#ff6644" />
        <Stat label="Explosions" value={totalExplosions} color="#ff4422" />
      </div>

      {/* Proudest Build tracker */}
      {proudestBuildSize > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-800/30">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500 font-mono">Proudest Build</span>
            <span className="text-[11px] font-mono font-bold text-amber-400">
              {proudestBuildSize} blocks
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

const Stat = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className="flex items-center justify-between">
    <span className="text-[10px] text-gray-500 font-mono">{label}</span>
    <span className="text-[11px] font-mono font-bold" style={{ color }}>
      {value}
    </span>
  </div>
)
