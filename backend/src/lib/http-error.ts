/**
 * Error carrying an HTTP status. The global handler passes the message of a
 * 4xx through to the client and replaces any 5xx with a generic string, so
 * only throw HttpError for messages that are safe to expose.
 */
export class HttpError extends Error {
  readonly status: number
  readonly details?: unknown

  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.details = details
  }
}

export const badRequest = (m: string, d?: unknown) => new HttpError(400, m, d)
export const unauthorized = (m = 'Not authenticated') => new HttpError(401, m)
export const forbidden = (m = 'Access denied') => new HttpError(403, m)
export const notFound = (m = 'Not found') => new HttpError(404, m)
export const conflict = (m: string) => new HttpError(409, m)
export const payloadTooLarge = (m: string) => new HttpError(413, m)
