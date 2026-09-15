import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import rateLimit, { ipKeyGenerator } from 'express-rate-limit'

import { env } from './lib/env'
import { prisma } from './lib/prisma'
import { HttpError } from './lib/http-error'

import authRoutes from './routes/auth.routes'
import restaurantRoutes from './routes/restaurant.routes'
import productRoutes from './routes/product.routes'
import categoryRoutes from './routes/category.routes'
import uploadRoutes from './routes/upload.routes'
import menuRoutes from './routes/menu.routes'

const app = express()

// ── Proxy awareness ──────────────────────────────────────────────────────────
// Rate limiting keys on the client IP. Behind a proxy that is only correct if
// Express is told exactly how many hops to trust: `true` would let any client
// spoof X-Forwarded-For and sidestep every limiter below.
app.set('trust proxy', env.TRUST_PROXY_HOPS)
app.disable('x-powered-by')

// ── Shared hostname ──────────────────────────────────────────────────────────
// When the API is served at a path on the web app's hostname, such as
// https://menu.example.com/api, the tunnel forwards the path untouched. Strip
// the prefix before anything else sees the URL, so routes and rate limiters
// stay unprefixed and the same image still works on a hostname of its own.
if (env.API_PATH_PREFIX) {
  const prefix = env.API_PATH_PREFIX
  app.use((req, _res, next) => {
    if (req.url === prefix || req.url.startsWith(`${prefix}/`) || req.url.startsWith(`${prefix}?`)) {
      const rest = req.url.slice(prefix.length)
      req.url = rest.startsWith('/') ? rest : `/${rest}`
    }
    next()
  })
}

// ── Security headers ─────────────────────────────────────────────────────────
app.use(
  helmet({
    // This is a JSON API; it renders nothing, so lock the CSP right down.
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'same-site' },
    referrerPolicy: { policy: 'no-referrer' },
    hsts: env.isProduction
      ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
      : false,
  })
)

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = new Set(
  [env.FRONTEND_URL, ...env.ALLOWED_ORIGINS, 'http://localhost:3000'].filter(Boolean)
)

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header: curl, server-to-server, same-origin. These carry no
      // ambient credentials, so there is nothing for CORS to protect.
      if (!origin || allowedOrigins.has(origin.replace(/\/$/, ''))) {
        callback(null, true)
        return
      }
      callback(new HttpError(403, 'Origin not allowed'))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    maxAge: 600,
  })
)

// ── Body parsers ─────────────────────────────────────────────────────────────
// 100 kB is ample for the largest JSON this API accepts (a product with a
// dozen sizes). File bodies go through multer, not here.
app.use(express.json({ limit: '100kb' }))
app.use(express.urlencoded({ extended: false, limit: '100kb' }))
app.use(cookieParser())

// ── Rate limiting ────────────────────────────────────────────────────────────
const base = { standardHeaders: 'draft-7' as const, legacyHeaders: false }

// Login and registration are the brute-force surface. Key on IP plus the
// submitted email so one attacker cannot lock every account from one address,
// and a botnet cannot spread an attack on a single account across many IPs.
const credentialLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req: Request) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase() : ''
    return `${ipKeyGenerator(req.ip ?? '')}:${email}`
  },
  message: { error: 'Too many attempts. Please try again in a few minutes.' },
})

const sessionLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 100,
  message: { error: 'Too many requests, please try again later.' },
})

const uploadLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 60,
  message: { error: 'Upload limit reached, please try again later.' },
})

const publicLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 120,
  message: { error: 'Too many requests, please try again later.' },
})

const apiLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 120,
  message: { error: 'Too many requests, please try again later.' },
})

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', publicLimiter, (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/auth/login', credentialLimiter)
app.use('/auth/register', credentialLimiter)
app.use('/auth', sessionLimiter, authRoutes)

app.use('/restaurants/:id/products', apiLimiter, productRoutes)
app.use('/restaurants/:id/categories', apiLimiter, categoryRoutes)
app.use('/restaurants', apiLimiter, restaurantRoutes)
app.use('/upload', uploadLimiter, uploadRoutes)
app.use('/menu', publicLimiter, menuRoutes)

// ── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' })
})

/**
 * Middleware we do not control (body-parser, multer, cors) reports failures by
 * setting `status`/`statusCode` on the error rather than by throwing one of
 * ours. Honour those so an oversized body reads as 413 instead of 500.
 */
function statusOf(err: unknown): number {
  if (err instanceof HttpError) return err.status
  const candidate = err as { status?: unknown; statusCode?: unknown }
  const raw =
    typeof candidate?.status === 'number'
      ? candidate.status
      : typeof candidate?.statusCode === 'number'
        ? candidate.statusCode
        : null
  // Only trust client-error codes; anything else is our bug, not the caller's.
  return raw !== null && raw >= 400 && raw < 500 ? raw : 500
}

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const status = statusOf(err)

  if (status >= 500) {
    console.error('[error]', err)
  } else if (!env.isProduction) {
    console.warn('[warn]', err instanceof Error ? err.message : err)
  }

  // 4xx messages are authored above and safe to show. Anything else could
  // carry a stack trace or a database detail, so it is replaced.
  const message =
    status < 500 && err instanceof Error ? err.message : 'Internal server error'

  res.status(status).json({ error: message })
})

const server = app.listen(env.PORT, () => {
  console.log(`\nAR Menu API listening on http://localhost:${env.PORT}`)
  console.log(`  environment : ${env.NODE_ENV}`)
  console.log(`  storage     : ${env.r2Ready ? 'Cloudflare R2' : 'not configured (uploads disabled)'}`)
  console.log(`  signups     : ${env.ALLOW_REGISTRATION ? 'open' : 'disabled'}\n`)
})

// ── Graceful shutdown ────────────────────────────────────────────────────────
async function shutdown(signal: string): Promise<void> {
  console.log(`\n${signal} received, shutting down.`)
  server.close(() => undefined)
  await prisma.$disconnect()
  process.exit(0)
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))

// A rejection that reaches here is a bug: every handler is wrapped in
// asyncHandler. Log it rather than letting Node terminate the process.
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason)
})

export default app
