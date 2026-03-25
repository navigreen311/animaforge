import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface RequestLog {
  timestamp: string;
  requestId: string;
  method: string;
  path: string;
  status: number;
  duration: number;
  userId: string | null;
  ip: string;
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();

  req.headers['x-request-id'] = requestId;
  res.setHeader('x-request-id', requestId);

  const userId = (req.headers['x-user-id'] as string) || null;

  res.on('finish', () => {
    const log: RequestLog = {
      timestamp: new Date().toISOString(),
      requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      status: res.statusCode,
      duration: Date.now() - start,
      userId,
      ip: req.ip || req.socket.remoteAddress || 'unknown',
    };

    process.stdout.write(JSON.stringify(log) + '\n');
  });

  next();
}
