import { Router } from 'express'
import { asyncHandler } from '../lib/async'
import { requireAuth } from '../middleware/auth'
import { requireTenant } from '../middleware/tenant'
import {
  getAll,
  create,
  update,
  reorder,
  remove,
} from '../controllers/category.controller'

const router = Router({ mergeParams: true })

router.use(requireAuth, requireTenant('id'))

router.get('/', asyncHandler(getAll))
router.post('/', asyncHandler(create))
router.put('/order', asyncHandler(reorder))
router.patch('/:cid', asyncHandler(update))
router.delete('/:cid', asyncHandler(remove))

export default router
