import { Request, Response } from 'express'
import { prisma } from '../lib/prisma'

export async function getAll(req: Request, res: Response): Promise<void> {
  const { id: restaurant_id } = req.params

  const categories = await prisma.category.findMany({
    where: { restaurant_id },
    orderBy: { order: 'asc' },
    include: {
      _count: { select: { products: { where: { active: true } } } },
    },
  })

  res.json(categories)
}

export async function create(req: Request, res: Response): Promise<void> {
  const { id: restaurant_id } = req.params
  const { name, order } = req.body

  if (!name || typeof name !== 'string' || name.trim() === '') {
    res.status(400).json({ error: 'Category name is required' })
    return
  }

  const maxOrder = await prisma.category.aggregate({
    where: { restaurant_id },
    _max: { order: true },
  })
  const nextOrder = order ?? (maxOrder._max.order ?? 0) + 1

  const category = await prisma.category.create({
    data: {
      restaurant_id,
      name: name.trim(),
      order: nextOrder,
    },
  })

  res.status(201).json(category)
}

export async function update(req: Request, res: Response): Promise<void> {
  const { id: restaurant_id, cid } = req.params
  const { name, order } = req.body

  const existing = await prisma.category.findFirst({
    where: { id: cid, restaurant_id },
  })
  if (!existing) {
    res.status(404).json({ error: 'Category not found' })
    return
  }

  const updateData: Record<string, unknown> = {}
  if (name !== undefined) updateData.name = name.trim()
  if (order !== undefined) updateData.order = parseInt(order)

  const category = await prisma.category.update({
    where: { id: cid },
    data: updateData,
  })

  res.json(category)
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { id: restaurant_id, cid } = req.params

  const existing = await prisma.category.findFirst({
    where: { id: cid, restaurant_id },
  })
  if (!existing) {
    res.status(404).json({ error: 'Category not found' })
    return
  }

  // Reassign products in this category to uncategorized
  await prisma.product.updateMany({
    where: { category_id: cid, restaurant_id },
    data: { category_id: null },
  })

  await prisma.category.delete({ where: { id: cid } })

  res.json({ success: true, message: 'Category deleted, products uncategorized' })
}
