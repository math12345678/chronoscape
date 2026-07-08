// ── LLM API Client ──
// Universal client supporting OpenAI, Ollama, and any OpenAI-compatible API.
// Graceful fallback to procedural generation when LLM is unavailable.

export interface LLMConfig {
  provider: 'openai' | 'ollama' | 'custom'
  endpoint: string
  apiKey: string
  model: string
  enabled: boolean
}

let _config: LLMConfig = {
  provider: 'ollama',
  endpoint: 'http://localhost:11434/v1',
  apiKey: '',
  model: 'llama3.2',
  enabled: false,
}

export function getLLMConfig(): LLMConfig { return { ..._config } }

export function setLLMConfig(partial: Partial<LLMConfig>): void {
  _config = { ..._config, ...partial }
  try { localStorage.setItem('chronoscape_llm_config', JSON.stringify(_config)) } catch {}
}

// Load config from localStorage
try {
  const raw = localStorage.getItem('chronoscape_llm_config')
  if (raw) {
    const parsed = JSON.parse(raw)
    _config = { ..._config, ...parsed }
  }
} catch {}

/** Call the LLM with a prompt and get back structured JSON */
export async function llmGenerateJSON<T>(
  prompt: string,
  systemPrompt: string,
  fallback: () => T,
): Promise<T> {
  if (!_config.enabled) return fallback()

  try {
    const res = await fetch(`${_config.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(_config.apiKey ? { Authorization: `Bearer ${_config.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: _config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.85,
        max_tokens: 1500,
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return fallback()
    const data = await res.json()
    const content = data.choices?.[0]?.message?.content ?? ''
    // Try to extract JSON from markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || content.match(/{[\s\S]*?}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1] ?? jsonMatch[0]) as T
    }
    return fallback()
  } catch {
    return fallback()
  }
}

/** Call the LLM for freeform text generation */
export async function llmGenerateText(prompt: string, systemPrompt: string): Promise<string | null> {
  if (!_config.enabled) return null

  try {
    const res = await fetch(`${_config.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(_config.apiKey ? { Authorization: `Bearer ${_config.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: _config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.9,
        max_tokens: 500,
      }),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.choices?.[0]?.message?.content ?? null
  } catch {
    return null
  }
}
