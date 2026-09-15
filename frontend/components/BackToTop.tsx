'use client'

import React, { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'

/**
 * Appears once the reader is well down a long page. On a phone, a full menu
 * pushes the category tabs a long thumb-scroll away.
 */
export default function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let frame = 0
    const check = () => {
      frame = 0
      setVisible(window.scrollY > window.innerHeight * 1.5)
    }
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(check)
    }

    schedule()
    window.addEventListener('scroll', schedule, { passive: true })
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
    }
  }, [])

  if (!visible) return null

  function backToTop() {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })

    // This button unmounts once the page reaches the top. Without moving focus
    // first, a keyboard user would be dropped back onto <body>.
    const main = document.getElementById('main')
    if (main) {
      main.setAttribute('tabindex', '-1')
      main.focus({ preventScroll: true })
    }
  }

  return (
    <button
      type="button"
      onClick={backToTop}
      aria-label="Back to top"
      title="Back to top"
      className="fixed right-4 z-30 rounded-full border border-menu-border bg-menu-raised/90 p-3 text-menu-ink shadow-menu-card backdrop-blur transition-colors hover:border-white/30 hover:bg-menu-raised print:hidden"
      style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      <ArrowUp size={18} aria-hidden />
    </button>
  )
}
