import { useState, useEffect } from 'react'
import { ALCHEMY_RECIPES } from '../../config/economy'
import type { AlchemyRecipeId } from '../../config/economy'
import { useStore } from '../../store'
import { getAlchemyCrafts, startCraft, claimCraft, tickCrafts } from './TimeAlchemy'
import { unlockGear } from './TimeGear'

interface AlchemyUIProps {
  open: boolean
  onClose: () => void
}

export const AlchemyUI = ({ open, onClose }: AlchemyUIProps) => {
  const inventory = useStore((s) => s.inventory)
  const [, forceUpdate] = useState(0)

  // Tick crafts every second
  useEffect(() => {
    if (!open) return
    const interval = setInterval(() => {
      tickCrafts()
      forceUpdate(n => n + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [open])

  const activeCrafts = getAlchemyCrafts()

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-auto">
      <div className="bg-gray-950/95 border border-emerald-700/40 rounded-xl shadow-2xl shadow-emerald-500/10 w-full max-w-md mx-4 max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-emerald-800/30 flex items-center justify-between bg-gradient-to-r from-emerald-950/30 to-gray-950">
          <div>
            <h2 className="text-white font-bold text-lg tracking-wide flex items-center gap-2">
              <span className="text-emerald-400">🧪</span> Alchemy Cauldron
            </h2>
            <p className="text-emerald-500/50 text-xs mt-0.5 font-mono">Time brews wonders. Patience pays.</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1 rounded hover:bg-gray-800">✕</button>
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 120px)' }}>
          {/* Resources */}
          <div className="flex gap-2 text-[10px] font-mono">
            {(['raw', 'vapour', 'liquid', 'crystal'] as const).map((key) => (
              <div key={key} className="flex-1 bg-gray-800/40 rounded p-2 border border-gray-700/30">
                <span className="text-gray-500">{key.slice(0, 3)} </span>
                <span className="text-white">{Math.floor(inventory[key])}</span>
              </div>
            ))}
          </div>

          {/* Active crafts */}
          {activeCrafts.length > 0 && (
            <div>
              <h3 className="text-[10px] uppercase tracking-wider text-emerald-400 mb-2 font-medium">
                Brewing ({activeCrafts.length}/3)
              </h3>
              <div className="space-y-2">
                {activeCrafts.map((craft, i) => {
                  const recipe = ALCHEMY_RECIPES[craft.recipeId]
                  const elapsed = Date.now() - craft.startedAt
                  const progress = Math.min(1, elapsed / craft.cookTime)
                  const remaining = Math.max(0, Math.ceil((craft.cookTime - elapsed) / 1000))

                  return (
                    <div key={`${craft.recipeId}-${craft.startedAt}`}
                      className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/30">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white text-sm font-medium" style={{ color: recipe.color }}>
                          {recipe.icon} {recipe.name}
                        </span>
                        {craft.completed ? (
                          <button onClick={() => {
                            const result = claimCraft(i)
                            if (result) {
                              const r = ALCHEMY_RECIPES[result.recipeId]
                              // Grant rewards
                              const state = useStore.getState()
                              const updates: Record<string, number> = {}
                              if (r.output.raw) updates.raw = (state.inventory.raw + r.output.raw)
                              if (r.output.liquid) updates.liquid = (state.inventory.liquid + r.output.liquid)
                              if (r.output.crystal) updates.crystal = (state.inventory.crystal + r.output.crystal)
                              if (r.output.renown) updates.renown = (state.inventory.renown + r.output.renown)
                              if (r.output.gearUnlock) unlockGear(r.output.gearUnlock)
                              if (Object.keys(updates).length > 0) {
                                useStore.setState((s) => ({
                                  inventory: { ...s.inventory, ...updates },
                                }))
                              }
                              forceUpdate(n => n + 1)
                            }
                          }}
                            className="px-3 py-1 bg-emerald-700/50 hover:bg-emerald-600 text-emerald-300 text-[10px] rounded font-bold uppercase tracking-wider transition-all">
                            Claim
                          </button>
                        ) : (
                          <span className="text-gray-500 text-[10px] font-mono">{remaining}s</span>
                        )}
                      </div>
                      {/* Progress bar */}
                      {!craft.completed && (
                        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-500 transition-all duration-1000"
                            style={{ width: `${progress * 100}%` }} />
                        </div>
                      )}
                      {craft.completed && (
                        <p className="text-emerald-400 text-[10px] font-mono">✓ Ready to claim!</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Recipe list */}
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-gray-400 mb-2 font-medium">
              Recipes {activeCrafts.length >= 3 ? '(slots full)' : ''}
            </h3>
            <div className="space-y-2">
              {(Object.values(ALCHEMY_RECIPES) as Array<{
                id: AlchemyRecipeId; name: string; description: string;
                input: { raw?: number; vapour?: number; liquid?: number; crystal?: number };
                cookTime: number;
                output: { raw?: number; liquid?: number; crystal?: number; renown?: number; gearUnlock?: string };
                color: string; icon: string;
              }>).map((recipe) => {
                const canAfford = (
                  (!recipe.input.raw || inventory.raw >= recipe.input.raw) &&
                  (!recipe.input.vapour || inventory.vapour >= recipe.input.vapour) &&
                  (!recipe.input.liquid || inventory.liquid >= recipe.input.liquid) &&
                  (!recipe.input.crystal || inventory.crystal >= recipe.input.crystal)
                )
                const cookMinutes = Math.floor(recipe.cookTime / 60000)
                const cookSeconds = Math.floor((recipe.cookTime % 60000) / 1000)

                return (
                  <div key={recipe.id}
                    className={`bg-gray-800/40 rounded-lg p-3 border transition-all ${
                      canAfford && activeCrafts.length < 3 ? 'border-gray-700/40 hover:border-emerald-700/50' : 'border-gray-700/20 opacity-60'
                    }`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span>{recipe.icon}</span>
                        <div>
                          <p className="text-white text-sm font-medium" style={{ color: recipe.color }}>{recipe.name}</p>
                          <p className="text-gray-500 text-[10px]">{recipe.description}</p>
                        </div>
                      </div>
                      <button onClick={() => {
                        startCraft(recipe.id)
                        forceUpdate(n => n + 1)
                      }}
                        disabled={!canAfford || activeCrafts.length >= 3}
                        className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 ${
                          canAfford && activeCrafts.length < 3
                            ? 'bg-emerald-700/50 hover:bg-emerald-600 text-emerald-300'
                            : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                        }`}>
                        {activeCrafts.length >= 3 ? 'Full' : canAfford ? 'Brew' : 'Need More'}
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-gray-600 font-mono">
                      <span>
                        Costs: {recipe.input.raw ? `${recipe.input.raw} ⟐ ` : ''}{recipe.input.vapour ? `${recipe.input.vapour} ⟡ ` : ''}
                        {recipe.input.liquid ? `${recipe.input.liquid} ≈ ` : ''}{recipe.input.crystal ? `${recipe.input.crystal} ◆ ` : ''}
                      </span>
                      <span>{cookMinutes > 0 ? `${cookMinutes}m ` : ''}{cookSeconds}s</span>
                    </div>
                    <p className="text-[9px] text-gray-600 font-mono mt-0.5">
                      Yields: {recipe.output.raw ? `${recipe.output.raw} ⟐ ` : ''}{recipe.output.liquid ? `${recipe.output.liquid} ≈ ` : ''}
                      {recipe.output.crystal ? `${recipe.output.crystal} ◆ ` : ''}{recipe.output.renown ? `${recipe.output.renown} ✦ ` : ''}
                      {recipe.output.gearUnlock ? `+${recipe.output.gearUnlock}` : ''}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-gray-800 text-center">
          <p className="text-gray-600 text-[9px] font-mono">
            <kbd className="bg-gray-800 text-gray-400 px-1 rounded text-[8px]">A</kbd> Alchemy
            {' · '}Max 3 concurrent crafts · Set &amp; forget
          </p>
        </div>
      </div>
    </div>
  )
}
