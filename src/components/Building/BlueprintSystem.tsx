import { useState, useEffect, useCallback } from 'react'
import { useStore } from '../../store'
import type { Blueprint } from '../../store'

/**
 * Blueprint save/load interface.
 * Press B to open when in build mode with a selection active.
 * Shows saved blueprints, allows saving the current selection,
 * loading a blueprint into clipboard, or deleting.
 */
export const BlueprintSystem = () => {
  const blueprints = useStore((s) => s.blueprints)
  const selectionBox = useStore((s) => s.selectionBox)
  const saveBlueprint = useStore((s) => s.saveBlueprint)
  const loadBlueprint = useStore((s) => s.loadBlueprint)
  const deleteBlueprint = useStore((s) => s.deleteBlueprint)
  const [open, setOpen] = useState(false)
  const [bpName, setBpName] = useState('')
  const [message, setMessage] = useState('')

  // Load blueprints from localStorage on mount
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('chronoscape_blueprints') || '[]')
      if (saved.length > 0 && blueprints.length === 0) {
        // Blueprints already synced via saveBlueprint action
      }
    } catch { /* ignore */ }
  }, [blueprints.length])

  // Keyboard shortcut: B to toggle (via custom event from global keyboard handler)
  // Escape closes the panel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    const customHandler = () => {
      if (useStore.getState().selectionBox) {
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', handler)
    window.addEventListener('blueprint-toggle', customHandler)
    return () => {
      window.removeEventListener('keydown', handler)
      window.removeEventListener('blueprint-toggle', customHandler)
    }
  }, [selectionBox, open])

  const handleSave = useCallback(() => {
    if (!bpName.trim()) {
      setMessage('Enter a name')
      return
    }
    saveBlueprint(bpName.trim())
    setBpName('')
    setMessage('Blueprint saved!')
    setTimeout(() => setMessage(''), 2000)
  }, [bpName, saveBlueprint])

  const handleLoad = useCallback((bp: Blueprint) => {
    loadBlueprint(bp.id)
    setMessage(`Loaded: ${bp.name}`)
    setTimeout(() => setMessage(''), 2000)
  }, [loadBlueprint])

  const handleDelete = useCallback((id: string) => {
    deleteBlueprint(id)
    setMessage('Blueprint deleted')
    setTimeout(() => setMessage(''), 2000)
  }, [deleteBlueprint])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-900/95 border border-gray-700/50 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-white font-bold text-sm tracking-wide uppercase">
            Blueprints
          </h2>
          <button
            onClick={() => setOpen(false)}
            className="text-gray-500 hover:text-white transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Save new */}
        <div className="px-5 py-4 border-b border-gray-800">
          <p className="text-xs text-gray-400 mb-2">
            Save current selection as blueprint
          </p>
          <div className="flex gap-2">
            <input
              value={bpName}
              onChange={(e) => setBpName(e.target.value)}
              placeholder="Blueprint name..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
            <button
              onClick={handleSave}
              className="bg-teal-600 hover:bg-teal-500 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
              disabled={!selectionBox}
            >
              Save
            </button>
          </div>
          {message && (
            <p className="text-xs text-teal-400 mt-1">{message}</p>
          )}
        </div>

        {/* Blueprint list */}
        <div className="px-5 py-3 max-h-60 overflow-y-auto">
          {blueprints.length === 0 ? (
            <p className="text-gray-500 text-xs text-center py-4">
              No blueprints saved yet. Select blocks and press B.
            </p>
          ) : (
            <div className="space-y-2">
              {blueprints.map((bp) => (
                <div
                  key={bp.id}
                  className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2 border border-gray-700/30"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {bp.name}
                    </p>
                    <p className="text-gray-500 text-[10px]">
                      {bp.blocks.length} blocks · {new Date(bp.created).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={() => handleLoad(bp)}
                      className="text-xs bg-teal-700/50 hover:bg-teal-600 text-teal-300 px-2 py-1 rounded transition-colors"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => handleDelete(bp.id)}
                      className="text-xs bg-red-800/50 hover:bg-red-700 text-red-300 px-2 py-1 rounded transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
