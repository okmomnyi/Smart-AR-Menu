import { Router, Request, Response, NextFunction } from 'express'
import { verifyToken } from '../middleware/auth'
import { uploadImage as imageMiddleware, uploadModel as modelMiddleware } from '../middleware/upload'
import { uploadImage, uploadModel } from '../controllers/upload.controller'

const router = Router()

router.post(
  '/image',
  verifyToken,
  (req: Request, res: Response, next: NextFunction) => {
    imageMiddleware(req, res, (err) => {
      if (err) {
        res.status(400).json({ error: err.message })
        return
      }
      next()
    })
  },
  uploadImage
)

router.post(
  '/model',
  verifyToken,
  (req: Request, res: Response, next: NextFunction) => {
    modelMiddleware(req, res, (err) => {
      if (err) {
        res.status(400).json({ error: err.message })
        return
      }
      next()
    })
  },
  uploadModel
)

export default router
