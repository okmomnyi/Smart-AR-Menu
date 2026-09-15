import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../lib/jwt'
import { unauthorized, forbidden } from '../lib/http-error'
import { env } from '../lib/env'

export interface AuthenticatedUser {
  id: string
  email: string
  role: string
  restaurantId: string
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser
    }
  }
}

/**
 * Verifies the short-lived access token. Stateless by design: no database
 * round-trip on the hot path. Revocation is handled at refresh time via
 * User.token_version.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    next(unauthorized('Missing or malformed Authorization header'))
    return
  }

  const claims = verifyAccessToken(header.slice('Bearer '.length).trim())
  if (!claims) {
    next(unauthorized('Invalid or expired token'))
    return
  }

  req.user = {
    id: claims.sub,
    email: claims.email,
    role: claims.role,
    restaurantId: claims.rid,
  }
  next()
}

/**
 * Blocks cross-site form posts against cookie-authenticated endpoints. The
 * refresh cookie is SameSite=None in production, so an Origin check is what
 * stands between a third-party page and a silent token rotation.
 */
export function requireSameOrigin(req: Request, _res: Response, next: NextFunction): void {
  const origin = req.headers.origin
  // Non-browser clients (curl, server-to-server) send no Origin and carry no
  // ambient cookies, so there is nothing to forge.
  if (!origin) {
    next()
    return
  }
  const allowed = [env.FRONTEND_URL, ...env.ALLOWED_ORIGINS, 'http://localhost:3000']
  if (!allowed.includes(origin.replace(/\/$/, ''))) {
    next(forbidden('Cross-origin request rejected'))
    return
  }
  next()
}
