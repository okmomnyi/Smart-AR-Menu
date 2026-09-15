import { Router } from 'express'
import { asyncHandler } from '../lib/async'
import { requireAuth, requireSameOrigin } from '../middleware/auth'
import {
  register,
  login,
  refresh,
  logout,
  me,
  changePassword,
} from '../controllers/auth.controller'

const router = Router()

router.post('/register', asyncHandler(register))
router.post('/login', asyncHandler(login))

// Cookie-authenticated: guard against cross-site invocation.
router.post('/refresh', requireSameOrigin, asyncHandler(refresh))
router.post('/logout', requireSameOrigin, asyncHandler(logout))

router.get('/me', requireAuth, asyncHandler(me))
router.post('/change-password', requireAuth, asyncHandler(changePassword))

export default router
