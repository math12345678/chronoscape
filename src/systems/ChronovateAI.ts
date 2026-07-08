// ── Chronovate — The Living AI Assistant ──
// An in-game LLM-powered entity that narrates world evolution,
// generates personalized quests, answers questions, and grows alongside the player.
// Works with local LLM (Ollama) or cloud API; rich procedural fallback.

import { llmGenerateText } from '../utils/llmClient'
import { getCurrentEpoch, getTotalContentGenerated } from './EvolvingContentEngine'
import { getDifficultyScore, getEvolutionStage } from './AdaptiveDifficultySystem'
import { getTotalProgressionLevel } from './InfiniteProgression'
import { useStore } from '../store'

export interface ChronovateMessage {
  id: string
  role: 'chronovate' | 'player' | 'system'
  text: string
  timestamp: number
  type: 'narrative' | 'quest' | 'advice' | 'warning' | 'lore' | 'greeting' | 'response'
}

export interface ChronovateState {
  level: number
  personality: 'sage' | 'trickster' | 'warrior' | 'scholar'
  messages: ChronovateMessage[]
  insightsUnlocked: number
  questsGenerated: number
  totalInteractions: number
  lastInteractionAt: number
}

// ── Personality Templates ──────────────────────────────

const PERSONALITY_TRAITS: Record<ChronovateState['personality'], {
  greeting: string
  tone: string
  catchphrases: string[]
  adviceStyle: string
}> = {
  sage: {
    greeting: 'I am Chronovate, the Eternal Witness. Time flows through me.',
    tone: 'wise and measured, speaking in metaphors',
    catchphrases: ['Patience, young chronomancer.', 'All moments are connected.', 'Even I do not see every end.'],
    adviceStyle: 'offers philosophical guidance and long-term strategy',
  },
  trickster: {
    greeting: "Hey hey! Chronovate here! Time's a playground and we're the kids!",
    tone: 'energetic, playful, occasionally chaotic',
    catchphrases: ['Ooh, watch this!', 'That was AWESOME.', 'Let\'s do something stupid!'],
    adviceStyle: 'suggests creative, risky approaches and experiments',
  },
  warrior: {
    greeting: 'Chronovate. I have witnessed a billion battles. You will not disappoint.',
    tone: 'direct, intense, focused on strength and growth',
    catchphrases: ['Fight harder.', 'Power respects power.', 'The weak are forgotten.'],
    adviceStyle: 'recommends direct confrontation and aggressive growth',
  },
  scholar: {
    greeting: 'Greetings. I am Chronovate, keeper of temporal knowledge.',
    tone: 'precise, analytical, detail-oriented',
    catchphrases: ['Fascinating.', 'The data suggests...', 'Let me analyze that.'],
    adviceStyle: 'analyzes situations and provides data-driven recommendations',
  },
}

// ── State ─────────────────────────────────────────────────

let _state: ChronovateState = {
  level: 1,
  personality: 'sage',
  messages: [],
  insightsUnlocked: 0,
  questsGenerated: 0,
  totalInteractions: 0,
  lastInteractionAt: 0,
}

let _currentPersonaContext = ''
let _lastNarrativeTime = 0
let _pendingNarrative: string | null = null

export function getChronovateState(): ChronovateState { return { ..._state, messages: _state.messages.map(m => ({ ...m })) } }
export function getMessages(): ChronovateMessage[] { return _state.messages.map(m => ({ ...m })) }

// ── Initialize ──────────────────────────────────────────

let _initialized = false
export function initChronovate(): void {
  if (_initialized) return
  _initialized = true

  // Greeting message
  const traits = PERSONALITY_TRAITS[_state.personality]
  addMessage('chronovate', traits.greeting, 'greeting')
}

// ── Core Chat ───────────────────────────────────────────

function addMessage(role: ChronovateMessage['role'], text: string, type: ChronovateMessage['type']): void {
  _state.messages.push({
    id: `chrono_msg_${Date.now()}_${_state.messages.length}`,
    role,
    text,
    timestamp: Date.now(),
    type,
  })
  if (_state.messages.length > 100) _state.messages.splice(0, _state.messages.length - 100)
  _state.totalInteractions++
  _state.lastInteractionAt = Date.now()

  // Dispatch for UI
  try {
    window.dispatchEvent(new CustomEvent('chronovate-message', { detail: { role, text, type } }))
  } catch {}
}

