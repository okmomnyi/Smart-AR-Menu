import { Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { param } from '../lib/params'
import { parse, restaurantUpdateSchema } from '../lib/validate'
import { releaseAssetsByUrl } from '../lib/storage'

export async function update(req: Request, res: Response): Promise<void> {
  const id = param(req, 'id')
  const input = parse(restaurantUpdateSchema, req.body)

  const existing = await prisma.restaurant.findUniqueOrThrow({
    where: { id },
    select: { logo_url: true },
  })

  const restaurant = await prisma.restaurant.update({
    where: { id },
    data: input,
    select: {
      id: true,
      name: true,
      slug: true,
      logo_url: true,
      theme_color: true,
      active: true,
      storage_used: true,
    },
  })

  // Reclaim the old logo when it has been replaced or cleared.
  if (
    input.logo_url !== undefined &&
    existing.logo_url &&
    existing.logo_url !== restaurant.logo_url
  ) {
    await releaseAssetsByUrl(id, [existing.logo_url])
  }

  res.json({ ...restaurant, storage_used: Number(restaurant.storage_used) })
}
