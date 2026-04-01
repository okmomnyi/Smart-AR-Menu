'use client'

import React from 'react'
import type { Category } from '../lib/api'

interface CategoryPillsProps {
  categories: Category[]
  activeId: string | null
  onSelect: (id: string | null) => void
}

export default function CategoryPills({ categories, activeId, onSelect }: CategoryPillsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-3">
      {/* All pill */}
      <button
        onClick={() => onSelect(null)}
        className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200"
        style={{
          fontFamily: 'DM Sans, sans-serif',
          background:
            activeId === null
              ? 'linear-gradient(135deg, #D4820A, #F0A830)'
              : 'rgba(255,255,255,0.08)',
          color: activeId === null ? 'white' : '#8A7D70',
          border:
            activeId === null ? 'none' : '1px solid rgba(255,255,255,0.12)',
        }}
      >
        All
      </button>

      {categories.map((cat) => {
        const active = activeId === cat.id
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200"
            style={{
              fontFamily: 'DM Sans, sans-serif',
              background: active
                ? 'linear-gradient(135deg, #D4820A, #F0A830)'
                : 'rgba(255,255,255,0.08)',
              color: active ? 'white' : '#8A7D70',
              border: active ? 'none' : '1px solid rgba(255,255,255,0.12)',
            }}
          >
            {cat.name}
          </button>
        )
      })}
    </div>
  )
}
