'use client'

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import type { Product, Category, SizeEntry, ProductFormData } from '../lib/api'
import {
  createProduct,
  updateProduct,
  uploadImage,
  uploadModel,
} from '../lib/api'
import { useAuth } from '../lib/auth'

interface ProductSlideOverProps {
  open: boolean
  onClose: () => void
  product?: Product | null
  categories: Category[]
  restaurantId: string
  onSaved: () => void
}

const emptySize = (): SizeEntry => ({ label: '', cm: 0, price: 0 })

export default function ProductSlideOver({
  open,
  onClose,
  product,
  categories,
  restaurantId,
  onSaved,
}: ProductSlideOverProps) {
  const { getToken } = useAuth()
  const imageInputRef = useRef<HTMLInputElement>(null)
  const modelInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [sizes, setSizes] = useState<SizeEntry[]>([emptySize()])
  const [imageUrl, setImageUrl] = useState<string>('')
  const [modelUrl, setModelUrl] = useState<string>('')
  const [modelFilename, setModelFilename] = useState<string>('')
  const [diameterCm, setDiameterCm] = useState<string>('')
  const [heightCm, setHeightCm] = useState<string>('')
  const [active, setActive] = useState(true)

  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingModel, setUploadingModel] = useState(false)
  const [error, setError] = useState<string>('')

  // Populate form when editing
  useEffect(() => {
    if (product) {
      setName(product.name)
      setDescription(product.description ?? '')
      setCategoryId(product.category_id ?? '')
      setSizes(product.sizes.length ? product.sizes : [emptySize()])
      setImageUrl(product.image_url ?? '')
      setModelUrl(product.model_url ?? '')
      setModelFilename(product.model_url ? 'existing model' : '')
      setDiameterCm(product.diameter_cm?.toString() ?? '')
      setHeightCm(product.height_cm?.toString() ?? '')
      setActive(product.active)
    } else {
      setName('')
      setDescription('')
      setCategoryId('')
      setSizes([emptySize()])
      setImageUrl('')
      setModelUrl('')
      setModelFilename('')
      setDiameterCm('')
      setHeightCm('')
      setActive(true)
    }
    setError('')
  }, [product, open])

  function updateSize(index: number, field: keyof SizeEntry, value: string | number) {
    setSizes((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: field === 'label' ? value : Number(value) }
      return next
    })
  }

  function addSize() {
    setSizes((prev) => [...prev, emptySize()])
  }

  function removeSize(index: number) {
    setSizes((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImage(true)
    try {
      const token = await getToken()
      const { url } = await uploadImage(restaurantId, file, token)
      setImageUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image upload failed')
    } finally {
      setUploadingImage(false)
    }
  }

  async function handleModelUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingModel(true)
    try {
      const token = await getToken()
      const { url } = await uploadModel(restaurantId, file, token)
      setModelUrl(url)
      setModelFilename(file.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Model upload failed')
    } finally {
      setUploadingModel(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!name.trim()) { setError('Product name is required'); return }
    if (sizes.length === 0 || sizes.some((s) => !s.label)) {
      setError('All sizes must have a label'); return
    }

    const prices: Record<string, number> = {}
    sizes.forEach((s) => { prices[s.label] = s.price })

    const data: ProductFormData = {
      name: name.trim(),
      description: description.trim() || undefined,
      category_id: categoryId || null,
      image_url: imageUrl || null,
      model_url: modelUrl || null,
      diameter_cm: diameterCm ? parseFloat(diameterCm) : null,
      height_cm: heightCm ? parseFloat(heightCm) : null,
      sizes,
      prices,
      active,
    }

    setSaving(true)
    try {
      const token = await getToken()
      if (product) {
        await updateProduct(restaurantId, product.id, data, token)
      } else {
        await createProduct(restaurantId, data, token)
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

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
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed inset-y-0 right-0 z-50 w-full max-w-lg flex flex-col slide-in-right overflow-hidden"
        style={{ background: '#FDFAF5', boxShadow: '-4px 0 32px rgba(0,0,0,0.2)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
          style={{ borderColor: 'rgba(61,43,31,0.12)', background: '#F4F1ED' }}
        >
          <h2
            className="text-lg font-bold"
            style={{ fontFamily: 'Playfair Display, serif', color: '#1A1814' }}
          >
            {product ? 'Edit Product' : 'Add Product'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-black/5"
            style={{ color: '#8A7D70' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-5">
            {error && (
              <div
                className="px-4 py-3 rounded-lg text-sm"
                style={{ background: 'rgba(193,75,30,0.08)', color: '#C14B1E', fontFamily: 'DM Sans, sans-serif' }}
              >
                {error}
              </div>
            )}

            {/* Name */}
            <div>
              <label style={labelStyle}>Name *</label>
              <input
                style={inputStyle}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Margherita Pizza"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label style={labelStyle}>Description</label>
              <textarea
                style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the dish..."
                rows={3}
              />
            </div>

            {/* Category */}
            <div>
              <label style={labelStyle}>Category</label>
              <select
                style={inputStyle}
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">— Uncategorized —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Sizes */}
            <div>
              <label style={labelStyle}>Sizes & Prices *</label>
              <div className="space-y-2">
                {sizes.map((s, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      style={{ ...inputStyle, flex: '1' }}
                      placeholder="Label (S/M/L)"
                      value={s.label}
                      onChange={(e) => updateSize(i, 'label', e.target.value)}
                    />
                    <input
                      style={{ ...inputStyle, flex: '1' }}
                      type="number"
                      placeholder="cm"
                      value={s.cm || ''}
                      min="0"
                      step="0.1"
                      onChange={(e) => updateSize(i, 'cm', e.target.value)}
                    />
                    <input
                      style={{ ...inputStyle, flex: '1' }}
                      type="number"
                      placeholder="$"
                      value={s.price || ''}
                      min="0"
                      step="0.01"
                      onChange={(e) => updateSize(i, 'price', e.target.value)}
                    />
                    {sizes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSize(i)}
                        className="flex-shrink-0 p-1.5 rounded-lg"
                        style={{ color: '#C14B1E' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addSize}
                  className="text-sm font-medium flex items-center gap-1.5 transition-opacity hover:opacity-70"
                  style={{ color: '#D4820A', fontFamily: 'DM Sans, sans-serif' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add Size
                </button>
              </div>
            </div>

            {/* Dimensions */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={labelStyle}>Diameter (cm)</label>
                <input
                  style={inputStyle}
                  type="number"
                  placeholder="e.g. 28"
                  value={diameterCm}
                  min="0"
                  step="0.1"
                  onChange={(e) => setDiameterCm(e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Height (cm)</label>
                <input
                  style={inputStyle}
                  type="number"
                  placeholder="e.g. 5"
                  value={heightCm}
                  min="0"
                  step="0.1"
                  onChange={(e) => setHeightCm(e.target.value)}
                />
              </div>
            </div>

            {/* Image upload */}
            <div>
              <label style={labelStyle}>Product Image</label>
              <input
                ref={imageInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={handleImageUpload}
              />
              <div className="flex gap-3 items-center">
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    borderColor: 'rgba(61,43,31,0.2)',
                    color: '#3D2B1F',
                    background: 'white',
                  }}
                >
                  {uploadingImage ? 'Uploading…' : 'Upload Image'}
                </button>
                {imageUrl && (
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden">
                    <Image src={imageUrl} alt="preview" fill className="object-cover" />
                  </div>
                )}
              </div>
              <p className="text-xs mt-1" style={{ color: '#8A7D70' }}>.jpg .png .webp, max 10MB</p>
            </div>

            {/* Model upload */}
            <div>
              <label style={labelStyle}>3D Model (.glb)</label>
              <input
                ref={modelInputRef}
                type="file"
                accept=".glb"
                className="hidden"
                onChange={handleModelUpload}
              />
              <div className="flex gap-3 items-center">
                <button
                  type="button"
                  onClick={() => modelInputRef.current?.click()}
                  disabled={uploadingModel}
                  className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    borderColor: 'rgba(61,43,31,0.2)',
                    color: '#3D2B1F',
                    background: 'white',
                  }}
                >
                  {uploadingModel ? 'Uploading…' : 'Upload .glb'}
                </button>
                {modelFilename && (
                  <span
                    className="text-sm flex items-center gap-1.5"
                    style={{ color: '#6B7C5E', fontFamily: 'DM Sans, sans-serif' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {modelFilename}
                  </span>
                )}
              </div>
              <p className="text-xs mt-1" style={{ color: '#8A7D70' }}>.glb only, max 100MB</p>
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between">
              <span style={{ ...labelStyle, marginBottom: 0 }}>Active (visible to customers)</span>
              <button
                type="button"
                onClick={() => setActive((v) => !v)}
                className="relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none"
                style={{ background: active ? '#D4820A' : '#D1C5B8' }}
              >
                <span
                  className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200 shadow-sm"
                  style={{ transform: active ? 'translateX(24px)' : 'translateX(0)' }}
                />
              </button>
            </div>
          </div>

          {/* Footer */}
          <div
            className="sticky bottom-0 px-6 py-4 border-t flex gap-3"
            style={{ background: '#F4F1ED', borderColor: 'rgba(61,43,31,0.12)' }}
          >
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-full text-sm font-medium border transition-colors"
              style={{
                fontFamily: 'DM Sans, sans-serif',
                borderColor: 'rgba(61,43,31,0.2)',
                color: '#3D2B1F',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 btn-amber py-2.5 text-sm"
            >
              {saving ? 'Saving…' : product ? 'Save Changes' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
