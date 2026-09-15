'use client'

import React, { useCallback, useEffect, useId, useRef, useState } from 'react'
import Image from 'next/image'
import { X, Plus, Trash2, Upload, Check, AlertCircle } from 'lucide-react'
import {
  createProduct,
  updateProduct,
  uploadImage,
  uploadModel,
  type Product,
  type Category,
  type SizeEntry,
  type ProductFormData,
} from '../lib/api'

interface ProductSlideOverProps {
  open: boolean
  onClose: () => void
  product?: Product | null
  categories: Category[]
  restaurantId: string
  onSaved: () => void | Promise<void>
}

const emptySize = (): SizeEntry => ({ label: '', cm: 0, price: 0 })

/**
 * Mounts the form only while the panel is open, keyed by the product being
 * edited. Remounting is what resets the fields, so the form can initialise
 * its state straight from props instead of copying props into state inside an
 * effect — which was both a cascading-render hazard and 35 lines of
 * hand-written reset logic that had to be kept in sync with the field list.
 */
export default function ProductSlideOver(props: ProductSlideOverProps) {
  if (!props.open) return null
  return <ProductForm {...props} key={props.product?.id ?? 'new'} />
}

function ProductForm({
  onClose,
  product,
  categories,
  restaurantId,
  onSaved,
}: ProductSlideOverProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const modelInputRef = useRef<HTMLInputElement>(null)
  const titleId = useId()

  const [name, setName] = useState(product?.name ?? '')
  const [description, setDescription] = useState(product?.description ?? '')
  const [categoryId, setCategoryId] = useState(product?.category_id ?? '')
  const [sizes, setSizes] = useState<SizeEntry[]>(
    product?.sizes.length ? product.sizes : [emptySize()]
  )
  const [imageUrl, setImageUrl] = useState(product?.image_url ?? '')
  const [modelUrl, setModelUrl] = useState(product?.model_url ?? '')
  const [modelLabel, setModelLabel] = useState(product?.model_url ? 'Model uploaded' : '')
  const [diameterCm, setDiameterCm] = useState(product?.diameter_cm?.toString() ?? '')
  const [heightCm, setHeightCm] = useState(product?.height_cm?.toString() ?? '')
  const [active, setActive] = useState(product?.active ?? true)

  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingModel, setUploadingModel] = useState(false)
  const [error, setError] = useState('')

  // Move focus into the panel on open so keyboard users are not left behind
  // on the page underneath.
  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  // Escape closes; Tab is trapped inside the panel while it is open.
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) {
        onClose()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]'
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    },
    [onClose, saving]
  )

  function updateSize(index: number, field: keyof SizeEntry, value: string) {
    setSizes((prev) =>
      prev.map((size, i) =>
        i === index
          ? { ...size, [field]: field === 'label' ? value : Number(value) || 0 }
          : size
      )
    )
  }

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // allow re-picking the same file after an error
    if (!file) return
    setUploadingImage(true)
    setError('')
    try {
      const { url } = await uploadImage(file)
      setImageUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That image could not be uploaded.')
    } finally {
      setUploadingImage(false)
    }
  }

  async function handleModelUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setUploadingModel(true)
    setError('')
    try {
      const { url } = await uploadModel(file)
      setModelUrl(url)
      setModelLabel(file.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That model could not be uploaded.')
    } finally {
      setUploadingModel(false)
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Give the product a name.')
      return
    }
    if (sizes.length === 0 || sizes.some((s) => !s.label.trim())) {
      setError('Every size needs a label, for example “Regular” or “L”.')
      return
    }
    const labels = sizes.map((s) => s.label.trim().toLowerCase())
    if (new Set(labels).size !== labels.length) {
      setError('Two sizes share the same label. Make each one distinct.')
      return
    }
    if (sizes.some((s) => s.cm <= 0)) {
      setError('Each size needs a real-world width in centimetres so AR can scale it correctly.')
      return
    }

    const data: ProductFormData = {
      name: name.trim(),
      description: description.trim() || null,
      category_id: categoryId || null,
      image_url: imageUrl || null,
      model_url: modelUrl || null,
      diameter_cm: diameterCm ? Number.parseFloat(diameterCm) : null,
      height_cm: heightCm ? Number.parseFloat(heightCm) : null,
      sizes: sizes.map((s) => ({ ...s, label: s.label.trim() })),
      active,
    }

    setSaving(true)
    try {
      if (product) await updateProduct(restaurantId, product.id, data)
      else await createProduct(restaurantId, data)
      await onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That product could not be saved.')
    } finally {
      setSaving(false)
    }
  }


  return (
    <div onKeyDown={handleKeyDown}>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close panel"
        tabIndex={-1}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="slide-in-right fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-surface-card shadow-panel"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-line bg-surface px-6 py-4">
          <h2 id={titleId} className="font-display text-lg font-bold text-ink">
            {product ? 'Edit product' : 'Add product'}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
            aria-label="Close"
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {error && (
              <div role="alert" className="alert alert-error">
                <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="product-name" className="label">
                Name <span className="text-critical">*</span>
              </label>
              <input
                id="product-name"
                className="field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Margherita"
                maxLength={120}
                required
              />
            </div>

            <div>
              <label htmlFor="product-description" className="label">
                Description
              </label>
              <textarea
                id="product-description"
                className="field min-h-20 resize-y"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Fior di latte, San Marzano, basil."
                maxLength={2000}
                rows={3}
              />
            </div>

            <div>
              <label htmlFor="product-category" className="label">
                Category
              </label>
              <select
                id="product-category"
                className="field"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">Uncategorised</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <fieldset>
              <legend className="label">
                Sizes and prices <span className="text-critical">*</span>
              </legend>
              <p className="mb-2 text-xs text-ink-muted">
                The width in centimetres is what AR uses to render the dish at life size, so
                measure the real plate.
              </p>
              <div className="space-y-2">
                {sizes.map((size, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      className="field flex-1"
                      placeholder="Label"
                      aria-label={`Size ${index + 1} label`}
                      value={size.label}
                      maxLength={24}
                      onChange={(e) => updateSize(index, 'label', e.target.value)}
                    />
                    <input
                      className="field w-24"
                      type="number"
                      inputMode="decimal"
                      placeholder="cm"
                      aria-label={`Size ${index + 1} width in centimetres`}
                      value={size.cm || ''}
                      min="0.1"
                      step="0.1"
                      onChange={(e) => updateSize(index, 'cm', e.target.value)}
                    />
                    <input
                      className="field w-24"
                      type="number"
                      inputMode="decimal"
                      placeholder="Price"
                      aria-label={`Size ${index + 1} price`}
                      value={size.price || ''}
                      min="0"
                      step="0.01"
                      onChange={(e) => updateSize(index, 'price', e.target.value)}
                    />
                    {sizes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setSizes((prev) => prev.filter((_, i) => i !== index))}
                        className="shrink-0 rounded-md p-2 text-critical transition-colors hover:bg-critical-wash"
                        aria-label={`Remove size ${index + 1}`}
                      >
                        <Trash2 size={16} aria-hidden />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setSizes((prev) => [...prev, emptySize()])}
                className="mt-2 inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-accent-deep"
              >
                <Plus size={14} aria-hidden />
                Add another size
              </button>
            </fieldset>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="product-diameter" className="label">
                  Plate diameter (cm)
                </label>
                <input
                  id="product-diameter"
                  className="field"
                  type="number"
                  inputMode="decimal"
                  placeholder="28"
                  value={diameterCm}
                  min="0"
                  step="0.1"
                  onChange={(e) => setDiameterCm(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="product-height" className="label">
                  Height (cm)
                </label>
                <input
                  id="product-height"
                  className="field"
                  type="number"
                  inputMode="decimal"
                  placeholder="5"
                  value={heightCm}
                  min="0"
                  step="0.1"
                  onChange={(e) => setHeightCm(e.target.value)}
                />
              </div>
            </div>

            <div>
              <span className="label">Photo</span>
              <input
                ref={imageInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                className="sr-only"
                onChange={handleImageUpload}
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="btn btn-secondary"
                >
                  {uploadingImage ? (
                    <>
                      <span className="spinner" style={{ width: 16, height: 16 }} aria-hidden />
                      Uploading…
                    </>
                  ) : (
                    <>
                      <Upload size={16} aria-hidden />
                      {imageUrl ? 'Replace photo' : 'Upload photo'}
                    </>
                  )}
                </button>
                {imageUrl && (
                  <div className="relative h-12 w-12 overflow-hidden rounded-lg">
                    <Image
                      src={imageUrl}
                      alt={`Current photo for ${name || 'this product'}`}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                )}
              </div>
              <p className="mt-1.5 text-xs text-ink-muted">
                JPG, PNG or WebP, up to 10 MB. Converted to WebP on upload.
              </p>
            </div>

            <div>
              <span className="label">3D model</span>
              <input
                ref={modelInputRef}
                type="file"
                accept=".glb"
                className="sr-only"
                onChange={handleModelUpload}
              />
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => modelInputRef.current?.click()}
                  disabled={uploadingModel}
                  className="btn btn-secondary"
                >
                  {uploadingModel ? (
                    <>
                      <span className="spinner" style={{ width: 16, height: 16 }} aria-hidden />
                      Uploading…
                    </>
                  ) : (
                    <>
                      <Upload size={16} aria-hidden />
                      {modelUrl ? 'Replace .glb' : 'Upload .glb'}
                    </>
                  )}
                </button>
                {modelLabel && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-positive">
                    <Check size={14} aria-hidden />
                    {modelLabel}
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs text-ink-muted">
                Binary glTF (.glb), up to 40 MB. Keep it under 5 MB where you can: guests load
                this over mobile data at the table.
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-line pt-4">
              <span id="active-label" className="text-sm font-medium text-ink">
                Show on the public menu
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={active}
                aria-labelledby="active-label"
                onClick={() => setActive((v) => !v)}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  active ? 'bg-accent-strong' : 'bg-line-strong'
                }`}
              >
                <span
                  className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform"
                  style={{ transform: active ? 'translateX(20px)' : 'translateX(0)' }}
                />
              </button>
            </div>
          </div>

          <div className="flex shrink-0 gap-3 border-t border-line bg-surface px-6 py-4">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploadingImage || uploadingModel}
              className="btn btn-primary flex-1"
            >
              {saving ? (
                <>
                  <span className="spinner" style={{ width: 16, height: 16 }} aria-hidden />
                  Saving…
                </>
              ) : product ? (
                'Save changes'
              ) : (
                'Add product'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
