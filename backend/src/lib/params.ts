import { Request } from 'express'
import { badRequest } from './http-error'

/**
 * Express 5 types route params as `string | string[]` because a pattern can
 * bind the same name more than once. None of our routes do, so anything but a
 * single string is a malformed request rather than something to handle.
 */
export function param(req: Request, name: string): string {
  const value = req.params[name]
  if (typeof value !== 'string' || value === '') {
    throw badRequest(`${name}: missing or invalid route parameter`)
  }
  return value
}
