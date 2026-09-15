import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'crypto'
import { promisify } from 'util'

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number
) => Promise<Buffer>

// OWASP-recommended scrypt parameters (N=2^17, r=8, p=1).
// scrypt ships with Node, so there is no native module to compile in Docker.
const N = 1 << 17
const R = 8
const P = 1
const KEY_LEN = 64
const SALT_LEN = 16

// scrypt's default maxmem (32 MiB) is too small for N=2^17; it needs ~128*N*r.
const MAX_MEM = 256 * N * R

function scryptWithParams(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(
      password.normalize('NFKC'),
      salt,
      KEY_LEN,
      { N, r: R, p: P, maxmem: MAX_MEM },
      (err, key) => (err ? reject(err) : resolve(key))
    )
  })
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LEN)
  const key = await scryptWithParams(password, salt)
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false

  const n = Number.parseInt(parts[1], 10)
  const r = Number.parseInt(parts[2], 10)
  const p = Number.parseInt(parts[3], 10)
  if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p)) return false

  const salt = Buffer.from(parts[4], 'base64')
  const expected = Buffer.from(parts[5], 'base64')

  const actual = await new Promise<Buffer | null>((resolve) => {
    scryptCb(
      password.normalize('NFKC'),
      salt,
      expected.length,
      { N: n, r, p, maxmem: 256 * n * r },
      (err, key) => resolve(err ? null : key)
    )
  })

  if (!actual || actual.length !== expected.length) return false
  return timingSafeEqual(actual, expected)
}

/**
 * Burn roughly the same CPU as a real verification. Called when an email does
 * not exist so that response timing does not reveal which accounts are
 * registered.
 */
export async function fakeVerify(): Promise<void> {
  await scryptWithParams('timing-equalizer', Buffer.alloc(SALT_LEN))
}

export interface PasswordProblem {
  message: string
}

/**
 * Deliberately not a regex zoo: length is the property that actually matters,
 * plus a small block-list of the passwords credential-stuffing tools try first.
 */
const COMMON = new Set([
  'password', 'password1', 'password123', '12345678', '123456789', '1234567890',
  'qwertyuiop', 'letmein123', 'iloveyou', 'admin123', 'welcome1', 'restaurant',
  'changeme', 'passw0rd', 'football', 'baseball', 'sunshine', 'princess',
])

export function validatePasswordStrength(password: string): PasswordProblem | null {
  if (password.length < 12) {
    return { message: 'Password must be at least 12 characters.' }
  }
  if (password.length > 128) {
    return { message: 'Password must be at most 128 characters.' }
  }
  if (COMMON.has(password.toLowerCase())) {
    return { message: 'That password is too common. Choose something less predictable.' }
  }
  if (/^(.)\1+$/.test(password)) {
    return { message: 'Password cannot be a single repeated character.' }
  }
  return null
}
