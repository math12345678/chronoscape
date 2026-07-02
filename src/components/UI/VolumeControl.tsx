import { useState } from 'react'
import { getAmbientVolume, setAmbientVolume } from '../AmbientMusic'

/**
 * Small speaker control, bottom-right, for adjusting the ambient music volume.
 * Persists the chosen level to localStorage via setAmbientVolume.
 */
export const VolumeControl = () => {
  const [open, setOpen] = useState(false)
  const [volume, setVolume] = useState(() => getAmbientVolume())

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value)
    setVolume(v)
    setAmbientVolume(v)
  }

  return (
    <div className="fixed bottom-3 right-3 z-50 flex items-center gap-2">
      {open && (
        <div className="bg-gray-950/80 backdrop-blur-sm border border-gray-800/50 rounded-lg px-3 py-2 flex items-center gap-2 shadow-2xl">
          <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Music</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={handleChange}
            className="w-24 accent-teal-400"
            aria-label="Ambient music volume"
          />
          <span className="text-[10px] font-mono text-gray-500 w-7 text-right">
            {Math.round(volume * 100)}%
          </span>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-9 h-9 rounded-full bg-gray-950/80 backdrop-blur-sm border border-gray-800/50 flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-900 transition-colors shadow-2xl"
        aria-label="Toggle music volume control"
      >
        {volume === 0 ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 6h2.5l3-3v10l-3-3H2V6z" />
            <path d="M10.5 6.5l3 3M13.5 6.5l-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 6h2.5l3-3v10l-3-3H2V6z" />
            <path
              d="M10.5 4.5a5 5 0 010 7M12.5 2.5a8 8 0 010 11"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        )}
      </button>
    </div>
  )
}
