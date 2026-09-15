'use client'

import { useEffect } from 'react'

/**
 * Two things <details> does not do on its own.
 *
 * A link such as /help#ar-devices should land on that answer already open,
 * which not every browser does for a fragment inside a closed <details>.
 *
 * A collapsed answer does not print, and CSS cannot open a <details> in every
 * browser, so all of them are opened for printing and restored afterwards.
 */
export default function DetailsBehaviour() {
  useEffect(() => {
    const openFromHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1))
      const target = id ? document.getElementById(id) : null
      if (target instanceof HTMLDetailsElement) target.open = true
    }

    let closedBeforePrint: HTMLDetailsElement[] = []
    const beforePrint = () => {
      closedBeforePrint = Array.from(document.querySelectorAll('details')).filter((d) => !d.open)
      closedBeforePrint.forEach((d) => (d.open = true))
    }
    const afterPrint = () => {
      closedBeforePrint.forEach((d) => (d.open = false))
      closedBeforePrint = []
    }

    openFromHash()
    window.addEventListener('hashchange', openFromHash)
    window.addEventListener('beforeprint', beforePrint)
    window.addEventListener('afterprint', afterPrint)
    return () => {
      window.removeEventListener('hashchange', openFromHash)
      window.removeEventListener('beforeprint', beforePrint)
      window.removeEventListener('afterprint', afterPrint)
    }
  }, [])

  return null
}
