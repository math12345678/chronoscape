import { useState, useEffect, useCallback } from 'react'
import { useStore, SHOP_BLOCK_COLORS } from '../../store'
import type { ShopItemId } from '../../store'
import { SINGLE_COLOR_COST } from '../../config/constants'

const COLOR_ENTRIES = Object.entries(SHOP_BLOCK_COLORS)

/**
 * Block Color Customization panel.
 * Opens when the player presses `3` while in build mode.
 * Shows shop-purchased colors + ability to buy new ones.
 * Selected color applies to all newly placed blocks.
 */
export const BlockColorPicker = () => {
  const [open, setOpen] = useState(false)
  const selectedBlockColor = useStore((s) => s.selectedBlockColor)
  const setSelectedBlockColor = useStore((s) => s.setSelectedBlockColor)
  const shopPurchases = useStore((s) => s.shopPurchases)
  const purchaseShopItem = useStore((s) => s.purchaseShopItem)
  const inventory = useStore((s) => s.inventory)
  const selectedBlockType = useStore((s) => s.selectedBlockType)
  const [message, setMessage] = useState('')

  // Listen for custom blueprint-toggle event from keyboard shortcuts
  useEffect(() => {
    const handler = () => {
      if (useStore.getState().selectedBlockType) {
        setOpen((o) => !o)
      }
    }
    window.addEventListener('colorpicker-toggle', handler)
    return () => window.removeEventListener('colorpicker-toggle', handler)
  }, [])

  useEffect(() => {
    if (!selectedBlockType) setOpen(false)
  }, [selectedBlockType])

  const handleSelect = useCallback((colorKey: string | null) => {
    setSelectedBlockColor(colorKey)
    setMessage(`Color set to ${colorKey ? (SHOP_BLOCK_COLORS[colorKey]?.label ?? 'Custom') : 'Default'}`)
    setTimeout(() => setMessage(''), 1500)
  }, [setSelectedBlockColor])

  const handleBuy = useCallback((colorKey: string) => {
    const shopId = `blockColor${colorKey.charAt(0).toUpperCase() + colorKey.slice(1)}` as ShopItemId
    if (!shopPurchases[shopId as keyof typeof shopPurchases]) {
      const success = purchaseShopItem(shopId)
      if (success) {
        setMessage(`Unlocked ${SHOP_BLOCK_COLORS[colorKey].label}!`)
        setTimeout(() => setMessage(''), 2000)
      } else {
        setMessage(`Need ${SINGLE_COLOR_COST} Renown!`)
        setTimeout(() => setMessage(''), 2000)
      }
    }
  }, [shopPurchases, purchaseShopItem])

  if (!open) return null

  return (
    <div className="fixed bottom-36 left-1/2 -translate-x-1/2 z-50 select-none">
      <div
        className="bg-gray-900/95 border border-gray-700/50 rounded-xl shadow-2xl overflow-hidden"
        style={{
          width: 340,
          animation: 'modal-pop-in 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-xs uppercase tracking-wider">
              Block Colors
            </span>
            <span className="text-[10px] text-gray-500 font-mono">Press 3</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-gray-500 hover:text-white transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Color grid */}
        <div className="p-3">
          {/* Current color preview */}
          <div className="mb-3 flex items-center gap-3 bg-gray-800/40 rounded-lg p-2.5 border border-gray-700/30">
            <div
              className="w-8 h-8 rounded-lg border border-white/20"
              style={{
                backgroundColor: selectedBlockColor
                  ? SHOP_BLOCK_COLORS[selectedBlockColor]?.vapour ?? '#ffaa00'
                  : '#ffaa00',
              }}
            />
            <div className="flex-1">
              <p className="text-white text-xs font-medium">
                {selectedBlockColor ? SHOP_BLOCK_COLORS[selectedBlockColor]?.label ?? 'Custom' : 'Default'}
              </p>
              <p className="text-gray-500 text-[10px] font-mono">
                Selected color — all new blocks
              </p>
            </div>
            {selectedBlockColor && (
              <button
                onClick={() => handleSelect(null)}
                className="text-[10px] text-gray-500 hover:text-white bg-gray-800 px-2 py-1 rounded transition-all"
              >
                Reset
              </button>
            )}
          </div>

          {message && (
            <p className="text-teal-400 text-[10px] text-center mb-2 font-mono animate-pulse">
              {message}
            </p>
          )}

          {/* Default option */}
          <button
            onClick={() => handleSelect(null)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg mb-2 transition-all ${
              !selectedBlockColor
                ? 'bg-teal-900/30 border border-teal-700/40'
                : 'bg-gray-800/40 border border-gray-700/20 hover:bg-gray-800/60'
            }`}
          >
            <div className="w-6 h-6 rounded border border-white/10 bg-gradient-to-br from-amber-400 to-amber-600" />
            <div className="flex-1 text-left">
              <p className="text-white text-xs font-medium">Default</p>
              <p className="text-gray-500 text-[9px] font-mono">Amber / Violet (free)</p>
            </div>
            {!selectedBlockColor && <span className="text-teal-400 text-[10px]">✓ Active</span>}
          </button>

          {/* Shop colors */}
          <div className="grid grid-cols-4 gap-2">
            {COLOR_ENTRIES.map(([key, color]) => {
              const shopId = `blockColor${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof typeof shopPurchases
              const owned = shopPurchases[shopId]
              const isActive = selectedBlockColor === key
              return (
                <button
                  key={key}
                  onClick={() => {
                    if (owned) {
                      handleSelect(key)
                    } else {
                      handleBuy(key)
                    }
                  }}
                  className={`
                    relative flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all
                    ${isActive
                      ? 'bg-teal-900/30 border border-teal-700/50 ring-1 ring-teal-500/30'
                      : owned
                        ? 'bg-gray-800/40 border border-gray-700/30 hover:bg-gray-800/60 hover:border-gray-600/50'
                        : 'bg-gray-800/20 border border-gray-700/20 opacity-60 hover:opacity-80'
                    }
                  `}
                  title={`${color.label}${owned ? ' (owned)' : ` — ${SINGLE_COLOR_COST} Renown`}`}
                >
                  {/* Color swatch */}
                  <div
                    className="w-7 h-7 rounded-md border border-white/10"
                    style={{ backgroundColor: color.vapour }}
                  />
                  <span className="text-[8px] text-gray-400 font-mono truncate w-full text-center">
                    {owned ? color.label : `+${SINGLE_COLOR_COST}⟐`}
                  </span>
                  {isActive && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-teal-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-[6px]">✓</span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-800 flex items-center justify-between">
          <p className="text-[9px] text-gray-600 font-mono">
            3 Open · Click to buy/select
          </p>
          <p className="text-[9px] text-gray-600 font-mono">
            Renown: {Math.floor(inventory.renown)}
          </p>
        </div>
      </div>
    </div>
  )
}
