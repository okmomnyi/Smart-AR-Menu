import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'

export function verifyTenant(paramName: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' })
      return
    }

    const user = await prisma.user.findUnique({
      where: { firebase_uid: req.user.uid },
    })

    if (!user) {
      res.status(404).json({ error: 'User not found. Please register first.' })
      return
    }

    const requestedRestaurantId = req.params[paramName]
    if (user.restaurant_id !== requestedRestaurantId) {
      res.status(403).json({ error: 'Access denied to this restaurant' })
      return
    }

    req.restaurant = { id: user.restaurant_id, role: user.role }
    next()
  }
}
