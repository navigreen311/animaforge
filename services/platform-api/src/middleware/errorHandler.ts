import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // A schema failure is the client's mistake, not the server's. Routes that
  // call `schema.parse()` inline (rather than through the validate middleware)
  // used to surface it as a 500, which told the caller nothing about which
  // field was wrong.
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: err.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; '),
      },
    });
    return;
  }

  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = statusCode === 500 ? 'Internal server error' : err.message;

  logger.error(`[${code}] ${err.message}`, {
    stack: err.stack,
    statusCode,
  });

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
    },
  });
}
