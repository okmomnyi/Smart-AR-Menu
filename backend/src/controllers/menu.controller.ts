import { Request, Response } from 'express'
import { prisma } from '../lib/prisma'

export async function getMenu(req: Request, res: Response): Promise<void> {
  const { slug } = req.params

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    include: {
      categories: {
        orderBy: { order: 'asc' },
        include: {
          products: {
            where: { active: true },
            orderBy: { created_at: 'asc' },
          },
        },
      },
    },
  })

  if (!restaurant || !restaurant.active) {
    res.status(404).json({ error: 'Menu not found' })
    return
  }

  // Cache for 60 seconds
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60')
  res.json({
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      slug: restaurant.slug,
      logo_url: restaurant.logo_url,
      theme_color: restaurant.theme_color,
    },
    categories: restaurant.categories,
  })
}
