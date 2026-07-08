import { useEffect, useState, useCallback } from 'react'
import { useStore } from '../../store'
import { submitLeaderboardScore, fetchLeaderboard } from '../../utils/api'
import type { LeaderboardEntry } from '../../utils/api'

/**
 * Time Trial mode with leaderboard integration.
 * F2 toggles the timer. On completion, submits score to the backend.
 * Shows local best time and a global leaderboard.
 */
export const TimeTrialUI = () => {
  const timeTrial = useStore((s) => s.timeTrial)
  const bestTimeTrial = useStore((s) => s.bestTimeTrial)
  const inventory = useStore((s) => s.inventory)
  const formulas = useStore((s) => s.formulas)
  const totalBlocksPlaced = useStore((s) => s.totalBlocksPlaced)
  const startTimeTrial = useStore((s) => s.startTimeTrial)
  const endTimeTrial = useStore((s) => s.endTimeTrial)

  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [playerName, setPlayerName] = useState(() => {
    try { return localStorage.getItem('chronoscape_player_name') || '' } catch { return '' }
  })
  const [submitStatus, setSubmitStatus] = useState<string | null>(null)
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false)

  // Format ms to mm:ss.ms
  const formatTime = (ms: number) => {
    const totalSec = ms / 1000
    const mins = Math.floor(totalSec / 60)
    const secs = Math.floor(totalSec % 60)
    const millis = Math.floor((totalSec % 1) * 100)
    return `${mins}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`
  }

  // Save player name to localStorage
  const handleNameChange = useCallback((name: string) => {
    setPlayerName(name)
    try { localStorage.setItem('chronoscape_player_name', name) } catch {}
  }, [])

  // Fetch leaderboard
  const loadLeaderboard = useCallback(async () => {
    setLoadingLeaderboard(true)
    const entries = await fetchLeaderboard(20)
    setLeaderboard(entries)
    setLoadingLeaderboard(false)
  }, [])

  // Toggle leaderboard panel
  const toggleLeaderboard = useCallback(() => {
    setShowLeaderboard((prev) => {
      if (!prev) loadLeaderboard()
      return !prev
    })
  }, [loadLeaderboard])

  // Keyboard shortcut: F2 to toggle time trial
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault()
        if (!timeTrial.active) {
          startTimeTrial()
        } else {
          endTimeTrial()
        }
      }
      // L to toggle leaderboard
      if (e.key === 'l' && !e.ctrlKey && !e.metaKey && !timeTrial.active) {
        toggleLeaderboard()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [timeTrial.active, startTimeTrial, endTimeTrial, toggleLeaderboard])

  // Tick the timer every 100ms when active
  useEffect(() => {
    if (!timeTrial.active) return
    const interval = setInterval(() => {
      useStore.getState().updateTimeTrial(100)
    }, 100)
    return () => clearInterval(interval)
  }, [timeTrial.active])

  // Submit score when time trial ends
  useEffect(() => {
    if (timeTrial.active === false && submitStatus === null) {
      const elapsed = useStore.getState().bestTimeTrial
      // Check if best time JUST changed (means we just finished a run)
      const prevBest = Number(sessionStorage.getItem('chronoscape_prev_best') || '-1')
      if (elapsed !== null && elapsed !== prevBest) {
        sessionStorage.setItem('chronoscape_prev_best', String(elapsed))
        const name = playerName || 'Anonymous'
        submitLeaderboardScore({
          playerName: name,
          timeMs: elapsed,
          blocksPlaced: totalBlocksPlaced,
          formulasDiscovered: formulas.filter((f) => f.discovered).length,
          renown: Math.floor(inventory.renown),
        }).then((success) => {
          setSubmitStatus(success ? 'Score submitted!' : 'Offline')
          if (success) loadLeaderboard()
          setTimeout(() => setSubmitStatus(null), 3000)
        })
      }
    }
  }, [timeTrial.active]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed top-20 right-4 z-50 select-none">
      {timeTrial.active && (
        <div className="bg-black/60 backdrop-blur-sm border border-teal-500/30 rounded-lg px-3 py-2 pointer-events-none">
          <p className="text-[10px] text-teal-400 uppercase tracking-wider font-mono">
            Speed Run
          </p>
          <p className="text-white text-lg font-mono font-bold tabular-nums">
            {formatTime(timeTrial.elapsed)}
          </p>
          <div className="w-full h-0.5 bg-teal-500/20 rounded-full mt-1 overflow-hidden">
            <div className="h-full bg-teal-400 rounded-full animate-pulse" style={{ width: '100%' }} />
          </div>
        </div>
      )}

      {!timeTrial.active && (
        <div className="space-y-2">
          {/* Best time display */}
          {bestTimeTrial !== null && (
            <div className="bg-black/40 backdrop-blur-sm border border-amber-500/20 rounded-lg px-3 py-2 pointer-events-none">
              <p className="text-[10px] text-amber-400 uppercase tracking-wider font-mono">Best Time</p>
              <p className="text-amber-300 text-sm font-mono font-bold tabular-nums">
                {formatTime(bestTimeTrial)}
              </p>
            </div>
          )}

          {/* Submit status */}
          {submitStatus && (
            <div className="bg-black/40 backdrop-blur-sm border border-teal-500/20 rounded-lg px-3 py-1.5 pointer-events-none">
              <p className="text-[10px] text-teal-400 font-mono">{submitStatus}</p>
            </div>
          )}

          {/* Leaderboard toggle */}
          <button
            onClick={toggleLeaderboard}
            className="w-full bg-black/40 hover:bg-black/60 backdrop-blur-sm border border-gray-700/30 hover:border-teal-500/40 rounded-lg px-3 py-1.5 text-[11px] text-gray-400 hover:text-teal-300 font-mono transition-all duration-200 cursor-pointer"
          >
            {showLeaderboard ? 'Close' : 'Leaderboard [L]'}
          </button>

          {/* Leaderboard panel */}
          {showLeaderboard && (
            <div className="bg-black/70 backdrop-blur-md border border-teal-500/20 rounded-lg px-3 py-2 min-w-[220px] max-h-[320px] overflow-y-auto">
              <p className="text-[10px] text-teal-400 uppercase tracking-wider font-mono mb-2">
                🏆 Global Leaderboard
              </p>

              {/* Player name input */}
              <div className="flex gap-1.5 mb-2">
                <input
                  value={playerName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Your name"
                  maxLength={16}
                  className="flex-1 bg-gray-800/60 border border-gray-700/50 rounded px-2 py-1 text-[11px] text-white placeholder-gray-500 font-mono focus:outline-none focus:border-teal-500/50"
                />
                <button
                  onClick={loadLeaderboard}
                  className="bg-teal-700/40 hover:bg-teal-600/60 text-teal-300 px-2 py-1 rounded text-[10px] font-mono transition-colors cursor-pointer"
                >
                  ↻
                </button>
              </div>

              {/* Leaderboard rows */}
              {loadingLeaderboard ? (
                <p className="text-gray-500 text-[10px] font-mono text-center py-4">Loading...</p>
              ) : leaderboard.length === 0 ? (
                <p className="text-gray-500 text-[10px] font-mono text-center py-4">No scores yet. Run a time trial with F2!</p>
              ) : (
                <div className="space-y-1">
                  {leaderboard.map((entry, i) => (
                    <div
                      key={entry.id}
                      className={`flex items-center justify-between px-2 py-1 rounded ${
                        i === 0 ? 'bg-amber-500/10 border border-amber-500/20' :
                        i < 3 ? 'bg-gray-800/30' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-[10px] font-mono font-bold ${
                          i === 0 ? 'text-amber-400' :
                          i === 1 ? 'text-gray-300' :
                          i === 2 ? 'text-amber-600' :
                          'text-gray-500'
                        }`}>
                          #{i + 1}
                        </span>
                        <span className="text-[11px] text-white/80 font-mono truncate">
                          {entry.playerName}
                        </span>
                      </div>
                      <span className="text-[11px] text-teal-300 font-mono tabular-nums font-bold">
                        {formatTime(entry.timeMs)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-[9px] text-gray-600 font-mono text-center mt-2">
                Press F2 to start a run
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
