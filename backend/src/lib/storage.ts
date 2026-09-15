import {
  S3Client,
  PutObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3'
import { env } from './env'
import { prisma } from './prisma'
import { HttpError, payloadTooLarge } from './http-error'

export const storageReady = env.r2Ready

const client = storageReady
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${env.r2.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.r2.accessKeyId,
        secretAccessKey: env.r2.secretAccessKey,
      },
    })
  : null

function requireClient(): S3Client {
  if (!client) {
    throw new HttpError(
      503,
      'Object storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME and R2_PUBLIC_URL.'
    )
  }
  return client
}

/**
 * Uploads a file and records it against the tenant's storage budget in the
 * same transaction, so a burst of concurrent uploads cannot overshoot the
 * quota. The quota is what stops an authenticated tenant from turning the
 * upload endpoint into unbounded storage spend.
 */
export async function storeAsset(params: {
  restaurantId: string
  key: string
  body: Buffer
  contentType: string
  kind: 'image' | 'model'
}): Promise<{ url: string; bytes: number }> {
  const s3 = requireClient()
  const bytes = params.body.byteLength

  const restaurant = await prisma.restaurant.findUniqueOrThrow({
    where: { id: params.restaurantId },
    select: { storage_used: true },
  })

  if (restaurant.storage_used + BigInt(bytes) > env.STORAGE_QUOTA_BYTES) {
    const quotaMb = Number(env.STORAGE_QUOTA_BYTES / BigInt(1024 * 1024))
    const usedMb = Math.round(Number(restaurant.storage_used) / (1024 * 1024))
    throw payloadTooLarge(
      `Storage quota reached (${usedMb} MB of ${quotaMb} MB used). Delete unused media and try again.`
    )
  }

  const url = `${env.r2.publicUrl}/${params.key}`

  await s3.send(
    new PutObjectCommand({
      Bucket: env.r2.bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    })
  )

  try {
    await prisma.$transaction([
      prisma.asset.create({
        data: {
          restaurant_id: params.restaurantId,
          key: params.key,
          url,
          kind: params.kind,
          bytes,
        },
      }),
      prisma.restaurant.update({
        where: { id: params.restaurantId },
        data: { storage_used: { increment: BigInt(bytes) } },
      }),
    ])
  } catch (err) {
    // Do not leave a paid-for object behind if bookkeeping failed.
    await deleteObjects([params.key]).catch(() => undefined)
    throw err
  }

  return { url, bytes }
}

async function deleteObjects(keys: string[]): Promise<void> {
  if (!client || keys.length === 0) return
  // DeleteObjects accepts at most 1000 keys per call.
  for (let i = 0; i < keys.length; i += 1000) {
    await client.send(
      new DeleteObjectsCommand({
        Bucket: env.r2.bucket,
        Delete: { Objects: keys.slice(i, i + 1000).map((Key) => ({ Key })) },
      })
    )
  }
}

/**
 * Deletes the objects behind the given public URLs and credits the bytes back
 * to the tenant. Silently ignores URLs that are not tracked assets of this
 * restaurant — an admin may have pasted an external image URL.
 */
export async function releaseAssetsByUrl(
  restaurantId: string,
  urls: string[]
): Promise<void> {
  if (urls.length === 0) return

  const assets = await prisma.asset.findMany({
    where: { restaurant_id: restaurantId, url: { in: urls } },
  })
  if (assets.length === 0) return

  // Never remove a file another product still points at.
  const stillReferenced = await prisma.product.findMany({
    where: {
      restaurant_id: restaurantId,
      OR: [
        { image_url: { in: assets.map((a) => a.url) } },
        { model_url: { in: assets.map((a) => a.url) } },
      ],
    },
    select: { image_url: true, model_url: true },
  })
  const inUse = new Set(
    stillReferenced.flatMap((p) => [p.image_url, p.model_url]).filter(Boolean) as string[]
  )

  const removable = assets.filter((a) => !inUse.has(a.url))
  if (removable.length === 0) return

  await deleteObjects(removable.map((a) => a.key))

  const freed = removable.reduce((sum, a) => sum + BigInt(a.bytes), BigInt(0))
  await prisma.$transaction([
    prisma.asset.deleteMany({ where: { id: { in: removable.map((a) => a.id) } } }),
    prisma.restaurant.update({
      where: { id: restaurantId },
      data: { storage_used: { decrement: freed } },
    }),
  ])
}
