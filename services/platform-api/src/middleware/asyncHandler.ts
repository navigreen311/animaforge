import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Wrap an async route handler so a rejected promise reaches the error handler.
 *
 * Express 4 does not await handlers: if one returns a rejected promise, Express
 * never sees the failure and the request hangs until the client times out. Every
 * async handler must be wrapped.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
