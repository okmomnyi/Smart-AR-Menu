import { Router } from 'express'
import { asyncHandler } from '../lib/async'
import { requireAuth } from '../middleware/auth'
import { uploadImage as imageUpload, uploadModel as modelUpload } from '../middleware/upload'
import { uploadImage, uploadModel, usage } from '../controllers/upload.controller'

const router = Router()

router.use(requireAuth)

router.get('/usage', asyncHandler(usage))
router.post('/image', imageUpload, asyncHandler(uploadImage))
router.post('/model', modelUpload, asyncHandler(uploadModel))

export default router
