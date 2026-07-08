import { useState, useEffect, useRef } from 'react'
import {
  getChronovateState, getMessages, chatWithChronovate,
  generateNarrative, generateInsight, setPersonality,
} from '../../systems/ChronovateAI'
import type { ChronovateMessage } from '../../systems/ChronovateAI'

interface Props { open: boolean; onClose: () => void }

const PERSONALITY_COLORS: Record<string, string> = { sage: '#44ffcc', trickster: '#ff8844', warrior: '#ff4444', scholar: '#44aaff' }

export const ChronovateUI = ({ open, onClose }: Props) => {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChronovateMessage[]>([])
  const [state, setState] = useState(getChronovateState())
  const [responding, setResponding] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setMessages(getMessages())
    setState(getChronovateState())
    const interval = setInterval(() => {
      setMessages(getMessages())
      setState(getChronovateState())
    }, 2000)
    return () => clearInterval(interval)
  }, [open])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const send = async () => {
    if (!input.trim() || responding) return
    setResponding(true)
    const msg = input.trim()
    setInput('')
    await chatWithChronovate(msg)
    setMessages(getMessages())
    setState(getChronovateState())
    setResponding(false)
  }

  if (!open) return null

  const color = PERSONALITY_COLORS[state.personality] || '#44ffcc'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)', fontFamily: 'monospace',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'rgba(5,10,25,0.97)', border: `1px solid ${color}44`,
        borderRadius: 12, padding: 0, maxWidth: 500, width: '95%',
        maxHeight: '80vh', display: 'flex', flexDirection: 'column', color: '#fff',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 16px', borderBottom: `1px solid ${color}22`,
          background: `${color}06`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🤖</span>
            <div>
              <span style={{ color, fontSize: 14, fontWeight: 'bold' }}>Chronovate</span>
              <span style={{ marginLeft: 8, fontSize: 10, padding: '1px 6px', borderRadius: 3, background: `${color}22`, color }}>
                Lv.{state.level} {state.personality}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {['sage', 'trickster', 'warrior', 'scholar'].map(p => (
              <button key={p} onClick={() => { setPersonality(p as any); setState(getChronovateState()) }} style={{
                padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)',
                background: state.personality === p ? `${color}33` : 'transparent',
                color: state.personality === p ? color : 'rgba(255,255,255,0.4)',
                cursor: 'pointer', fontFamily: 'monospace', fontSize: 9,
              }}>{p}</button>
            ))}
            <button onClick={onClose} style={{
              background: 'rgba(255,0,0,0.15)', border: '1px solid rgba(255,0,0,0.3)',
              color: '#ff4444', borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
              fontFamily: 'monospace', fontSize: 11, marginLeft: 4,
            }}>✕</button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} style={{
          flex: 1, overflow: 'auto', padding: 12,
          display: 'flex', flexDirection: 'column', gap: 8,
          minHeight: 300, maxHeight: 400,
        }}>
          {messages.length === 0 && (
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center', padding: 40 }}>
              Chronovate is silent... Say something to begin.
            </div>
          )}
          {messages.map(m => (
            <div key={m.id} style={{
              padding: '8px 12px', borderRadius: 8, fontSize: 12, lineHeight: 1.4,
              background: m.role === 'chronovate' ? `${color}08` :
                m.role === 'player' ? 'rgba(68,255,204,0.05)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${m.role === 'chronovate' ? `${color}22` :
                m.role === 'player' ? 'rgba(68,255,204,0.15)' : 'rgba(255,255,255,0.05)'}`,
              alignSelf: m.role === 'player' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
            }}>
              {m.role === 'chronovate' && <span style={{ color, fontWeight: 'bold', fontSize: 10 }}>Chronovate · </span>}
              {m.role === 'player' && <span style={{ color: '#44ffcc', fontWeight: 'bold', fontSize: 10 }}>You · </span>}
              {m.role === 'system' && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>System · </span>}
              <span style={{ color: m.role === 'chronovate' ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.6)' }}>
                {m.text}
              </span>
            </div>
          ))}
          {responding && (
            <div style={{ color: color, fontSize: 11, padding: 8, opacity: 0.6 }}>
              Chronovate is thinking...
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{ padding: '10px 12px', borderTop: `1px solid ${color}22`, display: 'flex', gap: 8 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') send() }}
            placeholder="Ask Chronovate anything..."
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 6, border: `1px solid ${color}33`,
              background: 'rgba(0,0,0,0.5)', color: '#fff', fontFamily: 'monospace', fontSize: 12,
              outline: 'none',
            }}
          />
          <button onClick={() => { generateInsight(); setMessages(getMessages()) }} style={{
            padding: '4px 10px', borderRadius: 6, border: `1px solid ${color}33`,
            background: `${color}11`, color, cursor: 'pointer', fontFamily: 'monospace', fontSize: 10,
          }}>💡</button>
          <button onClick={send} disabled={!input.trim() || responding} style={{
            padding: '8px 16px', borderRadius: 6, border: 'none', cursor: input.trim() && !responding ? 'pointer' : 'default',
            background: input.trim() && !responding ? color : 'rgba(255,255,255,0.05)',
            color: input.trim() && !responding ? '#000' : 'rgba(255,255,255,0.3)',
            fontFamily: 'monospace', fontSize: 12, fontWeight: 'bold',
          }}>Send</button>
        </div>
      </div>
    </div>
  )
}
