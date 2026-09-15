import { Router } from 'express'
import { asyncHandler } from '../lib/async'
import { getMedia } from '../controllers/media.controller'

const router = Router()

// Public: these are the photos and models shown on published menus.
router.get('/*key', asyncHandler(getMedia))

export default router
