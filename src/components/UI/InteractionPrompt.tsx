import { useState, useEffect, useRef } from 'react'
import { useStore } from '../../store'

/**
 * Simplified interaction prompt — no entity-specific icons or colors.
 * Just clean white text on a dark glass panel.
 */
export const InteractionPrompt = () => {
  const target = useStore((s) => s.interactionTarget)
  const [visible, setVisible] = useState(false)
  const [displayText, setDisplayText] = useState('')
  const prevTargetRef = useRef<string | null>(null)

  useEffect(() => {
    const prompt = target?.prompt ?? null

    if (prompt !== prevTargetRef.current) {
      prevTargetRef.current = prompt

      if (prompt) {
        setDisplayText(prompt)
        setVisible(true)
      } else {
        setVisible(false)
      }
    }
  }, [target])

  if (!visible && !displayText) return null

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 pointer-events-none z-50 select-none">
      <div
        className={`
          px-4 py-2.5 rounded-lg
          bg-gray-900/70 backdrop-blur-sm
          border border-white/10
          transition-all duration-300 ease-out
          ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}
        `}
      >
        <span className="text-white/80 text-xs font-mono tracking-wide">
          {displayText}
        </span>
      </div>
    </div>
  )
}
