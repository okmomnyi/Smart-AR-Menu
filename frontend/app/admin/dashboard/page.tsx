'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { AuthProvider, ProtectedRoute, useAuth } from '../../../lib/auth'
import AdminLayout from '../../../components/AdminLayout'
import { getProducts, getCategories, Product } from '../../../lib/api'

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  color: string
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <div
      className="rounded-xl p-5 flex items-center gap-4"
      style={{ background: 'white', border: '1px solid rgba(61,43,31,0.08)', boxShadow: '0 1px 8px rgba(61,43,31,0.06)' }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: color }}
      >
        {icon}
      </div>
      <div>
        <p
          className="text-2xl font-bold"
          style={{ fontFamily: 'Space Mono, monospace', color: '#1A1814' }}
        >
          {value}
        </p>
        <p
          className="text-sm"
          style={{ color: '#8A7D70', fontFamily: 'DM Sans, sans-serif' }}
        >
          {label}
        </p>
      </div>
    </div>
  )
}

function DashboardContent() {
  const { userRecord, getToken } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [categoryCount, setCategoryCount] = useState(0)
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    if (!userRecord) return
    async function load() {
      try {
        const token = await getToken()
        const [prods, cats] = await Promise.all([
          getProducts(userRecord!.restaurant_id, token),
          getCategories(userRecord!.restaurant_id, token),
        ])
        setProducts(prods)
        setCategoryCount(cats.length)
      } catch {
        // show zeros
      } finally {
        setLoadingStats(false)
      }
    }
    load()
  }, [userRecord, getToken])

  const totalProducts = products.length
  const activeProducts = products.filter((p) => p.active).length
  const pendingModels = products.filter((p) => p.active && !p.model_url).length
  const recentProducts = products.slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2
          className="text-2xl font-bold"
          style={{ fontFamily: 'Playfair Display, serif', color: '#1A1814' }}
        >
          Welcome back
        </h2>
        <p className="text-sm mt-1" style={{ color: '#8A7D70', fontFamily: 'DM Sans, sans-serif' }}>
          {userRecord?.restaurant?.name} · Admin
        </p>
      </div>

      {/* Stats grid */}
      {loadingStats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton-admin rounded-xl h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Products"
            value={totalProducts}
            color="rgba(212,130,10,0.12)"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D4820A" strokeWidth="2">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
            }
          />
          <StatCard
            label="Active Products"
            value={activeProducts}
            color="rgba(107,124,94,0.12)"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6B7C5E" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            }
          />
          <StatCard
            label="Need 3D Model"
            value={pendingModels}
            color="rgba(193,75,30,0.1)"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C14B1E" strokeWidth="2">
                <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1.5" />
                <path d="M7 7h10v10H7z" />
              </svg>
            }
          />
          <StatCard
            label="Categories"
            value={categoryCount}
            color="rgba(61,43,31,0.08)"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3D2B1F" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            }
          />
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          {
            href: '/admin/products',
            title: 'Manage Products',
            desc: 'Add, edit, and upload 3D models',
            icon: (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
            ),
          },
          {
            href: '/admin/categories',
            title: 'Manage Categories',
            desc: 'Organize your menu sections',
            icon: (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
              </svg>
            ),
          },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex items-center gap-4 p-5 rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            style={{
              background: 'white',
              border: '1px solid rgba(61,43,31,0.08)',
              textDecoration: 'none',
              boxShadow: '0 1px 8px rgba(61,43,31,0.06)',
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(212,130,10,0.1)', color: '#D4820A' }}
            >
              {action.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm" style={{ color: '#1A1814', fontFamily: 'DM Sans, sans-serif' }}>
                {action.title}
              </p>
              <p className="text-xs" style={{ color: '#8A7D70', fontFamily: 'DM Sans, sans-serif' }}>
                {action.desc}
              </p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D4820A" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        ))}
      </div>

      {/* Recent products */}
      {recentProducts.length > 0 && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: 'white', border: '1px solid rgba(61,43,31,0.08)', boxShadow: '0 1px 8px rgba(61,43,31,0.06)' }}
        >
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(61,43,31,0.08)' }}>
            <h3 className="font-semibold text-sm" style={{ fontFamily: 'DM Sans, sans-serif', color: '#1A1814' }}>
              Recent Products
            </h3>
            <Link href="/admin/products" className="text-xs" style={{ color: '#D4820A', fontFamily: 'DM Sans, sans-serif' }}>
              View all →
            </Link>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(61,43,31,0.06)' }}>
            {recentProducts.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0" style={{ background: '#F4F1ED' }}>
                  {p.image_url ? (
                    <Image src={p.image_url} alt={p.name} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C8BEB5" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="M21 15l-5-5L5 21" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#1A1814', fontFamily: 'DM Sans, sans-serif' }}>
                    {p.name}
                  </p>
                </div>
                <span
                  className="text-xs px-2.5 py-1 rounded-full flex-shrink-0"
                  style={{
                    background: p.active ? 'rgba(107,124,94,0.12)' : 'rgba(193,75,30,0.1)',
                    color: p.active ? '#6B7C5E' : '#C14B1E',
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  {p.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <AdminLayout title="Dashboard">
          <DashboardContent />
        </AdminLayout>
      </ProtectedRoute>
    </AuthProvider>
  )
}