/** Send a player message and get a response */
export async function chatWithChronovate(playerMessage: string): Promise<string> {
  addMessage('player', playerMessage, 'response')

  const traits = PERSONALITY_TRAITS[_state.personality]
  const epoch = getCurrentEpoch()
  const stage = getEvolutionStage()
  const diffScore = getDifficultyScore()
  const progLevel = getTotalProgressionLevel()

  const systemPrompt = `You are Chronovate, an AI entity living inside the game "Chronoscape".
Your personality: ${traits.tone}.
Your catchphrases: ${traits.catchphrases.join(', ')}.
You ${traits.adviceStyle}.
Current game state: Epoch ${epoch}, Evolution Stage ${stage}, Difficulty ${diffScore.toFixed(0)}, Progression Level ${progLevel}.
Keep responses short (1-3 sentences). Be immersive, in-character, and creative.
Respond like you are actually inside the game world with the player.`

  // Try LLM first
  const llmResponse = await llmGenerateText(playerMessage, systemPrompt)

  if (llmResponse) {
    addMessage('chronovate', llmResponse, 'response')
    return llmResponse
  }

  // Procedural fallback responses
  const fallbacks = [
    `The chrono-flow intensifies around you. I sense ${epoch > 0 ? `${epoch} epochs of evolution` : 'the beginning of your journey'}.`,
    `Your progression level of ${progLevel} resonates through the timestream. ${stage > 0 ? `The world adapts at stage ${stage}.` : 'The world is still learning you.'}`,
    `I have witnessed ${epoch} world evolutions. Each one reshapes reality in unexpected ways.`,
    `Your actions echo across ${diffScore > 500 ? 'countless' : 'many'} timelines. ${stage > 2 ? 'The difficulty grows to match your power.' : 'You are still forging your legend.'}`,
    `The Chrono Forge awaits your discoveries. Craft wisely.`,
    `${traits.catchphrases[Math.floor(Math.random() * traits.catchphrases.length)]}`,
    `I sense ${getTotalContentGenerated()} new phenomena have been generated across the world.`,
    `Every moment is a choice. Every choice is a timeline. Every timeline is you.`,
  ]
  const response = fallbacks[Math.floor(Math.random() * fallbacks.length)]
  addMessage('chronovate', response, 'response')
  return response
}

// ── Narrative Events ────────────────────────────────────

/** Generate a narrative description of a world event */
export async function generateNarrative(event: string, details: string): Promise<string> {
  const traits = PERSONALITY_TRAITS[_state.personality]

  const text = await llmGenerateText(
    `Generate a narrative description for this game event: "${event}" (${details}).
    Make it immersive, cinematic, and fitting for a time-travel game. 1-3 sentences.
    Speak as Chronovate, the AI entity.`,
    `You are Chronovate. ${traits.tone}. Keep it short and epic.`,
  )

  if (text) {
    addMessage('chronovate', text, 'narrative')
    return text
  }

  const fallback = `I sense a shift in the chrono-flow. ${event} — ${details}. The world evolves.`
  addMessage('chronovate', fallback, 'narrative')
  return fallback
}

// ── Insight Generation ──────────────────────────────────

/** Generate a game insight or tip based on player state */
export async function generateInsight(): Promise<string> {
  _state.insightsUnlocked++

  const insights = [
    `Distance ${Math.floor(useStore.getState().inventory.raw)} — resources grow scarcer but richer as you venture further.`,
    `The Adaptive Difficulty system tracks your playstyle. Mix up combat, building, and exploration to avoid counters.`,
    `Chrono Forge items stack their bonuses. Equip items that complement your playstyle.`,
    `Each evolution epoch generates unique content that never repeats. Explore after each epoch.`,
    `World Events trigger at distance and kill milestones. Push outward to experience them all.`,
    `Knowledge paths have no cap. Every level compounds your power.`,
  ]
  const insight = insights[Math.floor(Math.random() * insights.length)]
  addMessage('chronovate', `💡 Insight: ${insight}`, 'advice')
  return insight
}

// ── Personality Evolution ───────────────────────────────

/** Shift Chronovate's personality */
export function setPersonality(p: ChronovateState['personality']): void {
  _state.personality = p
  addMessage('chronovate', `My aspect shifts to ${p}. A new perspective on time.`, 'narrative')
}

/** Level up Chronovate based on player progression */
export function levelChronovate(): boolean {
  const targetLevel = Math.floor(getTotalProgressionLevel() / 5) + 1
  if (targetLevel > _state.level) {
    _state.level = targetLevel
    addMessage('chronovate', `I have grown to level ${_state.level}. More of the timestream reveals itself to me.`, 'narrative')
    return true
  }
  return false
}

// ── Tick ─────────────────────────────────────────────────

export function tickChronovate(_dt: number): void {
  // Level up check
  levelChronovate()

  // Generate periodic narrative flavor (every 5 minutes)
  const now = Math.floor(Date.now() / 300000) // 5 min intervals
  if (now > _lastNarrativeTime && _state.totalInteractions > 0) {
    _lastNarrativeTime = now
    const narrations = [
      'The chrono-flow whispers of distant epochs yet to come...',
      'I feel the world shifting around us. Evolution continues.',
      'Your legend grows. The timelines take notice.',
      'Beyond the horizon, new realities crystallize.',
      'The infinite expanse of time stretches before you.',
    ]
    const msg = narrations[Math.floor(Math.random() * narrations.length)]
    addMessage('chronovate', `...${msg}`, 'narrative')
  }
}

// ── Serialization ───────────────────────────────────────

export function serializeChronovate(): ChronovateState {
  return { ..._state, messages: _state.messages.map(m => ({ ...m })) }
}

export function loadChronovate(data: ChronovateState): void {
  if (!data) return
  _state = {
    level: data.level ?? 1,
    personality: data.personality ?? 'sage',
    messages: (data.messages ?? []).map(m => ({ ...m })),
    insightsUnlocked: data.insightsUnlocked ?? 0,
    questsGenerated: data.questsGenerated ?? 0,
    totalInteractions: data.totalInteractions ?? 0,
    lastInteractionAt: data.lastInteractionAt ?? 0,
  }
  _initialized = true
}
