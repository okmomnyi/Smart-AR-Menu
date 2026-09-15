'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'

interface CopyButtonProps {
  value: string
  label?: string
  className?: string
  /** Receives the failure message. Without it the button reports the failure on itself. */
  onError?: (message: string) => void
}

/**
 * Copies a value and confirms it both visibly and to screen readers. The
 * clipboard API only exists on secure origins, so on a plain-http address the
 * failure is reported instead of the button silently doing nothing.
 */
export default function CopyButton({
  value,
  label = 'Copy link',
  className = 'btn btn-secondary',
  onError,
}: CopyButtonProps) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      flash('copied')
    } catch {
      const message = 'Could not copy the link. Select it and copy it manually.'
      if (onError) onError(message)
      else flash('failed')
    }
  }

  function flash(next: 'copied' | 'failed') {
    setState(next)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setState('idle'), next === 'copied' ? 2000 : 4000)
  }

  return (
    <>
      <button type="button" onClick={() => void copy()} className={className}>
        {state === 'copied' ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
        {state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : label}
      </button>
      {/* Outside the button so the announcement is not folded into its name. */}
      <span className="sr-only" role="status" aria-live="polite">
        {state === 'copied'
          ? 'Link copied to clipboard'
          : state === 'failed'
            ? 'Copy failed. Select the link and copy it manually.'
            : ''}
      </span>
    </>
  )
}
