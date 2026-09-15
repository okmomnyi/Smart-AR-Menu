'use client'

import React, { useEffect, useId, useRef, useState } from 'react'
import Image from 'next/image'
import QRCode from 'qrcode'
import { Upload, Download, Check, AlertCircle, ExternalLink } from 'lucide-react'
import { ProtectedRoute, useAuth } from '../../../lib/auth'
import AdminLayout from '../../../components/AdminLayout'
import PasswordInput from '../../../components/PasswordInput'
import CopyButton from '../../../components/CopyButton'
import { updateRestaurant, uploadImage, changePassword, type Restaurant } from '../../../lib/api'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// Contrast of white text on the given hex, per WCAG. A restaurant can pick any
// brand colour, but if buttons on their menu become unreadable they should be
// told before their guests find out.
function contrastWithWhite(hex: string): number {
  const value = hex.replace('#', '')
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value
  if (full.length !== 6) return 21

  const channel = (pair: string) => {
    const srgb = Number.parseInt(pair, 16) / 255
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
  }

  const luminance =
    0.2126 * channel(full.slice(0, 2)) +
    0.7152 * channel(full.slice(2, 4)) +
    0.0722 * channel(full.slice(4, 6))

  return 1.05 / (luminance + 0.05)
}

/**
 * Waits for the restaurant to load, then mounts the form keyed by its id so
 * the fields initialise straight from it. Copying those values into state
 * inside an effect meant the form re-rendered twice on every load and could
 * clobber a half-typed edit if the context refreshed underneath it.
 */
function BrandingContent() {
  const { restaurant } = useAuth()

  if (!restaurant) {
    return (
      <div className="max-w-xl space-y-6">
        <div className="skeleton h-10 w-48 rounded-xl" />
        <div className="skeleton h-80 rounded-xl" />
        <span className="sr-only" role="status">
          Loading your branding settings
        </span>
      </div>
    )
  }

  return <BrandingForm key={restaurant.id} restaurant={restaurant} />
}

