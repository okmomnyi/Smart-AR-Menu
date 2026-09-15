'use client'

import React, { useEffect, useId, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle, Check } from 'lucide-react'
import PasswordInput from '../../../components/PasswordInput'
import { useAuth } from '../../../lib/auth'
import { ApiError } from '../../../lib/api'
import BrandMark from '../../../components/BrandMark'

const MIN_LENGTH = 12

export default function RegisterPage() {
  const { signUp, user, loading } = useAuth()
  const router = useRouter()
  const nameId = useId()
  const emailId = useId()
  const passwordId = useId()
  const hintId = useId()
  const errorId = useId()

  const [restaurantName, setRestaurantName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loading && user) router.replace('/admin/dashboard')
  }, [user, loading, router])

  const longEnough = password.length >= MIN_LENGTH
  const canSubmit =
    restaurantName.trim().length > 0 && email.trim().length > 0 && longEnough && !submitting

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')

    if (!longEnough) {
      setError(`Password must be at least ${MIN_LENGTH} characters.`)
      return
    }

    setSubmitting(true)
    try {
      await signUp(email, password, restaurantName.trim())
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
          <h1 className="font-display text-3xl font-black text-menu-ink">Create your menu</h1>
          <p className="mt-1 text-sm text-menu-ink-muted">
            One account per restaurant. Takes about a minute.
          </p>
        </div>

        <div className="rounded-2xl border border-menu-border bg-menu-surface p-8 shadow-menu-card">
          {error && (
            <div id={errorId} role="alert" className="alert mb-4 bg-critical-wash text-critical-on">
              <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-4">
              <label htmlFor={nameId} className="label text-menu-ink">
                Restaurant name
              </label>
              <input
                id={nameId}
                type="text"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                placeholder="The Golden Fork"
                required
                maxLength={80}
                autoComplete="organization"
                className="field-dark"
              />
            </div>

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
                minLength={MIN_LENGTH}
                autoComplete="new-password"
                aria-describedby={hintId}
              />

              <p
                id={hintId}
                className={`mt-2 flex items-center gap-1.5 text-sm ${
                  longEnough ? 'text-positive-on' : 'text-menu-ink-muted'
                }`}
              >
                {longEnough && <Check size={14} aria-hidden="true" />}
                At least {MIN_LENGTH} characters. A short phrase you can remember beats a
                short scramble you cannot.
              </p>
            </div>

            <button type="submit" disabled={!canSubmit} className="btn btn-accent-dark w-full py-3">
              {submitting ? (
                <>
                  <span className="spinner" style={{ width: '1rem', height: '1rem' }} aria-hidden="true" />
                  Creating your menu…
                </>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <p className="mt-5 text-sm text-menu-ink-muted">
            By creating an account you agree to our{' '}
            <Link href="/legal/terms" className="text-accent underline underline-offset-2">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/legal/privacy" className="text-accent underline underline-offset-2">
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-menu-ink-muted">
          Already have an account?{' '}
          <Link href="/admin" className="font-medium text-accent underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
