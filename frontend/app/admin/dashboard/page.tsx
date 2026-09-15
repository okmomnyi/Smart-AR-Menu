'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  UtensilsCrossed,
  CheckCircle2,
  Box,
  ListOrdered,
  ChevronRight,
  AlertCircle,
  ImageOff,
  HardDrive,
} from 'lucide-react'
import { ProtectedRoute, useAuth } from '../../../lib/auth'
import AdminLayout from '../../../components/AdminLayout'
import {
  getProducts,
  getCategories,
  getStorageUsage,
  type Product,
  type StorageUsage,
} from '../../../lib/api'

function StatCard({
  label,
  value,
  Icon,
  tone,
}: {
  label: string
  value: number | string
  Icon: React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>
  tone: 'accent' | 'positive' | 'critical' | 'neutral'
}) {
  const tones = {
    accent: 'bg-accent-wash text-accent-deep',
    positive: 'bg-positive-wash text-positive',
    critical: 'bg-critical-wash text-critical',
    neutral: 'bg-surface-sunken text-ink-muted',
  } as const

  return (
    <div className="flex items-center gap-4 rounded-xl border border-line bg-surface-card p-5 shadow-card">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon size={22} aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="font-mono text-2xl font-bold text-ink">{value}</p>
        <p className="text-sm text-ink-muted">{label}</p>
      </div>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`
}

function DashboardContent() {
  const { user, restaurant } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [categoryCount, setCategoryCount] = useState(0)
  const [usage, setUsage] = useState<StorageUsage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!user) return
    try {
      const [prods, cats, storage] = await Promise.all([
        getProducts(user.restaurant_id),
        getCategories(user.restaurant_id),
        getStorageUsage().catch(() => null),
      ])
      setProducts(prods)
      setCategoryCount(cats.length)
      setUsage(storage)
      // Cleared only once there is something to replace it with, so a retry
      // does not blank the message before it is known to have worked.
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your dashboard.')
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

  const activeProducts = products.filter((p) => p.active)
  const missingModels = activeProducts.filter((p) => !p.model_url).length
  const recent = products.slice(0, 5)

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))}
        </div>
        <div className="skeleton h-64 rounded-xl" />
        <span className="sr-only" role="status">
          Loading dashboard
        </span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-line bg-surface-card p-8 text-center shadow-card">
        <AlertCircle size={28} className="mx-auto mb-3 text-critical" aria-hidden />
        <h2 className="font-display text-lg font-bold text-ink">Could not load your dashboard</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">{error}</p>
        <button type="button" onClick={() => void load()} className="btn btn-primary mt-5">
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-ink">
          {restaurant?.name ?? 'Your restaurant'}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          {activeProducts.length === 0
            ? 'Your menu is empty. Add a product to get started.'
            : `${activeProducts.length} ${activeProducts.length === 1 ? 'dish is' : 'dishes are'} live on your menu right now.`}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total products" value={products.length} Icon={UtensilsCrossed} tone="accent" />
        <StatCard label="Live on menu" value={activeProducts.length} Icon={CheckCircle2} tone="positive" />
        <StatCard label="Missing a 3D model" value={missingModels} Icon={Box} tone={missingModels > 0 ? 'critical' : 'neutral'} />
        <StatCard label="Categories" value={categoryCount} Icon={ListOrdered} tone="neutral" />
      </div>

      {usage && (
        <div className="rounded-xl border border-line bg-surface-card p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <HardDrive size={16} className="text-ink-muted" aria-hidden />
              <h3 className="text-sm font-semibold text-ink">Media storage</h3>
            </div>
            <p className="font-mono text-sm text-ink-muted">
              {formatBytes(usage.used_bytes)} of {formatBytes(usage.quota_bytes)}
            </p>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-surface-sunken"
            role="progressbar"
            aria-valuenow={Math.round((usage.used_bytes / usage.quota_bytes) * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Storage used"
          >
            <div
              className="h-full rounded-full bg-accent-strong transition-[width] duration-500"
              style={{
                width: `${Math.min(100, (usage.used_bytes / usage.quota_bytes) * 100).toFixed(1)}%`,
              }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          {
            href: '/admin/products',
            title: 'Manage products',
            desc: 'Add dishes, upload photos and 3D models',
            Icon: UtensilsCrossed,
          },
          {
            href: '/admin/categories',
            title: 'Manage categories',
            desc: 'Group and reorder your menu sections',
            Icon: ListOrdered,
          },
        ].map(({ href, title, desc, Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-4 rounded-xl border border-line bg-surface-card p-5 no-underline shadow-card transition-shadow hover:shadow-raised"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-wash text-accent-deep">
              <Icon size={20} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{title}</p>
              <p className="text-xs text-ink-muted">{desc}</p>
            </div>
            <ChevronRight size={16} className="text-ink-muted" aria-hidden />
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface-card shadow-card">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="text-sm font-semibold text-ink">Recently added</h3>
          <Link href="/admin/products" className="text-sm font-medium text-accent-deep underline underline-offset-2">
            View all
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-wash">
              <UtensilsCrossed size={22} className="text-accent-deep" aria-hidden />
            </div>
            <p className="font-display text-base font-bold text-ink">No products yet</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-ink-muted">
              Add your first dish and it will appear on your menu straight away.
            </p>
            <Link href="/admin/products" className="btn btn-primary mt-4">
              Add a product
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {recent.map((product) => (
              <li key={product.id} className="flex items-center gap-3 px-5 py-3">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface-sunken">
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt=""
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center">
                      <ImageOff size={16} className="text-ink-muted" aria-hidden />
                    </span>
                  )}
                </div>
                <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                  {product.name}
                </p>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                    product.active
                      ? 'bg-positive-wash text-positive'
                      : 'bg-critical-wash text-critical'
                  }`}
                >
                  {product.active ? 'Live' : 'Hidden'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <AdminLayout title="Dashboard">
        <DashboardContent />
      </AdminLayout>
    </ProtectedRoute>
  )
}
