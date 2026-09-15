const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '')

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Restaurant {
  id: string
  name: string
  slug: string
  logo_url?: string | null
  theme_color: string
  active: boolean
}

export interface Category {
  id: string
  name: string
  order: number
  restaurant_id?: string
  _count?: { products: number }
}

export interface SizeEntry {
  label: string
  cm: number
  price: number
}

export interface Product {
  id: string
  name: string
  description?: string | null
  category_id?: string | null
  category?: { id: string; name: string } | null
  model_url?: string | null
  image_url?: string | null
  diameter_cm?: number | null
  height_cm?: number | null
  sizes: SizeEntry[]
  prices: Record<string, number>
  active: boolean
  created_at: string
  restaurant_id?: string
}

export interface MenuCategory extends Category {
  products: Product[]
}

export interface MenuData {
  restaurant: Restaurant
  categories: MenuCategory[]
}

export interface ProductFormData {
  name: string
  description?: string | null
  category_id?: string | null
  model_url?: string | null
  image_url?: string | null
  diameter_cm?: number | null
  height_cm?: number | null
  sizes: SizeEntry[]
  active: boolean
}

export interface UserRecord {
  id: string
  email: string
  role: string
  restaurant_id: string
}

export interface Session {
  accessToken: string
  user: UserRecord
  restaurant: Restaurant
}

export interface StorageUsage {
  used_bytes: number
  quota_bytes: number
  max_image_bytes: number
  max_model_bytes: number
}

export class ApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// ─── Access token (memory only) ───────────────────────────────────────────────

/**
 * The access token is deliberately never written to localStorage or a
 * JS-readable cookie: script injected into the admin panel would be able to
 * read it there. It lives for the lifetime of the tab and is re-minted from
 * the httpOnly refresh cookie on load and on expiry.
 */
let accessToken: string | null = null
let onSessionLost: (() => void) | null = null

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function getAccessToken(): string | null {
  return accessToken
}

export function setSessionLostHandler(handler: (() => void) | null): void {
  onSessionLost = handler
}

// ─── Fetch plumbing ───────────────────────────────────────────────────────────

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string }
    if (typeof body.error === 'string' && body.error) return body.error
  } catch {
    /* non-JSON error body */
  }
  if (res.status === 429) return 'Too many requests. Please wait a moment and try again.'
  if (res.status >= 500) return 'The server ran into a problem. Please try again.'
  return res.statusText || `Request failed (${res.status})`
}

/**
 * Only one refresh is ever in flight. Without this, a page that fires several
 * requests at once would rotate the refresh cookie several times in parallel
 * and log the user out.
 */
let refreshInFlight: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        })
        if (!res.ok) return null
        const session = (await res.json()) as Session
        accessToken = session.accessToken
        return session.accessToken
      } catch {
        return null
      } finally {
        // Cleared on the next tick so concurrent callers all see this result.
        setTimeout(() => {
          refreshInFlight = null
        }, 0)
      }
    })()
  }
  return refreshInFlight
}

interface RequestOptions {
  method?: string
  body?: unknown
  auth?: boolean
  signal?: AbortSignal
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = false, signal } = options

  const send = async (token: string | null): Promise<Response> => {
    const headers: Record<string, string> = {}
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    if (token) headers.Authorization = `Bearer ${token}`

    return fetch(`${API_URL}${path}`, {
      method,
      headers,
      signal,
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  }

  let res = await send(auth ? accessToken : null)

  // A 401 on an authenticated call means the 15-minute access token aged out.
  // Mint a new one from the refresh cookie and replay the request once.
  if (res.status === 401 && auth) {
    const fresh = await refreshAccessToken()
    if (!fresh) {
      accessToken = null
      onSessionLost?.()
      throw new ApiError(401, 'Your session has expired. Please sign in again.')
    }
    res = await send(fresh)
  }

  if (!res.ok) throw new ApiError(res.status, await readError(res))
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

async function upload<T>(path: string, file: File): Promise<T> {
  const send = async (token: string | null): Promise<Response> => {
    const form = new FormData()
    form.append('file', file)
    return fetch(`${API_URL}${path}`, {
      method: 'POST',
      // Content-Type is set by the browser so the multipart boundary is correct.
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
      body: form,
    })
  }

  let res = await send(accessToken)
  if (res.status === 401) {
    const fresh = await refreshAccessToken()
    if (!fresh) {
      accessToken = null
      onSessionLost?.()
      throw new ApiError(401, 'Your session has expired. Please sign in again.')
    }
    res = await send(fresh)
  }

  if (!res.ok) throw new ApiError(res.status, await readError(res))
  return (await res.json()) as T
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function login(email: string, password: string): Promise<Session> {
  const session = await request<Session>('/auth/login', {
    method: 'POST',
    body: { email, password },
  })
  accessToken = session.accessToken
  return session
}

export async function register(
  email: string,
  password: string,
  restaurantName: string
): Promise<Session> {
  const session = await request<Session>('/auth/register', {
    method: 'POST',
    body: { email, password, restaurantName },
  })
  accessToken = session.accessToken
  return session
}

/** Restores a session from the refresh cookie. Returns null when signed out. */
export async function restoreSession(): Promise<Session | null> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    if (!res.ok) return null
    const session = (await res.json()) as Session
    accessToken = session.accessToken
    return session
  } catch {
    return null
  }
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' })
  } finally {
    accessToken = null
  }
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const result = await request<{ accessToken: string }>('/auth/change-password', {
    method: 'POST',
    auth: true,
    body: { currentPassword, newPassword },
  })
  accessToken = result.accessToken
}

