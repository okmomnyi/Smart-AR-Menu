import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import DocumentShell from '../../components/DocumentShell'
import DetailsBehaviour from '../../components/DetailsBehaviour'

export const metadata: Metadata = {
  title: 'Help',
  description:
    'How to browse a restaurant menu, view dishes in 3D, and what the AR button does on your phone.',
  alternates: { canonical: '/help' },
}

interface Question {
  id: string
  question: string
  answer: React.ReactNode
}

// Every answer describes what the code actually does. If the viewer or the
// privacy position changes, change these too.
const QUESTIONS: Question[] = [
  {
    id: 'no-app',
    question: 'Do I need to install an app?',
    answer: (
      <p>
        No. The menu and the 3D view open in your phone&apos;s browser straight from the code on
        your table. There is nothing to download and no account to create.
      </p>
    ),
  },
  {
    id: 'ar-devices',
    question: 'Why does my phone show a different AR button?',
    answer: (
      <>
        <p>
          Phones reach augmented reality in different ways, so the button changes to match
          yours.
        </p>
        <ul>
          <li>
            <strong>View on your table</strong> on most recent Android phones: Chrome uses
            Google Play Services for AR to find your table and set the dish on it.
          </li>
          <li>
            <strong>View on your table</strong> on iPhone and iPad: the dish opens in
            Apple&apos;s AR Quick Look at the size you picked.
          </li>
          <li>
            <strong>View through camera</strong> on older phones without either: the dish
            appears over your camera and follows your phone&apos;s movement. It cannot lock
            onto the table, so its size is approximate.
          </li>
        </ul>
        <p>
          Whichever you get, you can always drag the 3D preview to turn the dish and switch
          sizes to compare them.
        </p>
      </>
    ),
  },
  {
    id: 'size',
    question: 'Is the dish shown at its real size?',
    answer: (
      <p>
        It is drawn at the width the restaurant entered for each portion, so changing the size
        changes it on your table. How closely it matches the plate that arrives depends on that
        measurement and on your phone finding the table surface cleanly. If a size looks wrong,
        a member of staff can check it.
      </p>
    ),
  },
  {
    id: 'camera',
    question: 'Why does it ask to use my camera?',
    answer: (
      <p>
        Augmented reality draws the dish over your camera&apos;s live view so it appears to sit
        on the table. Your browser handles the camera on your phone for that. The feed is not
        recorded and is not sent to us or to the restaurant. If you decline, the 3D preview
        still works.
      </p>
    ),
  },
  {
    id: 'loading',
    question: 'The 3D view is slow to load. What can I do?',
    answer: (
      <p>
        Each dish downloads its 3D model when you open it, and detailed models can be large. The
        percentage on screen shows how far along it is. A stronger connection, such as the
        restaurant&apos;s Wi-Fi if it has one, makes the biggest difference.
      </p>
    ),
  },
  {
    id: 'privacy',
    question: 'Does the menu track me?',
    answer: (
      <p>
        No. The menu and 3D pages set no cookies and run no analytics or advertising trackers.
        The <Link href="/legal/privacy">privacy policy</Link> has the details.
      </p>
    ),
  },
  {
    id: 'wrong-information',
    question: 'Something on the menu looks wrong. Who do I tell?',
    answer: (
      <p>
        Each restaurant manages its own dishes, prices and photos, so please tell a member of
        staff. For allergens and ingredients, always check with staff before you order.
      </p>
    ),
  },
]

export default function HelpPage() {
  return (
    <DocumentShell>
      <DetailsBehaviour />

      <div className="legal-prose">
        <h1>Using the menu</h1>
        <p className="lead">
          Answers to what guests ask most about browsing a menu and viewing dishes in 3D.
        </p>
      </div>

      <div className="divide-y divide-menu-border border-y border-menu-border">
        {QUESTIONS.map(({ id, question, answer }) => (
          <details key={id} id={id} className="faq-item">
            <summary className="flex items-center justify-between gap-4 rounded-md py-4 text-left font-medium text-menu-ink transition-colors hover:text-white">
              <span>{question}</span>
              <ChevronDown
                size={18}
                className="faq-chevron shrink-0 text-menu-ink-muted"
                aria-hidden
              />
            </summary>
            <div className="legal-prose pb-4 pr-8">{answer}</div>
          </details>
        ))}
      </div>
    </DocumentShell>
  )
}
