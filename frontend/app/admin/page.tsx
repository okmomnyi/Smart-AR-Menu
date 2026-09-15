'use client'

import React, { useEffect, useId, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import PasswordInput from '../../components/PasswordInput'
import { useAuth } from '../../lib/auth'
import { ApiError } from '../../lib/api'
import BrandMark from '../../components/BrandMark'

export default function AdminLoginPage() {
  const { signIn, user, loading } = useAuth()
  const router = useRouter()
  const emailId = useId()
  const passwordId = useId()
  const errorId = useId()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loading && user) router.replace('/admin/dashboard')
  }, [user, loading, router])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await signIn(email, password)
      router.replace('/admin/dashboard')
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not reach the server. Check your connection and try again.'
      )
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-menu-bg">
        <span className="spinner spinner-lg" style={{ color: '#D4820A' }} aria-hidden="true" />
        <span className="sr-only">Checking your session</span>
      </div>
    )
  }

  return (
    <main
      id="main" tabIndex={-1}
      className="on-dark relative flex min-h-screen items-center justify-center bg-menu-bg px-4 py-12"
    >
      <div
        className="pointer-events-none fixed inset-0"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse at 30% 20%, rgba(212,130,10,0.07) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(61,43,31,0.18) 0%, transparent 60%)',
        }}
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <BrandMark className="mx-auto mb-4" size={56} />
          <h1 className="font-display text-3xl font-black text-menu-ink">AR Menu</h1>
          <p className="mt-1 text-sm text-menu-ink-muted">Restaurant admin</p>
        </div>

        <div className="rounded-2xl border border-menu-border bg-menu-surface p-8 shadow-menu-card">
          <h2 className="mb-6 font-display text-xl font-bold text-menu-ink">Sign in</h2>

          {error && (
            <div id={errorId} role="alert" className="alert mb-4 bg-critical-wash text-critical-on">
              <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-4">
              <label htmlFor={emailId} className="label text-menu-ink">
                Email
              </label>
              <input
                id={emailId}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourrestaurant.com"
                required
                autoComplete="email"
                aria-describedby={error ? errorId : undefined}
                className="field-dark"
              />
            </div>

            <div className="mb-6">
              <label htmlFor={passwordId} className="label text-menu-ink">
                Password
              </label>
              <PasswordInput
                tone="dark"
                id={passwordId}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                aria-describedby={error ? errorId : undefined}
              />
            </div>

            <button type="submit" disabled={submitting} className="btn btn-accent-dark w-full py-3">
              {submitting ? (
                <>
                  <span className="spinner" style={{ width: '1rem', height: '1rem' }} aria-hidden="true" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-menu-ink-muted">
          New here?{' '}
          <Link href="/admin/register" className="font-medium text-accent underline underline-offset-2">
            Create a restaurant account
          </Link>
        </p>
      </div>
    </main>
  )
}
