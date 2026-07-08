import { useState, useEffect } from 'react'
import { loadBlueprints, createBlueprint, deleteBlueprint, renameBlueprint, placeBlueprint } from '../../systems/BlueprintSystem'
import type { BlueprintData } from '../../systems/BlueprintSystem'
import { getPlayerPosition } from '../NPC/NPCTick'
import { FButton } from './controls/FButton'
import { FLabel } from './controls/FLabel'
import { FTextInput } from './controls/FTextInput'
import { FSection } from './controls/FSection'
import { UI } from '../../utils/uiStyles'

export const BlueprintUI = () => {
  const [visible, setVisible] = useState(false)
  const [blueprints, setBlueprints] = useState<BlueprintData[]>([])
  const [saveName, setSaveName] = useState('')
  const [snapSize, setSnapSize] = useState(5)
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const refresh = () => setBlueprints(loadBlueprints())

  useEffect(() => {
    const handler = () => { setVisible(v => !v); refresh() }
    window.addEventListener('toggle-blueprints', handler)
    return () => window.removeEventListener('toggle-blueprints', handler)
  }, [])

  useEffect(() => {
    if (visible) refresh()
  }, [visible])

  if (!visible) return null

  const handleSaveSelection = () => {
    const [px, py, pz] = getPlayerPosition()
    const half = Math.floor(snapSize / 2)
    const minX = Math.floor(px) - half
    const minY = Math.floor(py) - half
    const minZ = Math.floor(pz) - half
    const maxX = Math.floor(px) + half
    const maxY = Math.floor(py) + half
    const maxZ = Math.floor(pz) + half

    const name = saveName.trim() || `Blueprint ${blueprints.length + 1}`
    const bp = createBlueprint(name, minX, minY, minZ, maxX, maxY, maxZ)

    if (bp) {
      setMessage(`Saved "${bp.name}" (${bp.blocks.length} blocks, ${bp.width}×${bp.height}×${bp.depth})`)
      refresh()
      setSaveName('')
    } else {
      setMessage('No blocks found in that region.')
    }

    setTimeout(() => setMessage(''), 3000)
  }

  const handlePlace = (bp: BlueprintData) => {
    const [px, py, pz] = getPlayerPosition()
    const targetX = Math.floor(px) - Math.floor(bp.width / 2)
    const targetY = Math.floor(py)
    const targetZ = Math.floor(pz) - Math.floor(bp.depth / 2)

    if (placeBlueprint(targetX, targetY, targetZ, bp)) {
      setMessage(`Placed "${bp.name}" at ${targetX}, ${targetY}, ${targetZ}`)
    } else {
      setMessage('Cannot place — position is occupied.')
    }
    setTimeout(() => setMessage(''), 3000)
  }

  const handleDelete = (id: string) => {
    deleteBlueprint(id)
    refresh()
    setMessage('Blueprint deleted.')
    setTimeout(() => setMessage(''), 2000)
  }

  const handleRename = (id: string) => {
    if (editName.trim()) {
      renameBlueprint(id, editName.trim())
      refresh()
      setEditingId(null)
      setMessage('Blueprint renamed.')
      setTimeout(() => setMessage(''), 2000)
    }
  }

  return (
    <div style={{
      position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
      zIndex: 9990,
      ...UI.panel({ border: 'rgba(170,136,255,0.08)', padding: '18px 22px' }),
      width: 400, maxHeight: '80vh', overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <FSection title="Blueprints" color="#aa88ff" />
        <FButton onClick={() => setVisible(false)} color="#ff4466" size="sm">Close</FButton>
      </div>

      {/* Save new */}
      <div style={{
        ...UI.panel({ border: 'rgba(170,136,255,0.06)', padding: '10px 12px' }),
        marginBottom: 14,
      }}>
        <FLabel label="Save Selection" value={`${snapSize}×${snapSize}×${snapSize} cube`} />

        <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
          <FTextInput
            placeholder="Blueprint name"
            value={saveName}
            onChange={setSaveName}
            style={{ flex: 1 }}
          />
          <FButton onClick={handleSaveSelection} color="#aa88ff" size="sm">Save</FButton>
        </div>

        {/* Snap size selector */}
        <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
          {[3, 5, 7, 11].map(n => (
            <FButton
              key={n}
              onClick={() => setSnapSize(n)}
              color={snapSize === n ? '#aa88ff' : '#445'}
              size="sm"
            >
              {n}×{n}×{n}
            </FButton>
          ))}
        </div>

        <div style={{ fontSize: 7, color: '#556', fontFamily: 'monospace', marginTop: 6 }}>
          Saves all blocks in a {snapSize}×{snapSize}×{snapSize} cube centered on you.
        </div>
      </div>

      {/* Blueprint list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {blueprints.length === 0 && (
          <div style={{ fontSize: 9, color: '#556', fontFamily: 'monospace', textAlign: 'center', padding: 20 }}>
            No saved blueprints yet.
          </div>
        )}

        {blueprints.map(bp => {
          const typeSummary = countTypes(bp.blocks)

          return (
            <div key={bp.id} style={{
              ...UI.panel({ border: 'rgba(170,136,255,0.06)', padding: '10px 12px' }),
            }}>
              {/* Name & actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {editingId === bp.id ? (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flex: 1 }}>
                    <FTextInput value={editName} onChange={setEditName} placeholder="New name" style={{ flex: 1 }} />
                    <FButton onClick={() => handleRename(bp.id)} color="#44ffcc" size="sm">OK</FButton>
                    <FButton onClick={() => setEditingId(null)} color="#556" size="sm">X</FButton>
                  </div>
                ) : (
                  <>
                    <FLabel label={bp.name} value={`${bp.blocks.length} blocks`} valueColor="#aa88ff" />
                    <div style={{ display: 'flex', gap: 4 }}>
                      <FButton onClick={() => handlePlace(bp)} color="#44ffcc" size="sm">Place</FButton>
                      <FButton
                        onClick={() => { setEditingId(bp.id); setEditName(bp.name) }}
                        color="#6688ff" size="sm"
                      >
                        Rename
                      </FButton>
                      <FButton onClick={() => handleDelete(bp.id)} color="#ff4466" size="sm">Del</FButton>
                    </div>
                  </>
                )}
              </div>

              {/* Size */}
              <div style={{ fontSize: 7, fontFamily: 'monospace', color: '#556', marginTop: 4 }}>
                {bp.width}×{bp.height}×{bp.depth} &middot; {new Date(bp.created).toLocaleDateString()}
              </div>

              {/* Type breakdown */}
              <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                {Object.entries(typeSummary).slice(0, 4).map(([t, c]) => (
                  <div key={t} style={{
                    fontSize: 7, fontFamily: 'monospace', color: '#778',
                    padding: '2px 5px', background: 'rgba(170,136,255,0.06)', borderRadius: 4,
                  }}>
                    {t}: {c}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Message */}
      {message && (
        <div style={{
          marginTop: 10, padding: '6px 10px', borderRadius: 6,
          background: 'rgba(170,136,255,0.08)', border: '1px solid rgba(170,136,255,0.15)',
          fontSize: 9, fontFamily: 'monospace', color: '#aa88ff', textAlign: 'center',
        }}>
          {message}
        </div>
      )}

      <div style={{ fontSize: 7, color: '#445', marginTop: 12, textAlign: 'center', fontFamily: 'monospace' }}>
        Press V to toggle
      </div>
    </div>
  )
}

function countTypes(blocks: BlueprintData['blocks']): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const b of blocks) {
    counts[b.type] = (counts[b.type] || 0) + 1
  }
  return counts
}
