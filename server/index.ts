import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { saveGame, loadGame, submitScore, getLeaderboard } from './db.js'

const app = new Hono()

// CORS for the frontend dev server
app.use('/*', cors({
  origin: ['http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:5173'],
  credentials: true,
}))

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// Save game state
app.post('/api/saves', async (c) => {
  try {
    const body = await c.req.json()
    const { playerId, gameState } = body
    if (!playerId || !gameState) {
      return c.json({ error: 'playerId and gameState are required' }, 400)
    }
    saveGame(playerId, JSON.stringify(gameState))
    return c.json({ success: true, savedAt: new Date().toISOString() })
  } catch {
    return c.json({ error: 'Failed to save game state' }, 500)
  }
})

// Load game state
app.get('/api/saves/:playerId', (c) => {
  try {
    const playerId = c.req.param('playerId')
    const state = loadGame(playerId)
    if (!state) {
      return c.json({ error: 'No save found' }, 404)
    }
    return c.json({ success: true, gameState: JSON.parse(state) })
  } catch {
    return c.json({ error: 'Failed to load game state' }, 500)
  }
})

// Submit time trial score
app.post('/api/leaderboard', async (c) => {
  try {
    const body = await c.req.json()
    const { playerName, timeMs, blocksPlaced = 0, formulasDiscovered = 0, renown = 0 } = body
    if (!playerName || timeMs == null) {
      return c.json({ error: 'playerName and timeMs are required' }, 400)
    }
    const id = submitScore({ playerName, timeMs, blocksPlaced, formulasDiscovered, renown })
    return c.json({ success: true, id, submittedAt: new Date().toISOString() })
  } catch {
    return c.json({ error: 'Failed to submit score' }, 500)
  }
})

// Get leaderboard
app.get('/api/leaderboard', (c) => {
  try {
    const limit = Math.min(Number(c.req.query('limit')) || 20, 100)
    const entries = getLeaderboard(limit)
    return c.json({ success: true, entries })
  } catch {
    return c.json({ error: 'Failed to fetch leaderboard' }, 500)
  }
})

const port = Number(process.env.PORT) || 3001
console.log(`🌌 Chronoscape backend running on http://localhost:${port}`)

serve({ fetch: app.fetch, port })
