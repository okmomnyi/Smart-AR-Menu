import { Request, Response, NextFunction } from 'express'
import { auth } from '../lib/firebase'

export interface AuthenticatedUser {
  uid: string
  email: string
}

export interface TenantInfo {
  id: string
  role: string
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser
      restaurant?: TenantInfo
    }
  }
}

export async function verifyToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!auth) {
    res.status(503).json({
      error: 'Firebase Auth is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL.',
    })
    return
  }

  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' })
    return
  }

  const token = authHeader.split('Bearer ')[1]
  try {
    const decoded = await auth.verifyIdToken(token)
    req.user = { uid: decoded.uid, email: decoded.email ?? '' }
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
