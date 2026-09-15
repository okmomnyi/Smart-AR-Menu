import { Response, CookieOptions } from 'express'
import { env } from './env'

export const REFRESH_COOKIE = 'ar_menu_refresh'

/**
 * The refresh cookie is scoped to the auth routes as the browser addresses
 * them, so it is never attached to menu, product or upload requests. That path
 * includes API_PATH_PREFIX when the API shares the web app's hostname:
 * scoping it to /auth there would mean the browser never sends it back to
 * /api/auth/refresh, and every page load would sign the user out.
 *
 * Sharing a hostname also makes the API same-site, so the stricter Lax policy
 * applies. Only a production API on a separate site needs SameSite=None.
 */
function options(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: env.isProduction && !env.API_PATH_PREFIX ? 'none' : 'lax',
    path: `${env.API_PATH_PREFIX}/auth`,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  }
}

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, options())
}

export function clearRefreshCookie(res: Response): void {
  const { maxAge: _maxAge, ...rest } = options()
  res.clearCookie(REFRESH_COOKIE, rest)
}
