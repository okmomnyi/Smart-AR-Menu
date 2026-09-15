'use client'

import React, { useEffect, useRef } from 'react'

/**
 * Thin bar showing how far through a long document the reader is. Written to
 * the DOM directly inside an animation frame rather than through state, so
 * scrolling does not re-render the page. Decorative, so hidden from assistive
 * technology: the scrollbar already conveys the same thing.
 */
export default function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const root = document.documentElement
      const scrollable = root.scrollHeight - root.clientHeight
      const progress = scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0
      if (barRef.current) barRef.current.style.transform = `scaleX(${progress})`
    }
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update)
    }

    schedule()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [])

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 print:hidden">
      <div
        ref={barRef}
        className="h-full origin-left"
        style={{ background: 'var(--accent)', transform: 'scaleX(0)' }}
      />
    </div>
  )
}
