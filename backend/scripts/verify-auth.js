/**
 * Smoke test for the authentication primitives. Needs no database:
 *   npm run build && npm run verify:auth
 *
 * Covers password hashing and the JWT boundary — including that a token with
 * a rewritten restaurant id, a swapped audience, or alg:none is refused.
 */
process.env.DATABASE_URL ||= 'postgresql://x:y@localhost:5432/z'
process.env.ACCESS_TOKEN_SECRET = 'a'.repeat(48)
process.env.REFRESH_TOKEN_SECRET = 'b'.repeat(48)

const { hashPassword, verifyPassword, validatePasswordStrength } = require('../dist/lib/password')
const { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } = require('../dist/lib/jwt')

let pass = 0, fail = 0
const check = (name, cond) => { if (cond) { pass++; console.log('  PASS', name) } else { fail++; console.log('  FAIL', name) } }

;(async () => {
  console.log('\n[password hashing]')
  const hash = await hashPassword('correct horse battery staple')
  check('hash uses scrypt format', /^scrypt\$\d+\$\d+\$\d+\$[\w+/=]+\$[\w+/=]+$/.test(hash))
  check('plaintext never appears in hash', !hash.includes('correct'))
  check('correct password verifies', await verifyPassword('correct horse battery staple', hash))
  check('wrong password rejected', !(await verifyPassword('correct horse battery stapl', hash)))
  check('empty password rejected', !(await verifyPassword('', hash)))
  const hash2 = await hashPassword('correct horse battery staple')
  check('same password -> different hash (salted)', hash !== hash2)
  check('malformed stored hash rejected, no throw', !(await verifyPassword('x', 'garbage')))

  console.log('\n[password policy]')
  check('11 chars rejected', validatePasswordStrength('a'.repeat(11)) !== null)
  check('12 chars accepted', validatePasswordStrength('abcdefghijkl') === null)
  check('common password rejected', validatePasswordStrength('password123') !== null)
  check('repeated char rejected', validatePasswordStrength('aaaaaaaaaaaaaa') !== null)

  console.log('\n[jwt]')
  const access = signAccessToken({ sub: 'u1', rid: 'r1', role: 'owner', email: 'a@b.com' })
  const refresh = signRefreshToken({ sub: 'u1', tv: 3 })

  const a = verifyAccessToken(access)
  check('access token verifies', a && a.sub === 'u1' && a.rid === 'r1')
  const r = verifyRefreshToken(refresh)
  check('refresh token verifies', r && r.sub === 'u1' && r.tv === 3)

  check('access token rejected as refresh (audience split)', verifyRefreshToken(access) === null)
  check('refresh token rejected as access (audience split)', verifyAccessToken(refresh) === null)

  const [h, p, s] = access.split('.')
  const tamperedPayload = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(p, 'base64url')), rid: 'SOMEONE-ELSE' })).toString('base64url')
  check('tampered restaurant id rejected', verifyAccessToken(`${h}.${tamperedPayload}.${s}`) === null)

  const alg = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
  check('alg:none rejected', verifyAccessToken(`${alg}.${p}.`) === null)

  check('garbage rejected', verifyAccessToken('not.a.token') === null)
  check('empty rejected', verifyAccessToken('') === null)

  const jwt = require('jsonwebtoken')
  const wrongKey = jwt.sign({ sub: 'u1', rid: 'r1', role: 'owner', email: 'a@b.com' },
    'c'.repeat(48), { issuer: 'ar-menu-api', audience: 'ar-menu-access', expiresIn: '15m' })
  check('token signed with wrong key rejected', verifyAccessToken(wrongKey) === null)

  const expired = jwt.sign({ sub: 'u1', rid: 'r1', role: 'owner', email: 'a@b.com' },
    process.env.ACCESS_TOKEN_SECRET, { issuer: 'ar-menu-api', audience: 'ar-menu-access', expiresIn: -10 })
  check('expired token rejected', verifyAccessToken(expired) === null)

  console.log(`\n${pass} passed, ${fail} failed\n`)
  process.exit(fail ? 1 : 0)
})()
