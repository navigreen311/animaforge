import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import type { Logger } from 'pino';
import { logger as defaultLogger } from './logger';

declare global {
  namespace Express {
    interface Request {
      id?: string;
      log?: Logger;
    }
  }
}

export interface RequestLoggerOptions {
  logger?: Logger;
  /** Header name to read an existing request ID from (e.g. 'x-request-id') */
  requestIdHeader?: string;
  /** Paths to skip logging (e.g. /health, /metrics) */
  ignorePaths?: string[];
}

/**
 * Express middleware that logs every HTTP request on response finish.
 * Generates a requestId (UUID v4) and attaches it to req.id plus a child logger to req.log.
 */
export function requestLogger(options: RequestLoggerOptions = {}) {
  const {
    logger: baseLogger = defaultLogger,
    requestIdHeader = 'x-request-id',
    ignorePaths = [],
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    if (ignorePaths.includes(req.path)) {
      return next();
    }

    const requestId = (req.headers[requestIdHeader] as string) || randomUUID();
    const startTime = Date.now();

    req.id = requestId;
    res.setHeader('x-request-id', requestId);

    // Create child logger with request context
    const childLogger = baseLogger.child({
      requestId,
      ...(req.headers['x-user-id'] && { userId: req.headers['x-user-id'] }),
    });
    req.log = childLogger;

    // Log on response finish
    res.on('finish', () => {
      const duration_ms = Date.now() - startTime;

      childLogger.info({
        msg: 'request completed',
        method: req.method,
        path: req.originalUrl || req.url,
        statusCode: res.statusCode,
        duration_ms,
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.socket?.remoteAddress,
      });
    });

    next();
  };
}
