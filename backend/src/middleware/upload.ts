import multer, { FileFilterCallback, MulterError } from 'multer'
import { Request, Response, NextFunction, RequestHandler } from 'express'
import path from 'path'
import { env } from '../lib/env'
import { badRequest, payloadTooLarge } from '../lib/http-error'

const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp']
const ALLOWED_MODEL_EXTS = ['.glb']

const storage = multer.memoryStorage()

function imageFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void {
  const ext = path.extname(file.originalname).toLowerCase()
  if (ALLOWED_IMAGE_MIMES.includes(file.mimetype) && ALLOWED_IMAGE_EXTS.includes(ext)) {
    cb(null, true)
  } else {
    cb(new Error('Only .jpg, .jpeg, .png and .webp images are allowed'))
  }
}

function modelFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void {
  // Extension only here; the controller verifies the glTF magic bytes.
  if (ALLOWED_MODEL_EXTS.includes(path.extname(file.originalname).toLowerCase())) {
    cb(null, true)
  } else {
    cb(new Error('Only .glb 3D model files are allowed'))
  }
}

const imageUploader = multer({
  storage,
  limits: { fileSize: env.MAX_IMAGE_BYTES, files: 1, fields: 4 },
  fileFilter: imageFilter,
}).single('file')

const modelUploader = multer({
  storage,
  limits: { fileSize: env.MAX_MODEL_BYTES, files: 1, fields: 4 },
  fileFilter: modelFilter,
}).single('file')

function megabytes(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`
}

/**
 * Multer reports failures through its callback rather than by throwing, so it
 * needs its own adapter to reach the global error handler with a sane status.
 */
function adapt(uploader: RequestHandler, limit: number): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    uploader(req, res, (err: unknown) => {
      if (!err) {
        next()
        return
      }
      if (err instanceof MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          next(payloadTooLarge(`File is too large. The limit is ${megabytes(limit)}.`))
          return
        }
        next(badRequest(err.message))
        return
      }
      next(badRequest(err instanceof Error ? err.message : 'Upload failed'))
    })
  }
}

export const uploadImage = adapt(imageUploader, env.MAX_IMAGE_BYTES)
export const uploadModel = adapt(modelUploader, env.MAX_MODEL_BYTES)
