import multer, { FileFilterCallback } from 'multer'
import { Request } from 'express'
import path from 'path'

const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp']
const ALLOWED_MODEL_MIMES = ['model/gltf-binary', 'application/octet-stream']
const ALLOWED_MODEL_EXTS = ['.glb']

const storage = multer.memoryStorage()

function imageFileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void {
  const ext = path.extname(file.originalname).toLowerCase()
  if (ALLOWED_IMAGE_MIMES.includes(file.mimetype) && ALLOWED_IMAGE_EXTS.includes(ext)) {
    cb(null, true)
  } else {
    cb(new Error('Only .jpg, .jpeg, .png, and .webp images are allowed'))
  }
}

function modelFileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void {
  const ext = path.extname(file.originalname).toLowerCase()
  if (ALLOWED_MODEL_EXTS.includes(ext)) {
    cb(null, true)
  } else {
    cb(new Error('Only .glb 3D model files are allowed'))
  }
}

export const uploadImage = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: imageFileFilter,
}).single('file')

export const uploadModel = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
  fileFilter: modelFileFilter,
}).single('file')
