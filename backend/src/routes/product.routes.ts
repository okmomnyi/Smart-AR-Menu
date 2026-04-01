import { Router } from 'express'
import { verifyToken } from '../middleware/auth'
import { verifyTenant } from '../middleware/tenant'
import { getAll, create, update, softDelete } from '../controllers/product.controller'

const router = Router({ mergeParams: true })

router.get('/', verifyToken, verifyTenant('id'), getAll)
router.post('/', verifyToken, verifyTenant('id'), create)
router.patch('/:pid', verifyToken, verifyTenant('id'), update)
router.delete('/:pid', verifyToken, verifyTenant('id'), softDelete)

export default router
