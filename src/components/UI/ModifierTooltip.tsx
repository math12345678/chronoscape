import { MODIFIERS } from '../../config/modifiers'
import { getWeaponModifiers } from '../../systems/WeaponModifierSystem'
import type { WeaponId } from '../../config/combat'
import { UI } from '../../utils/uiStyles'

/** Parse a tooltip string like "#f84a00**Powerful**#808080 text" into segments. */
function parseTooltip(text: string): { color: string; bold: boolean; text: string }[] {
  const segments: { color: string; bold: boolean; text: string }[] = []
  let i = 0
  let currentColor = '#cccccc'
  while (i < text.length) {
    if (text[i] === '#' && i + 6 < text.length && /^[0-9a-fA-F]{6}$/.test(text.slice(i + 1, i + 7))) {
      currentColor = '#' + text.slice(i + 1, i + 7)
      i += 7
      continue
    }
    if (text.startsWith('**', i)) {
      const end = text.indexOf('**', i + 2)
      if (end === -1) { segments.push({ color: currentColor, bold: false, text: text.slice(i) }); break }
      segments.push({ color: currentColor, bold: true, text: text.slice(i + 2, end) })
      i = end + 2
      continue
    }
    // Collect regular text until next special char
    let end = i + 1
    while (end < text.length && text[end] !== '#' && !text.startsWith('**', end)) end++
    segments.push({ color: currentColor, bold: false, text: text.slice(i, end) })
    i = end
  }
  return segments
}

interface Props {
  weaponId: WeaponId | null
  // If true, show the full tooltip card; otherwise just inline indicator
  mode: 'card' | 'indicator'
}

/** Shows modifier tooltip. Card mode: full panel. Indicator mode: colored dot count. */
export const ModifierTooltip = ({ weaponId, mode }: Props) => {
  if (!weaponId) return null
  const mods = getWeaponModifiers(weaponId)
  if (mods.length === 0) return null

  if (mode === 'indicator') {
    return (
      <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        {mods.map((m, i) => (
          <span
            key={i}
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: MODIFIERS[m.id].color,
              boxShadow: `0 0 4px ${MODIFIERS[m.id].color}`,
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div style={{
      ...UI.panel({ border: 'rgba(255,255,255,0.06)' }),
      padding: 8,
      minWidth: 180,
      maxWidth: 260,
    }}>
      <div style={{ ...UI.label('#889'), marginBottom: 6 }}>MODIFIERS</div>
      {mods.map((m, i) => {
        const def = MODIFIERS[m.id]
        const segments = parseTooltip(def.tooltip(m.strength))
        return (
          <div key={i} style={{ marginBottom: i < mods.length - 1 ? 4 : 0, lineHeight: 1.5 }}>
            {segments.map((seg, j) => (
              <span
                key={j}
                style={{
                  color: seg.color,
                  fontWeight: seg.bold ? 700 : 400,
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 10,
                  letterSpacing: 0.3,
                }}
              >
                {seg.text}
              </span>
            ))}
          </div>
        )
      })}
    </div>
  )
}

/** Inline modifier badges shown next to weapon name in HUD. */
export const ModifierBadges = ({ weaponId }: { weaponId: WeaponId | null }) => {
  if (!weaponId) return null
  const mods = getWeaponModifiers(weaponId)
  if (mods.length === 0) return null

  return (
    <span style={{ display: 'inline-flex', gap: 3, marginLeft: 4, verticalAlign: 'middle' }}>
      {mods.map((m, i) => (
        <span
          key={i}
          title={MODIFIERS[m.id].tooltip(m.strength)}
          style={{
            display: 'inline-block',
            padding: '0 3px',
            fontSize: 8,
            fontWeight: 700,
            fontFamily: 'monospace',
            color: MODIFIERS[m.id].color,
            background: `${MODIFIERS[m.id].color}15`,
            border: `1px solid ${MODIFIERS[m.id].color}33`,
            borderRadius: 3,
            lineHeight: '14px',
          }}
        >
          {MODIFIERS[m.id].icon}
        </span>
      ))}
    </span>
  )
}
