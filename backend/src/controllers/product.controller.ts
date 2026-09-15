import { Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { param } from '../lib/params'
import { badRequest, notFound } from '../lib/http-error'
import { parse, productCreateSchema, productUpdateSchema, uuidSchema } from '../lib/validate'
import { releaseAssetsByUrl } from '../lib/storage'

/**
 * A product may only be filed under a category belonging to the same
 * restaurant. Without this check a tenant could set category_id to another
 * restaurant's category and have their product rendered on that restaurant's
 * public menu, since the menu is assembled by walking the category relation.
 */
async function assertCategoryBelongsToTenant(
  categoryId: string | null | undefined,
  restaurantId: string
): Promise<void> {
  if (!categoryId) return
  const category = await prisma.category.findFirst({
    where: { id: categoryId, restaurant_id: restaurantId },
    select: { id: true },
  })
  if (!category) throw badRequest('category_id: unknown category for this restaurant')
}

/** Derived server-side so `prices` can never disagree with `sizes`. */
function pricesFrom(sizes: { label: string; price: number }[]): Record<string, number> {
  return Object.fromEntries(sizes.map((s) => [s.label, s.price]))
}

export async function getAll(req: Request, res: Response): Promise<void> {
  const restaurant_id = param(req, 'id')

  const products = await prisma.product.findMany({
    where: { restaurant_id },
    include: { category: { select: { id: true, name: true } } },
    orderBy: { created_at: 'desc' },
  })

  res.json(products)
}

export async function create(req: Request, res: Response): Promise<void> {
  const restaurant_id = param(req, 'id')
  const input = parse(productCreateSchema, req.body)

  await assertCategoryBelongsToTenant(input.category_id, restaurant_id)

  const product = await prisma.product.create({
    data: {
      restaurant_id,
      name: input.name,
      description: input.description ?? null,
      category_id: input.category_id ?? null,
      model_url: input.model_url ?? null,
      image_url: input.image_url ?? null,
      diameter_cm: input.diameter_cm ?? null,
      height_cm: input.height_cm ?? null,
      sizes: input.sizes,
      prices: pricesFrom(input.sizes),
      active: input.active ?? true,
    },
    include: { category: { select: { id: true, name: true } } },
  })

  res.status(201).json(product)
}

export async function update(req: Request, res: Response): Promise<void> {
  const restaurant_id = param(req, 'id')
  const pid = parse(uuidSchema, param(req, 'pid'))
  const input = parse(productUpdateSchema, req.body)

  const existing = await prisma.product.findFirst({
    where: { id: pid, restaurant_id },
  })
  if (!existing) throw notFound('Product not found')

  if (input.category_id !== undefined) {
    await assertCategoryBelongsToTenant(input.category_id, restaurant_id)
  }

  const data: Record<string, unknown> = {}
  if (input.name !== undefined) data.name = input.name
  if (input.description !== undefined) data.description = input.description
  if (input.category_id !== undefined) data.category_id = input.category_id
  if (input.model_url !== undefined) data.model_url = input.model_url
  if (input.image_url !== undefined) data.image_url = input.image_url
  if (input.diameter_cm !== undefined) data.diameter_cm = input.diameter_cm
  if (input.height_cm !== undefined) data.height_cm = input.height_cm
  if (input.active !== undefined) data.active = input.active
  if (input.sizes !== undefined) {
    data.sizes = input.sizes
    data.prices = pricesFrom(input.sizes)
  }

  const product = await prisma.product.update({
    where: { id: pid },
    data,
    include: { category: { select: { id: true, name: true } } },
  })

  // Reclaim storage for any media this edit detached from the product.
  const orphaned = [
    input.image_url !== undefined && existing.image_url !== product.image_url
      ? existing.image_url
      : null,
    input.model_url !== undefined && existing.model_url !== product.model_url
      ? existing.model_url
      : null,
  ].filter((url): url is string => Boolean(url))

  if (orphaned.length) await releaseAssetsByUrl(restaurant_id, orphaned)

  res.json(product)
}

/** Soft delete: the row is retained so historical QR codes keep resolving. */
export async function softDelete(req: Request, res: Response): Promise<void> {
  const restaurant_id = param(req, 'id')
  const pid = parse(uuidSchema, param(req, 'pid'))

  const existing = await prisma.product.findFirst({
    where: { id: pid, restaurant_id },
    select: { id: true },
  })
  if (!existing) throw notFound('Product not found')

  await prisma.product.update({ where: { id: pid }, data: { active: false } })

  res.json({ success: true, message: 'Product hidden from the menu' })
}

/** Hard delete, including the product's uploaded media. */
export async function destroy(req: Request, res: Response): Promise<void> {
  const restaurant_id = param(req, 'id')
  const pid = parse(uuidSchema, param(req, 'pid'))

  const existing = await prisma.product.findFirst({
    where: { id: pid, restaurant_id },
  })
  if (!existing) throw notFound('Product not found')

  await prisma.product.delete({ where: { id: pid } })

  const media = [existing.image_url, existing.model_url].filter(
    (url): url is string => Boolean(url)
  )
  if (media.length) await releaseAssetsByUrl(restaurant_id, media)

  res.json({ success: true, message: 'Product deleted' })
}
