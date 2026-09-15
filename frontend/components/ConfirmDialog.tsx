'use client'

import React, { useEffect, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  body: string
  confirmLabel: string
  cancelLabel?: string
  destructive?: boolean
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Replaces window.confirm, which cannot be styled, cannot explain what is
 * about to happen, and is suppressed outright by some mobile browsers.
 * Focus moves into the dialog on open and Escape closes it.
 */
export default function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) confirmRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, busy, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-body"
    >
      <div className="w-full max-w-sm rounded-2xl bg-surface-card p-6 shadow-raised">
        <div className="mb-4 flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              destructive ? 'bg-critical-wash text-critical' : 'bg-accent-wash text-accent-deep'
            }`}
          >
            <AlertTriangle size={20} aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 id="confirm-title" className="font-display text-base font-bold text-ink">
              {title}
            </h2>
            <p id="confirm-body" className="mt-1.5 text-sm text-ink-muted">
              {body}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="btn btn-secondary flex-1"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`btn flex-1 ${destructive ? 'btn-danger' : 'btn-primary'}`}
          >
            {busy ? (
              <>
                <span className="spinner" style={{ width: 16, height: 16 }} aria-hidden />
                Working…
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
