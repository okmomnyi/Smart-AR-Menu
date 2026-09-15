import React from 'react'
import Link from 'next/link'
import BrandMark from './BrandMark'
import ScrollProgress from './ScrollProgress'
import BackToTop from './BackToTop'

const FOOTER_LINKS = [
  { href: '/help', label: 'Help' },
  { href: '/legal/privacy', label: 'Privacy' },
  { href: '/legal/terms', label: 'Terms' },
  { href: '/admin', label: 'Restaurant sign in' },
]

/** Frame for long-form pages: the legal documents and guest help. */
export default function DocumentShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="on-dark min-h-screen bg-menu-bg">
      <ScrollProgress />

      <header className="sticky top-0 z-10 border-b border-menu-border bg-menu-bg/85 px-6 py-4 backdrop-blur-lg">
        <Link href="/" className="inline-flex items-center gap-3 rounded-md no-underline">
          <BrandMark size={32} />
          <span className="font-display text-lg font-bold text-menu-ink">AR Menu</span>
        </Link>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto max-w-2xl px-6 py-12">
        {children}
      </main>

      <footer className="border-t border-menu-border px-6 py-8 text-center print:hidden">
        <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
          {FOOTER_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="rounded-sm text-menu-ink-muted underline underline-offset-2 transition-colors hover:text-menu-ink hover:decoration-2"
            >
              {label}
            </Link>
          ))}
        </nav>
      </footer>

      <BackToTop />
    </div>
  )
}
