import { useStore } from '../../store'

/**
 * Reads the current interaction target from the Zustand store and renders
 * a contextual prompt at the bottom of the screen.
 *
 * The actual raycasting is handled by <InteractionScanner /> inside the
 * R3F Canvas. This component never touches R3F hooks — it's pure HTML.
 */
export const InteractionPrompt = () => {
  const target = useStore((s) => s.interactionTarget)

  if (!target) return null

  return (
    <div className="fixed bottom-16 left-1/2 -translate-x-1/2 bg-black/70 text-white px-5 py-2.5 rounded-lg text-sm font-mono pointer-events-none z-50 backdrop-blur-sm border border-white/10 shadow-lg">
      {target.prompt}
    </div>
  )
}
