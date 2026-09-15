'use client'

import React, { useRef } from 'react'
import type { Category } from '../lib/api'

interface CategoryPillsProps {
  categories: Category[]
  activeId: string | null
  onSelect: (id: string | null) => void
}

/**
 * Rendered as a tablist so screen readers announce which section is showing
 * and arrow keys move between sections, matching what the visual does.
 */
export default function CategoryPills({ categories, activeId, onSelect }: CategoryPillsProps) {
  const options: { id: string | null; name: string }[] = [
    { id: null, name: 'All' },
    ...categories.map((c) => ({ id: c.id as string | null, name: c.name })),
  ]

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  function handleKeyDown(event: React.KeyboardEvent, index: number) {
    let next: number
    if (event.key === 'ArrowRight') next = index + 1
    else if (event.key === 'ArrowLeft') next = index - 1
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = options.length - 1
    else return

    event.preventDefault()
    const target = (next + options.length) % options.length
    onSelect(options[target].id)
    // Roving tabindex: the tab that was focused has just become tabIndex -1,
    // so focus has to follow the selection or the keyboard user is stranded.
    tabRefs.current[target]?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label="Menu sections"
      className="scrollbar-hide flex gap-2 overflow-x-auto px-4 py-3"
    >
      {options.map((option, index) => {
        const active = activeId === option.id
        return (
          <button
            key={option.id ?? 'all'}
            ref={(el) => {
              tabRefs.current[index] = el
            }}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onSelect(option.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              active
                ? 'text-[color:var(--accent-on)]'
                : 'border border-menu-border bg-white/[0.06] text-menu-ink-muted hover:border-white/25 hover:text-menu-ink'
            }`}
            style={active ? { background: 'var(--accent)' } : undefined}
          >
            {option.name}
          </button>
        )
      })}
    </div>
  )
}
