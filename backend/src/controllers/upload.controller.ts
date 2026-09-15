import { Request, Response } from 'express'
import sharp from 'sharp'
import { randomUUID } from 'crypto'
import { prisma } from '../lib/prisma'
import { storeAsset, storageReady } from '../lib/storage'
import { badRequest, HttpError } from '../lib/http-error'
import { env } from '../lib/env'

function requireStorage(): void {
  if (!storageReady) {
    throw new HttpError(
      503,
      'Object storage is not configured. Set the R2_* variables to enable uploads.'
    )
  }
}

export async function uploadImage(req: Request, res: Response): Promise<void> {
  requireStorage()
  if (!req.file) throw badRequest('No file uploaded')

  const restaurantId = req.user!.restaurantId

  // sharp decodes and re-encodes, so whatever the client claimed the file was,
  // what reaches storage is a real WebP with no embedded metadata or scripts.
  let compressed: Buffer
  try {
    compressed = await sharp(req.file.buffer, { limitInputPixels: 50_000_000 })
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer()
  } catch {
    throw badRequest('That file could not be read as an image.')
  }

  const key = `images/${restaurantId}/${randomUUID()}.webp`
  const { url, bytes } = await storeAsset({
    restaurantId,
    key,
    body: compressed,
    contentType: 'image/webp',
    kind: 'image',
  })

  res.json({ url, bytes })
}

// Every .glb begins with the ASCII magic "glTF" followed by a uint32 version.
function isGlb(buffer: Buffer): boolean {
  if (buffer.length < 12) return false
  if (buffer.toString('ascii', 0, 4) !== 'glTF') return false
  const version = buffer.readUInt32LE(4)
  return version === 1 || version === 2
}

export async function uploadModel(req: Request, res: Response): Promise<void> {
  requireStorage()
  if (!req.file) throw badRequest('No file uploaded')

  // The extension filter in multer only checks the filename. Verify the actual
  // bytes so the endpoint cannot be used as a general-purpose file host.
  if (!isGlb(req.file.buffer)) {
    throw badRequest('That file is not a valid binary glTF (.glb) model.')
  }

  const restaurantId = req.user!.restaurantId
  const key = `models/${restaurantId}/${randomUUID()}.glb`

  const { url, bytes } = await storeAsset({
    restaurantId,
    key,
    body: req.file.buffer,
    contentType: 'model/gltf-binary',
    kind: 'model',
  })

  res.json({ url, bytes })
}

/** Storage usage for the admin UI, so the quota is visible before it is hit. */
export async function usage(req: Request, res: Response): Promise<void> {
  const restaurant = await prisma.restaurant.findUniqueOrThrow({
    where: { id: req.user!.restaurantId },
    select: { storage_used: true },
  })

  res.json({
    used_bytes: Number(restaurant.storage_used),
    quota_bytes: Number(env.STORAGE_QUOTA_BYTES),
    max_image_bytes: env.MAX_IMAGE_BYTES,
    max_model_bytes: env.MAX_MODEL_BYTES,
  })
}
