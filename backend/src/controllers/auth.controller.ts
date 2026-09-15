import { Request, Response } from 'express'
import { randomBytes } from 'crypto'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { env } from '../lib/env'
import {
  hashPassword,
  verifyPassword,
  fakeVerify,
  validatePasswordStrength,
} from '../lib/password'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt'
import { setRefreshCookie, clearRefreshCookie, REFRESH_COOKIE } from '../lib/cookies'
import { badRequest, conflict, forbidden, unauthorized, notFound } from '../lib/http-error'
import {
  parse,
  registerSchema,
  loginSchema,
  changePasswordSchema,
} from '../lib/validate'

// Deliberately identical for "no such account" and "wrong password" so the
// endpoint cannot be used to enumerate which emails are registered.
const INVALID_CREDENTIALS = 'Incorrect email or password'

interface UserRow {
  id: string
  email: string
  role: string
  restaurant_id: string
  token_version: number
}

interface RestaurantRow {
  id: string
  name: string
  slug: string
  logo_url: string | null
  theme_color: string
  active: boolean
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40)
    .replace(/^-+|-+$/g, '')
  return base || 'menu'
}

function publicUser(user: UserRow) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    restaurant_id: user.restaurant_id,
  }
}

function publicRestaurant(r: RestaurantRow) {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    logo_url: r.logo_url,
    theme_color: r.theme_color,
    active: r.active,
  }
}

/**
 * Mints a fresh access token and sets a rotated refresh cookie.
 */
function issueSession(res: Response, user: UserRow): string {
  const accessToken = signAccessToken({
    sub: user.id,
    rid: user.restaurant_id,
    role: user.role,
    email: user.email,
  })
  setRefreshCookie(res, signRefreshToken({ sub: user.id, tv: user.token_version }))
  return accessToken
}

export async function register(req: Request, res: Response): Promise<void> {
  if (!env.ALLOW_REGISTRATION) {
    throw forbidden('Self-serve registration is disabled on this instance.')
  }

  const { email, password, restaurantName } = parse(registerSchema, req.body)

  const weak = validatePasswordStrength(password)
  if (weak) throw badRequest(weak.message)

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) throw conflict('An account with that email already exists.')

  const password_hash = await hashPassword(password)

  // Retry on a slug collision rather than letting the unique constraint
  // surface as an unhandled 500.
  let created: { user: UserRow; restaurant: RestaurantRow } | null = null

  for (let attempt = 0; attempt < 5 && !created; attempt++) {
    const slug = `${slugify(restaurantName)}-${randomBytes(3).toString('hex')}`
    try {
      created = await prisma.$transaction(async (tx) => {
        const restaurant = await tx.restaurant.create({
          data: { name: restaurantName, slug },
        })
        const user = await tx.user.create({
          data: { email, password_hash, restaurant_id: restaurant.id, role: 'owner' },
        })
        return { user, restaurant }
      })
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const target = String(err.meta?.target ?? '')
        // Two signups racing on the same address: the loser reports a conflict.
        if (target.includes('email')) {
          throw conflict('An account with that email already exists.')
        }
        continue // slug collision — try another suffix
      }
      throw err
    }
  }

  if (!created) throw conflict('Could not allocate a menu address. Please try again.')

  const accessToken = issueSession(res, created.user)

  res.status(201).json({
    accessToken,
    user: publicUser(created.user),
    restaurant: publicRestaurant(created.restaurant),
  })
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = parse(loginSchema, req.body)

  const user = await prisma.user.findUnique({
    where: { email },
    include: { restaurant: true },
  })

  if (!user) {
    // Burn comparable CPU so response timing does not reveal registered emails.
    await fakeVerify()
    throw unauthorized(INVALID_CREDENTIALS)
  }

  const ok = await verifyPassword(password, user.password_hash)
  if (!ok) throw unauthorized(INVALID_CREDENTIALS)

  if (!user.restaurant.active) {
    throw forbidden('This restaurant account has been deactivated.')
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { last_login_at: new Date() },
  })

  res.json({
    accessToken: issueSession(res, user),
    user: publicUser(user),
    restaurant: publicRestaurant(user.restaurant),
  })
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[REFRESH_COOKIE]
  if (!token || typeof token !== 'string') throw unauthorized('No session')

  const claims = verifyRefreshToken(token)
  if (!claims) {
    clearRefreshCookie(res)
    throw unauthorized('Session expired')
  }

  const user = await prisma.user.findUnique({
    where: { id: claims.sub },
    include: { restaurant: true },
  })

  // token_version advances on logout and password change, invalidating every
  // refresh token issued before that point.
  if (!user || user.token_version !== claims.tv || !user.restaurant.active) {
    clearRefreshCookie(res)
    throw unauthorized('Session expired')
  }

  res.json({
    accessToken: issueSession(res, user),
    user: publicUser(user),
    restaurant: publicRestaurant(user.restaurant),
  })
}

export async function logout(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[REFRESH_COOKIE]
  const claims = typeof token === 'string' ? verifyRefreshToken(token) : null

  if (claims) {
    // Best effort: an already-deleted user has nothing left to revoke.
    await prisma.user
      .update({
        where: { id: claims.sub },
        data: { token_version: { increment: 1 } },
      })
      .catch(() => undefined)
  }

  clearRefreshCookie(res)
  res.json({ success: true })
}

export async function me(req: Request, res: Response): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { restaurant: true },
  })
  if (!user) throw notFound('User not found')

  res.json({ user: publicUser(user), restaurant: publicRestaurant(user.restaurant) })
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  const { currentPassword, newPassword } = parse(changePasswordSchema, req.body)

  const weak = validatePasswordStrength(newPassword)
  if (weak) throw badRequest(weak.message)

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
  if (!user) throw notFound('User not found')

  if (!(await verifyPassword(currentPassword, user.password_hash))) {
    throw unauthorized('Current password is incorrect')
  }

  const password_hash = await hashPassword(newPassword)
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { password_hash, token_version: { increment: 1 } },
  })

  // Re-issue so the tab that just changed the password stays signed in while
  // every other session is revoked.
  res.json({ accessToken: issueSession(res, updated), success: true })
}
