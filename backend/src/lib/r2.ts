import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const accountId = process.env.R2_ACCOUNT_ID
const accessKeyId = process.env.R2_ACCESS_KEY_ID
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

export const r2Ready = Boolean(accountId && accessKeyId && secretAccessKey && process.env.R2_BUCKET_NAME)

export const r2 = r2Ready
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKeyId!,
        secretAccessKey: secretAccessKey!,
      },
    })
  : null

export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  if (!r2 || !r2Ready) {
    throw new Error('Cloudflare R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, and R2_PUBLIC_URL.')
  }

  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000',
    })
  )

  const publicUrl = process.env.R2_PUBLIC_URL!.replace(/\/$/, '')
  return `${publicUrl}/${key}`
}
