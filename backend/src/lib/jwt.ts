import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken'
import { randomUUID } from 'crypto'
import { env } from './env'

const ISSUER = 'ar-menu-api'
const ACCESS_AUDIENCE = 'ar-menu-access'
const REFRESH_AUDIENCE = 'ar-menu-refresh'

export interface AccessClaims {
  sub: string           // user id
  rid: string           // restaurant id
  role: string
  email: string
}

export interface RefreshClaims {
  sub: string
  tv: number            // token_version, checked against the DB on refresh
}

export function signAccessToken(claims: AccessClaims): string {
  const options: SignOptions = {
    issuer: ISSUER,
    audience: ACCESS_AUDIENCE,
    expiresIn: env.ACCESS_TOKEN_TTL as SignOptions['expiresIn'],
    jwtid: randomUUID(),
  }
  return jwt.sign(claims, env.ACCESS_TOKEN_SECRET, options)
}

export function signRefreshToken(claims: RefreshClaims): string {
  const options: SignOptions = {
    issuer: ISSUER,
    audience: REFRESH_AUDIENCE,
    expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d`,
    jwtid: randomUUID(),
  }
  return jwt.sign(claims, env.REFRESH_TOKEN_SECRET, options)
}

/**
 * Returns null instead of throwing: a bad token is an expected condition on a
 * public endpoint, not an exceptional one.
 */
export function verifyAccessToken(token: string): (AccessClaims & JwtPayload) | null {
  try {
    return jwt.verify(token, env.ACCESS_TOKEN_SECRET, {
      issuer: ISSUER,
      audience: ACCESS_AUDIENCE,
      algorithms: ['HS256'],
    }) as AccessClaims & JwtPayload
  } catch {
    return null
  }
}

export function verifyRefreshToken(token: string): (RefreshClaims & JwtPayload) | null {
  try {
    return jwt.verify(token, env.REFRESH_TOKEN_SECRET, {
      issuer: ISSUER,
      audience: REFRESH_AUDIENCE,
      algorithms: ['HS256'],
    }) as RefreshClaims & JwtPayload
  } catch {
    return null
  }
}
