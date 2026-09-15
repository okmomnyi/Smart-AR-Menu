import { Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { notFound } from '../lib/http-error'
import { parse, slugSchema } from '../lib/validate'

/**
 * Public menu for a restaurant slug.
 *
 * Products are fetched by restaurant_id and grouped in application code rather
 * than walked through the category relation. That guarantees two things the
 * old relation-based query got wrong: a product filed under another tenant's
 * category can never appear here, and products with no category are shown
 * instead of silently disappearing.
 */
export async function getMenu(req: Request, res: Response): Promise<void> {
  const slug = parse(slugSchema, req.params.slug)

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      logo_url: true,
      theme_color: true,
      active: true,
    },
  })

  if (!restaurant || !restaurant.active) throw notFound('Menu not found')

  const [categories, products] = await Promise.all([
    prisma.category.findMany({
      where: { restaurant_id: restaurant.id },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, order: true },
    }),
    prisma.product.findMany({
      where: { restaurant_id: restaurant.id, active: true },
      orderBy: { created_at: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        category_id: true,
        model_url: true,
        image_url: true,
        diameter_cm: true,
        height_cm: true,
        sizes: true,
        prices: true,
      },
    }),
  ])

  const byCategory = new Map<string, typeof products>()
  const uncategorised: typeof products = []

  for (const product of products) {
    if (!product.category_id) {
      uncategorised.push(product)
      continue
    }
    const bucket = byCategory.get(product.category_id)
    if (bucket) bucket.push(product)
    else byCategory.set(product.category_id, [product])
  }

  const grouped = categories
    .map((category) => ({ ...category, products: byCategory.get(category.id) ?? [] }))
    .filter((category) => category.products.length > 0)

  if (uncategorised.length > 0) {
    grouped.push({
      id: 'uncategorised',
      name: 'More',
      order: Number.MAX_SAFE_INTEGER,
      products: uncategorised,
    })
  }

  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600')
  res.json({
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      slug: restaurant.slug,
      logo_url: restaurant.logo_url,
      theme_color: restaurant.theme_color,
    },
    categories: grouped,
  })
}
