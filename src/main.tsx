import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary, CatastrophicFallback } from './components/ErrorBoundary'

type ErrorState = { hasError: boolean; error: Error | null }

class RootErrorBoundary extends ErrorBoundary {
  state: ErrorState = { hasError: false, error: null }

  /** On root level, retry means a full reload — setState recovery would infinite-loop */
  handleRetry = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <CatastrophicFallback
          error={this.state.error}
          onReset={this.handleRetry}
        />
      )
    }
    return this.props.children
  }
}

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element #root not found in DOM')
createRoot(rootEl).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>
)
