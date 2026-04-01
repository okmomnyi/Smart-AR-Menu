import { Router } from 'express'
import { verifyToken } from '../middleware/auth'
import { verifyTenant } from '../middleware/tenant'
import { getBySlug, update } from '../controllers/restaurant.controller'

const router = Router()

router.get('/:slug', getBySlug)
router.patch('/:id', verifyToken, verifyTenant('id'), update)

export default router
