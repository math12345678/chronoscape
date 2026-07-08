import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  name?: string // label for which component crashed
  fallback?: ReactNode
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * ErrorBoundary that isolates component crashes.
 * 
 * - `name` prop: labels which component crashed for easier debugging
 * - `fallback` prop: custom fallback UI (defaults to compact inline error)
 * - `onReset` prop: called when user clicks "Retry"
 * 
 * Default fallback is a small dark banner — NOT a full black screen.
 * Use at root level for a last-resort barrier, and wrap individual
 * sections around crash-prone areas (3D scene, audio, HUD panels).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.name ? `:${this.props.name}` : ''}]`, error.message, info.componentStack)
  }

  protected handleRetry = () => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback takes priority
      if (this.props.fallback) {
        return this.props.fallback
      }

      const label = this.props.name || 'Component'

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '16px',
            background: 'rgba(5, 10, 25, 0.85)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            color: '#9ca3af',
            fontSize: '13px',
            fontFamily: 'ui-monospace, monospace',
            textAlign: 'center',
            minHeight: '80px',
          }}
        >
          <div style={{ color: '#ef4444', fontSize: '14px', fontWeight: 600 }}>
            ⚠ {label} crashed
          </div>
          {this.state.error && (
            <div style={{ color: '#6b7280', fontSize: '11px', maxWidth: '400px', lineHeight: 1.4 }}>
              {this.state.error.message}
            </div>
          )}
          <button
            onClick={this.handleRetry}
            style={{
              marginTop: '4px',
              padding: '4px 14px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '6px',
              color: '#d1d5db',
              fontSize: '12px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
          >
            Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

/**
 * Full-screen catastrophic error fallback — used only at the root level
 * when a section-level ErrorBoundary didn't catch it.
 * Shows a stylized game-feel error screen instead of a blank black page.
 */
export function CatastrophicFallback({ error, onReset }: { error: Error | null; onReset: () => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        background: 'radial-gradient(ellipse at center, #0a0f1f 0%, #050810 100%)',
        color: '#9ca3af',
        fontFamily: 'ui-monospace, monospace',
        textAlign: 'center',
        padding: '40px',
      }}
    >
      {/* Subtle decorative line */}
      <div
        style={{
          width: '60px',
          height: '2px',
          background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.5), transparent)',
          marginBottom: '8px',
        }}
      />

      <div style={{ fontSize: '20px', color: '#ef4444', fontWeight: 700, letterSpacing: '0.05em' }}>
        CHRONOSCAPE
      </div>
      <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
        A temporal anomaly disrupted the instance
      </div>

      {error && (
        <div
          style={{
            fontSize: '11px',
            color: '#4b5563',
            maxWidth: '480px',
            lineHeight: 1.5,
            background: 'rgba(0,0,0,0.3)',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.05)',
            wordBreak: 'break-word',
          }}
        >
          {error.message}
        </div>
      )}

      <button
        onClick={onReset}
        style={{
          marginTop: '8px',
          padding: '8px 24px',
          background: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.05))',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '8px',
          color: '#ef4444',
          fontSize: '14px',
          cursor: 'pointer',
          fontFamily: 'inherit',
          letterSpacing: '0.03em',
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239,68,68,0.3), rgba(239,68,68,0.1))')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.05))')}
      >
        ⚡ Re-establish Timeline
      </button>
    </div>
  )
}
