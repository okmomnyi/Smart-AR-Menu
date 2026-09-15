import { Request, Response, NextFunction } from 'express'
import { forbidden, unauthorized } from '../lib/http-error'

/**
 * Enforces that the :id in the route is the caller's own restaurant.
 *
 * The restaurant id comes from the signed access token, so this no longer
 * needs a database lookup on every request the way the Firebase version did.
 */
export function requireTenant(paramName = 'id') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(unauthorized())
      return
    }
    if (req.params[paramName] !== req.user.restaurantId) {
      next(forbidden('Access denied to this restaurant'))
      return
    }
    next()
  }
}
