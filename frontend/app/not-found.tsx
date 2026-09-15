import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <main id="main" tabIndex={-1} className="on-dark flex min-h-screen flex-col items-center justify-center bg-menu-bg px-6 text-center">
      <p className="font-mono text-sm tracking-widest text-accent">404</p>
      <h1 className="mt-3 font-display text-3xl font-bold text-menu-ink">
        We couldn&apos;t find that page
      </h1>
      <p className="mt-3 max-w-md text-menu-ink-muted">
        The link may be out of date, or the restaurant may have taken its menu down. If you
        scanned a QR code at a table, ask a member of staff for the current one.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/help" className="btn btn-accent-dark">
          Help with the menu
        </Link>
        <Link
          href="/admin"
          className="btn border-menu-border text-menu-ink hover:border-white/30 hover:bg-white/5"
        >
          Restaurant sign in
        </Link>
      </div>
    </main>
  )
}
