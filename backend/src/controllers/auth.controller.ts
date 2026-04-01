import { Request, Response } from 'express'
import { auth } from '../lib/firebase'
import { prisma } from '../lib/prisma'

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
  const suffix = Math.random().toString(36).substring(2, 6)
  return `${base}-${suffix}`
}

export async function register(req: Request, res: Response): Promise<void> {
  if (!auth) {
    res.status(503).json({ error: 'Authentication service not configured.' })
    return
  }

  const { firebaseToken, restaurantName, email } = req.body

  if (!firebaseToken || !restaurantName || !email) {
    res.status(400).json({ error: 'firebaseToken, restaurantName, and email are required' })
    return
  }

  let decoded: { uid: string }
  try {
    decoded = await auth.verifyIdToken(firebaseToken)
  } catch {
    res.status(401).json({ error: 'Invalid Firebase token' })
    return
  }

  const existingUser = await prisma.user.findUnique({
    where: { firebase_uid: decoded.uid },
  })
  if (existingUser) {
    res.status(409).json({ error: 'User already registered' })
    return
  }

  const slug = generateSlug(restaurantName)

  const restaurant = await prisma.restaurant.create({
    data: { name: restaurantName, slug },
  })

  const user = await prisma.user.create({
    data: {
      firebase_uid: decoded.uid,
      email,
      restaurant_id: restaurant.id,
      role: 'admin',
    },
    include: { restaurant: true },
  })

  res.status(201).json({ user, restaurant })
}

export async function verify(req: Request, res: Response): Promise<void> {
  if (!auth) {
    res.status(503).json({ error: 'Authentication service not configured.' })
    return
  }

  const { firebaseToken } = req.body

  if (!firebaseToken) {
    res.status(400).json({ error: 'firebaseToken is required' })
    return
  }

  let decoded: { uid: string }
  try {
    decoded = await auth.verifyIdToken(firebaseToken)
  } catch {
    res.status(401).json({ error: 'Invalid Firebase token' })
    return
  }

  const user = await prisma.user.findUnique({
    where: { firebase_uid: decoded.uid },
    include: { restaurant: true },
  })

  if (!user) {
    res.status(404).json({ error: 'User not found. Please register.' })
    return
  }

  res.json({ user, restaurant: user.restaurant })
}
