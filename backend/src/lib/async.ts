import { RequestHandler, Request, Response, NextFunction } from 'express'

/**
 * Express 4 does not catch rejected promises returned by a handler: an async
 * handler that throws produces an unhandled rejection, which terminates the
 * process on Node >= 15. Every async route handler and middleware must be
 * wrapped so the rejection reaches the global error handler instead.
 */
export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    void Promise.resolve(fn(req, res, next)).catch(next)
  }
}
