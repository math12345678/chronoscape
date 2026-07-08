import { useStore } from '../../store'

/**
 * New Game+ activation panel.
 * Shown in the Lab after all 3 formulas are discovered.
 * Allows the player to reset inventory/blocks while keeping upgrades,
 * shop purchases, achievements, and Renown.
 */
export const NewGamePlusUI = () => {
  const newGamePlusUnlock = useStore((s) => s.newGamePlusUnlock)
  const newGamePlus = useStore((s) => s.newGamePlus)
  const activateNewGamePlus = useStore((s) => s.activateNewGamePlus)
  const labOpen = useStore((s) => s.labOpen)

  if (!labOpen || !newGamePlusUnlock || newGamePlus) return null

  return (
    <div className="mt-4 pt-4 border-t border-purple-500/30">
      <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⏳</span>
          <div className="flex-1">
            <h3 className="text-purple-300 text-sm font-bold">
              New Game+ Available
            </h3>
            <p className="text-gray-400 text-xs mt-1 leading-relaxed">
              You've mastered all formulas. Start a new cycle with harder decay rates
              while keeping your upgrades, Renown, and achievements.
            </p>
            <div className="mt-3 space-y-1.5">
              <p className="text-green-400/80 text-[10px] flex items-center gap-1">
                <span>✓</span> Keeps upgrades, shop purchases, achievements
              </p>
              <p className="text-green-400/80 text-[10px] flex items-center gap-1">
                <span>✓</span> Keeps Renown and discovered formulas
              </p>
              <p className="text-red-400/80 text-[10px] flex items-center gap-1">
                <span>✗</span> Resets inventory and all blocks
              </p>
              <p className="text-red-400/80 text-[10px] flex items-center gap-1">
                <span>✗</span> 25% faster decay across all resources
              </p>
            </div>
            <button
              onClick={activateNewGamePlus}
              className="mt-3 w-full bg-purple-700 hover:bg-purple-600 text-white text-sm font-medium py-2 rounded-lg transition-colors"
            >
              Begin New Game+
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
