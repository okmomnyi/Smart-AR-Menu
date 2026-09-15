import type { MenuData } from './api'

/**
 * Server-side menu fetch, used for SSR and metadata on the customer page.
 *
 * Inside Docker the browser reaches the API on localhost while the frontend
 * container reaches it by service name, so the internal URL is separate from
 * the public one.
 */
// `??` is wrong here. .env.example ships API_INTERNAL_URL blank and tells you
// to leave it that way unless the server reaches the API at a different
// address, so the value is usually the empty string rather than undefined.
// Nullish coalescing keeps "", the base URL collapses to a relative path that
// fetch cannot resolve on the server, and every menu 404s. Treat blank and
// whitespace as unset.
const firstSet = (...values: (string | undefined)[]): string =>
  values.find((v) => v && v.trim() !== '')?.trim() ?? 'http://localhost:4000'

const INTERNAL_API_URL = firstSet(
  process.env.API_INTERNAL_URL,
  process.env.NEXT_PUBLIC_API_URL
).replace(/\/$/, '')

export async function fetchMenu(slug: string): Promise<MenuData | null> {
  try {
    const res = await fetch(`${INTERNAL_API_URL}/menu/${encodeURIComponent(slug)}`, {
      // Matches the Cache-Control the API sets. A menu changes rarely, and a
      // stale minute is far better than a slow first paint at the table.
      next: { revalidate: 60 },
    })
    if (!res.ok) return null
    return (await res.json()) as MenuData
  } catch {
    // The API being unreachable must not crash the page; the client component
    // retries and shows a real error state.
    return null
  }
}
