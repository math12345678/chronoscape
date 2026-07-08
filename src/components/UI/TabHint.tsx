import { useEffect, useRef, useState } from 'react'

const LS_KEY = 'chronoscape_tab_hint_dismissed'
const FADE_DURATION = 500 // ms

/**
 * Subtle 'Tab — Menu' hint rendered near the bottom of the screen.
 * Fades out after 10 seconds or immediately when Tab is pressed.
 * Persists dismissal across sessions via localStorage.
 */
export const TabHint = () => {
  const [visible, setVisible] = useState(false)
  const [fading, setFading] = useState(false)
  const dismissedRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const dismiss = () => {
    if (dismissedRef.current) return
    dismissedRef.current = true
    setFading(true)
    setTimeout(() => {
      setVisible(false)
      try { localStorage.setItem(LS_KEY, '1') } catch {}
    }, FADE_DURATION)
  }

  useEffect(() => {
    // Check if already dismissed
    try {
      if (localStorage.getItem(LS_KEY)) {
        dismissedRef.current = true
        return
      }
    } catch {}

    // Show after a short delay (let other UI settle)
    const showTimer = setTimeout(() => {
      if (dismissedRef.current) return
      setVisible(true)
    }, 2000)

    // Auto-hide after 10 seconds
    timerRef.current = setTimeout(dismiss, 10000)

    // Hide immediately on Tab press
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && !dismissedRef.current) {
        if (timerRef.current) clearTimeout(timerRef.current)
        dismiss()
      }
    }
    window.addEventListener('keydown', handler)

    return () => {
      clearTimeout(showTimer)
      if (timerRef.current) clearTimeout(timerRef.current)
      window.removeEventListener('keydown', handler)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!visible) return null

  return (
    <div
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 pointer-events-none select-none"
      style={{
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE_DURATION}ms ease-out, transform ${FADE_DURATION}ms ease-out`,
        transform: fading ? 'translateY(6px) translateX(-50%)' : 'translateY(0) translateX(-50%)',
        animation: visible && !fading ? 'tab-hint-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) both' : 'none',
      }}
    >
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-950/60 backdrop-blur-sm border border-gray-800/30">
        <kbd className="text-[10px] font-mono font-bold text-teal-400/80 bg-teal-900/20 px-1.5 py-0.5 rounded border border-teal-700/20">
          Tab
        </kbd>
        <span className="text-[10px] text-gray-500 font-mono tracking-wide">— Menu</span>
      </div>

      <style>{`
        @keyframes tab-hint-in {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
