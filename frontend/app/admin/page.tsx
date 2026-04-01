'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthProvider, useAuth } from '../../lib/auth'

function LoginForm() {
  const { signIn, user, loading } = useAuth()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      router.replace('/admin/dashboard')
    }
  }, [user, loading, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await signIn(email, password)
      router.replace('/admin/dashboard')
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setError('Invalid email or password')
      } else if (code === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later.')
      } else {
        setError('Sign in failed. Please check your credentials.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0E0C0A' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#D4820A', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#0E0C0A' }}
    >
      {/* Background texture */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 30% 20%, rgba(212,130,10,0.06) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(61,43,31,0.15) 0%, transparent 60%)',
        }}
      />

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #D4820A, #F0A830)' }}
          >
            AR
          </div>
          <h1
            className="text-3xl font-black"
            style={{ fontFamily: 'Playfair Display, serif', color: '#F5F0E8' }}
          >
            AR Menu
          </h1>
          <p className="text-sm mt-1" style={{ color: '#8A7D70', fontFamily: 'DM Sans, sans-serif' }}>
            Restaurant Admin Panel
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: '#1A1814',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 32px 64px rgba(0,0,0,0.4)',
          }}
        >
          {/* Top accent */}
          <div
            className="h-0.5 rounded-full mb-6 -mt-0.5"
            style={{ background: 'linear-gradient(90deg, #D4820A, #F0A830, transparent)' }}
          />

          <h2
            className="text-xl font-bold mb-6"
            style={{ fontFamily: 'Playfair Display, serif', color: '#F5F0E8' }}
          >
            Sign in
          </h2>

          {error && (
            <div
              className="mb-4 px-4 py-3 rounded-lg text-sm flex items-center gap-2"
              style={{ background: 'rgba(193,75,30,0.12)', color: '#C14B1E', fontFamily: 'DM Sans, sans-serif' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: '#8A7D70', fontFamily: 'DM Sans, sans-serif' }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@yourrestaurant.com"
                required
                className="dark-input"
                autoComplete="email"
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: '#8A7D70', fontFamily: 'DM Sans, sans-serif' }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="dark-input pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: '#8A7D70' }}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-amber w-full py-3 text-base mt-2"
            >
              {submitting ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Signing in…
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        <p
          className="text-center text-xs mt-6"
          style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'DM Sans, sans-serif' }}
        >
          Don&apos;t have an account? Contact your AR Menu provider.
        </p>
      </div>
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <AuthProvider>
      <LoginForm />
    </AuthProvider>
  )
}
