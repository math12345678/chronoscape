// ── Inventory Overhaul — sorting, filtering, bulk actions ──

import { useStore } from '../store'

export type SortField = 'name' | 'quantity' | 'type'
export type SortDir = 'asc' | 'desc'
export type FilterType = 'all' | 'raw' | 'crafted' | 'refined' | 'special'

export interface InventoryItem {
  id: string
  name: string
  type: FilterType
  quantity: number
  icon: string
  color: string
  canSell: boolean
  sellPrice: number // in raw
  canRefine: boolean
  refineInto: string | null
  refineRate: number // units per refine
  category: string
}

/** Define known inventory items beyond the basic 5 resources */
const _ALL_ITEMS: InventoryItem[] = [
  // Raw resources
  { id: 'raw', name: 'Raw Chrono Energy', type: 'raw', quantity: 0, icon: '🪨', color: '#44ff88', canSell: true, sellPrice: 1, canRefine: true, refineInto: 'vapour', refineRate: 5, category: 'Resources' },
  { id: 'vapour', name: 'Chrono Vapour', type: 'refined', quantity: 0, icon: '💨', color: '#88ffcc', canSell: true, sellPrice: 3, canRefine: true, refineInto: 'liquid', refineRate: 3, category: 'Refined' },
  { id: 'liquid', name: 'Time Liquid', type: 'refined', quantity: 0, icon: '💧', color: '#44aaff', canSell: true, sellPrice: 8, canRefine: true, refineInto: 'crystal', refineRate: 2, category: 'Refined' },
  { id: 'crystal', name: 'Chrono Crystal', type: 'refined', quantity: 0, icon: '💎', color: '#cc88ff', canSell: true, sellPrice: 25, canRefine: false, refineInto: null, refineRate: 0, category: 'Refined' },
  { id: 'renown', name: 'Renown', type: 'special', quantity: 0, icon: '⭐', color: '#ffd700', canSell: false, sellPrice: 0, canRefine: false, refineInto: null, refineRate: 0, category: 'Currency' },

  // Crafted items (from crafting overhaul)
  { id: 'gear_basic', name: 'Basic Chrono Gear', type: 'crafted', quantity: 0, icon: '⚙️', color: '#88aacc', canSell: true, sellPrice: 10, canRefine: false, refineInto: null, refineRate: 0, category: 'Gear' },
  { id: 'gear_enhanced', name: 'Enhanced Chrono Gear', type: 'crafted', quantity: 0, icon: '⚙️', color: '#44aaff', canSell: true, sellPrice: 50, canRefine: false, refineInto: null, refineRate: 0, category: 'Gear' },
  { id: 'potion_speed', name: 'Speed Potion', type: 'crafted', quantity: 0, icon: '🧪', color: '#44ff88', canSell: true, sellPrice: 15, canRefine: false, refineInto: null, refineRate: 0, category: 'Potions' },
  { id: 'potion_power', name: 'Power Potion', type: 'crafted', quantity: 0, icon: '🧪', color: '#ff4444', canSell: true, sellPrice: 20, canRefine: false, refineInto: null, refineRate: 0, category: 'Potions' },
  { id: 'rift_stabilizer', name: 'Rift Stabilizer', type: 'crafted', quantity: 0, icon: '🔮', color: '#aa88ff', canSell: true, sellPrice: 40, canRefine: false, refineInto: null, refineRate: 0, category: 'Tools' },
  { id: 'time_bomb', name: 'Time Bomb', type: 'crafted', quantity: 0, icon: '💣', color: '#ff8844', canSell: true, sellPrice: 30, canRefine: false, refineInto: null, refineRate: 0, category: 'Weapons' },
  { id: 'chrono_shield', name: 'Chrono Shield', type: 'crafted', quantity: 0, icon: '🛡️', color: '#44ddff', canSell: true, sellPrice: 60, canRefine: false, refineInto: null, refineRate: 0, category: 'Armor' },
  { id: 'time_key', name: 'Time Key', type: 'crafted', quantity: 0, icon: '🗝️', color: '#ffd700', canSell: true, sellPrice: 100, canRefine: false, refineInto: null, refineRate: 0, category: 'Keys' },
  { id: 'chrono_core', name: 'Chrono Core', type: 'crafted', quantity: 0, icon: '🟊', color: '#ff00aa', canSell: true, sellPrice: 200, canRefine: false, refineInto: null, refineRate: 0, category: 'Cores' },
  { id: 'artifact_temporal', name: 'Temporal Artifact', type: 'crafted', quantity: 0, icon: '🏺', color: '#ffaa44', canSell: true, sellPrice: 500, canRefine: false, refineInto: null, refineRate: 0, category: 'Artifacts' },

  // Special resources
  { id: 'time_shard', name: 'Time Shard', type: 'special', quantity: 0, icon: '💠', color: '#44ffcc', canSell: true, sellPrice: 50, canRefine: false, refineInto: null, refineRate: 0, category: 'Special' },
  { id: 'void_essence', name: 'Void Essence', type: 'special', quantity: 0, icon: '🌀', color: '#aa44ff', canSell: true, sellPrice: 150, canRefine: false, refineInto: null, refineRate: 0, category: 'Special' },
  { id: 'chrono_dust', name: 'Chrono Dust', type: 'special', quantity: 0, icon: '✨', color: '#ff8844', canSell: true, sellPrice: 500, canRefine: false, refineInto: null, refineRate: 0, category: 'Special' },
  { id: 'omega_alloy', name: 'Omega Alloy', type: 'special', quantity: 0, icon: '🔶', color: '#ff0044', canSell: true, sellPrice: 2000, canRefine: false, refineInto: null, refineRate: 0, category: 'Special' },

  // World boss drops
  { id: 'void_core', name: 'Void Core', type: 'special', quantity: 0, icon: '🟣', color: '#8822ff', canSell: true, sellPrice: 300, canRefine: false, refineInto: null, refineRate: 0, category: 'Boss Drops' },
  { id: 'titan_heart', name: 'Titan Heart', type: 'special', quantity: 0, icon: '❤️', color: '#ff4444', canSell: true, sellPrice: 800, canRefine: false, refineInto: null, refineRate: 0, category: 'Boss Drops' },
  { id: 'omega_fragment', name: 'Omega Fragment', type: 'special', quantity: 0, icon: '🔴', color: '#ff0044', canSell: true, sellPrice: 5000, canRefine: false, refineInto: null, refineRate: 0, category: 'Boss Drops' },
]

