/**
 * Tiny save-status indicator. Shows when the game was last persisted.
 * Fades out after a few seconds if nothing new happened.
 */
export const SaveIndicator = ({ lastSaved }: { lastSaved: string }) => {
  const isNew = lastSaved === 'Just now' || lastSaved === '0s ago'

  return (
    <div className="fixed bottom-3 right-3 z-50 select-none pointer-events-none">
      <div
        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg backdrop-blur-sm transition-all duration-500 ${
          isNew
            ? 'bg-teal-900/40 border border-teal-700/40'
            : 'bg-gray-900/30 border border-gray-800/20'
        }`}
      >
        {/* Animated dot */}
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isNew
              ? 'bg-teal-400 animate-pulse shadow-[0_0_4px_rgba(45,212,191,0.6)]'
              : 'bg-gray-600'
          }`}
        />
        <span className="text-[9px] font-mono text-gray-500/80 tracking-wide">
          {lastSaved ? `Saved ${lastSaved}` : '—'}
        </span>
      </div>
    </div>
  )
}