// ─── Menu (public) ────────────────────────────────────────────────────────────

export async function getMenu(slug: string, signal?: AbortSignal): Promise<MenuData> {
  return request<MenuData>(`/menu/${encodeURIComponent(slug)}`, { signal })
}

// ─── Restaurant ───────────────────────────────────────────────────────────────

export async function updateRestaurant(
  id: string,
  data: { name?: string; theme_color?: string; logo_url?: string | null }
): Promise<Restaurant> {
  return request<Restaurant>(`/restaurants/${id}`, { method: 'PATCH', auth: true, body: data })
}

// ─── Products ─────────────────────────────────────────────────────────────────

export async function getProducts(restaurantId: string): Promise<Product[]> {
  return request<Product[]>(`/restaurants/${restaurantId}/products`, { auth: true })
}

export async function createProduct(
  restaurantId: string,
  data: ProductFormData
): Promise<Product> {
  return request<Product>(`/restaurants/${restaurantId}/products`, {
    method: 'POST',
    auth: true,
    body: data,
  })
}

export async function updateProduct(
  restaurantId: string,
  productId: string,
  data: Partial<ProductFormData>
): Promise<Product> {
  return request<Product>(`/restaurants/${restaurantId}/products/${productId}`, {
    method: 'PATCH',
    auth: true,
    body: data,
  })
}

/** Hides the product from the menu; the record and its QR link survive. */
export async function hideProduct(restaurantId: string, productId: string): Promise<void> {
  await request(`/restaurants/${restaurantId}/products/${productId}`, {
    method: 'DELETE',
    auth: true,
  })
}

/** Permanently removes the product and frees its uploaded media. */
export async function deleteProduct(restaurantId: string, productId: string): Promise<void> {
  await request(`/restaurants/${restaurantId}/products/${productId}/permanent`, {
    method: 'DELETE',
    auth: true,
  })
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function getCategories(restaurantId: string): Promise<Category[]> {
  return request<Category[]>(`/restaurants/${restaurantId}/categories`, { auth: true })
}

export async function createCategory(
  restaurantId: string,
  data: { name: string; order?: number }
): Promise<Category> {
  return request<Category>(`/restaurants/${restaurantId}/categories`, {
    method: 'POST',
    auth: true,
    body: data,
  })
}

export async function updateCategory(
  restaurantId: string,
  categoryId: string,
  data: { name?: string; order?: number }
): Promise<Category> {
  return request<Category>(`/restaurants/${restaurantId}/categories/${categoryId}`, {
    method: 'PATCH',
    auth: true,
    body: data,
  })
}

/** Persists a whole drag-and-drop reorder in one request. */
export async function reorderCategories(
  restaurantId: string,
  ids: string[]
): Promise<Category[]> {
  return request<Category[]>(`/restaurants/${restaurantId}/categories/order`, {
    method: 'PUT',
    auth: true,
    body: { ids },
  })
}

export async function deleteCategory(
  restaurantId: string,
  categoryId: string
): Promise<void> {
  await request(`/restaurants/${restaurantId}/categories/${categoryId}`, {
    method: 'DELETE',
    auth: true,
  })
}

// ─── Uploads ──────────────────────────────────────────────────────────────────

export async function uploadImage(file: File): Promise<{ url: string; bytes: number }> {
  return upload<{ url: string; bytes: number }>('/upload/image', file)
}

export async function uploadModel(file: File): Promise<{ url: string; bytes: number }> {
  return upload<{ url: string; bytes: number }>('/upload/model', file)
}

export async function getStorageUsage(): Promise<StorageUsage> {
  return request<StorageUsage>('/upload/usage', { auth: true })
}
