import { Request, Response } from 'express'
import { prisma } from '../lib/prisma'

export async function getAll(req: Request, res: Response): Promise<void> {
  const { id: restaurant_id } = req.params

  const products = await prisma.product.findMany({
    where: { restaurant_id },
    include: { category: true },
    orderBy: { created_at: 'desc' },
  })

  res.json(products)
}

export async function create(req: Request, res: Response): Promise<void> {
  const { id: restaurant_id } = req.params
  const {
    name,
    description,
    category_id,
    model_url,
    image_url,
    diameter_cm,
    height_cm,
    sizes,
    prices,
  } = req.body

  if (!name) {
    res.status(400).json({ error: 'Product name is required' })
    return
  }
  if (!sizes || !Array.isArray(sizes) || sizes.length === 0) {
    res.status(400).json({ error: 'At least one size is required' })
    return
  }
  if (!prices || typeof prices !== 'object') {
    res.status(400).json({ error: 'Prices object is required' })
    return
  }

  const product = await prisma.product.create({
    data: {
      restaurant_id,
      name,
      description: description ?? null,
      category_id: category_id ?? null,
      model_url: model_url ?? null,
      image_url: image_url ?? null,
      diameter_cm: diameter_cm ? parseFloat(diameter_cm) : null,
      height_cm: height_cm ? parseFloat(height_cm) : null,
      sizes,
      prices,
    },
    include: { category: true },
  })

  res.status(201).json(product)
}

export async function update(req: Request, res: Response): Promise<void> {
  const { id: restaurant_id, pid } = req.params

  const existing = await prisma.product.findFirst({
    where: { id: pid, restaurant_id },
  })
  if (!existing) {
    res.status(404).json({ error: 'Product not found' })
    return
  }

  const {
    name,
    description,
    category_id,
    model_url,
    image_url,
    diameter_cm,
    height_cm,
    sizes,
    prices,
    active,
  } = req.body

  const updateData: Record<string, unknown> = {}
  if (name !== undefined) updateData.name = name
  if (description !== undefined) updateData.description = description
  if (category_id !== undefined) updateData.category_id = category_id
  if (model_url !== undefined) updateData.model_url = model_url
  if (image_url !== undefined) updateData.image_url = image_url
  if (diameter_cm !== undefined) updateData.diameter_cm = parseFloat(diameter_cm)
  if (height_cm !== undefined) updateData.height_cm = parseFloat(height_cm)
  if (sizes !== undefined) updateData.sizes = sizes
  if (prices !== undefined) updateData.prices = prices
  if (active !== undefined) updateData.active = active

  const product = await prisma.product.update({
    where: { id: pid },
    data: updateData,
    include: { category: true },
  })

  res.json(product)
}

export async function softDelete(req: Request, res: Response): Promise<void> {
  const { id: restaurant_id, pid } = req.params

  const existing = await prisma.product.findFirst({
    where: { id: pid, restaurant_id },
  })
  if (!existing) {
    res.status(404).json({ error: 'Product not found' })
    return
  }

  await prisma.product.update({
    where: { id: pid },
    data: { active: false },
  })

  res.json({ success: true, message: 'Product disabled' })
}
