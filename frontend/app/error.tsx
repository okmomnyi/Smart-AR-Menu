'use client'

import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'

/**
 * Root error boundary. Renders for any uncaught render or data error below the
 * root layout, so a failure shows something actionable instead of a blank tab.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Unhandled application error:', error)
  }, [error])

  return (
    <main id="main" tabIndex={-1} className="on-dark flex min-h-screen flex-col items-center justify-center bg-menu-bg px-6 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full"
        style={{ background: 'rgba(226, 113, 74, 0.15)' }}
      >
        {/* lucide, like every other icon in the app, instead of a hand-drawn SVG. */}
        <AlertCircle size={26} className="text-critical-on" aria-hidden />
      </div>
      <h1 className="mt-5 font-display text-2xl font-bold text-menu-ink">Something broke</h1>
      <p className="mt-3 max-w-md text-menu-ink-muted">
        This page failed to load. Trying again usually fixes it.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-menu-ink-subtle">
          Reference: {error.digest}
        </p>
      )}
      <button onClick={reset} className="btn btn-accent-dark mt-8" type="button">
        Try again
      </button>
    </main>
  )
}
