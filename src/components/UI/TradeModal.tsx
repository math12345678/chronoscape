import { useCallback, useState } from 'react'
import { useStore } from '../../store'
import type { ShopItemId } from '../../store'
import { SHOP_BLOCK_COLORS } from '../../store'
import { useSoundEngine } from '../../hooks/useSoundEngine'
import { useModalClose } from '../../hooks/useModalClose'

const SHOP_ITEMS: {
  id: ShopItemId
  label: string
  description: string
  icon: string
  cost: number
  color: string
  blockColor?: string
}[] = [
  {
    id: 'capacitySurge',
    label: 'Capacity Surge',
    description: '+100 to all resource capacities permanently',
    icon: '⬡',
    cost: 8,
    color: '#ff8844',
  },
  {
    id: 'blockColorGold',
    label: 'Gold Block Skin',
    description: 'Recolor your blocks in gleaming gold',
    icon: '✦',
    cost: 3,
    color: '#ffd700',
  },
  {
    id: 'blockColorRuby',
    label: 'Ruby Block Skin',
    description: 'Recolor your blocks in fiery ruby red',
    icon: '✦',
    cost: 3,
    color: '#ff4466',
  },
  {
    id: 'blockColorSapphire',
    label: 'Sapphire Block Skin',
    description: 'Recolor your blocks in deep sapphire blue',
    icon: '✦',
    cost: 3,
    color: '#4488ff',
  },
]

interface TradeModalProps {
  onClose: () => void
}

