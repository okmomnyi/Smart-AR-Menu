import 'dotenv/config'
import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'

import authRoutes from './routes/auth.routes'
import restaurantRoutes from './routes/restaurant.routes'
import productRoutes from './routes/product.routes'
import categoryRoutes from './routes/category.routes'
import uploadRoutes from './routes/upload.routes'
import menuRoutes from './routes/menu.routes'

const app = express()
const PORT = process.env.PORT ?? 4000

// ── Security headers ─────────────────────────────────────────────────────────
app.use(helmet())

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

// Always allow the configured frontend URL and localhost for dev
if (process.env.FRONTEND_URL) allowedOrigins.push(process.env.FRONTEND_URL)
allowedOrigins.push('http://localhost:3000')

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow same-origin requests (no origin header) and whitelisted origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        const err = new Error('CORS: origin not allowed') as Error & { status: number }
        err.status = 403
        callback(err)
      }
    },
    credentials: true,
  })
)

// ── Rate limiting ─────────────────────────────────────────────────────────────

// Auth endpoints — tight limit to prevent brute force / account enumeration
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  skipSuccessfulRequests: false,
})

// Upload endpoints — prevent storage abuse
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1 hour
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Upload limit reached, please try again later.' },
})

// Public menu — generous but still rate-limited to prevent scraping / DoS
const publicLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 minute
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
})

// General API limit applied to everything else
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
})

// ── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// ── Health check (unauthenticated, rate-limited) ──────────────────────────────
app.get('/health', publicLimiter, (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/auth',                        authLimiter,   authRoutes)
app.use('/restaurants',                 apiLimiter,    restaurantRoutes)
app.use('/restaurants/:id/products',    apiLimiter,    productRoutes)
app.use('/restaurants/:id/categories',  apiLimiter,    categoryRoutes)
app.use('/upload',                      uploadLimiter, uploadRoutes)
app.use('/menu',                        publicLimiter, menuRoutes)

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' })
})

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  // Log full error server-side only — never send internal details to the client
  console.error('[error]', err.message)

  const status = err.status ?? 500
  // For expected HTTP errors pass the message through; for unexpected 500s
  // return a generic message to avoid leaking stack traces or DB details.
  const message = status < 500 ? (err.message ?? 'Request error') : 'Internal server error'
  res.status(status).json({ error: message })
})

app.listen(PORT, () => {
  console.log(`\n🚀 AR Menu API running on http://localhost:${PORT}`)
  console.log(`   Health: http://localhost:${PORT}/health\n`)
})

export default app
