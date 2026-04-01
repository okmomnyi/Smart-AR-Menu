'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import { getMenu, MenuData, Product, Category } from '../../../lib/api'
import CategoryPills from '../../../components/CategoryPills'
import ProductCard from '../../../components/ProductCard'

export default function MenuPage() {
  const params = useParams()
  const slug = params.slug as string

  const [menuData, setMenuData] = useState<MenuData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [cartCount, setCartCount] = useState(0)

  useEffect(() => {
    async function load() {
      try {
        const data = await getMenu(slug)
        setMenuData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load menu')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [slug])

  // Apply restaurant theme color
  useEffect(() => {
    if (menuData?.restaurant.theme_color) {
      document.documentElement.style.setProperty('--amber', menuData.restaurant.theme_color)
    }
  }, [menuData])

  // Flatten all products or filter by category
  const allProducts: Product[] = menuData
    ? menuData.categories.flatMap((c) => c.products)
    : []

  const allCategories: Category[] = menuData
    ? menuData.categories.filter((c) => c.products.length > 0)
    : []

  const filteredProducts = activeCategory
    ? menuData?.categories.find((c) => c.id === activeCategory)?.products ?? []
    : allProducts

  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ background: '#0E0C0A' }}
      >
        {/* Skeleton header */}
        <div
          className="sticky top-0 z-10 px-4 py-4 flex items-center gap-3"
          style={{ background: 'rgba(14,12,10,0.9)', backdropFilter: 'blur(12px)' }}
        >
          <div className="skeleton w-10 h-10 rounded-full" />
          <div className="skeleton w-32 h-5 rounded" />
        </div>
        <div className="flex gap-2 px-4 py-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton w-20 h-8 rounded-full flex-shrink-0" />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton rounded-xl aspect-square" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !menuData) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: '#0E0C0A' }}
      >
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(193,75,30,0.15)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#C14B1E" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ fontFamily: 'Playfair Display, serif', color: '#F5F0E8' }}>
            Menu Not Found
          </h2>
          <p className="text-sm" style={{ color: '#8A7D70', fontFamily: 'DM Sans, sans-serif' }}>
            {error || "This restaurant's menu isn't available right now."}
          </p>
        </div>
      </div>
    )
  }

  const restaurant = menuData.restaurant

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0E0C0A' }}>
      {/* Sticky header */}
      <header
        className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between"
        style={{
          background: 'rgba(14,12,10,0.85)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-3">
          {restaurant.logo_url ? (
            <div className="relative w-9 h-9 rounded-full overflow-hidden">
              <Image src={restaurant.logo_url} alt={restaurant.name} fill className="object-cover" />
            </div>
          ) : (
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
              style={{ background: 'linear-gradient(135deg, #D4820A, #F0A830)' }}
            >
              {restaurant.name.charAt(0).toUpperCase()}
            </div>
          )}
          <h1
            className="text-lg font-bold"
            style={{ fontFamily: 'Playfair Display, serif', color: '#F5F0E8' }}
          >
            {restaurant.name}
          </h1>
        </div>

        {/* Cart icon */}
        <button
          className="relative p-2 rounded-lg transition-colors"
          style={{ color: '#F5F0E8' }}
          onClick={() => setCartCount((n) => n + 1)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 01-8 0" />
          </svg>
          {cartCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold"
              style={{ background: '#D4820A', color: 'white', fontFamily: 'DM Sans, sans-serif' }}
            >
              {cartCount}
            </span>
          )}
        </button>
      </header>

      {/* Category pills */}
      {allCategories.length > 1 && (
        <div
          className="sticky top-[57px] z-10"
          style={{ background: 'rgba(14,12,10,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
        >
          <CategoryPills
            categories={allCategories}
            activeId={activeCategory}
            onSelect={setActiveCategory}
          />
        </div>
      )}

      {/* Products grid */}
      <main className="flex-1 p-4">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <p style={{ color: '#8A7D70', fontFamily: 'DM Sans, sans-serif' }}>
              No items in this category yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} slug={slug} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'DM Sans, sans-serif' }}>
          Powered by AR Menu
        </p>
      </footer>
    </div>
  )
}
