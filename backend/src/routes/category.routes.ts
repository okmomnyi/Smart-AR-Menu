import { Router } from 'express'
import { verifyToken } from '../middleware/auth'
import { verifyTenant } from '../middleware/tenant'
import { getAll, create, update, remove } from '../controllers/category.controller'

const router = Router({ mergeParams: true })

router.get('/', verifyToken, verifyTenant('id'), getAll)
router.post('/', verifyToken, verifyTenant('id'), create)
router.patch('/:cid', verifyToken, verifyTenant('id'), update)
router.delete('/:cid', verifyToken, verifyTenant('id'), remove)

export default router
