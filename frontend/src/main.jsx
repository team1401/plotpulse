import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/index.css'
import { logError } from './utils/api'

console.log('[PlotPulse] Starting app...')

// Global error handlers
window.addEventListener('error', (e) => {
  logError('Uncaught Error', e.error || new Error(e.message), {
    filename: e.filename, line: e.lineno, col: e.colno
  })
})
window.addEventListener('unhandledrejection', (e) => {
  logError('Unhandled Promise Rejection', new Error(String(e.reason)))
})

// Error boundary for debugging
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    console.error('[PlotPulse] React Error:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return React.createElement('div', { style: { color: 'white', padding: '2rem' } },
        React.createElement('h1', null, 'Something went wrong'),
        React.createElement('pre', { style: { color: '#ff6b6b' } }, this.state.error?.toString())
      )
    }
    return this.props.children
  }
}

// Lazy load App to catch import errors
const App = React.lazy(() => import('./App'))

ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement(ErrorBoundary, null,
    React.createElement(React.Suspense, { 
      fallback: React.createElement('div', { style: { color: 'white', padding: '2rem', fontSize: '1.5rem' } }, 'Loading PlotPulse...')
    },
      React.createElement(App, null)
    )
  )
)
