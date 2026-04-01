'use client'

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { Product } from '../lib/api'

interface ProductCardProps {
  product: Product
  slug: string
}

export default function ProductCard({ product, slug }: ProductCardProps) {
  const firstSize = product.sizes?.[0]
  const fromPrice = firstSize ? firstSize.price : null
  const [showQR, setShowQR] = useState(false)
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)

  const arUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/r/${slug}/ar/${product.id}`

  useEffect(() => {
    if (!showQR || !product.model_url) return
    let cancelled = false
    import('qrcode').then((QRCode) => {
      if (cancelled || !qrCanvasRef.current) return
      QRCode.default.toCanvas(qrCanvasRef.current, arUrl, {
        width: 220,
        margin: 2,
        color: { dark: '#1A1814', light: '#F5F0E8' },
      })
    })
    return () => { cancelled = true }
  }, [showQR, arUrl, product.model_url])

  return (
    <>
      <div
        className="rounded-xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-1"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        }}
      >
        {/* Image */}
        <div className="relative aspect-square w-full overflow-hidden" style={{ background: '#161410' }}>
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </div>
          )}

          {/* AR badge */}
          {product.model_url && (
            <div
              className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{
                background: 'rgba(212,130,10,0.9)',
                color: 'white',
                fontFamily: 'DM Sans, sans-serif',
                backdropFilter: 'blur(8px)',
              }}
            >
              AR
            </div>
          )}

          {/* QR button — only for products with a 3D model */}
          {product.model_url && (
            <button
              onClick={() => setShowQR(true)}
              className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-100"
              style={{
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(8px)',
                opacity: 0.85,
              }}
              title="Show QR code"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F5F0E8" strokeWidth="1.8">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="5" y="5" width="3" height="3" fill="#F5F0E8" stroke="none" />
                <rect x="16" y="5" width="3" height="3" fill="#F5F0E8" stroke="none" />
                <rect x="5" y="16" width="3" height="3" fill="#F5F0E8" stroke="none" />
                <path d="M14 14h3v3h-3z" fill="#F5F0E8" stroke="none" />
                <path d="M17 17h4" strokeLinecap="round" />
                <path d="M21 14v3" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col flex-1 gap-2">
          <h3
            className="text-base font-bold leading-tight"
            style={{ fontFamily: 'Playfair Display, serif', color: '#F5F0E8' }}
          >
            {product.name}
          </h3>

          {product.description && (
            <p
              className="text-sm line-clamp-2 flex-1"
              style={{ color: '#8A7D70', fontFamily: 'DM Sans, sans-serif' }}
            >
              {product.description}
            </p>
          )}

          <div className="flex items-center justify-between mt-auto pt-1">
            {fromPrice !== null ? (
              <span
                className="text-base font-bold"
                style={{ fontFamily: 'Space Mono, monospace', color: '#D4820A' }}
              >
                {product.sizes.length > 1 ? 'from ' : ''}${fromPrice.toFixed(2)}
              </span>
            ) : (
              <span style={{ color: '#8A7D70', fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem' }}>
                —
              </span>
            )}
          </div>

          {/* CTA */}
          {product.model_url ? (
            <Link
              href={`/r/${slug}/ar/${product.id}`}
              className="btn-amber text-sm py-2 px-4 text-center mt-1"
              style={{ textDecoration: 'none' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1.5" />
                <path d="M7 7h10v10H7z" />
              </svg>
              View in AR
            </Link>
          ) : (
            <div
              className="mt-1 text-center text-xs py-2 px-4 rounded-full"
              style={{
                color: '#8A7D70',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              No 3D Model Yet
            </div>
          )}
        </div>
      </div>

      {/* QR Modal */}
      {showQR && product.model_url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)' }}
          onClick={() => setShowQR(false)}
        >
          <div
            className="relative rounded-3xl p-6 flex flex-col items-center gap-4 max-w-xs w-full"
            style={{ background: '#1A1814', border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setShowQR(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.08)', color: '#8A7D70' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Header */}
            <div className="text-center pr-8">
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#D4820A', fontFamily: 'DM Sans, sans-serif' }}>
                Scan to View in AR
              </p>
              <h3 className="text-lg font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#F5F0E8' }}>
                {product.name}
              </h3>
            </div>

            {/* QR canvas */}
            <div className="rounded-2xl overflow-hidden p-3" style={{ background: '#F5F0E8' }}>
              <canvas ref={qrCanvasRef} />
            </div>

            {/* Instruction */}
            <p className="text-xs text-center" style={{ color: '#8A7D70', fontFamily: 'DM Sans, sans-serif' }}>
              Point your camera at this code to see<br />the dish in augmented reality
            </p>

            {/* Dimension hint */}
            {(product.diameter_cm || product.height_cm) && (
              <p className="text-xs" style={{ color: '#D4820A', fontFamily: 'Space Mono, monospace' }}>
                {product.diameter_cm ? `⌀ ${product.diameter_cm}cm` : ''}
                {product.diameter_cm && product.height_cm ? '  ·  ' : ''}
                {product.height_cm ? `↕ ${product.height_cm}cm` : ''}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
