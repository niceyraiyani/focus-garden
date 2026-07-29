import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

/** Keeps a render error from blanking the whole app; offers a gentle reset. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('lock.in error:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="crash">
          <h1>Oh no, a little weed appeared</h1>
          <p>Something went wrong, but your data is safe on this device.</p>
          <pre>{this.state.error.message}</pre>
          <button className="btn btn--primary" onClick={() => window.location.reload()}>
            Reload the garden
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
