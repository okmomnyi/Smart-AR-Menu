'use client'

import React, { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import QRCode from 'qrcode'
import { AuthProvider, ProtectedRoute, useAuth } from '../../../lib/auth'
import AdminLayout from '../../../components/AdminLayout'
import ProductSlideOver from '../../../components/ProductSlideOver'
import { getProducts, getCategories, deleteProduct, Product, Category } from '../../../lib/api'

function ProductsContent() {
  const { userRecord, getToken } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [slideOverOpen, setSlideOverOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [disabling, setDisabling] = useState<string | null>(null)
  const [qrProduct, setQrProduct] = useState<Product | null>(null)
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!qrProduct || !qrCanvasRef.current || !userRecord) return
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://yourdomain.com'
    const url = `${appUrl}/r/${userRecord.restaurant.slug}/ar/${qrProduct.id}`
    QRCode.toCanvas(qrCanvasRef.current, url, {
      width: 260,
      margin: 3,
      color: { dark: '#1A1814', light: '#F5F0E8' },
    })
  }, [qrProduct, userRecord])

  function downloadProductQR() {
    if (!qrCanvasRef.current || !qrProduct) return
    const link = document.createElement('a')
    link.download = `${qrProduct.name.toLowerCase().replace(/\s+/g, '-')}-qr.png`
    link.href = qrCanvasRef.current.toDataURL('image/png')
    link.click()
  }

  async function load() {
    if (!userRecord) return
    try {
      const token = await getToken()
      const [prods, cats] = await Promise.all([
        getProducts(userRecord.restaurant_id, token),
        getCategories(userRecord.restaurant_id, token),
      ])
      setProducts(prods)
      setCategories(cats)
    } catch {
      // keep existing data
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [userRecord]) // eslint-disable-line react-hooks/exhaustive-deps

  function openAdd() {
    setEditingProduct(null)
    setSlideOverOpen(true)
  }

  function openEdit(product: Product) {
    setEditingProduct(product)
    setSlideOverOpen(true)
  }

  async function handleDisable(product: Product) {
    if (!userRecord) return
    if (!window.confirm(`Disable "${product.name}"? It will no longer appear on the menu.`)) return
    setDisabling(product.id)
    try {
      const token = await getToken()
      await deleteProduct(userRecord.restaurant_id, product.id, token)
      await load()
    } catch {
      // ignore
    } finally {
      setDisabling(null)
    }
  }

  const categoryName = (id?: string | null) =>
    categories.find((c) => c.id === id)?.name ?? '—'

  const firstPrice = (product: Product): string => {
    if (product.sizes.length > 0) return `$${product.sizes[0].price.toFixed(2)}`
    return '—'
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="skeleton-admin h-9 w-36 rounded-xl" />
          <div className="skeleton-admin h-10 w-32 rounded-full" />
        </div>
        <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid rgba(61,43,31,0.08)' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b" style={{ borderColor: 'rgba(61,43,31,0.06)' }}>
              <div className="skeleton-admin w-12 h-12 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="skeleton-admin h-4 w-32 rounded" />
                <div className="skeleton-admin h-3 w-20 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#1A1814' }}>
              Products
            </h2>
            <p className="text-sm" style={{ color: '#8A7D70', fontFamily: 'DM Sans, sans-serif' }}>
              {products.length} total · {products.filter((p) => p.active).length} active
            </p>
          </div>
          <button onClick={openAdd} className="btn-amber text-sm px-5 py-2.5">
            + Add Product
          </button>
        </div>

        {products.length === 0 ? (
          <div
            className="rounded-xl py-16 text-center"
            style={{ background: 'white', border: '1px solid rgba(61,43,31,0.08)' }}
          >
            <div
              className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'rgba(212,130,10,0.08)' }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D4820A" strokeWidth="1.5">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
            </div>
            <h3 className="font-semibold mb-1" style={{ fontFamily: 'Playfair Display, serif', color: '#1A1814' }}>
              No products yet
            </h3>
            <p className="text-sm mb-4" style={{ color: '#8A7D70', fontFamily: 'DM Sans, sans-serif' }}>
              Add your first menu item to get started
            </p>
            <button onClick={openAdd} className="btn-amber text-sm px-6 py-2.5">
              Add Your First Product
            </button>
          </div>
        ) : (
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: 'white', border: '1px solid rgba(61,43,31,0.08)', boxShadow: '0 1px 8px rgba(61,43,31,0.06)' }}
          >
            {/* Table header */}
            <div
              className="hidden md:grid grid-cols-[48px_1fr_140px_100px_100px_80px_100px] gap-4 px-6 py-3 text-xs font-semibold uppercase tracking-wide border-b"
              style={{ color: '#8A7D70', fontFamily: 'DM Sans, sans-serif', borderColor: 'rgba(61,43,31,0.08)', background: '#FDFAF5' }}
            >
              <div />
              <div>Name</div>
              <div>Category</div>
              <div>Price</div>
              <div>3D Model</div>
              <div>Status</div>
              <div>Actions</div>
            </div>

            {/* Rows */}
            <div className="divide-y" style={{ borderColor: 'rgba(61,43,31,0.06)' }}>
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex md:grid md:grid-cols-[48px_1fr_140px_100px_100px_80px_100px] items-center gap-3 md:gap-4 px-4 md:px-6 py-3 md:py-4 flex-wrap"
                  style={{ opacity: product.active ? 1 : 0.6 }}
                >
                  {/* Thumbnail */}
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0" style={{ background: '#F4F1ED' }}>
                    {product.image_url ? (
                      <Image src={product.image_url} alt={product.name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C8BEB5" strokeWidth="1.5">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path d="M21 15l-5-5L5 21" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <div className="flex-1 md:flex-none min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: '#1A1814', fontFamily: 'DM Sans, sans-serif' }}>
                      {product.name}
                    </p>
                    {product.description && (
                      <p className="text-xs truncate" style={{ color: '#8A7D70', fontFamily: 'DM Sans, sans-serif' }}>
                        {product.description}
                      </p>
                    )}
                  </div>

                  {/* Category (hidden on mobile) */}
                  <div className="hidden md:block">
                    <span
                      className="inline-flex text-xs px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(107,124,94,0.1)', color: '#6B7C5E', fontFamily: 'DM Sans, sans-serif' }}
                    >
                      {categoryName(product.category_id)}
                    </span>
                  </div>

                  {/* Price */}
                  <div className="hidden md:block">
                    <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.8125rem', color: '#3D2B1F' }}>
                      {firstPrice(product)}
                    </span>
                  </div>

                  {/* 3D Model */}
                  <div className="hidden md:block">
                    {product.model_url ? (
                      <span
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                        style={{ background: 'rgba(107,124,94,0.1)', color: '#6B7C5E', fontFamily: 'DM Sans, sans-serif' }}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        GLB
                      </span>
                    ) : (
                      <span
                        className="inline-flex text-xs px-2.5 py-1 rounded-full"
                        style={{ background: 'rgba(138,125,112,0.1)', color: '#8A7D70', fontFamily: 'DM Sans, sans-serif' }}
                      >
                        No Model
                      </span>
                    )}
                  </div>

                  {/* Status */}
                  <div className="hidden md:block">
                    <span
                      className="inline-flex text-xs px-2.5 py-1 rounded-full"
                      style={{
                        background: product.active ? 'rgba(107,124,94,0.1)' : 'rgba(193,75,30,0.1)',
                        color: product.active ? '#6B7C5E' : '#C14B1E',
                        fontFamily: 'DM Sans, sans-serif',
                      }}
                    >
                      {product.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-auto md:ml-0">
                    <button
                      onClick={() => setQrProduct(product)}
                      className="p-1.5 rounded-lg transition-colors hover:bg-amber-50"
                      style={{ color: '#D4820A' }}
                      title="QR Code"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                        <rect x="5" y="5" width="3" height="3" fill="currentColor" stroke="none" /><rect x="16" y="5" width="3" height="3" fill="currentColor" stroke="none" /><rect x="5" y="16" width="3" height="3" fill="currentColor" stroke="none" />
                        <path d="M14 14h3v3h-3zM17 17h3v3M17 14h3" />
                      </svg>
                    </button>
                    <button
                      onClick={() => openEdit(product)}
                      className="p-1.5 rounded-lg transition-colors hover:bg-amber-50"
                      style={{ color: '#D4820A' }}
                      title="Edit"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    {product.active && (
                      <button
                        onClick={() => handleDisable(product)}
                        disabled={disabling === product.id}
                        className="p-1.5 rounded-lg transition-colors hover:bg-rust-50"
                        style={{ color: '#C14B1E' }}
                        title="Disable"
                      >
                        {disabling === product.id ? (
                          <span className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin block" style={{ borderColor: '#C14B1E', borderTopColor: 'transparent' }} />
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <ProductSlideOver
        open={slideOverOpen}
        onClose={() => setSlideOverOpen(false)}
        product={editingProduct}
        categories={categories}
        restaurantId={userRecord?.restaurant_id ?? ''}
        onSaved={load}
      />

      {/* Per-product QR modal */}
      {qrProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
          onClick={() => setQrProduct(null)}
        >
          <div
            className="rounded-2xl p-6 max-w-xs w-full"
            style={{ background: 'white', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-base" style={{ fontFamily: 'Playfair Display, serif', color: '#1A1814' }}>
                  {qrProduct.name}
                </h3>
                <p className="text-xs" style={{ color: '#8A7D70', fontFamily: 'DM Sans, sans-serif' }}>
                  Scan to view dish in AR / 3D
                </p>
              </div>
              <button
                onClick={() => setQrProduct(null)}
                className="p-1.5 rounded-full"
                style={{ color: '#8A7D70', background: 'rgba(61,43,31,0.06)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="flex justify-center mb-4">
              <canvas ref={qrCanvasRef} className="rounded-xl" style={{ border: '6px solid #F5F0E8' }} />
            </div>
            <div
              className="text-xs px-3 py-2 rounded-lg mb-4 break-all"
              style={{ background: 'rgba(61,43,31,0.04)', color: '#8A7D70', fontFamily: 'Space Mono, monospace' }}
            >
              {(process.env.NEXT_PUBLIC_APP_URL ?? 'https://yourdomain.com')}/r/{userRecord?.restaurant.slug}/ar/{qrProduct.id}
            </div>
            <button
              onClick={downloadProductQR}
              className="btn-amber w-full py-2.5 text-sm flex items-center justify-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download QR
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default function ProductsPage() {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <AdminLayout title="Products">
          <ProductsContent />
        </AdminLayout>
      </ProtectedRoute>
    </AuthProvider>
  )
}
