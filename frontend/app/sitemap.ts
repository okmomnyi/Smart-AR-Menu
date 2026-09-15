import type { MetadataRoute } from 'next'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

/**
 * Only the pages that are the same for everyone.
 *
 * Individual restaurant menus are deliberately absent: enumerating every
 * tenant's slug here would publish a directory of customers, and the API
 * exposes no endpoint to list them — by design, since that was part of the
 * cross-tenant reconnaissance path this codebase already had to close.
 * Restaurants that want their menu indexed can submit their own URL.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [
    { url: `${APP_URL}/help`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${APP_URL}/legal/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${APP_URL}/legal/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]
}
