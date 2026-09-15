'use client'

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import QRCode from 'qrcode'
import {
  Plus,
  Search,
  QrCode,
  Pencil,
  EyeOff,
  Eye,
  Trash2,
  Download,
  X,
  ImageOff,
  AlertCircle,
  UtensilsCrossed,
} from 'lucide-react'
import { ProtectedRoute, useAuth } from '../../../lib/auth'
import AdminLayout from '../../../components/AdminLayout'
import ProductSlideOver from '../../../components/ProductSlideOver'
import ConfirmDialog from '../../../components/ConfirmDialog'
import CopyButton from '../../../components/CopyButton'
import { matchesQuery } from '../../../lib/search'
import {
  getProducts,
  getCategories,
  hideProduct,
  updateProduct,
  deleteProduct,
  type Product,
  type Category,
} from '../../../lib/api'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

function ProductsContent() {
  const { user, restaurant } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')

  const [slideOverOpen, setSlideOverOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [qrProduct, setQrProduct] = useState<Product | null>(null)
  const [confirm, setConfirm] = useState<{ product: Product; mode: 'hide' | 'delete' } | null>(null)
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)
  const [query, setQuery] = useState('')
  const searchId = useId()

  const load = useCallback(async () => {
    if (!user) return
    try {
      const [prods, cats] = await Promise.all([
        getProducts(user.restaurant_id),
        getCategories(user.restaurant_id),
      ])
      setProducts(prods)
      setCategories(cats)
      // Cleared only once there is something to replace it with, so a retry
      // does not blank the message before it is known to have worked.
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your products.')
    } finally {
      setLoading(false)
    }
  }, [user])

  // Client-side fetch on mount. The rule steers towards a data library or a
  // server component; neither fits here, because this page needs the client
  // auth state to know which restaurant to ask for. Every setState in load()
  // happens after an await, so there is no synchronous cascading render.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const arUrl = useCallback(
    (product: Product) =>
      restaurant ? `${APP_URL}/r/${restaurant.slug}/ar/${product.id}` : '',
    [restaurant]
  )

  useEffect(() => {
    if (!qrProduct || !qrCanvasRef.current) return
    void QRCode.toCanvas(qrCanvasRef.current, arUrl(qrProduct), {
      width: 260,
      margin: 2,
      color: { dark: '#1A1814', light: '#F5F0E8' },
    })
  }, [qrProduct, arUrl])

  function downloadQR() {
    const canvas = qrCanvasRef.current
    if (!canvas || !qrProduct) return
    const link = document.createElement('a')
    link.download = `${qrProduct.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-ar-qr.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  async function toggleVisibility(product: Product) {
    if (!user) return
    setBusyId(product.id)
    setActionError('')
    try {
      if (product.active) {
        await hideProduct(user.restaurant_id, product.id)
      } else {
        await updateProduct(user.restaurant_id, product.id, { active: true })
      }
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'That change did not save.')
    } finally {
      setBusyId(null)
      setConfirm(null)
    }
  }

  async function removeProduct(product: Product) {
    if (!user) return
    setBusyId(product.id)
    setActionError('')
    try {
      await deleteProduct(user.restaurant_id, product.id)
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'That product could not be deleted.')
    } finally {
      setBusyId(null)
      setConfirm(null)
    }
  }

  const categoryName = (id?: string | null) =>
    categories.find((c) => c.id === id)?.name ?? 'Uncategorised'

  // Name, description and category, so "desserts" lists the whole section.
  const shown = useMemo(
    () =>
      products.filter((p) =>
        matchesQuery(query, [
          p.name,
          p.description,
          categories.find((c) => c.id === p.category_id)?.name ?? 'Uncategorised',
        ])
      ),
    [products, categories, query]
  )

  const startingPrice = (product: Product) => {
    if (product.sizes.length === 0) return '—'
    const lowest = Math.min(...product.sizes.map((s) => s.price))
    return `${product.sizes.length > 1 ? 'from ' : ''}$${lowest.toFixed(2)}`
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-10 w-48 rounded-xl" />
        <div className="skeleton h-80 rounded-xl" />
        <span className="sr-only" role="status">
          Loading products
        </span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-line bg-surface-card p-8 text-center shadow-card">
        <AlertCircle size={28} className="mx-auto mb-3 text-critical" aria-hidden />
        <h2 className="font-display text-lg font-bold text-ink">Could not load your products</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">{error}</p>
        <button type="button" onClick={() => void load()} className="btn btn-primary mt-5">
          Try again
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">Products</h2>
            <p className="text-sm text-ink-muted">
              {products.length} total · {products.filter((p) => p.active).length} live
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditing(null)
              setSlideOverOpen(true)
            }}
            className="btn btn-primary"
          >
            <Plus size={16} aria-hidden />
            Add product
          </button>
        </div>

        {actionError && (
          <div role="alert" className="alert alert-error">
            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
            <span>{actionError}</span>
          </div>
        )}

        {products.length > 0 && (
          <div className="relative max-w-sm">
            <label htmlFor={searchId} className="sr-only">
              Search products
            </label>
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
              aria-hidden
            />
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, description or category"
              className="field pl-9"
              autoComplete="off"
            />
            <p className="sr-only" role="status" aria-live="polite">
              {query ? `${shown.length} of ${products.length} products match` : ''}
            </p>
          </div>
        )}

        {products.length === 0 ? (
          <div className="rounded-xl border border-line bg-surface-card py-16 text-center shadow-card">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-wash">
              <UtensilsCrossed size={28} className="text-accent-deep" aria-hidden />
            </div>
            <h3 className="font-display text-lg font-bold text-ink">No products yet</h3>
            <p className="mx-auto mt-1 max-w-xs text-sm text-ink-muted">
              Add your first dish, then upload a 3D model so guests can see it on their table.
            </p>
            <button
              type="button"
              onClick={() => {
                setEditing(null)
                setSlideOverOpen(true)
              }}
              className="btn btn-primary mt-5"
            >
              Add your first product
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-line bg-surface-card shadow-card">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">
                Your menu products, with category, price, 3D model status and visibility
              </caption>
              <thead>
                <tr className="border-b border-line bg-surface-sunken">
                  <th scope="col" className="w-16 px-4 py-3">
                    <span className="sr-only">Photo</span>
                  </th>
                  <th scope="col" className="px-2 py-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    Name
                  </th>
                  <th scope="col" className="hidden px-3 py-3 text-xs font-semibold uppercase tracking-wide text-ink-muted md:table-cell">
                    Category
                  </th>
                  <th scope="col" className="hidden px-3 py-3 text-xs font-semibold uppercase tracking-wide text-ink-muted sm:table-cell">
                    Price
                  </th>
                  <th scope="col" className="hidden px-3 py-3 text-xs font-semibold uppercase tracking-wide text-ink-muted lg:table-cell">
                    3D model
                  </th>
                  <th scope="col" className="hidden px-3 py-3 text-xs font-semibold uppercase tracking-wide text-ink-muted sm:table-cell">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shown.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-ink-muted">
                      No products match &ldquo;{query.trim()}&rdquo;.{' '}
                      <button
                        type="button"
                        onClick={() => setQuery('')}
                        className="font-medium text-accent-deep underline underline-offset-2 hover:no-underline"
                      >
                        Clear search
                      </button>
                    </td>
                  </tr>
                )}
                {shown.map((product) => (
                  <tr key={product.id} className={product.active ? '' : 'opacity-60'}>
                    <td className="px-4 py-3">
                      <div className="relative h-11 w-11 overflow-hidden rounded-lg bg-surface-sunken">
                        {product.image_url ? (
                          <Image
                            src={product.image_url}
                            alt=""
                            fill
                            sizes="44px"
                            className="object-cover"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center">
                            <ImageOff size={16} className="text-ink-muted" aria-hidden />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <p className="text-sm font-medium text-ink">{product.name}</p>
                      {product.description && (
                        <p className="line-clamp-2 max-w-xs text-xs text-ink-muted">
                          {product.description}
                        </p>
                      )}
                      <p className="mt-1 font-mono text-xs text-ink-muted sm:hidden">
                        {startingPrice(product)}
                      </p>
                    </td>
                    <td className="hidden px-3 py-3 md:table-cell">
                      <span className="inline-flex rounded-full bg-surface-sunken px-2.5 py-1 text-xs text-ink-muted">
                        {categoryName(product.category_id)}
                      </span>
                    </td>
                    <td className="hidden px-3 py-3 font-mono text-sm text-ink sm:table-cell">
                      {startingPrice(product)}
                    </td>
                    <td className="hidden px-3 py-3 lg:table-cell">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          product.model_url
                            ? 'bg-positive-wash text-positive'
                            : 'bg-surface-sunken text-ink-muted'
                        }`}
                      >
                        {product.model_url ? 'Uploaded' : 'Missing'}
                      </span>
                    </td>
                    <td className="hidden px-3 py-3 sm:table-cell">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          product.active
                            ? 'bg-positive-wash text-positive'
                            : 'bg-critical-wash text-critical'
                        }`}
                      >
                        {product.active ? 'Live' : 'Hidden'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setQrProduct(product)}
                          className="rounded-md p-2 text-accent-deep transition-colors hover:bg-accent-wash"
                          aria-label={`Show QR code for ${product.name}`}
                        >
                          <QrCode size={16} aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(product)
                            setSlideOverOpen(true)
                          }}
                          className="rounded-md p-2 text-accent-deep transition-colors hover:bg-accent-wash"
                          aria-label={`Edit ${product.name}`}
                        >
                          <Pencil size={16} aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            product.active
                              ? setConfirm({ product, mode: 'hide' })
                              : void toggleVisibility(product)
                          }
                          disabled={busyId === product.id}
                          className="rounded-md p-2 text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
                          aria-label={
                            product.active
                              ? `Hide ${product.name} from the menu`
                              : `Show ${product.name} on the menu`
                          }
                        >
                          {busyId === product.id ? (
                            <span className="spinner" style={{ width: 16, height: 16 }} aria-hidden />
                          ) : product.active ? (
                            <EyeOff size={16} aria-hidden />
                          ) : (
                            <Eye size={16} aria-hidden />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirm({ product, mode: 'delete' })}
                          disabled={busyId === product.id}
                          className="rounded-md p-2 text-critical transition-colors hover:bg-critical-wash"
                          aria-label={`Delete ${product.name} permanently`}
                        >
                          <Trash2 size={16} aria-hidden />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ProductSlideOver
        open={slideOverOpen}
        onClose={() => setSlideOverOpen(false)}
        product={editing}
        categories={categories}
        restaurantId={user?.restaurant_id ?? ''}
        onSaved={load}
      />

      {qrProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`QR code for ${qrProduct.name}`}
          onClick={() => setQrProduct(null)}
        >
          <div
            className="w-full max-w-xs rounded-2xl bg-surface-card p-6 shadow-raised"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate font-display text-base font-bold text-ink">
                  {qrProduct.name}
                </h2>
                <p className="text-xs text-ink-muted">Scan to open the AR view</p>
              </div>
              <button
                type="button"
                onClick={() => setQrProduct(null)}
                className="rounded-full bg-surface-sunken p-1.5 text-ink-muted hover:text-ink"
                aria-label="Close"
              >
                <X size={16} aria-hidden />
              </button>
            </div>

            <div className="mb-4 flex justify-center">
              <canvas ref={qrCanvasRef} className="rounded-xl" aria-label="QR code" />
            </div>

            <p className="mb-4 break-all rounded-lg bg-surface-sunken px-3 py-2 font-mono text-xs text-ink-muted">
              {arUrl(qrProduct)}
            </p>

            <div className="grid grid-cols-2 gap-2 print:hidden">
              <button type="button" onClick={downloadQR} className="btn btn-primary">
                <Download size={16} aria-hidden />
                PNG
              </button>
              <CopyButton value={arUrl(qrProduct)} />
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.mode === 'delete' ? 'Delete this product?' : 'Hide this product?'}
        body={
          confirm?.mode === 'delete'
            ? `“${confirm.product.name}” and its uploaded photo and 3D model will be removed for good. Any printed QR code for it will stop working.`
            : `“${confirm?.product.name}” will disappear from your public menu. You can show it again at any time.`
        }
        confirmLabel={confirm?.mode === 'delete' ? 'Delete permanently' : 'Hide from menu'}
        destructive={confirm?.mode === 'delete'}
        busy={busyId !== null}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return
          if (confirm.mode === 'delete') void removeProduct(confirm.product)
          else void toggleVisibility(confirm.product)
        }}
      />
    </>
  )
}

export default function ProductsPage() {
  return (
    <ProtectedRoute>
      <AdminLayout title="Products">
        <ProductsContent />
      </AdminLayout>
    </ProtectedRoute>
  )
}
