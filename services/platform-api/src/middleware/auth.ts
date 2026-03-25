import type { Request, Response, NextFunction } from "express";

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

// Extend Express Request to carry user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Mock JWT decode -- extracts a base64-encoded JSON payload from a Bearer token.
 * In production this would verify the signature against a real secret/JWKS.
 */
function decodeToken(token: string): AuthUser | null {
  try {
    // Simulates decoding the payload section of a JWT (header.payload.signature)
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    if (payload.sub && payload.email && payload.role) {
      return { id: payload.sub, email: payload.email, role: payload.role };
    }
    return null;
  } catch {
    return null;
  }
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  return header.slice(7);
}

/**
 * Requires a valid Bearer token. Returns 401 if missing or invalid.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required" },
    });
    return;
  }

  const user = decodeToken(token);
  if (!user) {
    res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Invalid or expired token" },
    });
    return;
  }

  req.user = user;
  next();
}

/**
 * Attaches user to request if a valid token is present, but does not reject if absent.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (token) {
    const user = decodeToken(token);
    if (user) {
      req.user = user;
    }
  }
  next();
}
