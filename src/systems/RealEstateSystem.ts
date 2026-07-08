import { useStore } from '../store'
import { LAND_PARCELS } from '../config/finance'
import type { LandParcel } from '../config/finance'

// ── Module-level real estate state ─────────────────────
export let _parcels = LAND_PARCELS.map(p => ({ ...p }))
export let _totalRentCollected = 0
const RENT_MULTIPLIERS = { rentYield: 1 }

export function setRentMultiplier(key: 'rentYield', value: number) {
  RENT_MULTIPLIERS[key] = value
}

export function getParcels(): LandParcel[] { return [..._parcels] }
export function getTotalRentCollected(): number { return _totalRentCollected }
export function getTotalPropertyValue(): number {
  return _parcels.filter(p => p.owned).reduce((sum, p) => sum + p.currentValue, 0)
}

/** Buy a land parcel */
export function buyLand(parcelIndex: number): boolean {
  const parcel = _parcels[parcelIndex]
  if (!parcel || parcel.owned) return false
  const state = useStore.getState()
  if (state.inventory.liquid < parcel.currentValue) return false
  useStore.setState((s) => ({
    inventory: { ...s.inventory, liquid: s.inventory.liquid - parcel.currentValue },
  }))
  _parcels[parcelIndex] = { ...parcel, owned: true }
  return true
}

/** Sell a land parcel (recoup 70% of value) */
export function sellLand(parcelIndex: number): boolean {
  const parcel = _parcels[parcelIndex]
  if (!parcel || !parcel.owned) return false
  const sellValue = Math.floor(parcel.currentValue * 0.7)
  useStore.setState((s) => ({
    inventory: { ...s.inventory, liquid: s.inventory.liquid + sellValue },
  }))
  _parcels[parcelIndex] = { ...parcel, owned: false, hasBuilding: false, buildingType: null, buildingLevel: 0, tenant: false }
  return true
}

/** Build a property on owned land */
export function buildProperty(parcelIndex: number, type: 'residential' | 'commercial' | 'industrial'): boolean {
  const parcel = _parcels[parcelIndex]
  if (!parcel || !parcel.owned || parcel.hasBuilding) return false
  const costs: Record<string, number> = { residential: 25, commercial: 40, industrial: 60 }
  const cost = costs[type]
  const state = useStore.getState()
  if (state.inventory.liquid < cost) return false
  useStore.setState((s) => ({
    inventory: { ...s.inventory, liquid: s.inventory.liquid - cost },
  }))
  const rentBases: Record<string, number> = { residential: 3, commercial: 6, industrial: 10 }
  _parcels[parcelIndex] = {
    ...parcel, hasBuilding: true, buildingType: type, buildingLevel: 1,
    baseRent: rentBases[type] * parcel.size, tenant: false,
  }
  return true
}

/** Upgrade a building */
export function upgradeBuilding(parcelIndex: number): boolean {
  const parcel = _parcels[parcelIndex]
  if (!parcel || !parcel.owned || !parcel.hasBuilding || parcel.buildingLevel >= 3) return false
  const cost = 30 * parcel.buildingLevel
  const state = useStore.getState()
  if (state.inventory.liquid < cost) return false
  useStore.setState((s) => ({
    inventory: { ...s.inventory, liquid: s.inventory.liquid - cost },
  }))
  _parcels[parcelIndex] = {
    ...parcel, buildingLevel: parcel.buildingLevel + 1,
    baseRent: Math.floor(parcel.baseRent * 1.5),
  }
  return true
}

/** Collect rent from all properties. Call from economy tick. */
export function tickRent(boostMultiplier: number = 1): number {
  let totalRent = 0
  for (let i = 0; i < _parcels.length; i++) {
    const p = _parcels[i]
    if (!p.owned || !p.hasBuilding || !p.tenant) continue
    const rent = Math.floor(p.baseRent * RENT_MULTIPLIERS.rentYield * boostMultiplier)
    if (rent > 0) {
      useStore.setState((s) => ({
        inventory: { ...s.inventory, liquid: s.inventory.liquid + rent },
      }))
      totalRent += rent
      _totalRentCollected += rent
    }
  }
  return totalRent
}

/** Fluctuate property values based on market. Call from economy tick. */
export function tickPropertyValues() {
  for (let i = 0; i < _parcels.length; i++) {
    const p = _parcels[i]
    const fluctuation = (Math.random() - 0.5) * p.basePrice * 0.05
    _parcels[i] = {
      ...p,
      currentValue: Math.max(p.basePrice * 0.5, Math.floor(p.currentValue + fluctuation)),
    }
  }
}

/** Find tenants for vacant buildings. Call from economy tick. */
export function findTenants() {
  for (let i = 0; i < _parcels.length; i++) {
    const p = _parcels[i]
    if (!p.owned || !p.hasBuilding || p.tenant) continue
    if (Math.random() < 0.1) {
      _parcels[i] = { ...p, tenant: true }
    }
  }
}
