import { config } from 'dotenv'

// quiet: dotenv otherwise prints a promotional banner into production logs.
config({ quiet: true })

/**
 * Fail-fast environment validation.
 *
 * The old Firebase setup booted in a half-configured state and returned 503 at
 * request time. That hides misconfiguration until a user hits it, so instead we
 * refuse to start without the secrets the app cannot work without.
 */

function required(name: string): string {
  const value = process.env[name]
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing required environment variable ${name}. See .env.example.`
    )
  }
  return value
}

function optional(name: string, fallback = ''): string {
  return process.env[name]?.trim() || fallback
}

function int(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  if (Number.isNaN(parsed)) throw new Error(`${name} must be an integer`)
  return parsed
}

/**
 * A path such as /api, for deployments where the API shares the web app's
 * hostname and a tunnel or proxy forwards that path unchanged. Empty when the
 * API has a hostname of its own.
 */
function pathPrefix(name: string): string {
  const value = optional(name).replace(/\/+$/, '')
  if (value && !/^(\/[A-Za-z0-9._~-]+)+$/.test(value)) {
    throw new Error(`${name} must be a path such as /api (got "${value}").`)
  }
  return value
}

const NODE_ENV = optional('NODE_ENV', 'development')
const isProduction = NODE_ENV === 'production'

// Secrets must be long enough that brute-forcing a signature is not viable.
function secret(name: string): string {
  const value = required(name)
  if (value.length < 32) {
    throw new Error(`${name} must be at least 32 characters (got ${value.length}).`)
  }
  return value
}

const ACCESS_TOKEN_SECRET = secret('ACCESS_TOKEN_SECRET')
const REFRESH_TOKEN_SECRET = secret('REFRESH_TOKEN_SECRET')

if (ACCESS_TOKEN_SECRET === REFRESH_TOKEN_SECRET) {
  throw new Error('ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET must differ.')
}

const r2 = {
  accountId: optional('R2_ACCOUNT_ID'),
  accessKeyId: optional('R2_ACCESS_KEY_ID'),
  secretAccessKey: optional('R2_SECRET_ACCESS_KEY'),
  bucket: optional('R2_BUCKET_NAME'),
  publicUrl: optional('R2_PUBLIC_URL').replace(/\/$/, ''),
}

export const env = {
  NODE_ENV,
  isProduction,
  PORT: int('PORT', 4000),
  API_PATH_PREFIX: pathPrefix('API_PATH_PREFIX'),
  DATABASE_URL: required('DATABASE_URL'),

  FRONTEND_URL: optional('FRONTEND_URL', 'http://localhost:3000').replace(/\/$/, ''),
  ALLOWED_ORIGINS: optional('ALLOWED_ORIGINS')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean),

  ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET,
  ACCESS_TOKEN_TTL: optional('ACCESS_TOKEN_TTL', '15m'),
  REFRESH_TOKEN_TTL_DAYS: int('REFRESH_TOKEN_TTL_DAYS', 30),

  // Number of reverse proxies in front of the API. Railway/Render/Fly sit
  // behind exactly one. Must be a finite number, never `true`, or the rate
  // limiter can be defeated with a spoofed X-Forwarded-For chain.
  TRUST_PROXY_HOPS: int('TRUST_PROXY_HOPS', isProduction ? 1 : 0),

  // Self-serve signup. Turn off to run the platform invite-only.
  ALLOW_REGISTRATION: optional('ALLOW_REGISTRATION', 'true') !== 'false',

  // Per-restaurant object-storage ceiling. Default 2 GiB.
  STORAGE_QUOTA_BYTES: BigInt(optional('STORAGE_QUOTA_BYTES', String(2 * 1024 ** 3))),
  MAX_IMAGE_BYTES: int('MAX_IMAGE_BYTES', 10 * 1024 * 1024),
  MAX_MODEL_BYTES: int('MAX_MODEL_BYTES', 40 * 1024 * 1024),

  r2,
  r2Ready: Boolean(
    r2.accountId && r2.accessKeyId && r2.secretAccessKey && r2.bucket && r2.publicUrl
  ),
} as const
