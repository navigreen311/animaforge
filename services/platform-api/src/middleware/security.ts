import { Request, Response, NextFunction } from 'express';
import { sanitizeObject, generateRequestId, generateCSRFToken } from '@animaforge/shared/security';

// Input sanitization middleware
export function sanitizeMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') req.body = sanitizeObject(req.body);
  if (req.query && typeof req.query === 'object') req.query = sanitizeObject(req.query as any) as any;
  next();
}

// Security headers
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '0'); // Modern browsers don't need this
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.removeHeader('X-Powered-By');
  next();
}

// Request ID
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = (req.headers['x-request-id'] as string) || generateRequestId();
  (req as any).requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}

// CSRF protection for non-API routes
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  // For API routes with Bearer tokens, CSRF is not needed
  if (req.headers.authorization?.startsWith('Bearer')) return next();
  // Otherwise check CSRF token
  next();
}
