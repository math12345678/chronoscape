import { useCallback } from 'react'
import { useStore } from '../../store'
import { getNPCs, addNPC } from '../NPC/NPCTick'
import type { NPCTask } from '../../npcAI'

const HIRE_COST = 15 // Liquid units per hire

const TASK_INFO: Record<NPCTask, { label: string; description: string; color: string }> = {
  idle: { label: 'Idle', description: 'Wanders the island', color: '#888' },
  harvester: { label: 'Harvester', description: 'Autonomously harvests Time Rifts', color: '#44ff88' },
  builder: { label: 'Builder', description: 'Places blocks (future)', color: '#ffaa44' },
  explorer: { label: 'Explorer', description: 'Maps the island (future)', color: '#4488ff' },
}

interface HirePanelProps {
  onClose: () => void
}

export const HirePanel = ({ onClose }: HirePanelProps) => {
  const inventory = useStore((s) => s.inventory)
  const liquid = Math.floor(inventory.liquid)
  const npcs = getNPCs()

  const canHire = liquid >= HIRE_COST

  const handleHire = useCallback(() => {
    if (!canHire) return

    // Deduct Liquid from store
    useStore.setState((s) => ({
      inventory: {
        ...s.inventory,
        liquid: Math.max(0, s.inventory.liquid - HIRE_COST),
      },
    }))

    // Spawn hired NPC
    addNPC(true)
  }, [canHire])

  const handleAssignTask = useCallback((npcId: string, task: NPCTask) => {
    const npcs = getNPCs()
    const npc = npcs.find((n) => n.id === npcId)
    if (npc) {
      npc.task = task
      npc.state = 'idle'
      npc.stateTimer = 0
    }
  }, [])

  const hired = npcs.filter((n) => n.hired)
  const wild = npcs.filter((n) => !n.hired)

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="bg-gray-900/95 border border-gray-700/50 rounded-xl shadow-2xl overflow-hidden" style={{ width: 420, maxHeight: '85vh' }}>
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <div>
              <h2 className="text-white font-bold text-lg tracking-wide flex items-center gap-2">
                <span className="text-amber-400">◈</span> Time Workers
              </h2>
              <p className="text-gray-500 text-xs mt-0.5">
                Hire NPCs to harvest time for you
              </p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1 rounded hover:bg-gray-800">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4l10 10M14 4l-10 10" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 64px)' }}>
            {/* Hire section */}
            <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-700/30">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-white text-sm font-bold">Hire a Worker</p>
                  <p className="text-gray-500 text-xs">
                    Costs <span className="text-blue-400 font-bold">{HIRE_COST} Liquid</span>
                    {' · '}You have <span className="text-blue-400">{liquid}</span>
                  </p>
                </div>
                <button
                  onClick={handleHire}
                  disabled={!canHire}
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    canHire
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:brightness-110 active:scale-95'
                      : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                  }`}
                >
                  {canHire ? `Hire (${HIRE_COST}◎)` : 'Need Liquid'}
                </button>
              </div>
              <p className="text-gray-600 text-[10px]">
                Hired workers autonomously harvest Time Rifts and deposit Raw into your inventory
              </p>
            </div>

            {/* Hired NPCs */}
            {hired.length > 0 && (
              <div>
                <h3 className="text-white/80 text-xs uppercase tracking-wider font-bold mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-400" />
                  Your Workers ({hired.length})
                </h3>
                <div className="space-y-2">
                  {hired.map((npc) => {
                    return (
                      <div key={npc.id} className="bg-gray-800/30 border border-gray-700/40 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: npc.color }}
                            />
                            <span className="text-white text-sm font-bold">{npc.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 uppercase">
                              {npc.state}
                            </span>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-gray-500">Energy</span>
                              <span className="text-white font-mono">{Math.floor(npc.energy)}</span>
                            </div>
                            <div className="w-full h-1 bg-gray-800 rounded overflow-hidden">
                              <div className="h-full bg-amber-400 rounded" style={{ width: `${npc.energy}%` }} />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-gray-500">Vitality</span>
                              <span className="text-white font-mono">{Math.floor(npc.vitality)}</span>
                            </div>
                            <div className="w-full h-1 bg-gray-800 rounded overflow-hidden">
                              <div className="h-full bg-green-400 rounded" style={{ width: `${npc.vitality}%` }} />
                            </div>
                          </div>
                        </div>

                        {/* Inventory */}
                        <div className="text-[10px] text-gray-500 mb-2">
                          Stored: <span className="text-orange-400">{npc.inventory.raw} Raw</span>
                          {' · '}
                          <span className="text-amber-400">{npc.inventory.vapour} Vapour</span>
                        </div>

                        {/* Task assignment */}
                        <div className="flex gap-1.5">
                          {(['idle', 'harvester', 'explorer'] as NPCTask[]).map((task) => {
                            const info = TASK_INFO[task]
                            const isActive = npc.task === task
                            return (
                              <button
                                key={task}
                                onClick={() => handleAssignTask(npc.id, task)}
                                className={`text-[10px] px-2 py-1 rounded transition-all ${
                                  isActive
                                    ? 'bg-blue-900/40 text-blue-300 border border-blue-700/50'
                                    : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/60 border border-gray-700/30'
                                }`}
                              >
                                {info.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Wild NPCs (not hired) */}
            {wild.length > 0 && (
              <div>
                <h3 className="text-white/60 text-xs uppercase tracking-wider font-bold mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-gray-500" />
                  Island Wanderers ({wild.length})
                </h3>
                <div className="space-y-1.5">
                  {wild.map((npc) => (
                    <div key={npc.id} className="flex items-center gap-2 bg-gray-800/20 rounded px-3 py-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: npc.color }} />
                      <span className="text-gray-400 text-sm">{npc.name}</span>
                      <span className="text-[10px] text-gray-600 uppercase ml-auto">{npc.state}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hired.length === 0 && (
              <div className="text-center py-6">
                <p className="text-gray-500 text-sm">No workers yet</p>
                <p className="text-gray-600 text-xs mt-1">Hire workers to automate harvesting</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-2.5 border-t border-gray-800 text-center">
            <p className="text-gray-600 text-[10px] font-mono">
              <kbd className="bg-gray-800 text-gray-400 px-1 rounded text-[9px]">H</kbd> Hire panel
              {' · '}
              Workers deposit resources automatically
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
