/** @type {import('next').NextConfig} */

// Hostnames next/image is allowed to optimise. Uploads land in Cloudflare R2,
// so the bucket's public host must be listed or every uploaded photo fails to
// render. NEXT_PUBLIC_MEDIA_HOSTNAME covers a custom domain in front of R2.
const mediaHostname = process.env.NEXT_PUBLIC_MEDIA_HOSTNAME

const remotePatterns = [
  { protocol: 'https', hostname: '**.r2.dev' },
  { protocol: 'https', hostname: 'images.unsplash.com' },
  { protocol: 'https', hostname: 'plus.unsplash.com' },
]

if (mediaHostname) {
  remotePatterns.push({ protocol: 'https', hostname: mediaHostname })
}

// Uploads can also be served by the API's own media route, which keeps them
// on the site's origin when the bucket has no public URL. Allow exactly that
// path on the API's host, not the whole host.
try {
  const api = new URL(process.env.NEXT_PUBLIC_API_URL ?? '')
  remotePatterns.push({
    protocol: api.protocol.replace(':', ''),
    hostname: api.hostname,
    port: api.port,
    pathname: `${api.pathname.replace(/\/$/, '')}/media/**`,
  })
} catch {
  // No API URL at build time; nothing to allow.
}

const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    remotePatterns,
    // .glb models and uploaded photos are already immutable and hashed.
    minimumCacheTTL: 31536000,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Permissions-Policy',
            // camera is required by WebXR on the AR route; everything else off.
            value: 'camera=(self), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
