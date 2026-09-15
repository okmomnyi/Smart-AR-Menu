'use client'

import React, { useSyncExternalStore } from 'react'
import { Moon, Sun } from 'lucide-react'
import { THEME_STORAGE_KEY } from '../lib/theme'

type Theme = 'light' | 'dark'

const DARK_QUERY = '(prefers-color-scheme: dark)'
const listeners = new Set<() => void>()

function currentTheme(): Theme {
  const chosen = document.documentElement.getAttribute('data-theme')
  if (chosen === 'light' || chosen === 'dark') return chosen
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange)
  const media = window.matchMedia(DARK_QUERY)
  media.addEventListener('change', onChange)

  // A choice made in another tab applies here too.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) return
    if (event.newValue === 'light' || event.newValue === 'dark') {
      document.documentElement.setAttribute('data-theme', event.newValue)
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    onChange()
  }
  window.addEventListener('storage', onStorage)

  return () => {
    listeners.delete(onChange)
    media.removeEventListener('change', onChange)
    window.removeEventListener('storage', onStorage)
  }
}

/**
 * Light or dark for the admin panel. With nothing saved the panel follows the
 * operating system; pressing this saves an explicit choice. The customer menu
 * is unaffected because its palette is fixed.
 */
export default function ThemeToggle({ className = '' }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => 'light' as Theme)
  const next: Theme = theme === 'dark' ? 'light' : 'dark'
  const label = `Switch to ${next} theme`

  function toggle() {
    document.documentElement.setAttribute('data-theme', next)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // Storage can be unavailable in private modes. The switch still applies
      // for this visit; it just will not be remembered.
    }
    listeners.forEach((listener) => listener())
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={`rounded-md p-2 text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink ${className}`}
    >
      {theme === 'dark' ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
    </button>
  )
}
