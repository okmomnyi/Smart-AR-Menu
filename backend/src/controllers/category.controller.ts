import { Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { param } from '../lib/params'
import { notFound, badRequest } from '../lib/http-error'
import {
  parse,
  categoryCreateSchema,
  categoryUpdateSchema,
  categoryReorderSchema,
  uuidSchema,
} from '../lib/validate'

export async function getAll(req: Request, res: Response): Promise<void> {
  const restaurant_id = param(req, 'id')

  const categories = await prisma.category.findMany({
    where: { restaurant_id },
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
    include: {
      _count: { select: { products: { where: { active: true } } } },
    },
  })

  res.json(categories)
}

export async function create(req: Request, res: Response): Promise<void> {
  const restaurant_id = param(req, 'id')
  const { name, order } = parse(categoryCreateSchema, req.body)

  const max = await prisma.category.aggregate({
    where: { restaurant_id },
    _max: { order: true },
  })

  const category = await prisma.category.create({
    data: {
      restaurant_id,
      name,
      order: order ?? (max._max?.order ?? -1) + 1,
    },
  })

  res.status(201).json(category)
}

export async function update(req: Request, res: Response): Promise<void> {
  const restaurant_id = param(req, 'id')
  const cid = parse(uuidSchema, param(req, 'cid'))
  const input = parse(categoryUpdateSchema, req.body)

  const existing = await prisma.category.findFirst({
    where: { id: cid, restaurant_id },
    select: { id: true },
  })
  if (!existing) throw notFound('Category not found')

  const category = await prisma.category.update({ where: { id: cid }, data: input })

  res.json(category)
}

/**
 * Persists a whole drag-and-drop reorder in one request. The previous approach
 * fired one PATCH per category in parallel, which tripped the rate limiter on
 * larger menus and could leave the order half-applied.
 */
export async function reorder(req: Request, res: Response): Promise<void> {
  const restaurant_id = param(req, 'id')
  const { ids } = parse(categoryReorderSchema, req.body)

  const owned = await prisma.category.findMany({
    where: { restaurant_id },
    select: { id: true },
  })
  const ownedIds = new Set(owned.map((c) => c.id))

  if (ids.length !== ownedIds.size || ids.some((id) => !ownedIds.has(id))) {
    throw badRequest('ids: must list exactly this restaurant’s categories')
  }

  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.category.update({ where: { id }, data: { order: index } })
    )
  )

  const categories = await prisma.category.findMany({
    where: { restaurant_id },
    orderBy: { order: 'asc' },
    include: { _count: { select: { products: { where: { active: true } } } } },
  })

  res.json(categories)
}

export async function remove(req: Request, res: Response): Promise<void> {
  const restaurant_id = param(req, 'id')
  const cid = parse(uuidSchema, param(req, 'cid'))

  const existing = await prisma.category.findFirst({
    where: { id: cid, restaurant_id },
    select: { id: true },
  })
  if (!existing) throw notFound('Category not found')

  // Products survive the category: onDelete: SetNull moves them to the
  // "More" group on the menu rather than removing them.
  await prisma.category.delete({ where: { id: cid } })

  res.json({ success: true, message: 'Category deleted. Its products are now uncategorised.' })
}
