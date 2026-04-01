import { Router } from 'express'
import { getMenu } from '../controllers/menu.controller'

const router = Router()

router.get('/:slug', getMenu)

export default router
