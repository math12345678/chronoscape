import { useState, useEffect } from 'react'
import { useStore } from '../../store'
import {
  spinSlots, spinRoulette, coinFlip,
  getCasinoStats, recordBet, recordWin, getCasinoNet,
  getSlotProbability,
} from '../../systems/Casino'
import type { RouletteBet } from '../../systems/Casino'

const SYMBOL_COLORS: Record<string, string> = {
  '⟐': '#44ff88',
  '⟡': '#ffcc44',
  '◆': '#aa88ff',
  '✦': '#ffd700',
  '⬡': '#44aaff',
  '⏳': '#44ffcc',
}

export const CasinoUI = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const inventory = useStore((s) => s.inventory)
  const [tab, setTab] = useState<'slots' | 'roulette' | 'coinflip' | 'stats'>('slots')
  const [bet, setBet] = useState(10)
  const [result, setResult] = useState<string | null>(null)
  const [resultColor, setResultColor] = useState('#44ffcc')
  const [lastWin, setLastWin] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [slotSymbols, setSlotSymbols] = useState(['⟐', '⟐', '⟐'])
  const [stats, setStats] = useState(getCasinoStats())
  const [rouletteResult, setRouletteResult] = useState<{ number: number; color: string } | null>(null)
  const [refresh, setRefresh] = useState(0)

  // Roulette state
  const [rouletteBetType, setRouletteBetType] = useState<RouletteBet>('red')
  const [specificNum, setSpecificNum] = useState(7)

  const handleSlotSpin = () => {
    if (animating || inventory.raw < bet) return
    recordBet(bet)
    useStore.setState((s) => ({
      inventory: { ...s.inventory, raw: s.inventory.raw - bet },
    }))

    setAnimating(true)
    // Animate through symbols
    let ticks = 0
    const anim = setInterval(() => {
      setSlotSymbols([
        ['⟐', '⟡', '◆', '✦', '⬡', '⏳'][Math.floor(Math.random() * 6)],
        ['⟐', '⟡', '◆', '✦', '⬡', '⏳'][Math.floor(Math.random() * 6)],
        ['⟐', '⟡', '◆', '✦', '⬡', '⏳'][Math.floor(Math.random() * 6)],
      ])
      ticks++
      if (ticks > 10) {
        clearInterval(anim)
        const res = spinSlots(bet)
        setSlotSymbols(res.symbols)
        setAnimating(false)
        if (res.win) {
          recordWin(res.winnings, 'slots')
          setResult(`JACKPOT! Won ${res.winnings} Raw!`)
          setResultColor('#ffd700')
          setLastWin(res.winnings)
        } else {
          setResult('No luck this time')
          setResultColor('#ff4444')
          setLastWin(0)
        }
        setStats(getCasinoStats())
      }
    }, 80)
  }

  const handleRoulette = (type: RouletteBet, num?: number) => {
    if (inventory.raw < bet) return
    recordBet(bet)
    useStore.setState((s) => ({
      inventory: { ...s.inventory, raw: s.inventory.raw - bet },
    }))

    const res = spinRoulette(bet, type, num)
    setRouletteResult({ number: res.number, color: res.color })
    if (res.win) {
      recordWin(res.winnings, `roulette_${type}`)
      setResult(`Landed on ${res.number} ${res.color}! Won ${res.winnings} Raw!`)
      setResultColor('#44ff88')
      setLastWin(res.winnings)
    } else {
      setResult(`Landed on ${res.number} ${res.color}. Lost.`)
      setResultColor('#ff4444')
      setLastWin(0)
    }
    setStats(getCasinoStats())
  }

  const handleCoinFlip = (call: 'heads' | 'tails') => {
    if (inventory.raw < bet) return
    recordBet(bet)
    useStore.setState((s) => ({
      inventory: { ...s.inventory, raw: s.inventory.raw - bet },
    }))

    const res = coinFlip(bet, call)
    if (res.win) {
      recordWin(res.winnings, 'coinflip')
      setResult(`It was ${res.result}! You won ${res.winnings} Raw!`)
      setResultColor('#44ffcc')
      setLastWin(res.winnings)
    } else {
      setResult(`It was ${res.result}. Lost ${bet} Raw.`)
      setResultColor('#ff4444')
      setLastWin(0)
    }
    setStats(getCasinoStats())
  }

  if (!open) return null

  const containerStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
  }

  const panelStyle: React.CSSProperties = {
    width: 500, maxHeight: '85vh', overflow: 'auto',
    background: 'linear-gradient(180deg, #0f0a0a, #0a0808)',
    border: '1px solid #3a2a2a', borderRadius: 12, padding: 24,
    boxShadow: '0 0 80px rgba(255,68,0,0.1)',
  }

  const tabStyle = (t: string): React.CSSProperties => ({
    padding: '6px 14px', borderRadius: 6,
    background: tab === t ? '#2a1a1a' : 'transparent',
    border: '1px solid ' + (tab === t ? '#ff6644' : '#3a2a2a'),
    color: tab === t ? '#ff6644' : '#888',
    cursor: 'pointer', fontSize: 12, fontWeight: tab === t ? 700 : 400,
  })

  const chipBtn = (color: string, disabled = false): React.CSSProperties => ({
    padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 700,
    border: `2px solid ${disabled ? '#3a3a3a' : color}`,
    background: disabled ? '#1a1a1a' : color + '15',
    color: disabled ? '#555' : color,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.4 : 1,
  })

  return (
    <div style={containerStyle} onClick={onClose}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#ff6644' }}>
              🎰 Time's Casino
            </span>
            <span style={{ marginLeft: 12, fontSize: 11, color: '#5a5a5a' }}>
              Raw: {inventory.raw}
            </span>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: '1px solid #3a3a3a', borderRadius: 6,
            color: '#aaa', padding: '4px 12px', cursor: 'pointer', fontSize: 14,
          }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
          <button style={tabStyle('slots')} onClick={() => setTab('slots')}>Slots</button>
          <button style={tabStyle('roulette')} onClick={() => setTab('roulette')}>Roulette</button>
          <button style={tabStyle('coinflip')} onClick={() => setTab('coinflip')}>Coin Flip</button>
          <button style={tabStyle('stats')} onClick={() => setTab('stats')}>Stats</button>
        </div>

        {/* Bet selector */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#6a6a6a' }}>Bet:</span>
          {[5, 10, 25, 50, 100].map((v) => (
            <button key={v} style={{
              padding: '4px 10px', borderRadius: 4, fontSize: 11,
              border: `1px solid ${bet === v ? '#ff6644' : '#2a2a2a'}`,
              background: bet === v ? '#ff664422' : 'transparent',
              color: bet === v ? '#ff6644' : '#888', cursor: 'pointer',
            }} onClick={() => setBet(v)}>{v}</button>
          ))}
        </div>

        {/* ── SLOTS TAB ── */}
        {tab === 'slots' && (
          <div style={{ textAlign: 'center' }}>
            {/* Slot machine display */}
            <div style={{
              display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 16,
            }}>
              {slotSymbols.map((sym, i) => (
                <div key={i} style={{
                  width: 70, height: 70, borderRadius: 12,
                  background: '#1a1a1a', border: '2px solid #2a2a2a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 32, color: SYMBOL_COLORS[sym] ?? '#fff',
                  transition: animating ? 'none' : 'all 0.3s',
                }}>
                  {sym}
                </div>
              ))}
            </div>

            <button style={{
              ...chipBtn('#ff6644', animating || inventory.raw < bet),
              width: '100%', marginBottom: 12,
            }} disabled={animating || inventory.raw < bet} onClick={handleSlotSpin}>
              {animating ? 'Spinning...' : '🎰 SPIN'}
            </button>

            {result && (
              <div style={{
                fontSize: 14, fontWeight: 700, color: resultColor,
                padding: 8, borderRadius: 6, background: resultColor + '10',
                marginBottom: 8,
              }}>
                {lastWin > 0 && <span style={{ fontSize: 18 }}>✦ </span>}
                {result}
              </div>
            )}

            <div style={{ fontSize: 10, color: '#5a5a5a' }}>
              Win rate: ~{getSlotProbability().toFixed(1)}% · Jackpot: x50
            </div>
          </div>
        )}

        {/* ── ROULETTE TAB ── */}
        {tab === 'roulette' && (
          <div>
            {/* Result display */}
            {rouletteResult && (
              <div style={{
                textAlign: 'center', marginBottom: 12,
              }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '8px 20px', borderRadius: 8,
                  background: '#1a1a1a', border: '1px solid #2a2a2a',
                }}>
                  <span style={{
                    fontSize: 24, fontWeight: 900,
                    color: rouletteResult.color === 'red' ? '#ff4444' :
                      rouletteResult.color === 'black' ? '#fff' : '#44ff88',
                  }}>
                    {rouletteResult.number}
                  </span>
                  <span style={{
                    fontSize: 12, color: rouletteResult.color === 'red' ? '#ff4444' :
                      rouletteResult.color === 'black' ? '#fff' : '#44ff88',
                  }}>
                    {rouletteResult.color.toUpperCase()}
                  </span>
                </div>
              </div>
            )}

            {/* Bet type selector */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginBottom: 8 }}>
              {(['low', 'high', 'red', 'black', 'odd', 'even'] as RouletteBet[]).map((type) => (
                <button key={type} style={{
                  padding: '8px', borderRadius: 6, fontSize: 11,
                  border: `1px solid ${rouletteBetType === type ? '#ff6644' : '#2a2a2a'}`,
                  background: rouletteBetType === type ? '#ff664422' : 'transparent',
                  color: rouletteBetType === type ? '#ff6644' : '#888',
                  cursor: 'pointer', textTransform: 'capitalize',
                }} onClick={() => setRouletteBetType(type)}>
                  {type}
                </button>
              ))}
            </div>

            <button style={{
              ...chipBtn('#44ff88', inventory.raw < bet), width: '100%',
            }} disabled={inventory.raw < bet} onClick={() => handleRoulette(rouletteBetType)}>
              Spin Roulette ({bet} Raw)
            </button>

            {/* Specific number */}
            <div style={{ marginTop: 8, display: 'flex', gap: 4, alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: '#5a5a5a' }}>Pick number (x36):</span>
              <input type="number" min={0} max={36} value={specificNum}
                onChange={(e) => setSpecificNum(Math.min(36, Math.max(0, Number(e.target.value) || 0)))}
                style={{
                  width: 50, padding: '4px 8px', borderRadius: 4,
                  background: '#1a1a1a', border: '1px solid #2a2a2a',
                  color: '#fff', fontSize: 12,
                }}
              />
              <button style={{
                ...chipBtn('#ffd700', inventory.raw < bet), fontSize: 11, padding: '4px 10px',
              }} disabled={inventory.raw < bet}
                onClick={() => handleRoulette('specific', specificNum)}>
                Bet #{specificNum}
              </button>
            </div>
          </div>
        )}

        {/* ── COIN FLIP TAB ── */}
        {tab === 'coinflip' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 48, marginBottom: 16,
              animation: 'pulse 1s ease-in-out infinite',
            }}>
              {result ? (result.includes('heads') ? '🪙' : result.includes('tails') ? '🪙' : '🪙') : '🪙'}
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 12 }}>
              <button style={chipBtn('#44ffcc', inventory.raw < bet)}
                disabled={inventory.raw < bet} onClick={() => handleCoinFlip('heads')}>
                Heads (x1.8)
              </button>
              <button style={chipBtn('#ff6644', inventory.raw < bet)}
                disabled={inventory.raw < bet} onClick={() => handleCoinFlip('tails')}>
                Tails (x1.8)
              </button>
            </div>
          </div>
        )}

        {/* ── STATS TAB ── */}
        {tab === 'stats' && (
          <div>
            <div style={{ fontSize: 12, color: '#6a6a6a', marginBottom: 12 }}>
              Casino Career Stats
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Total Bet', value: `${stats.totalBet} Raw`, color: '#ff4444' },
                { label: 'Total Won', value: `${stats.totalWon} Raw`, color: '#44ff88' },
                { label: 'Net', value: `${getCasinoNet()} Raw`, color: getCasinoNet() >= 0 ? '#44ff88' : '#ff4444' },
                { label: 'Games Played', value: String(stats.spins), color: '#44aaff' },
                { label: 'Wins', value: String(stats.wins), color: '#44ffcc' },
                { label: 'Biggest Win', value: `${stats.biggestWin} Raw`, color: '#ffd700' },
              ].map((s) => (
                <div key={s.label} style={{
                  padding: 10, borderRadius: 6, background: '#0f0a0a',
                  border: '1px solid #1a1a1a',
                }}>
                  <div style={{ fontSize: 10, color: '#5a5a5a' }}>{s.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Result message */}
        {result && tab !== 'slots' && (
          <div style={{
            marginTop: 12, fontSize: 13, fontWeight: 600, color: resultColor,
            padding: 8, borderRadius: 6, background: resultColor + '10',
            textAlign: 'center',
          }}>
            {result}
          </div>
        )}

        {/* Warning */}
        <div style={{
          marginTop: 16, fontSize: 10, color: '#3a3a3a', textAlign: 'center',
        }}>
          Time's Casino is for entertainment purposes. Play responsibly.
        </div>
      </div>
    </div>
  )
}
