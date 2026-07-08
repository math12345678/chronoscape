// ── Racing Leaderboard — persistent best race times ──────────────

export interface RaceRecord {
  raceId: string
  raceName: string
  bestTime: number // seconds
  bestMashRate: number // mashes per second
  totalRaces: number
  totalWins: number
  totalEarnings: number
}

const STORAGE_KEY = 'chronoscape_race_records'

const RACE_NAMES: Record<string, string> = {
  race_ricky: 'Ricky Rifter',
  race_viper: 'Void Viper',
  race_king: 'Chrono King',
}

function loadRecords(): Record<string, RaceRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return {}
}

function saveRecords(records: Record<string, RaceRecord>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch { /* ignore */ }
}

let _records: Record<string, RaceRecord> = loadRecords()

export function getRaceRecords(): Record<string, RaceRecord> {
  return { ..._records }
}

export function getRaceRecord(raceId: string): RaceRecord | null {
  return _records[raceId] ?? null
}

export function getRaceName(raceId: string): string {
  return RACE_NAMES[raceId] ?? raceId
}

export function hasRaceRecord(raceId: string): boolean {
  return !!_records[raceId]
}

export function recordRaceResult(
  raceId: string,
  time: number,
  mashRate: number,
  won: boolean,
  earnings: number,
): { newBest: boolean; prevBest: number | null } {
  const existing = _records[raceId]
  const prevBest = existing?.bestTime ?? null
  const newBest = !existing || time < existing.bestTime

  _records[raceId] = {
    raceId,
    raceName: RACE_NAMES[raceId] ?? raceId,
    bestTime: newBest ? time : (existing?.bestTime ?? time),
    bestMashRate: existing ? Math.max(existing.bestMashRate, mashRate) : mashRate,
    totalRaces: (existing?.totalRaces ?? 0) + 1,
    totalWins: (existing?.totalWins ?? 0) + (won ? 1 : 0),
    totalEarnings: (existing?.totalEarnings ?? 0) + earnings,
  }

  saveRecords(_records)
  return { newBest, prevBest }
}

export function getTotalRaces(): number {
  return Object.values(_records).reduce((s, r) => s + r.totalRaces, 0)
}

export function getTotalWins(): number {
  return Object.values(_records).reduce((s, r) => s + r.totalWins, 0)
}

export function getTotalEarnings(): number {
  return Object.values(_records).reduce((s, r) => s + r.totalEarnings, 0)
}

export function clearRaceRecords(): void {
  _records = {}
  saveRecords(_records)
}