// ── Track crafted/special items ──

let _craftedItems: Record<string, number> = {}

export function addCraftedItem(id: string, amount: number): void {
  _craftedItems[id] = (_craftedItems[id] ?? 0) + amount
}

export function removeCraftedItem(id: string, amount: number): boolean {
  const current = _craftedItems[id] ?? 0
  if (current < amount) return false
  _craftedItems[id] = current - amount
  return true
}

export function getCraftedItemQty(id: string): number {
  return _craftedItems[id] ?? 0
}

/** Build item list with current quantities */
export function getInventoryItems(): InventoryItem[] {
  const state = useStore.getState().inventory

  return _ALL_ITEMS.map((item) => {
    // Basic resources from store
    if (item.id === 'raw') return { ...item, quantity: state.raw }
    if (item.id === 'vapour') return { ...item, quantity: state.vapour }
    if (item.id === 'liquid') return { ...item, quantity: state.liquid }
    if (item.id === 'crystal') return { ...item, quantity: state.crystal }
    if (item.id === 'renown') return { ...item, quantity: state.renown }

    // Crafted/special items from tracking
    return { ...item, quantity: _craftedItems[item.id] ?? 0 }
  })
}

/** Bulk sell all of a given type */
export function bulkSell(type: 'raw' | 'crafted' | 'refined' | 'special', keepAmount?: number): number {
  const items = getInventoryItems().filter((i) => i.type === type && i.canSell)
  let totalRaw = 0

  useStore.setState((s) => {
    let newInv = { ...s.inventory }

    for (const item of items) {
      if (item.id === 'raw') { /* handled below */ }
      else if (item.id === 'vapour') { const sell = keepAmount ? Math.max(0, item.quantity - keepAmount) : item.quantity; totalRaw += sell * item.sellPrice; }
      else if (item.id === 'liquid') { const sell = keepAmount ? Math.max(0, item.quantity - keepAmount) : item.quantity; totalRaw += sell * item.sellPrice; }
      else if (item.id === 'crystal') { const sell = keepAmount ? Math.max(0, item.quantity - keepAmount) : item.quantity; totalRaw += sell * item.sellPrice; }
      else if (item.type === 'crafted') { const sell = keepAmount ? Math.max(0, item.quantity - keepAmount) : item.quantity; totalRaw += sell * item.sellPrice; }
      else if (item.type === 'special') { const sell = keepAmount ? Math.max(0, item.quantity - keepAmount) : item.quantity; totalRaw += sell * item.sellPrice; }
    }

    return { inventory: { ...newInv, raw: newInv.raw + totalRaw } }
  })

  // Remove crafted/special items
  for (const item of items) {
    if (item.type !== 'raw') {
      const keep = keepAmount ?? 0
      const current = _craftedItems[item.id] ?? 0
      _craftedItems[item.id] = Math.max(0, current - keep)
    }
  }

  return totalRaw
}

/** Bulk refine all raw to the highest possible tier */
export function bulkRefineAll(): void {
  const state = useStore.getState()
  let { raw, vapour, liquid, crystal } = state.inventory

  // raw → vapour
  const vRefines = Math.floor(raw / 5)
  raw -= vRefines * 5
  vapour += vRefines

  // vapour → liquid
  const lRefines = Math.floor(vapour / 3)
  vapour -= lRefines * 3
  liquid += lRefines

  // liquid → crystal
  const cRefines = Math.floor(liquid / 2)
  liquid -= cRefines * 2
  crystal += cRefines

  useStore.setState({ inventory: { ...state.inventory, raw, vapour, liquid, crystal } })
}

/** Search items by name */
export function searchItems(query: string): InventoryItem[] {
  const items = getInventoryItems()
  if (!query.trim()) return items
  const lower = query.toLowerCase()
  return items.filter((i) => i.name.toLowerCase().includes(lower))
}

/** Sort items */
export function sortItems(items: InventoryItem[], field: SortField, dir: SortDir): InventoryItem[] {
  return [...items].sort((a, b) => {
    let cmp = 0
    if (field === 'name') cmp = a.name.localeCompare(b.name)
    else if (field === 'quantity') cmp = a.quantity - b.quantity
    else if (field === 'type') cmp = a.type.localeCompare(b.type)
    return dir === 'asc' ? cmp : -cmp
  })
}

export function serializeItems(): Record<string, number> {
  return { ..._craftedItems }
}

export function loadItems(data: Record<string, number>): void {
  _craftedItems = { ...data }
}
