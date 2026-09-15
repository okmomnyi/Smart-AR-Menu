import React from 'react'
import DocumentShell from '../../components/DocumentShell'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <DocumentShell>
      <article className="legal-prose">{children}</article>
    </DocumentShell>
  )
}
