import { useState, useEffect } from 'react'
import { useStore } from '../../store'
import {
  buyLand, sellLand, buildProperty, upgradeBuilding,
  getTotalPropertyValue,
  _parcels, _totalRentCollected,
} from '../../systems/RealEstateSystem'

// ── Real Estate UI ──────────────────────────────────
interface TimeRealEstateUIProps {
  open: boolean
  onClose: () => void
}

export const TimeRealEstateUI = ({ open, onClose }: TimeRealEstateUIProps) => {
  const [, forceUpdate] = useState(0)
  const liquid = useStore((s) => Math.floor(s.inventory.liquid))

  useEffect(() => {
    if (!open) return
    const interval = setInterval(() => forceUpdate(n => n + 1), 3000)
    return () => clearInterval(interval)
  }, [open])

  if (!open) return null

  const ownedCount = _parcels.filter(p => p.owned).length
  const totalValue = getTotalPropertyValue()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-auto">
      <div className="bg-gray-950/95 border border-cyan-700/40 rounded-xl shadow-2xl shadow-cyan-500/10 w-full max-w-lg mx-4 max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-cyan-800/30 flex items-center justify-between bg-gradient-to-r from-cyan-950/30 to-gray-950">
          <div>
            <h2 className="text-white font-bold text-lg tracking-wide flex items-center gap-2">
              <span className="text-cyan-400">🏘️</span> Time Real Estate
            </h2>
            <p className="text-cyan-500/50 text-xs mt-0.5 font-mono">Build your property empire.</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1 rounded hover:bg-gray-800">✕</button>
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 120px)' }}>
          {/* Portfolio summary */}
          <div className="flex gap-2 text-[10px] font-mono">
            <div className="flex-1 bg-gray-800/40 rounded p-2 border border-gray-700/30">
              <span className="text-gray-500">Liquid </span>
              <span className="text-cyan-300">{liquid}</span>
            </div>
            <div className="flex-1 bg-gray-800/40 rounded p-2 border border-gray-700/30">
              <span className="text-gray-500">Properties </span>
              <span className="text-white">{ownedCount}/{_parcels.length}</span>
            </div>
            <div className="flex-1 bg-gray-800/40 rounded p-2 border border-gray-700/30">
              <span className="text-gray-500">Portfolio </span>
              <span className="text-green-400">{totalValue} ≈</span>
            </div>
            <div className="flex-1 bg-gray-800/40 rounded p-2 border border-gray-700/30">
              <span className="text-gray-500">Rent </span>
              <span className="text-amber-400">+{_totalRentCollected}</span>
            </div>
          </div>

          {/* Parcel list */}
          <div className="space-y-2">
            {_parcels.map((parcel, i) => (
              <div key={parcel.id}
                className={`rounded-lg p-3 border transition-all ${
                  parcel.owned
                    ? parcel.hasBuilding
                      ? 'bg-gray-800/50 border-cyan-700/30'
                      : 'bg-gray-800/40 border-green-700/30'
                    : 'bg-gray-800/30 border-gray-700/20 hover:border-cyan-700/40'
                }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{parcel.icon}</span>
                    <div>
                      <p className="text-white text-sm font-medium">{parcel.name}</p>
                      <p className="text-gray-500 text-[10px]">{parcel.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!parcel.owned ? (
                      <button onClick={() => { buyLand(i); forceUpdate(n => n + 1) }}
                        disabled={liquid < parcel.currentValue}
                        className="px-2 py-1 bg-cyan-700/50 hover:bg-cyan-600 text-cyan-300 text-[9px] font-bold uppercase rounded transition-all disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed">
                        Buy {parcel.currentValue}≈
                      </button>
                    ) : (
                      <>
                        {!parcel.hasBuilding ? (
                          <div className="flex gap-1">
                            {(['residential', 'commercial', 'industrial'] as const).map((type) => {
                              const costs: Record<string, number> = { residential: 25, commercial: 40, industrial: 60 }
                              return (
                                <button key={type}
                                  onClick={() => { buildProperty(i, type); forceUpdate(n => n + 1) }}
                                  disabled={liquid < costs[type]}
                                  className="px-1.5 py-1 bg-gray-700/50 hover:bg-gray-600 text-gray-300 text-[8px] rounded transition-all disabled:opacity-50">
                                  {type.slice(0, 3)}
                                </button>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-mono" style={{ color: parcel.color }}>
                              {parcel.buildingType?.slice(0, 3)} Lv.{parcel.buildingLevel}
                              {parcel.tenant ? ' 👤' : ' 🏚️'}
                            </span>
                            {parcel.buildingLevel < 3 && (
                              <button onClick={() => { upgradeBuilding(i); forceUpdate(n => n + 1) }}
                                className="px-1.5 py-1 bg-blue-700/50 hover:bg-blue-600 text-blue-300 text-[8px] rounded transition-all">
                                ↑
                              </button>
                            )}
                          </div>
                        )}
                        <button onClick={() => { sellLand(i); forceUpdate(n => n + 1) }}
                          className="ml-1 px-1.5 py-1 bg-red-800/50 hover:bg-red-700 text-red-300 text-[8px] rounded transition-all">
                          Sell
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between text-[9px] text-gray-600 font-mono mt-1">
                  <span>Size: {parcel.size} · Value: {parcel.currentValue} ≈</span>
                  {parcel.hasBuilding && <span>Rent: {parcel.baseRent}≈/tick {parcel.tenant ? '(paid)' : '(vacant)'}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 py-2.5 border-t border-gray-800 text-center">
          <p className="text-gray-600 text-[9px] font-mono">
            <kbd className="bg-gray-800 text-gray-400 px-1 rounded text-[8px]">U</kbd> Real Estate
            {' · '}Properties attract tenants over time
          </p>
        </div>
      </div>
    </div>
  )
}
