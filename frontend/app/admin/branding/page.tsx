'use client'

import React, { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import QRCode from 'qrcode'
import { AuthProvider, ProtectedRoute, useAuth } from '../../../lib/auth'
import AdminLayout from '../../../components/AdminLayout'
import { updateRestaurant, uploadImage } from '../../../lib/api'

function BrandingContent() {
  const { userRecord, getToken } = useAuth()
  const logoInputRef = useRef<HTMLInputElement>(null)
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)

  const [name, setName] = useState('')
  const [themeColor, setThemeColor] = useState('#D4820A')
  const [logoUrl, setLogoUrl] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState('')
  const [qrGenerated, setQrGenerated] = useState(false)

  useEffect(() => {
    if (userRecord?.restaurant) {
      setName(userRecord.restaurant.name)
      setThemeColor(userRecord.restaurant.theme_color ?? '#D4820A')
      setLogoUrl(userRecord.restaurant.logo_url ?? '')
    }
  }, [userRecord])

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !userRecord) return
    setUploadingLogo(true)
    try {
      const token = await getToken()
      const { url } = await uploadImage(userRecord.restaurant_id, file, token)
      setLogoUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logo upload failed')
    } finally {
      setUploadingLogo(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!userRecord) return
    setSaving(true)
    setError('')
    setSaveSuccess(false)
    try {
      const token = await getToken()
      await updateRestaurant(
        userRecord.restaurant_id,
        { name: name.trim(), theme_color: themeColor, logo_url: logoUrl || null },
        token
      )
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  async function generateQR() {
    if (!qrCanvasRef.current || !userRecord) return
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://yourdomain.com'
    const url = `${appUrl}/r/${userRecord.restaurant.slug}`
    await QRCode.toCanvas(qrCanvasRef.current, url, {
      width: 300,
      margin: 3,
      color: {
        dark: '#1A1814',
        light: '#F5F0E8',
      },
    })
    setQrGenerated(true)
  }

  function downloadQR() {
    if (!qrCanvasRef.current) return
    const link = document.createElement('a')
    link.download = `${userRecord?.restaurant.slug ?? 'qr'}-menu-qr.png`
    link.href = qrCanvasRef.current.toDataURL('image/png')
    link.click()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'white',
    border: '1px solid rgba(61,43,31,0.2)',
    borderRadius: '0.5rem',
    padding: '0.625rem 0.875rem',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: '0.875rem',
    color: '#1A1814',
    outline: 'none',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#3D2B1F',
    marginBottom: '0.375rem',
    fontFamily: 'DM Sans, sans-serif',
  }

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h2 className="text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#1A1814' }}>
          Restaurant Branding
        </h2>
        <p className="text-sm mt-1" style={{ color: '#8A7D70', fontFamily: 'DM Sans, sans-serif' }}>
          Customize how your restaurant appears to customers
        </p>
      </div>

      {/* Settings form */}
      <form
        onSubmit={handleSave}
        className="rounded-xl p-6 space-y-5"
        style={{ background: 'white', border: '1px solid rgba(61,43,31,0.08)', boxShadow: '0 1px 8px rgba(61,43,31,0.06)' }}
      >
        {error && (
          <div
            className="px-4 py-3 rounded-lg text-sm"
            style={{ background: 'rgba(193,75,30,0.08)', color: '#C14B1E', fontFamily: 'DM Sans, sans-serif' }}
          >
            {error}
          </div>
        )}
        {saveSuccess && (
          <div
            className="px-4 py-3 rounded-lg text-sm flex items-center gap-2"
            style={{ background: 'rgba(107,124,94,0.12)', color: '#6B7C5E', fontFamily: 'DM Sans, sans-serif' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Settings saved!
          </div>
        )}

        {/* Logo */}
        <div>
          <label style={labelStyle}>Restaurant Logo</label>
          <input
            ref={logoInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={handleLogoUpload}
          />
          <div className="flex items-center gap-4">
            <div
              className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0"
              style={{ background: '#F4F1ED', border: '2px dashed rgba(61,43,31,0.15)' }}
            >
              {logoUrl ? (
                <Image src={logoUrl} alt="Logo" fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C8BEB5" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                </div>
              )}
            </div>
            <div>
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
                className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  borderColor: 'rgba(61,43,31,0.2)',
                  color: '#3D2B1F',
                  background: 'transparent',
                }}
              >
                {uploadingLogo ? 'Uploading…' : logoUrl ? 'Change Logo' : 'Upload Logo'}
              </button>
              <p className="text-xs mt-1" style={{ color: '#8A7D70' }}>PNG, JPG or WebP · Recommended: 200×200</p>
            </div>
          </div>
        </div>

        {/* Name */}
        <div>
          <label style={labelStyle}>Restaurant Name</label>
          <input
            style={inputStyle}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Restaurant"
            required
          />
        </div>

        {/* Theme color */}
        <div>
          <label style={labelStyle}>Accent Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={themeColor}
              onChange={(e) => setThemeColor(e.target.value)}
              className="w-12 h-10 rounded-lg cursor-pointer border-0 p-0.5"
              style={{ background: 'white', border: '1px solid rgba(61,43,31,0.2)' }}
            />
            <span
              className="px-3 py-2 rounded-lg text-sm"
              style={{
                background: 'rgba(61,43,31,0.04)',
                color: '#3D2B1F',
                fontFamily: 'Space Mono, monospace',
                border: '1px solid rgba(61,43,31,0.1)',
              }}
            >
              {themeColor}
            </span>
            <div
              className="w-8 h-8 rounded-full"
              style={{ background: themeColor, border: '2px solid rgba(0,0,0,0.08)' }}
            />
          </div>
          <p className="text-xs mt-1" style={{ color: '#8A7D70' }}>
            Used for buttons and accents in the customer-facing menu
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn-amber w-full py-3 text-sm"
        >
          {saving ? (
            <span className="flex items-center gap-2 justify-center">
              <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              Saving…
            </span>
          ) : (
            'Save Settings'
          )}
        </button>
      </form>

      {/* QR Code */}
      <div
        className="rounded-xl p-6 space-y-4"
        style={{ background: 'white', border: '1px solid rgba(61,43,31,0.08)', boxShadow: '0 1px 8px rgba(61,43,31,0.06)' }}
      >
        <div>
          <h3 className="font-bold text-base mb-1" style={{ fontFamily: 'Playfair Display, serif', color: '#1A1814' }}>
            Menu QR Code
          </h3>
          <p className="text-sm" style={{ color: '#8A7D70', fontFamily: 'DM Sans, sans-serif' }}>
            Print and place on tables so customers can scan to view your AR menu
          </p>
        </div>

        {userRecord && (
          <div
            className="text-xs px-3 py-2 rounded-lg flex items-center gap-2"
            style={{ background: 'rgba(61,43,31,0.04)', color: '#8A7D70', fontFamily: 'Space Mono, monospace' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
            </svg>
            {(process.env.NEXT_PUBLIC_APP_URL ?? 'https://yourdomain.com')}/r/{userRecord.restaurant.slug}
          </div>
        )}

        {/* QR Canvas */}
        <div className="flex flex-col items-start gap-4">
          <canvas
            ref={qrCanvasRef}
            className="rounded-xl"
            style={{
              display: qrGenerated ? 'block' : 'none',
              border: '6px solid #F5F0E8',
              boxShadow: '0 4px 16px rgba(61,43,31,0.12)',
            }}
          />

          {!qrGenerated && (
            <div
              className="w-[300px] h-[300px] rounded-xl flex items-center justify-center"
              style={{ background: '#F5F0E8', border: '2px dashed rgba(61,43,31,0.15)' }}
            >
              <p className="text-sm" style={{ color: '#8A7D70', fontFamily: 'DM Sans, sans-serif' }}>
                Click generate to create QR
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={generateQR}
              className="px-5 py-2.5 rounded-full text-sm font-medium border transition-colors"
              style={{
                borderColor: 'rgba(61,43,31,0.2)',
                color: '#3D2B1F',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              {qrGenerated ? 'Regenerate QR' : 'Generate QR'}
            </button>
            {qrGenerated && (
              <button
                type="button"
                onClick={downloadQR}
                className="btn-amber px-5 py-2.5 text-sm"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download PNG
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function BrandingPage() {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <AdminLayout title="Branding">
          <BrandingContent />
        </AdminLayout>
      </ProtectedRoute>
    </AuthProvider>
  )
}
