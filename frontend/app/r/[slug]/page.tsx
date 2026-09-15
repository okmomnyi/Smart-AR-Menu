import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchMenu } from '../../../lib/server-api'
import MenuView from '../../../components/MenuView'

interface PageProps {
  params: Promise<{ slug: string }>
}

/**
 * Per-restaurant metadata. Without this every shared menu link previewed as a
 * generic "AR Menu" card, and search engines saw one title for every tenant.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const data = await fetchMenu(slug)

  if (!data) {
    return { title: 'Menu not found', robots: { index: false, follow: false } }
  }

  const { restaurant, categories } = data
  const dishCount = categories.reduce((sum, c) => sum + c.products.length, 0)
  const description = `Browse ${dishCount} ${dishCount === 1 ? 'dish' : 'dishes'} from ${restaurant.name} and see each one at its real size in augmented reality before you order.`

  return {
    title: restaurant.name,
    description,
    openGraph: {
      type: 'website',
      title: `${restaurant.name} · Menu`,
      description,
      images: restaurant.logo_url ? [{ url: restaurant.logo_url }] : undefined,
    },
    twitter: {
      card: 'summary',
      title: `${restaurant.name} · Menu`,
      description,
    },
    alternates: { canonical: `/r/${restaurant.slug}` },
  }
}

/**
 * Server-rendered so the menu is on screen as fast as the network allows.
 * The previous version fetched everything client-side, which meant a guest who
 * had just scanned a QR code watched a skeleton while the bundle booted.
 */
export default async function MenuPage({ params }: PageProps) {
  const { slug } = await params
  const data = await fetchMenu(slug)

  if (!data) notFound()

  return <MenuView slug={slug} initialData={data} />
}
