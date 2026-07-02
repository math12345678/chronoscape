import { useStore } from '../../store'
import { BLOCK_COST } from '../../config/constants'
import type { BlockType } from '../../store'

const HOTBAR_SLOTS: {
  type: BlockType
  label: string
  color: string
  key: string
}[] = [
  { type: 'vapour', label: 'Vapour', color: '#ffaa00', key: '1' },
  { type: 'crystal', label: 'Crystal', color: '#aa88ff', key: '2' },
]

export const Hotbar = () => {
  const selectedBlockType = useStore((s) => s.selectedBlockType)
  const setSelectedBlockType = useStore((s) => s.setSelectedBlockType)
  const inventory = useStore((s) => s.inventory)
  const formulaDiscovered = useStore((s) => s.formulaDiscovered)

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 z-50 select-none">
      {HOTBAR_SLOTS.map((slot) => {
        const isSelected = selectedBlockType === slot.type
        const isCrystal = slot.type === 'crystal'
        const isLocked = isCrystal && !formulaDiscovered('crystallization')
        const resourceKey = slot.type === 'vapour' ? 'vapour' : 'crystal'
        const amount = Math.floor(inventory[resourceKey as keyof typeof inventory] as number)
        const cost = BLOCK_COST[slot.type] ?? 5
        const canAfford = amount >= cost

        return (
          <button
            key={slot.type}
            onClick={() => {
              if (isLocked) return
              setSelectedBlockType(isSelected ? null : slot.type)
            }}
            className={`
              relative flex flex-col items-center justify-center w-16 h-20
              rounded-lg border-2 transition-all duration-200
              ${isLocked
                ? 'border-gray-800 bg-gray-900/60 cursor-not-allowed opacity-50'
                : isSelected
                  ? 'border-yellow-400/80 bg-gray-800/95 shadow-lg shadow-yellow-400/10 scale-105'
                  : 'border-gray-700/50 bg-gray-900/70 hover:border-gray-400/60 hover:bg-gray-800/80 hover:scale-105'
              }
            `}
            title={
              isLocked
                ? 'Discover Crystallization in the Lab'
                : `${slot.label} Block (costs ${cost} ${slot.label})`
            }
          >
            {/* Slot number */}
            <span className="absolute top-1 left-2 text-[10px] text-gray-600 font-mono">
              {slot.key}
            </span>

            {/* Block icon with glow when selected */}
            <div
              className={`w-6 h-6 rounded-sm border mb-1 transition-all duration-300 ${isSelected ? 'shadow-lg' : ''}`}
              style={{
                backgroundColor: isLocked ? '#333' : slot.color,
                borderColor: isLocked ? '#444' : slot.color,
                opacity: isLocked ? 0.4 : canAfford ? 1 : 0.5,
                boxShadow: isSelected ? `0 0 12px ${slot.color}66` : 'none',
              }}
            />

            {/* Label */}
            <span
              className="text-[10px] font-bold uppercase tracking-wider transition-colors duration-200"
              style={{ color: isLocked ? '#666' : slot.color }}
            >
              {isLocked ? '🔒' : slot.label}
            </span>

            {/* Count */}
            <span className="text-[10px] text-gray-500 font-mono mt-0.5">
              {isLocked ? '—' : Math.floor(amount)}
            </span>

            {/* Selection indicator with glow */}
            {isSelected && (
              <div
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full"
                style={{
                  backgroundColor: slot.color,
                  boxShadow: `0 0 8px ${slot.color}88`,
                }}
              />
            )}
          </button>
        )
      })}

      {/* Deselect button */}
      {selectedBlockType && (
        <button
          onClick={() => setSelectedBlockType(null)}
          className="ml-2 px-2 py-1 text-[10px] text-gray-500 hover:text-white bg-gray-900/70 border border-gray-700/50 rounded hover:bg-gray-800/80 transition-all hover:scale-110"
          title="Deselect (Esc)"
        >
          ✕
        </button>
      )}
    </div>
  )
}
