const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'storage.googleapis.com' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'plus.unsplash.com' },
    ],
  },
  webpack: (config, { webpack }) => {
    // Firebase's node-esm auth build does `import 'undici'` (a Node.js-only
    // HTTP client whose source uses private-class-field syntax that
    // Next.js 14.1.x's webpack parser cannot handle). Replace every bare
    // 'undici' require/import with an empty stub in ALL webpack compilations
    // (both server and client) because next-flight-client-module-loader
    // runs on the server build when it processes 'use client' boundaries.
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /^undici$/,
        path.resolve(__dirname, 'lib/empty-module.js')
      )
    )
    return config
  },
}

module.exports = nextConfig
