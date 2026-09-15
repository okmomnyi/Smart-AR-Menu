'use client'

import React from 'react'
import { AuthProvider } from '../../lib/auth'

/**
 * One AuthProvider for the whole admin area.
 *
 * Each admin page used to mount its own provider, so every sidebar navigation
 * tore down the session and re-fetched it, producing a loading flash on each
 * click. Hoisting it into the segment layout keeps the session alive across
 * navigations.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}
