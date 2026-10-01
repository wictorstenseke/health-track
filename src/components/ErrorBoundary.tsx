import { Component, type ReactNode } from 'react'
import { sv } from '../i18n/sv'

/** Last resort for render-time failures, e.g. a live query rethrowing after IndexedDB went away. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
        <p>{sv.errors.failed}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-full bg-ink px-6 py-3 font-semibold text-white"
        >
          {sv.errors.reload}
        </button>
      </main>
    )
  }
}
