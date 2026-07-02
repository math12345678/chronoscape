import { useEffect } from 'react'
import { useStore } from '../../store'
import { CalibrationGame } from './CalibrationGame'
import { useModalClose } from '../../hooks/useModalClose'

/**
 * Full-screen modal that opens when the player enters the Lab trigger zone.
 * Hosts the CalibrationGame mini-game with formula progress tracking.
 * Closes when the player walks away from the Lab.
 */
export const LabModal = () => {
  const labOpen = useStore((s) => s.labOpen)
  const closeLab = useStore((s) => s.closeLab)
  const formulas = useStore((s) => s.formulas)
  const allDiscovered = formulas.every((f) => f.discovered)
  const { closing, requestClose } = useModalClose(closeLab)

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && labOpen) {
        requestClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [labOpen, requestClose])

  if (!labOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-150"
        style={{ opacity: closing ? 0 : 1 }}
      />

      {/* Panel */}
      <div className="fixed z-50 inset-0 flex items-center justify-center">
        <div
          className="bg-gray-900/95 border border-gray-700/50 rounded-xl shadow-2xl overflow-hidden"
          style={{
            width: 440,
            maxHeight: '90vh',
            animation: closing ? undefined : 'modal-pop-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            transition: 'opacity 0.18s ease, transform 0.18s ease',
            opacity: closing ? 0 : 1,
            transform: closing ? 'scale(0.95)' : 'scale(1)',
          }}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <div>
              <h2 className="text-white font-bold text-lg tracking-wide flex items-center gap-2">
                <span className="text-violet-400">◆</span> The Lab
              </h2>
              <p className="text-gray-500 text-xs mt-0.5">
                {allDiscovered
                  ? 'All knowledge has been unlocked'
                  : 'Calibrate the resonator to discover new formulas'}
              </p>
            </div>
            <button
              onClick={requestClose}
              className="text-gray-500 hover:text-white transition-colors p-1 rounded hover:bg-gray-800"
              title="Close (Esc)"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4l10 10M14 4l-10 10" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 64px)' }}>
            <CalibrationGame />
          </div>

          {/* Footer hint */}
          <div className="px-5 py-2.5 border-t border-gray-800">
            <p className="text-gray-600 text-[10px] font-mono text-center">
              Walk away from the Lab to close · Formulas persist once discovered
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
