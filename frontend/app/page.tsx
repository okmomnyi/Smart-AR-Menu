import { redirect } from 'next/navigation'

/**
 * There is no marketing site in this repository. The root sends visitors to
 * the admin sign-in; guests always arrive on /r/[slug] from a QR code.
 */
export default function RootPage() {
  redirect('/admin')
}
