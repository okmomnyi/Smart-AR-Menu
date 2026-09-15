'use client'

import React, { useEffect, useId, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Search } from 'lucide-react'
import CategoryPills from './CategoryPills'
import ProductCard from './ProductCard'
import BackToTop from './BackToTop'
import { matchesQuery } from '../lib/search'
import type { MenuData } from '../lib/api'

// Below this a guest can see every dish at a glance, and a search box is
// clutter between them and the food.
const SEARCH_THRESHOLD = 8

interface MenuViewProps {
  slug: string
  initialData: MenuData
}

/**
 * Readable text on the restaurant's chosen accent colour. A restaurant can
 * pick any brand colour; this keeps labels legible on top of it either way.
 */
function readableOn(hex: string): string {
  const value = hex.replace('#', '')
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value
  if (full.length !== 6) return '#1A1814'

  const channel = (pair: string) => {
    const srgb = Number.parseInt(pair, 16) / 255
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
  }

  const luminance =
    0.2126 * channel(full.slice(0, 2)) +
    0.7152 * channel(full.slice(2, 4)) +
    0.0722 * channel(full.slice(4, 6))

  // Compare contrast against near-black and white, and use whichever wins.
  const withDark = (luminance + 0.05) / 0.0592
  const withWhite = 1.05 / (luminance + 0.05)
  return withDark >= withWhite ? '#1A1814' : '#FFFFFF'
}

export default function MenuView({ slug, initialData }: MenuViewProps) {
  const { restaurant, categories } = initialData
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const searchId = useId()
  const searching = query.trim() !== ''

  // Apply the restaurant's accent so the menu carries their brand, not ours.
  useEffect(() => {
    const accent = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(restaurant.theme_color)
      ? restaurant.theme_color
      : '#D4820A'
    const root = document.documentElement
    root.style.setProperty('--accent', accent)
    root.style.setProperty('--accent-on', readableOn(accent))
    return () => {
      root.style.removeProperty('--accent')
      root.style.removeProperty('--accent-on')
    }
  }, [restaurant.theme_color])

  const visible = useMemo(
    () => categories.filter((c) => c.products.length > 0),
    [categories]
  )

  const products = useMemo(() => {
    // A search always covers the whole menu. Matching the category name as
    // well means "desserts" or "pizza" brings back that entire section.
    if (searching) {
      return visible.flatMap((c) =>
        c.products.filter((p) => matchesQuery(query, [p.name, p.description, c.name]))
      )
    }
    if (!activeCategory) return visible.flatMap((c) => c.products)
    return visible.find((c) => c.id === activeCategory)?.products ?? []
  }, [visible, activeCategory, searching, query])

  function selectCategory(id: string | null) {
    setQuery('')
    setActiveCategory(id)
  }

  const totalDishes = visible.reduce((sum, c) => sum + c.products.length, 0)

  return (
    <div className="on-dark flex min-h-screen flex-col bg-menu-bg">
      <header className="sticky top-0 z-10 border-b border-menu-border bg-menu-bg/85 px-4 py-3 backdrop-blur-lg">
        <div className="flex items-center gap-3">
          {restaurant.logo_url ? (
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full">
              <Image
                src={restaurant.logo_url}
                alt=""
                fill
                sizes="36px"
                className="object-cover"
                priority
              />
            </div>
          ) : (
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold"
              style={{ background: 'var(--accent)', color: 'var(--accent-on)' }}
              aria-hidden
            >
              {restaurant.name.charAt(0).toUpperCase()}
            </span>
          )}
          <h1 className="min-w-0 truncate font-display text-lg font-bold text-menu-ink">
            {restaurant.name}
          </h1>
        </div>
      </header>

      {visible.length > 1 && (
        <div className="sticky top-[61px] z-10 border-b border-menu-border bg-menu-bg/90 backdrop-blur print:hidden">
          <CategoryPills
            categories={visible}
            activeId={activeCategory}
            onSelect={selectCategory}
          />
        </div>
      )}

      <main id="main" tabIndex={-1} className="flex-1 p-4">
        {totalDishes >= SEARCH_THRESHOLD && (
          <div className="relative mb-4 max-w-md print:hidden">
            <label htmlFor={searchId} className="sr-only">
              Search this menu
            </label>
            <Search
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-menu-ink-subtle"
              aria-hidden
            />
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                if (activeCategory) setActiveCategory(null)
              }}
              placeholder="Search dishes or ingredients"
              className="field-dark pl-11"
              autoComplete="off"
              enterKeyHint="search"
            />
          </div>
        )}

        {totalDishes === 0 ? (
          <div className="py-20 text-center">
            <h2 className="font-display text-xl font-bold text-menu-ink">
              This menu is being set up
            </h2>
            <p className="mx-auto mt-2 max-w-xs text-menu-ink-muted">
              {restaurant.name} hasn&apos;t published any dishes yet. Please ask a member of
              staff for a printed menu.
            </p>
          </div>
        ) : products.length === 0 && searching ? (
          <div className="py-16 text-center">
            <p className="text-menu-ink-muted">
              No dishes match &ldquo;{query.trim()}&rdquo;.
            </p>
            <button
              type="button"
              onClick={() => setQuery('')}
              className="mt-3 rounded-md text-sm font-medium underline underline-offset-2 hover:decoration-2"
              style={{ color: 'var(--accent)' }}
            >
              Clear search
            </button>
            <p className="sr-only" role="status">
              No dishes match {query.trim()}
            </p>
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-menu-ink-muted">Nothing in this section yet.</p>
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className="mt-3 rounded-md text-sm font-medium underline underline-offset-2 hover:decoration-2"
              style={{ color: 'var(--accent)' }}
            >
              Show everything
            </button>
          </div>
        ) : (
          <>
            <p className="sr-only" role="status">
              {searching
                ? `${products.length} ${products.length === 1 ? 'dish matches' : 'dishes match'} ${query.trim()}`
                : `Showing ${products.length} ${products.length === 1 ? 'dish' : 'dishes'}`}
            </p>
            <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {products.map((product, index) => (
                <li key={product.id} className="contents">
                  <ProductCard product={product} slug={slug} priority={index < 4} />
                </li>
              ))}
            </ul>
          </>
        )}
      </main>

      <footer className="border-t border-menu-border px-4 py-8">
        <nav
          aria-label="Footer"
          className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm print:hidden"
        >
          {[
            { href: '/help', label: 'Help with 3D and AR' },
            { href: '/legal/privacy', label: 'Privacy' },
            { href: '/legal/terms', label: 'Terms' },
            { href: '/admin', label: 'Restaurant sign in' },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="rounded-sm text-menu-ink-muted underline underline-offset-2 transition-colors hover:text-menu-ink hover:decoration-2"
            >
              {label}
            </Link>
          ))}
        </nav>
        <p className="mt-4 text-center text-xs text-menu-ink-subtle">
          Menu by AR Menu · Sizes shown in AR are based on measurements supplied by the
          restaurant.
        </p>
      </footer>

      <BackToTop />
    </div>
  )
}
