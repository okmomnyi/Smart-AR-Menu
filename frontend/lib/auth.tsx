'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useRouter } from 'next/navigation'
import * as api from './api'
import type { Restaurant, UserRecord } from './api'

interface AuthContextValue {
  user: UserRecord | null
  restaurant: Restaurant | null
  /** True until the initial refresh-cookie check has settled. */
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, restaurantName: string) => Promise<void>
  signOut: () => Promise<void>
  /** Replaces the cached restaurant after a branding save. */
  setRestaurant: (restaurant: Restaurant) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserRecord | null>(null)
  const [restaurant, setRestaurantState] = useState<Restaurant | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // On mount, try to mint an access token from the httpOnly refresh cookie.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const session = await api.restoreSession()
      if (cancelled) return
      if (session) {
        setUser(session.user)
        setRestaurantState(session.restaurant)
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // When a refresh fails mid-session, drop local state so the guarded routes
  // redirect instead of rendering a shell that cannot load anything.
  useEffect(() => {
    api.setSessionLostHandler(() => {
      setUser(null)
      setRestaurantState(null)
    })
    return () => api.setSessionLostHandler(null)
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const session = await api.login(email, password)
    setUser(session.user)
    setRestaurantState(session.restaurant)
  }, [])

  const signUp = useCallback(
    async (email: string, password: string, restaurantName: string) => {
      const session = await api.register(email, password, restaurantName)
      setUser(session.user)
      setRestaurantState(session.restaurant)
    },
    []
  )

  const signOut = useCallback(async () => {
    await api.logout()
    setUser(null)
    setRestaurantState(null)
    router.replace('/admin')
  }, [router])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      restaurant,
      loading,
      signIn,
      signUp,
      signOut,
      setRestaurant: setRestaurantState,
    }),
    [user, restaurant, loading, signIn, signUp, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

/**
 * Client-side gate for the admin area. This is a convenience, not a security
 * boundary: every protected read and write is authorised server-side against
 * the signed access token.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.replace('/admin')
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-4">
          <span className="spinner spinner-lg" aria-hidden="true" />
          <p className="text-sm text-ink-muted" role="status">
            Loading your restaurant…
          </p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return <>{children}</>
}