function BrandingForm({ restaurant }: { restaurant: Restaurant }) {
  const { user, setRestaurant } = useAuth()
  const logoInputRef = useRef<HTMLInputElement>(null)
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)
  const nameId = useId()
  const colorId = useId()

  const [name, setName] = useState(restaurant.name)
  const [themeColor, setThemeColor] = useState(restaurant.theme_color || '#D4820A')
  const [logoUrl, setLogoUrl] = useState(restaurant.logo_url ?? '')
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSaved, setPasswordSaved] = useState(false)


  const menuUrl = `${APP_URL}/r/${restaurant.slug}`

  useEffect(() => {
    if (!qrCanvasRef.current || !menuUrl) return
    void QRCode.toCanvas(qrCanvasRef.current, menuUrl, {
      width: 280,
      margin: 2,
      color: { dark: '#1A1814', light: '#F5F0E8' },
    })
  }, [menuUrl])

  async function handleLogoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setUploadingLogo(true)
    setError('')
    try {
      const { url } = await uploadImage(file)
      setLogoUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That logo could not be uploaded.')
    } finally {
      setUploadingLogo(false)
    }
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    if (!user) return
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const updated = await updateRestaurant(user.restaurant_id, {
        name: name.trim(),
        theme_color: themeColor,
        logo_url: logoUrl || null,
      })
      // Push the result back into context so the sidebar name updates without
      // a page reload.
      setRestaurant(updated)
      setSaved(true)
      window.setTimeout(() => setSaved(false), 4000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Those settings could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  async function handlePasswordChange(event: React.FormEvent) {
    event.preventDefault()
    setPasswordError('')
    setPasswordSaved(false)

    if (newPassword.length < 12) {
      setPasswordError('Your new password must be at least 12 characters.')
      return
    }

    setPasswordSaving(true)
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setPasswordSaved(true)
      window.setTimeout(() => setPasswordSaved(false), 5000)
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'That password could not be changed.')
    } finally {
      setPasswordSaving(false)
    }
  }

  function downloadQR() {
    const canvas = qrCanvasRef.current
    if (!canvas || !restaurant) return
    const link = document.createElement('a')
    link.download = `${restaurant.slug}-menu-qr.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const ratio = contrastWithWhite(themeColor)
  const lowContrast = ratio < 4.5

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h2 className="font-display text-xl font-bold text-ink">Branding</h2>
        <p className="mt-1 text-sm text-ink-muted">
          How your restaurant appears to guests who scan your code.
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="space-y-5 rounded-xl border border-line bg-surface-card p-6 shadow-card"
      >
        {error && (
          <div role="alert" className="alert alert-error">
            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        )}
        {saved && (
          <div role="status" className="alert alert-success">
            <Check size={16} className="mt-0.5 shrink-0" aria-hidden />
            <span>Saved. Your menu updates for guests within a minute.</span>
          </div>
        )}

        <div>
          <span className="label">Logo</span>
          <input
            ref={logoInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            className="sr-only"
            onChange={handleLogoUpload}
          />
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-surface-sunken">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={`${name || 'Restaurant'} logo`}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              ) : (
                <span
                  className="flex h-full w-full items-center justify-center font-display text-xl font-bold text-white"
                  style={{ background: themeColor }}
                  aria-hidden
                >
                  {(name || 'A').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
                className="btn btn-secondary"
              >
                {uploadingLogo ? (
                  <>
                    <span className="spinner" style={{ width: 16, height: 16 }} aria-hidden />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Upload size={16} aria-hidden />
                    {logoUrl ? 'Replace logo' : 'Upload logo'}
                  </>
                )}
              </button>
              {logoUrl && (
                <button
                  type="button"
                  onClick={() => setLogoUrl('')}
                  className="ml-2 rounded-md text-sm font-medium text-critical"
                >
                  Remove
                </button>
              )}
              <p className="mt-1.5 text-xs text-ink-muted">Square works best. Up to 10 MB.</p>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor={nameId} className="label">
            Restaurant name
          </label>
          <input
            id={nameId}
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            required
          />
        </div>

        <div>
          <label htmlFor={colorId} className="label">
            Accent colour
          </label>
          <div className="flex items-center gap-3">
            <input
              id={colorId}
              type="color"
              value={themeColor}
              onChange={(e) => setThemeColor(e.target.value)}
              className="h-10 w-14 cursor-pointer rounded-md border border-line-strong bg-surface-card p-1"
            />
            <input
              className="field w-32 font-mono"
              value={themeColor}
              onChange={(e) => setThemeColor(e.target.value)}
              aria-label="Accent colour hex value"
              pattern="^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$"
              maxLength={7}
            />
            <span
              className="rounded-full px-4 py-2 text-sm font-medium text-white"
              style={{ background: themeColor }}
            >
              Preview
            </span>
          </div>
          {lowContrast && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-critical">
              <AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden />
              White text on this colour reads at {ratio.toFixed(1)}:1, below the 4.5:1 needed
              for readable body text. A darker shade will be easier for guests to read.
            </p>
          )}
        </div>

        <div className="flex justify-end border-t border-line pt-4">
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? (
              <>
                <span className="spinner" style={{ width: 16, height: 16 }} aria-hidden />
                Saving…
              </>
            ) : (
              'Save changes'
            )}
          </button>
        </div>
      </form>

      <section className="rounded-xl border border-line bg-surface-card p-6 shadow-card">
        <h3 className="font-display text-lg font-bold text-ink">Your menu QR code</h3>
        <p className="mt-1 text-sm text-ink-muted">
          Print this for your tables. It opens your live menu, so it keeps working as you
          change dishes.
        </p>

        <div className="mt-5 flex flex-col items-start gap-5 sm:flex-row">
          <canvas
            ref={qrCanvasRef}
            className="shrink-0 rounded-xl border-4 border-surface-sunken"
            aria-label="QR code linking to your public menu"
          />
          <div className="min-w-0 flex-1 space-y-3">
            <p className="break-all rounded-lg bg-surface-sunken px-3 py-2 font-mono text-xs text-ink-muted">
              {menuUrl}
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={downloadQR} className="btn btn-primary">
                <Download size={16} aria-hidden />
                Download PNG
              </button>
              <CopyButton value={menuUrl} onError={setError} />
              <a
                href={menuUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
              >
                <ExternalLink size={16} aria-hidden />
                Preview
              </a>
            </div>
          </div>
        </div>
      </section>

      <form
        onSubmit={handlePasswordChange}
        className="space-y-4 rounded-xl border border-line bg-surface-card p-6 shadow-card"
      >
        <div>
          <h3 className="font-display text-lg font-bold text-ink">Change password</h3>
          <p className="mt-1 text-sm text-ink-muted">
            Changing it signs out every other device.
          </p>
        </div>

        {passwordError && (
          <div role="alert" className="alert alert-error">
            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
            <span>{passwordError}</span>
          </div>
        )}
        {passwordSaved && (
          <div role="status" className="alert alert-success">
            <Check size={16} className="mt-0.5 shrink-0" aria-hidden />
            <span>Password changed. Other devices have been signed out.</span>
          </div>
        )}

        <div>
          <label htmlFor="current-password" className="label">
            Current password
          </label>
          <PasswordInput
            id="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        <div>
          <label htmlFor="new-password" className="label">
            New password
          </label>
          <PasswordInput
            id="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            minLength={12}
            required
            aria-describedby="new-password-hint"
          />
          <p id="new-password-hint" className="mt-1.5 text-xs text-ink-muted">
            At least 12 characters.
          </p>
        </div>

        <div className="flex justify-end border-t border-line pt-4">
          <button
            type="submit"
            disabled={passwordSaving || !currentPassword || !newPassword}
            className="btn btn-primary"
          >
            {passwordSaving ? 'Changing…' : 'Change password'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function BrandingPage() {
  return (
    <ProtectedRoute>
      <AdminLayout title="Branding">
        <BrandingContent />
      </AdminLayout>
    </ProtectedRoute>
  )
}
