'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  User as FirebaseUser,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { auth } from './firebase'
import { verifyUser, UserRecord } from './api'
import { useRouter } from 'next/navigation'

interface AuthContextValue {
  user: FirebaseUser | null
  userRecord: UserRecord | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  getToken: () => Promise<string>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [userRecord, setUserRecord] = useState<UserRecord | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken()
          const { user: record } = await verifyUser(token)
          setUserRecord(record)
        } catch {
          setUserRecord(null)
        }
      } else {
        setUserRecord(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  async function signIn(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(auth, email, password)
  }

  async function signOut(): Promise<void> {
    await firebaseSignOut(auth)
    setUserRecord(null)
  }

  async function getToken(): Promise<string> {
    if (!user) throw new Error('Not authenticated')
    return user.getIdToken()
  }

  return (
    <AuthContext.Provider value={{ user, userRecord, loading, signIn, signOut, getToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/admin')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div
        style={{ background: '#F4F1ED', minHeight: '100vh' }}
        className="flex items-center justify-center"
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: '#D4820A', borderTopColor: 'transparent' }}
          />
          <p style={{ color: '#8A7D70', fontFamily: 'DM Sans, sans-serif' }}>Loading…</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return <>{children}</>
}
