import React from 'react'

/**
 * The product mark: a plate seen at an angle with a dish resting on it, which
 * is literally what the AR viewer places on your table. Used in the login
 * screens and the admin sidebar so the two surfaces share an identity.
 */
export default function BrandMark({
  size = 40,
  className = '',
}: {
  size?: number
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label="AR Menu"
    >
      <rect width="32" height="32" rx="7" fill="#0E0C0A" />
      <ellipse cx="16" cy="19.5" rx="10" ry="4.5" fill="none" stroke="#D4820A" strokeWidth="2" />
      <circle cx="16" cy="13" r="5" fill="#D4820A" />
    </svg>
  )
}
