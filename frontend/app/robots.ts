import type { MetadataRoute } from 'next'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

/**
 * Restaurant menus should be findable. The admin panel should not, and neither
 * should individual AR views — those are reached from a QR code at a table and
 * would otherwise bury the menu itself in search results.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/', '/r/*/ar/'],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  }
}
