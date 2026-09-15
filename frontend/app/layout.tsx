import type { Metadata, Viewport } from 'next'
import { Playfair_Display, DM_Sans, Space_Mono } from 'next/font/google'
import './globals.css'
import { themeInitScript } from '../lib/theme'

// Self-hosted at build time by next/font: no render-blocking request to
// Google, no layout shift, and `display: swap` so text is readable immediately.
const display = Playfair_Display({
  subsets: ['latin'],
  weight: ['700', '900'],
  variable: '--font-display',
  display: 'swap',
})

const sans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
})

const mono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
  display: 'swap',
})

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'AR Menu',
    template: '%s · AR Menu',
  },
  description:
    'Scan the code on your table to browse the menu and see each dish at its real size in augmented reality before you order.',
  applicationName: 'AR Menu',
  openGraph: {
    type: 'website',
    siteName: 'AR Menu',
    title: 'AR Menu',
    description:
      'See each dish at its real size in augmented reality before you order.',
    url: appUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AR Menu',
    description:
      'See each dish at its real size in augmented reality before you order.',
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // No maximumScale: capping it blocks pinch-zoom, which people with low
  // vision rely on to read a menu.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F4F1ED' },
    { media: '(prefers-color-scheme: dark)', color: '#0E0C0A' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the inline script may set data-theme on <html>
    // before React hydrates, which is intended.
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <a href="#main" className="sr-only-focusable">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  )
}
