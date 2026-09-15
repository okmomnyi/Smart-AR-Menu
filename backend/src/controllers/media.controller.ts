import { Request, Response } from 'express'
import { pipeline } from 'stream/promises'
import { readAsset, storageReady } from '../lib/storage'
import { notFound } from '../lib/http-error'

/**
 * Serves uploaded photos and models from the bucket through the API.
 *
 * This lets storage work without a public bucket URL, and it keeps media on
 * the web app's own origin: the 3D viewer fetches models with no cross-origin
 * rules to configure on the bucket. Set R2_PUBLIC_URL to this route, for
 * example https://menu.example.com/api/media. Pointing R2_PUBLIC_URL at a
 * public bucket domain instead bypasses it with no code change.
 */

// Exactly the keys the upload controller writes, and nothing else in the
// bucket. The two ids are UUIDs, which also rules out path traversal.
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const KEY_PATTERN = new RegExp(`^(images/${UUID}/${UUID}\\.webp|models/${UUID}/${UUID}\\.glb)$`)

// From the extension, never from stored object metadata, so a mislabelled
// object cannot be served as HTML on this origin.
const CONTENT_TYPES: Record<string, string> = {
  webp: 'image/webp',
  glb: 'model/gltf-binary',
}

export async function getMedia(req: Request, res: Response): Promise<void> {
  const raw = (req.params as { key?: string | string[] }).key
  const key = Array.isArray(raw) ? raw.join('/') : (raw ?? '')

  if (!storageReady || !KEY_PATTERN.test(key)) throw notFound('Not found')

  const object = await readAsset(key, req.get('if-none-match') ?? undefined)
  if (object === 'not-modified') {
    res.status(304).end()
    return
  }
  if (!object) throw notFound('Not found')

  res.setHeader('Content-Type', CONTENT_TYPES[key.slice(key.lastIndexOf('.') + 1)])
  // Keys are random and never reused, so the bytes behind a URL never change.
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  if (object.contentLength !== undefined) res.setHeader('Content-Length', String(object.contentLength))
  if (object.etag) res.setHeader('ETag', object.etag)
  if (object.lastModified) res.setHeader('Last-Modified', object.lastModified.toUTCString())

  if (req.method === 'HEAD') {
    object.body.destroy()
    res.end()
    return
  }

  try {
    await pipeline(object.body, res)
  } catch {
    // The client went away mid-download. Nothing useful to send.
    res.destroy()
  }
}
