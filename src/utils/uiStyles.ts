/** Shared UI style tokens for consistent glassmorphism design */

export const UI = {
  panel: (options?: { border?: string; padding?: string; width?: string }) => ({
    background: 'rgba(5,10,25,0.85)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: `1px solid ${options?.border ?? 'rgba(68,255,204,0.08)'}`,
    borderRadius: 12,
    padding: options?.padding ?? 12,
    width: options?.width ?? 'auto',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)',
  }),

  label: (color = '#667') => ({
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
    color,
    fontWeight: 500,
  }),

  value: (color = '#ccd') => ({
    fontSize: 13,
    fontWeight: 700,
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
    color,
  }),

  glowText: (color: string) => ({
    color,
    textShadow: `0 0 10px ${color}44, 0 0 20px ${color}22`,
  }),

  bar: (pct: number, color: string) => ({
    width: '100%',
    height: 4,
    background: 'rgba(255,255,255,0.04)',
    borderRadius: 2,
    overflow: 'hidden' as const,
    _inner: {
      width: `${Math.max(0, Math.min(100, pct * 100))}%`,
      height: '100%',
      background: `linear-gradient(90deg, ${color}, ${color}cc)`,
      borderRadius: 2,
      transition: 'width 0.3s ease-out',
      boxShadow: `0 0 8px ${color}44`,
    },
  }),

  button: (color = '#44ffcc') => ({
    background: `${color}15`,
    border: `1px solid ${color}44`,
    color,
    borderRadius: 8,
    padding: '6px 16px',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
    transition: 'all 0.2s ease',
    ':hover': {
      background: `${color}25`,
      boxShadow: `0 0 20px ${color}22`,
    },
  }),

  grid: (cols = 3, gap = 8) => ({
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gap,
  }),

  row: (gap = 8) => ({
    display: 'flex',
    alignItems: 'center',
    gap,
  }),

  col: (gap = 4) => ({
    display: 'flex',
    flexDirection: 'column' as const,
    gap,
  }),

  section: (title: string, color = '#44ffcc') => ({
    _container: {
      ...UI.panel({ border: `${color}15` }),
      marginBottom: 8,
    },
    _title: {
      ...UI.label(color),
      marginBottom: 8,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
    },
    _dot: {
      width: 4,
      height: 4,
      borderRadius: '50%',
      background: color,
      boxShadow: `0 0 6px ${color}`,
    },
  }),
}

/** Shared Tailwind-compatible classes for glassmorphism */
export const glassPanel = 'bg-[rgba(5,10,25,0.85)] backdrop-blur-xl border border-white/[0.05] rounded-xl shadow-2xl'
export const glassPanelStrong = 'bg-[rgba(5,10,25,0.92)] backdrop-blur-2xl border border-white/[0.08] rounded-xl shadow-2xl'
export const labelStyle = 'text-[9px] uppercase tracking-[0.15em] font-medium'
export const valueStyle = 'text-sm font-bold font-mono tabular-nums'
export const glowBar = (color: string) => `h-1 rounded-full overflow-hidden bg-white/[0.04] [&>div]:h-full [&>div]:rounded-full [&>div]:transition-all [&>div]:duration-300 [&>div]:shadow-[0_0_8px_${color}44]`
