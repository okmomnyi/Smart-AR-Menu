'use client'

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  UtensilsCrossed,
  ListOrdered,
  Palette,
  LogOut,
  Menu as MenuIcon,
  X,
  ExternalLink,
} from 'lucide-react'
import { useAuth } from '../lib/auth'
import BrandMark from './BrandMark'
import ThemeToggle from './ThemeToggle'

// Matches Tailwind's lg breakpoint, where the sidebar stops being a drawer.
const DESKTOP_QUERY = '(min-width: 1024px)'

function subscribeDesktop(onChange: () => void) {
  const media = window.matchMedia(DESKTOP_QUERY)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/admin/products', label: 'Products', Icon: UtensilsCrossed },
  { href: '/admin/categories', label: 'Categories', Icon: ListOrdered },
  { href: '/admin/branding', label: 'Branding', Icon: Palette },
]

interface AdminLayoutProps {
  children: React.ReactNode
  title: string
}

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const pathname = usePathname()
  const { signOut, restaurant } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const openButtonRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const isDesktop = useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => true
  )

  // A closed drawer is only moved off-screen, so its links stayed in the tab
  // order: keyboard users tabbed into navigation they could not see. inert
  // removes it from focus and the accessibility tree until it is opened.
  const drawerHidden = !isDesktop && !mobileOpen

  function closeDrawer() {
    setMobileOpen(false)
    openButtonRef.current?.focus()
  }

  useEffect(() => {
    if (!mobileOpen) return
    closeButtonRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDrawer()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [mobileOpen])

  const menuUrl = restaurant
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/r/${restaurant.slug}`
    : null

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await signOut()
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-surface">
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={closeDrawer}
          tabIndex={-1}
          aria-label="Close navigation"
        />
      )}

      <aside
        id="admin-nav"
        inert={drawerHidden}
        className={`print:hidden fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-menu-bg transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="on-dark flex items-center gap-3 border-b border-menu-border px-5 py-5">
          <BrandMark size={34} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-bold text-menu-ink">
              {restaurant?.name ?? 'AR Menu'}
            </p>
            <p className="text-xs text-menu-ink-muted">Admin panel</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="rounded-md p-1 text-menu-ink-muted hover:text-menu-ink lg:hidden"
            onClick={closeDrawer}
            aria-label="Close navigation"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <nav className="on-dark flex-1 space-y-1 px-3 py-4" aria-label="Admin sections">
          {NAV.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-accent-wash text-accent'
                    : 'text-menu-ink-muted hover:bg-white/5 hover:text-menu-ink'
                }`}
              >
                <Icon size={18} aria-hidden="true" />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="on-dark space-y-1 border-t border-menu-border px-3 py-4">
          {menuUrl && (
            <a
              href={menuUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-menu-ink-muted transition-colors hover:bg-white/5 hover:text-menu-ink"
            >
              <ExternalLink size={18} aria-hidden="true" />
              View live menu
            </a>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-menu-ink-muted transition-colors hover:bg-white/5 hover:text-menu-ink disabled:opacity-60"
          >
            <LogOut size={18} aria-hidden="true" />
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-surface px-4 py-4 print:hidden sm:px-6">
          <button
            ref={openButtonRef}
            type="button"
            className="rounded-md p-1.5 text-ink hover:bg-surface-sunken lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            aria-controls="admin-nav"
          >
            <MenuIcon size={20} aria-hidden="true" />
          </button>
          <h1 className="min-w-0 flex-1 truncate font-display text-xl font-bold text-ink">{title}</h1>
          <ThemeToggle />
        </header>

        <main id="main" tabIndex={-1} className="flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
