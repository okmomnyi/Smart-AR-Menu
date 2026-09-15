import { Router } from 'express'
import { asyncHandler } from '../lib/async'
import { requireAuth } from '../middleware/auth'
import { requireTenant } from '../middleware/tenant'
import {
  getAll,
  create,
  update,
  softDelete,
  destroy,
} from '../controllers/product.controller'

const router = Router({ mergeParams: true })

router.use(requireAuth, requireTenant('id'))

router.get('/', asyncHandler(getAll))
router.post('/', asyncHandler(create))
router.patch('/:pid', asyncHandler(update))
router.delete('/:pid', asyncHandler(softDelete))
router.delete('/:pid/permanent', asyncHandler(destroy))

export default router
