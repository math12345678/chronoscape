import { useState, useEffect } from 'react'
import { useStore } from '../../store'
import { INDUSTRIES } from '../../config/finance'
import type { IndustryType } from '../../config/finance'
import {
  buildIndustry, upgradeIndustry,
  _industries, _totalProduced,
} from '../../systems/IndustrySystem'

// ── Industry UI Component ─────────────────────────────
interface TimeIndustryUIProps {
  open: boolean
  onClose: () => void
}

export const TimeIndustryUI = ({ open, onClose }: TimeIndustryUIProps) => {
  const [, forceUpdate] = useState(0)
  const inventory = useStore((s) => s.inventory)

  useEffect(() => {
    if (!open) return
    const interval = setInterval(() => forceUpdate(n => n + 1), 3000)
    return () => clearInterval(interval)
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-auto">
      <div className="bg-gray-950/95 border border-green-700/40 rounded-xl shadow-2xl shadow-green-500/10 w-full max-w-lg mx-4 max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-green-800/30 flex items-center justify-between bg-gradient-to-r from-green-950/30 to-gray-950">
          <div>
            <h2 className="text-white font-bold text-lg tracking-wide flex items-center gap-2">
              <span className="text-green-400">🏭</span> Time Industries
            </h2>
            <p className="text-green-500/50 text-xs mt-0.5 font-mono">Automate your empire. Passive income.</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1 rounded hover:bg-gray-800">✕</button>
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 120px)' }}>
          {/* Resources */}
          <div className="flex gap-2 text-[10px] font-mono">
            {(['raw', 'vapour', 'liquid', 'crystal', 'renown'] as const).map((key) => (
              <div key={key} className="flex-1 bg-gray-800/40 rounded p-2 border border-gray-700/30">
                <span className="text-gray-500">{key.slice(0, 3)} </span>
                <span className="text-white">{Math.floor(inventory[key])}</span>
              </div>
            ))}
          </div>

          {/* Active industries */}
          {_industries.length > 0 && (
            <div>
              <h3 className="text-[10px] uppercase tracking-wider text-green-400 mb-2 font-medium">
                Active ({_industries.length})
              </h3>
              {_industries.map((ind, i) => {
                const config = INDUSTRIES[ind.type]
                if (!config) return null
                return (
                  <div key={ind.id} className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/30 mb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>{config.icon}</span>
                        <div>
                          <p className="text-white text-sm font-medium" style={{ color: config.color }}>
                            {config.name} <span className="text-gray-500 text-[10px]">Lv.{ind.level}</span>
                          </p>
                          <p className="text-gray-500 text-[10px]">
                            +{config.production.amountPerTick * ind.level} {config.production.resource}/tick
                          </p>
                        </div>
                      </div>
                      {ind.level < config.maxLevel && (
                        <button onClick={() => { upgradeIndustry(i); forceUpdate(n => n + 1) }}
                          className="px-2 py-1 bg-blue-700/50 hover:bg-blue-600 text-blue-300 text-[9px] font-bold uppercase rounded transition-all">
                          Upgrade
                        </button>
                      )}
                    </div>
                    <div className="text-[9px] text-gray-600 font-mono mt-1">
                      Level {ind.level}/{config.maxLevel}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Build new industries */}
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-gray-400 mb-2 font-medium">Build New</h3>
            {(Object.values(INDUSTRIES) as Array<{
              id: IndustryType; name: string; description: string;
              buildCost: { raw?: number; vapour?: number; liquid?: number; crystal?: number; renown?: number };
              production: { resource: string; amountPerTick: number; tickInterval: number };
              color: string; icon: string;
            }>).map((config) => {
              const canAfford = (
                (!config.buildCost.raw || inventory.raw >= config.buildCost.raw) &&
                (!config.buildCost.vapour || inventory.vapour >= config.buildCost.vapour) &&
                (!config.buildCost.liquid || inventory.liquid >= config.buildCost.liquid) &&
                (!config.buildCost.crystal || inventory.crystal >= config.buildCost.crystal) &&
                (!config.buildCost.renown || inventory.renown >= config.buildCost.renown)
              )
              return (
                <div key={config.id} className={`bg-gray-800/40 rounded-lg p-4 border mb-2 transition-all ${
                  canAfford ? 'border-gray-700/40 hover:border-green-700/50' : 'border-gray-700/20 opacity-60'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-white text-sm font-medium" style={{ color: config.color }}>
                        {config.icon} {config.name}
                      </p>
                      <p className="text-gray-500 text-[10px]">{config.description}</p>
                    </div>
                    <button onClick={() => { buildIndustry(config.id, [0, 0.5, 0]); forceUpdate(n => n + 1) }}
                      disabled={!canAfford}
                      className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 ${
                        canAfford ? 'bg-green-700/50 hover:bg-green-600 text-green-300' : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                      }`}>
                      Build
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-gray-600 font-mono">
                    <span>
                      Cost: {config.buildCost.raw ? `${config.buildCost.raw} ⟐ ` : ''}{config.buildCost.vapour ? `${config.buildCost.vapour} ⟡ ` : ''}
                      {config.buildCost.liquid ? `${config.buildCost.liquid} ≈ ` : ''}{config.buildCost.crystal ? `${config.buildCost.crystal} ◆ ` : ''}
                      {config.buildCost.renown ? `${config.buildCost.renown} ✦` : ''}
                    </span>
                    <span>+{config.production.amountPerTick} {config.production.resource}/{Math.floor(config.production.tickInterval / 1000)}s</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Stats */}
          <div className="text-center text-[9px] text-gray-600 font-mono">
            Total produced: {_totalProduced} units
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-gray-800 text-center">
          <p className="text-gray-600 text-[9px] font-mono">
            <kbd className="bg-gray-800 text-gray-400 px-1 rounded text-[8px]">I</kbd> Industries
            {' · '}Each level doubles production speed
          </p>
        </div>
      </div>
    </div>
  )
}
