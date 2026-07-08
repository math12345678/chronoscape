import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'

const DB_PATH = path.resolve(process.cwd(), 'data', 'chronoscape.db')

let db: Database.Database

export function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(DB_PATH)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    initSchema()
  }
  return db
}

function initSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS game_saves (
      player_id TEXT PRIMARY KEY,
      game_state TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS leaderboard (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_name TEXT NOT NULL,
      time_ms INTEGER NOT NULL,
      blocks_placed INTEGER DEFAULT 0,
      formulas_discovered INTEGER DEFAULT 0,
      renown INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_leaderboard_time ON leaderboard(time_ms ASC);
  `)
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

export function saveGame(playerId: string, gameState: string): void {
  const s = getDb().prepare(`
    INSERT INTO game_saves (player_id, game_state, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(player_id) DO UPDATE SET
      game_state = excluded.game_state,
      updated_at = datetime('now')
  `)
  s.run(playerId, gameState)
}

export function loadGame(playerId: string): string | null {
  const s = getDb().prepare('SELECT game_state FROM game_saves WHERE player_id = ?')
  const row = s.get(playerId) as { gameState: string } | undefined
  return row?.gameState ?? null
}

export function submitScore(entry: Omit<LeaderboardEntry, 'id' | 'createdAt'>): number {
  const s = getDb().prepare(`
    INSERT INTO leaderboard (player_name, time_ms, blocks_placed, formulas_discovered, renown)
    VALUES (?, ?, ?, ?, ?)
  `)
  const result = s.run(entry.playerName, entry.timeMs, entry.blocksPlaced, entry.formulasDiscovered, entry.renown)
  return Number(result.lastInsertRowid)
}

export function getLeaderboard(limit: number = 20): LeaderboardEntry[] {
  const s = getDb().prepare(`
    SELECT id, player_name, time_ms, blocks_placed, formulas_discovered, renown, created_at
    FROM leaderboard
    ORDER BY time_ms ASC
    LIMIT ?
  `)
  return s.all(limit).map((row: any) => ({
    id: row.id,
    playerName: row.player_name,
    timeMs: row.time_ms,
    blocksPlaced: row.blocks_placed,
    formulasDiscovered: row.formulas_discovered,
    renown: row.renown,
    createdAt: row.created_at,
  }))
}
