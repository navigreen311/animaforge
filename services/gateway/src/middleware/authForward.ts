import { Request, Response, NextFunction } from 'express';

interface JwtPayload {
  sub?: string;
  userId?: string;
  role?: string;
  tier?: string;
  [key: string]: unknown;
}

function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], 'base64url').toString('utf-8');
    return JSON.parse(payload) as JwtPayload;
  } catch {
    return null;
  }
}

export function authForward(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const decoded = decodeJwt(token);

    if (decoded) {
      const userId = decoded.sub || decoded.userId || '';
      const userRole = decoded.role || '';
      const userTier = decoded.tier || '';

      if (userId) req.headers['x-user-id'] = userId;
      if (userRole) req.headers['x-user-role'] = userRole;
      if (userTier) req.headers['x-user-tier'] = userTier;
    }
  }

  next();
}
