import { useState, useEffect, useCallback, useRef } from 'react'
import { getTimeCreditBalance, spendTimeCredit } from '../../config/timeCredit'
import { triggerShake } from '../../hooks/useScreenShake'
import { playClickSound } from '../../utils/audio'
import { UI } from '../../utils/uiStyles'

// ── Drag Race Module ─────────────────────────────────
interface RaceConfig {
  distance: number
  entryFee: number
  prizePool: number
  difficulty: 'easy' | 'medium' | 'hard'
  opponentName: string
  opponentSpeed: number
}

const RACES: RaceConfig[] = [
  { distance: 100, entryFee: 50, prizePool: 150, difficulty: 'easy', opponentName: 'Ricky Rifter', opponentSpeed: 12 },
  { distance: 200, entryFee: 150, prizePool: 500, difficulty: 'medium', opponentName: 'Void Viper', opponentSpeed: 16 },
  { distance: 400, entryFee: 500, prizePool: 2000, difficulty: 'hard', opponentName: 'Chrono King', opponentSpeed: 20 },
]

// ── Vehicle upgrade config (persisted in localStorage) ─
export interface VehicleUpgrades {
  engineLevel: number    // 0-3, +3 speed per level
  handlingLevel: number  // 0-2, less drift penalty
  boostLevel: number     // 0-2, better boost
  paintJob: boolean
}

let _upgrades: VehicleUpgrades = { engineLevel: 0, handlingLevel: 0, boostLevel: 0, paintJob: false }

export function getVehicleUpgrades(): VehicleUpgrades { return { ..._upgrades } }

export function upgradeVehicle(slot: 'engineLevel' | 'handlingLevel' | 'boostLevel' | 'paintJob'): boolean {
  const costs: Record<string, number> = {
    engineLevel: _upgrades.engineLevel === 0 ? 100 : _upgrades.engineLevel === 1 ? 500 : 2000,
    handlingLevel: _upgrades.handlingLevel === 0 ? 300 : 800,
    boostLevel: _upgrades.boostLevel === 0 ? 750 : 1500,
    paintJob: 200,
  }
  const maxLevels: Record<string, number> = { engineLevel: 3, handlingLevel: 2, boostLevel: 2, paintJob: 1 }
  if (slot === 'paintJob' && _upgrades.paintJob) return false
  if (slot !== 'paintJob' && (_upgrades[slot as keyof VehicleUpgrades] as number) >= maxLevels[slot]) return false

  const cost = costs[slot]
  if (!spendTimeCredit(cost)) return false
  if (slot === 'paintJob') _upgrades.paintJob = true
  else (_upgrades as any)[slot]++
  return true
}

export function getVehicleSpeedBonus(): number {
  return _upgrades.engineLevel * 3
}

export function getVehicleHandlingBonus(): number {
  return _upgrades.handlingLevel * 0.15
}

export function getVehicleBoostBonus(): number {
  return _upgrades.boostLevel * 0.3
}

// ── Race state ───────────────────────────────────────
let _raceActive = false
let _raceProgress = 0
let _opponentProgress = 0
let _raceStartTime = 0
let _raceFinished = false
let _raceWon = false
let _currentRace: RaceConfig | null = null
let _buttonMasher = 0
let _lastMashTime = 0

export function isRaceActive() { return _raceActive }
export function getRaceProgress() { return _raceProgress }
export function getOpponentProgress() { return _opponentProgress }
export function getRaceDistance() { return _currentRace?.distance ?? 100 }
export function getRaceFinished() { return _raceFinished }
export function getRaceWon() { return _raceWon }

export function startRace(raceIndex: number): boolean {
  const race = RACES[raceIndex]
  if (!race || _raceActive) return false
  if (!spendTimeCredit(race.entryFee)) return false

  _raceActive = true
  _raceProgress = 0
  _opponentProgress = 0
  _raceStartTime = performance.now()
  _raceFinished = false
  _raceWon = false
  _currentRace = race
  _buttonMasher = 0
  _lastMashTime = 0

  window.dispatchEvent(new CustomEvent('race-start', { detail: { name: race.opponentName } }))
  return true
}

export function mashRaceButton(): void {
  if (!_raceActive || _raceFinished) return
  const now = performance.now()
  // Anti-spam: max 20 mashes/sec
  if (now - _lastMashTime < 50) return
  _lastMashTime = now
  _buttonMasher++
  const speed = 0.3 + getVehicleSpeedBonus() * 0.1 + getBoostPickupBonus()
  _raceProgress += speed
  triggerShake(0.05, 10, 0.05)
}

let _boostPickupBonus = 0
export function getBoostPickupBonus() { return _boostPickupBonus }
export function setBoostPickupBonus(v: number) { _boostPickupBonus = v }

export function tickRace(dt: number): void {
  if (!_raceActive || _raceFinished || !_currentRace) return

  // Opponent auto-progresses
  const oppSpeed = _currentRace.opponentSpeed * dt + Math.random() * 0.5
  _opponentProgress += oppSpeed

  if (_raceProgress >= _currentRace.distance || _opponentProgress >= _currentRace.distance) {
    _raceFinished = true
    _raceWon = _raceProgress >= _currentRace.distance && _raceProgress >= _opponentProgress
    _raceActive = false
    if (_raceWon) {
      triggerShake(0.5, 5, 0.5)
      window.dispatchEvent(new CustomEvent('race-win', {
        detail: { prize: _currentRace.prizePool },
      }))
    } else {
      window.dispatchEvent(new CustomEvent('race-lose'))
    }
  }
}

export function claimRacePrize(): boolean {
  if (!_raceFinished || !_raceWon || !_currentRace) return false
  spendTimeCredit(-_currentRace.prizePool) // negative = add
  return true
}

export function getRaces() { return RACES }