export const TradeModal = ({ onClose }: TradeModalProps) => {
  const { closing, requestClose } = useModalClose(onClose)
  const inventory = useStore((s) => s.inventory)
  const tradeLiquid = useStore((s) => s.tradeLiquidForRenown)
  const tradeCrystal = useStore((s) => s.tradeCrystalForRenown)
  const shopPurchases = useStore((s) => s.shopPurchases)
  const purchaseShopItem = useStore((s) => s.purchaseShopItem)
  const getCurrentLiquidRate = useStore((s) => s.getCurrentLiquidRate)
  const getCurrentCrystalRate = useStore((s) => s.getCurrentCrystalRate)
  const selectedBlockColor = useStore((s) => s.selectedBlockColor)
  const setSelectedBlockColor = useStore((s) => s.setSelectedBlockColor)
  const marketState = useStore((s) => s.marketState)
  const sounds = useSoundEngine()

  const [tradeAmount, setTradeAmount] = useState(1)
  const [message, setMessage] = useState<string | null>(null)
  const [shopTab, setShopTab] = useState<'trade' | 'shop'>('trade')

  const liquid = Math.floor(inventory.liquid)
  const crystal = Math.floor(inventory.crystal)
  const renown = Math.floor(inventory.renown)

  const currentLiquidRate = getCurrentLiquidRate()
  const currentCrystalRate = getCurrentCrystalRate()

  const maxLiquidTrades = Math.floor(liquid / currentLiquidRate)
  const maxCrystalTrades = Math.floor(crystal / currentCrystalRate)

  const showMessage = useCallback((text: string) => {
    setMessage(text)
    setTimeout(() => setMessage(null), 2000)
  }, [])

  const handleTradeLiquid = useCallback(() => {
    const success = tradeLiquid(tradeAmount)
    if (success) {
      showMessage(`Traded ${tradeAmount * currentLiquidRate} Liquid for ${tradeAmount} Renown`)
      sounds.purchase()
    } else {
      showMessage('Not enough Liquid!')
    }
  }, [tradeLiquid, tradeAmount, currentLiquidRate, showMessage, sounds])

  const handleTradeCrystal = useCallback(() => {
    const success = tradeCrystal(tradeAmount)
    if (success) {
      showMessage(`Traded ${tradeAmount * currentCrystalRate} Crystal for ${tradeAmount} Renown`)
      sounds.purchase()
    } else {
      showMessage('Not enough Crystal!')
    }
  }, [tradeCrystal, tradeAmount, currentCrystalRate, showMessage, sounds])

  const handlePurchase = useCallback((id: ShopItemId) => {
    const success = purchaseShopItem(id)
    if (success) {
      const item = SHOP_ITEMS.find((i) => i.id === id)
      showMessage(`Purchased ${item?.label ?? id}!`)
      sounds.purchase()
    } else {
      showMessage('Not enough Renown or already owned!')
    }
  }, [purchaseShopItem, showMessage, sounds])

  const marketArrow = (value: number) => {
    if (value > 1.05) return '▲'
    if (value < 0.95) return '▼'
    return '◆'
  }

  const marketColor = (value: number) => {
    if (value > 1.05) return 'text-green-400'
    if (value < 0.95) return 'text-red-400'
    return 'text-gray-400'
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-150"
        style={{ opacity: closing ? 0 : 1 }}
        onClick={requestClose}
      />
      <div
        className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          animation: closing ? undefined : 'modal-pop-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          transition: 'opacity 0.18s ease, transform 0.18s ease',
          opacity: closing ? 0 : 1,
          transform: closing ? 'translate(-50%, -50%) scale(0.95)' : 'translate(-50%, -50%) scale(1)',
        }}
      >
        <div className="bg-gray-900/95 border border-yellow-700/40 rounded-xl shadow-2xl shadow-yellow-500/10 overflow-hidden" style={{ width: 420, maxHeight: '85vh' }}>
          {/* Header */}
          <div className="px-5 py-4 border-b border-yellow-800/30 flex items-center justify-between bg-gradient-to-r from-yellow-950/30 to-gray-900">
            <div>
              <h2 className="text-white font-bold text-lg tracking-wide flex items-center gap-2">
                <span className="text-yellow-400">⟐</span> Time Trader
              </h2>
              <p className="text-gray-500 text-xs mt-0.5">
                Convert resources — prices fluctuate with supply
              </p>
            </div>
            <button onClick={requestClose} className="text-gray-500 hover:text-white p-1 rounded hover:bg-gray-800">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4l10 10M14 4l-10 10" />
              </svg>
            </button>
          </div>

          {/* Tab bar */}
          <div className="flex border-b border-gray-800">
            {(['trade', 'shop'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setShopTab(tab)}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                  shopTab === tab
                    ? 'text-yellow-400 border-b-2 border-yellow-400 bg-yellow-950/20'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {tab === 'trade' ? 'Exchange' : 'Shop'}
              </button>
            ))}
          </div>

          {/* Body */}
          <div className="px-5 py-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 140px)' }}>
            {/* Current balance */}
            <div className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/30 flex items-center justify-between">
              <span className="text-yellow-400 text-sm font-bold">Renown</span>
              <span className="text-white font-mono text-lg tabular-nums">{renown}</span>
            </div>

            {shopTab === 'trade' ? (
              <>
                {/* Market indicators */}
                <div className="flex gap-2 text-[10px] font-mono">
                  <div className={`flex-1 bg-gray-800/30 rounded p-2 border border-gray-700/30 ${marketColor(marketState.liquid)}`}>
                    <span className="text-gray-500">Liquid Market </span>
                    {marketArrow(marketState.liquid)} {(marketState.liquid * 100).toFixed(0)}%
                  </div>
                  <div className={`flex-1 bg-gray-800/30 rounded p-2 border border-gray-700/30 ${marketColor(marketState.crystal)}`}>
                    <span className="text-gray-500">Crystal Market </span>
                    {marketArrow(marketState.crystal)} {(marketState.crystal * 100).toFixed(0)}%
                  </div>
                </div>

                {/* Trade amount selector */}
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-xs">Amount:</span>
                  <button
                    onClick={() => setTradeAmount(Math.max(1, tradeAmount - 1))}
                    className="w-7 h-7 rounded bg-gray-800 text-white hover:bg-gray-700 text-sm"
                  >−</button>
                  <span className="text-white font-mono w-8 text-center">{tradeAmount}</span>
                  <button
                    onClick={() => setTradeAmount(Math.min(10, tradeAmount + 1))}
                    className="w-7 h-7 rounded bg-gray-800 text-white hover:bg-gray-700 text-sm"
                  >+</button>
                </div>

                {/* Trade Liquid */}
                <div className="bg-gray-800/30 border border-gray-700/40 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-blue-400 text-sm font-bold">Liquid → Renown</p>
                      <p className="text-gray-500 text-[10px]">
                        {currentLiquidRate} Liquid → 1 Renown · You have {liquid}
                        {marketState.liquid !== 1.0 && (
                          <span className={`ml-1 ${marketColor(marketState.liquid)}`}>
                            ({marketState.liquid > 1 ? 'premium' : 'discount'})
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={handleTradeLiquid}
                      disabled={maxLiquidTrades < tradeAmount}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                        maxLiquidTrades >= tradeAmount
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:brightness-110 active:scale-95'
                          : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                      }`}
                    >
                      Trade {tradeAmount * currentLiquidRate}◎
                    </button>
                  </div>
                  <p className="text-gray-600 text-[10px]">
                    Will receive <span className="text-yellow-400">{tradeAmount} Renown</span>
                  </p>
                </div>

                {/* Trade Crystal */}
                <div className="bg-gray-800/30 border border-gray-700/40 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-violet-400 text-sm font-bold">Crystal → Renown</p>
                      <p className="text-gray-500 text-[10px]">
                        {currentCrystalRate} Crystal → 1 Renown · You have {crystal}
                        {marketState.crystal !== 1.0 && (
                          <span className={`ml-1 ${marketColor(marketState.crystal)}`}>
                            ({marketState.crystal > 1 ? 'premium' : 'discount'})
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={handleTradeCrystal}
                      disabled={maxCrystalTrades < tradeAmount}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                        maxCrystalTrades >= tradeAmount
                          ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:brightness-110 active:scale-95'
                          : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                      }`}
                    >
                      Trade {tradeAmount * currentCrystalRate}◆
                    </button>
                  </div>
                  <p className="text-gray-600 text-[10px]">
                    Will receive <span className="text-yellow-400">{tradeAmount} Renown</span>
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* Shop */}
                <div className="space-y-2">
                  {SHOP_ITEMS.map((item) => {
                    const owned = shopPurchases[item.id]
                    const canAfford = renown >= item.cost

                    // For block colors, check if already selected
                    const isColorItem = item.id.startsWith('blockColor')
                    const isSelected = isColorItem && selectedBlockColor === item.id

                    return (
                      <div
                        key={item.id}
                        className={`
                          relative rounded-lg border transition-all duration-200 overflow-hidden
                          ${owned
                            ? 'border-green-700/30 bg-green-900/15'
                            : canAfford
                              ? 'border-gray-700/50 bg-gray-800/40 hover:border-yellow-700/50 hover:bg-gray-800/60'
                              : 'border-gray-700/30 bg-gray-800/30 opacity-60'
                          }
                        `}
                      >
                        <div className="px-4 py-3">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-lg" style={{ color: item.color }}>{item.icon}</span>
                              <div>
                                <p className="text-white text-sm font-bold">{item.label}</p>
                                <p className="text-gray-500 text-[10px]">{item.description}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {owned && !isColorItem && (
                                <span className="text-green-400 text-[10px] font-bold">✓ Owned</span>
                              )}
                              {isSelected && (
                                <span className="text-cyan-400 text-[10px] font-bold bg-cyan-900/30 px-1.5 py-0.5 rounded">Active</span>
                              )}
                              <button
                                onClick={() => {
                                  if (owned) {
                                    if (isColorItem) {
                                      setSelectedBlockColor(isSelected ? null : item.id)
                                      showMessage(isSelected ? 'Default skin restored' : `${item.label} activated!`)
                                    }
                                    return
                                  }
                                  handlePurchase(item.id)
                                }}
                                disabled={!canAfford && !owned}
                                className={`
                                  px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap
                                  ${owned
                                    ? isColorItem
                                      ? isSelected
                                        ? 'bg-cyan-900/30 text-cyan-300 border border-cyan-700/50'
                                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700/50'
                                      : 'bg-green-900/30 text-green-400 cursor-default'
                                    : canAfford
                                      ? 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white hover:brightness-110 active:scale-95'
                                      : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                                  }
                                `}
                              >
                                {owned
                                  ? isColorItem
                                    ? isSelected ? 'Active' : 'Equip'
                                    : 'Owned'
                                  : `Buy ${item.cost}◎`
                                }
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Active color indicator */}
                {selectedBlockColor && (
                  <div className="text-center text-[10px] text-gray-500 font-mono">
                    Block skin active. Build to see the effect.
                  </div>
                )}
              </>
            )}

            {/* Message */}
            {message && (
              <div className="text-center text-xs text-green-400 animate-pulse">
                {message}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-2.5 border-t border-gray-800 text-center">
            <p className="text-gray-600 text-[10px] font-mono">
              <kbd className="bg-gray-800 text-gray-400 px-1 rounded text-[9px]">T</kbd> Trade
              {' · '}
              <kbd className="bg-gray-800 text-gray-400 px-1 rounded text-[9px]">I</kbd> Time Shrine
              {' · '}Prices change with supply
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
