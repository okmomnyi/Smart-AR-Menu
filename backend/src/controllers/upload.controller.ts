import { Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { uploadToR2, r2Ready } from '../lib/r2'
import sharp from 'sharp'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'

export async function uploadImage(req: Request, res: Response): Promise<void> {
  if (!r2Ready) {
    res.status(503).json({ error: 'Cloudflare R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, and R2_PUBLIC_URL in your .env.' })
    return
  }
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' })
    return
  }
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' })
    return
  }

  const user = await prisma.user.findUnique({ where: { firebase_uid: req.user.uid } })
  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  const compressed = await sharp(req.file.buffer)
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer()

  const key = `images/${user.restaurant_id}/${uuidv4()}.webp`
  const url = await uploadToR2(key, compressed, 'image/webp')

  res.json({ url })
}

export async function uploadModel(req: Request, res: Response): Promise<void> {
  if (!r2Ready) {
    res.status(503).json({ error: 'Cloudflare R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, and R2_PUBLIC_URL in your .env.' })
    return
  }
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' })
    return
  }
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' })
    return
  }

  const user = await prisma.user.findUnique({ where: { firebase_uid: req.user.uid } })
  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  const originalName = path.parse(req.file.originalname).name
  const key = `models/${user.restaurant_id}/${uuidv4()}-${originalName}.glb`
  const url = await uploadToR2(key, req.file.buffer, 'model/gltf-binary')

  res.json({ url })
}
