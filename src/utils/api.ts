/**
 * Chronoscape backend API client.
 * Communicates with the Hono + SQLite server for cloud saves and leaderboard.
 */

const API_BASE = import.meta.env.VITE_API_URL ?? ''

interface ApiResponse {
  success?: boolean
  error?: string
  [key: string]: unknown
}

/**
 * Save game state to the cloud.
 */
export async function cloudSaveGame(playerId: string, gameState: unknown): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/saves`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, gameState }),
    })
    const data: ApiResponse = await res.json()
    return data.success === true
  } catch {
    return false
  }
}

/**
 * Load game state from the cloud.
 */
export async function cloudLoadGame(playerId: string): Promise<unknown | null> {
  try {
    const res = await fetch(`${API_BASE}/api/saves/${encodeURIComponent(playerId)}`)
    if (!res.ok) return null
    const data = await res.json()
    return data.gameState ?? null
  } catch {
    return null
  }
}

/**
 * Submit a time trial score to the leaderboard.
 */
export async function submitLeaderboardScore(entry: {
  playerName: string
  timeMs: number
  blocksPlaced?: number
  formulasDiscovered?: number
  renown?: number
}): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/leaderboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    })
    const data: ApiResponse = await res.json()
    return data.success === true
  } catch {
    return false
  }
}

/**
 * Fetch the leaderboard.
 */
export async function fetchLeaderboard(limit: number = 20): Promise<LeaderboardEntry[]> {
  try {
    const res = await fetch(`${API_BASE}/api/leaderboard?limit=${limit}`)
    const data = await res.json()
    return data.entries ?? []
  } catch {
    return []
  }
}

export interface LeaderboardEntry {
  id: number
  playerName: string
  timeMs: number
  blocksPlaced: number
  formulasDiscovered: number
  renown: number
  createdAt: string
}
