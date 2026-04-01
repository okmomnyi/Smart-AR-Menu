import { Request, Response } from 'express'
import { prisma } from '../lib/prisma'

export async function getBySlug(req: Request, res: Response): Promise<void> {
  const { slug } = req.params

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    include: {
      categories: {
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!restaurant || !restaurant.active) {
    res.status(404).json({ error: 'Restaurant not found' })
    return
  }

  res.json(restaurant)
}

export async function update(req: Request, res: Response): Promise<void> {
  const { id } = req.params
  const { name, theme_color, logo_url } = req.body

  const updateData: Record<string, unknown> = {}
  if (name !== undefined) updateData.name = name
  if (theme_color !== undefined) updateData.theme_color = theme_color
  if (logo_url !== undefined) updateData.logo_url = logo_url

  if (Object.keys(updateData).length === 0) {
    res.status(400).json({ error: 'No valid fields to update' })
    return
  }

  const restaurant = await prisma.restaurant.update({
    where: { id },
    data: updateData,
  })

  res.json(restaurant)
}
