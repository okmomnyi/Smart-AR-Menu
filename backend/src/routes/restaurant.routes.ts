import { Router } from 'express'
import { asyncHandler } from '../lib/async'
import { requireAuth } from '../middleware/auth'
import { requireTenant } from '../middleware/tenant'
import { update } from '../controllers/restaurant.controller'

const router = Router()

// There is no public restaurant endpoint: /menu/:slug serves the customer
// view and exposes only what the menu needs.
router.patch('/:id', requireAuth, requireTenant('id'), asyncHandler(update))

export default router
