import { useState } from 'react'
import { getLLMConfig, setLLMConfig } from '../../utils/llmClient'

interface Props { open: boolean; onClose: () => void }

export const LLMConfigUI = ({ open, onClose }: Props) => {
  const config = getLLMConfig()
  const [endpoint, setEndpoint] = useState(config.endpoint)
  const [apiKey, setApiKey] = useState(config.apiKey)
  const [model, setModel] = useState(config.model)
  const [provider, setProvider] = useState(config.provider)
  const [enabled, setEnabled] = useState(config.enabled)
  const [saved, setSaved] = useState(false)

  if (!open) return null

  const save = () => {
    setLLMConfig({ endpoint, apiKey, model, provider, enabled })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)', fontFamily: 'monospace',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'rgba(5,10,25,0.97)', border: '1px solid rgba(68,255,204,0.3)',
        borderRadius: 12, padding: 24, maxWidth: 500, width: '95%', color: '#fff',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ color: '#44ffcc', fontSize: 16, letterSpacing: 2, fontWeight: 'bold' }}>
            🤖 LLM CONFIGURATION
          </span>
          <button onClick={onClose} style={{
            background: 'rgba(255,0,0,0.15)', border: '1px solid rgba(255,0,0,0.3)',
            color: '#ff4444', borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
            fontFamily: 'monospace', fontSize: 11,
          }}>✕</button>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 4 }}>LLM Enabled</div>
          <button onClick={() => setEnabled(!enabled)} style={{
            padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
            fontFamily: 'monospace', fontSize: 12, fontWeight: 'bold',
            background: enabled ? '#44ff88' : 'rgba(255,255,255,0.1)',
            color: enabled ? '#000' : 'rgba(255,255,255,0.5)',
          }}>
            {enabled ? 'ON — Content will be LLM-generated' : 'OFF — Using procedural fallback'}
          </button>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 4 }}>Provider</div>
          <select value={provider} onChange={e => setProvider(e.target.value as any)} style={{
            width: '100%', padding: 8, borderRadius: 6, border: '1px solid rgba(68,255,204,0.2)',
            background: 'rgba(0,0,0,0.5)', color: '#fff', fontFamily: 'monospace', fontSize: 12,
          }}>
            <option value="ollama">Ollama (Local)</option>
            <option value="openai">OpenAI</option>
            <option value="custom">Custom API</option>
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 4 }}>Endpoint</div>
          <input value={endpoint} onChange={e => setEndpoint(e.target.value)} style={{
            width: '100%', padding: 8, borderRadius: 6, border: '1px solid rgba(68,255,204,0.2)',
            background: 'rgba(0,0,0,0.5)', color: '#44ffcc', fontFamily: 'monospace', fontSize: 12,
          }} placeholder="http://localhost:11434/v1" />
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 4 }}>Model</div>
          <input value={model} onChange={e => setModel(e.target.value)} style={{
            width: '100%', padding: 8, borderRadius: 6, border: '1px solid rgba(68,255,204,0.2)',
            background: 'rgba(0,0,0,0.5)', color: '#44ffcc', fontFamily: 'monospace', fontSize: 12,
          }} placeholder="llama3.2" />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 4 }}>API Key (optional)</div>
          <input value={apiKey} onChange={e => setApiKey(e.target.value)} type="password" style={{
            width: '100%', padding: 8, borderRadius: 6, border: '1px solid rgba(68,255,204,0.2)',
            background: 'rgba(0,0,0,0.5)', color: '#44ffcc', fontFamily: 'monospace', fontSize: 12,
          }} placeholder="sk-..." />
        </div>

        <button onClick={save} style={{
          width: '100%', padding: '10px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
          fontFamily: 'monospace', fontSize: 13, fontWeight: 'bold',
          background: saved ? '#44ff88' : 'linear-gradient(135deg, #44ffcc, #44aaff)',
          color: saved ? '#000' : '#000',
        }}>
          {saved ? '✓ CONFIGURATION SAVED' : 'SAVE CONFIGURATION'}
        </button>
      </div>
    </div>
  )
}
