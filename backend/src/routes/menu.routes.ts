import { Router } from 'express'
import { asyncHandler } from '../lib/async'
import { getMenu } from '../controllers/menu.controller'

const router = Router()

router.get('/:slug', asyncHandler(getMenu))

export default router
