import type { Request, Response, NextFunction } from 'express';
import type { Logger } from 'pino';
import { logger as defaultLogger } from './logger';

/** Keys whose values should be redacted from logged error data */
const SENSITIVE_KEYS = [
  'password',
  'token',
  'secret',
  'authorization',
  'cookie',
  'accessToken',
  'refreshToken',
  'apiKey',
  'api_key',
  'creditCard',
  'ssn',
];

/**
 * Recursively sanitize an object, replacing sensitive field values with '[REDACTED]'.
 */
export function sanitize<T>(obj: T, depth = 0): T {
  if (depth > 10 || obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitize(item, depth + 1)) as unknown as T;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitize(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized as T;
}

export interface ErrorLoggerOptions {
  logger?: Logger;
  /** Whether to include the stack trace in logs (default: true) */
  includeStack?: boolean;
}

/**
 * Express error-handling middleware that logs errors with full context.
 * Must be registered after all routes: app.use(errorLogger())
 */
export function errorLogger(options: ErrorLoggerOptions = {}) {
  const { logger: baseLogger = defaultLogger, includeStack = true } = options;

  return (err: Error & { code?: string; statusCode?: number; details?: unknown }, req: Request, res: Response, _next: NextFunction): void => {
    const requestId = req.id;
    const childLogger = requestId ? baseLogger.child({ requestId }) : baseLogger;

    const errorPayload: Record<string, unknown> = {
      msg: 'request error',
      error: {
        message: err.message,
        code: err.code || 'INTERNAL_ERROR',
        ...(includeStack && { stack: err.stack }),
        ...(err.details && { details: sanitize(err.details) }),
      },
      method: req.method,
      path: req.originalUrl || req.url,
    };

    const statusCode = err.statusCode || 500;

    if (statusCode >= 500) {
      childLogger.error(errorPayload);
    } else {
      childLogger.warn(errorPayload);
    }

    if (!res.headersSent) {
      res.status(statusCode).json({
        error: {
          message: err.message,
          code: err.code || 'INTERNAL_ERROR',
          requestId,
        },
      });
    }
  };
}
