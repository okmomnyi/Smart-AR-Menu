'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Box, ImageOff, Ruler } from 'lucide-react'
import type { Product } from '../lib/api'

interface ProductCardProps {
  product: Product
  slug: string
  /** Only the first row is eagerly loaded; the rest wait until scrolled to. */
  priority?: boolean
}

export default function ProductCard({ product, slug, priority = false }: ProductCardProps) {
  const lowest = product.sizes.length
    ? Math.min(...product.sizes.map((s) => s.price))
    : null
  const hasModel = Boolean(product.model_url)
  // A photo URL can outlive the photo. Without this a dead link left an empty
  // dark square where the dish should be.
  const [imageFailed, setImageFailed] = useState(false)

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-menu-border bg-white/[0.04] shadow-menu-card">
      <div className="relative aspect-square w-full overflow-hidden bg-menu-surface">
        {product.image_url && !imageFailed ? (
          <Image
            src={product.image_url}
            // The name is already the card heading below, so the image is
            // decorative here; announcing it twice just adds noise.
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
            loading={priority ? undefined : 'lazy'}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            <ImageOff size={40} className="text-menu-ink-subtle" aria-hidden />
          </span>
        )}

        {hasModel && (
          <span
            className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold print:hidden"
            style={{ background: 'var(--accent)', color: 'var(--accent-on)' }}
          >
            <Box size={11} aria-hidden />
            AR
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-display text-base font-bold leading-tight text-menu-ink">
          {product.name}
        </h3>

        {product.description && (
          <p className="line-clamp-2 flex-1 text-sm text-menu-ink-muted">{product.description}</p>
        )}

        {(product.diameter_cm || product.height_cm) && (
          <p className="flex items-center gap-1.5 font-mono text-xs text-menu-ink-subtle">
            <Ruler size={11} aria-hidden />
            {product.diameter_cm ? `${product.diameter_cm} cm across` : ''}
            {product.diameter_cm && product.height_cm ? ' · ' : ''}
            {product.height_cm ? `${product.height_cm} cm tall` : ''}
          </p>
        )}

        <p className="menu-price mt-auto pt-1 font-mono text-base font-bold" style={{ color: 'var(--accent)' }}>
          {lowest !== null ? (
            <>
              {product.sizes.length > 1 && (
                <span className="text-sm font-normal text-menu-ink-muted">from </span>
              )}
              ${lowest.toFixed(2)}
            </>
          ) : (
            <span className="text-sm font-normal text-menu-ink-subtle">Price on request</span>
          )}
        </p>

        {hasModel ? (
          <Link
            href={`/r/${slug}/ar/${product.id}`}
            className="btn btn-accent-dark mt-1 w-full py-2 text-sm print:hidden"
          >
            <Box size={14} aria-hidden />
            View at real size
            <span className="sr-only">: {product.name}</span>
          </Link>
        ) : (
          <p className="mt-1 rounded-full border border-menu-border bg-white/[0.04] py-2 text-center text-xs text-menu-ink-subtle print:hidden">
            3D view coming soon
          </p>
        )}
      </div>
    </article>
  )
}
