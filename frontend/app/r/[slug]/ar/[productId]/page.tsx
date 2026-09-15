import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchMenu } from '../../../../../lib/server-api'
import ARViewer from '../../../../../components/ARViewer'
import type { Product } from '../../../../../lib/api'

interface PageProps {
  params: Promise<{ slug: string; productId: string }>
}

async function findProduct(
  slug: string,
  productId: string
): Promise<{ product: Product; restaurantName: string } | null> {
  const data = await fetchMenu(slug)
  if (!data) return null
  const product = data.categories.flatMap((c) => c.products).find((p) => p.id === productId)
  return product ? { product, restaurantName: data.restaurant.name } : null
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, productId } = await params
  const found = await findProduct(slug, productId)

  if (!found) {
    return { title: 'Dish not found', robots: { index: false, follow: false } }
  }

  const { product, restaurantName } = found
  const description =
    product.description ??
    `See ${product.name} at its real size on your table before you order.`

  return {
    title: `${product.name} in AR`,
    description,
    openGraph: {
      title: `${product.name} · ${restaurantName}`,
      description,
      images: product.image_url ? [{ url: product.image_url }] : undefined,
    },
    // A single dish view reached by QR code is not a search landing page.
    robots: { index: false, follow: true },
  }
}

export default async function ARPage({ params }: PageProps) {
  const { slug, productId } = await params
  const found = await findProduct(slug, productId)

  if (!found) notFound()

  return <ARViewer product={found.product} slug={slug} />
}
