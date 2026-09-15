'use client'

import React, { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

type NativeProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'>

interface PasswordInputProps extends NativeProps {
  /** `dark` on the sign-in screens, `light` inside the admin panel. */
  tone?: 'light' | 'dark'
}

/**
 * Password field with a show/hide control. Sign-in, registration and the
 * change-password form each used to carry their own copy of this, and the
 * change-password form had none.
 */
export default function PasswordInput({ tone = 'light', ...inputProps }: PasswordInputProps) {
  const [visible, setVisible] = useState(false)
  const dark = tone === 'dark'

  return (
    <div className="relative">
      <input
        {...inputProps}
        type={visible ? 'text' : 'password'}
        className={`${dark ? 'field-dark' : 'field'} pr-11`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        // A fixed name with aria-pressed. Changing the name as well made screen
        // readers announce "Hide password, pressed", which says the opposite.
        aria-label="Show password"
        aria-pressed={visible}
        className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 transition-colors ${
          dark ? 'text-menu-ink-muted hover:text-menu-ink' : 'text-ink-muted hover:text-ink'
        }`}
      >
        {visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
      </button>
    </div>
  )
}
