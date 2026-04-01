const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Restaurant {
  id: string
  name: string
  slug: string
  logo_url?: string | null
  theme_color: string
  active: boolean
  created_at?: string
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
  category?: Category | null
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

export interface MenuData {
  restaurant: Restaurant
  categories: (Category & { products: Product[] })[]
}

export interface ProductFormData {
  name: string
  description?: string
  category_id?: string | null
  model_url?: string | null
  image_url?: string | null
  diameter_cm?: number | null
  height_cm?: number | null
  sizes: SizeEntry[]
  prices: Record<string, number>
  active: boolean
}

export interface UserRecord {
  id: string
  firebase_uid: string
  email: string
  restaurant_id: string
  role: string
  restaurant: Restaurant
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error ?? `API error ${res.status}`)
  }
  return res.json() as Promise<T>
}

async function apiFormData<T>(
  path: string,
  formData: FormData,
  token: string
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error ?? `Upload error ${res.status}`)
  }
  return res.json() as Promise<T>
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function registerUser(
  firebaseToken: string,
  restaurantName: string,
  email: string
): Promise<{ user: UserRecord; restaurant: Restaurant }> {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ firebaseToken, restaurantName, email }),
  })
}

export async function verifyUser(
  firebaseToken: string
): Promise<{ user: UserRecord; restaurant: Restaurant }> {
  return apiFetch('/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ firebaseToken }),
  })
}

// ─── Menu (public) ────────────────────────────────────────────────────────────

export async function getMenu(slug: string): Promise<MenuData> {
  return apiFetch<MenuData>(`/menu/${slug}`)
}

// ─── Restaurant ───────────────────────────────────────────────────────────────

export async function updateRestaurant(
  id: string,
  data: Partial<Pick<Restaurant, 'name' | 'theme_color' | 'logo_url'>>,
  token: string
): Promise<Restaurant> {
  return apiFetch<Restaurant>(`/restaurants/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }, token)
}

// ─── Products ─────────────────────────────────────────────────────────────────

export async function getProducts(restaurantId: string, token: string): Promise<Product[]> {
  return apiFetch<Product[]>(`/restaurants/${restaurantId}/products`, {}, token)
}

export async function createProduct(
  restaurantId: string,
  data: ProductFormData,
  token: string
): Promise<Product> {
  return apiFetch<Product>(`/restaurants/${restaurantId}/products`, {
    method: 'POST',
    body: JSON.stringify(data),
  }, token)
}

export async function updateProduct(
  restaurantId: string,
  productId: string,
  data: Partial<ProductFormData>,
  token: string
): Promise<Product> {
  return apiFetch<Product>(`/restaurants/${restaurantId}/products/${productId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }, token)
}

export async function deleteProduct(
  restaurantId: string,
  productId: string,
  token: string
): Promise<void> {
  await apiFetch<void>(`/restaurants/${restaurantId}/products/${productId}`, {
    method: 'DELETE',
  }, token)
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function getCategories(restaurantId: string, token: string): Promise<Category[]> {
  return apiFetch<Category[]>(`/restaurants/${restaurantId}/categories`, {}, token)
}

export async function createCategory(
  restaurantId: string,
  data: { name: string; order?: number },
  token: string
): Promise<Category> {
  return apiFetch<Category>(`/restaurants/${restaurantId}/categories`, {
    method: 'POST',
    body: JSON.stringify(data),
  }, token)
}

export async function updateCategory(
  restaurantId: string,
  categoryId: string,
  data: { name?: string; order?: number },
  token: string
): Promise<Category> {
  return apiFetch<Category>(`/restaurants/${restaurantId}/categories/${categoryId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }, token)
}

export async function deleteCategory(
  restaurantId: string,
  categoryId: string,
  token: string
): Promise<void> {
  await apiFetch<void>(`/restaurants/${restaurantId}/categories/${categoryId}`, {
    method: 'DELETE',
  }, token)
}

// ─── Uploads ──────────────────────────────────────────────────────────────────

export async function uploadImage(
  _restaurantId: string,
  file: File,
  token: string
): Promise<{ url: string }> {
  const fd = new FormData()
  fd.append('file', file)
  return apiFormData<{ url: string }>('/upload/image', fd, token)
}

export async function uploadModel(
  _restaurantId: string,
  file: File,
  token: string
): Promise<{ url: string }> {
  const fd = new FormData()
  fd.append('file', file)
  return apiFormData<{ url: string }>('/upload/model', fd, token)
}
