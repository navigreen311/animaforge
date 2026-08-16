import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

/**
 * Bearer token authentication for platform-api.
 *
 * This file used to base64-decode the middle segment of the Bearer token and
 * trust whatever it found:
 *
 *     const parts = token.split('.');
 *     if (parts.length !== 3) return null;
 *     const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
 *     if (payload.sub && payload.email && payload.role) { ...accept... }
 *
 * No signature was checked, no expiry was checked, and `jsonwebtoken` was not
 * even a dependency of this package. Since platform-api owns every console
 * endpoint and all persisted data, `<anything>.<base64url of {"sub": "<any
 * uuid>","email":"x@y.z","role":"admin"}>.<anything>` was accepted as that
 * user — full impersonation and read/write access to anyone's rows with a
 * token an attacker writes by hand. See docs/auth.md for the reproduction.
 *
 * The rules now enforced on every request:
 *
 *   1. The signature must verify against JWT_SECRET.
 *   2. The algorithm must be HS256. Passing an allow-list to `jwt.verify` is
 *      what rejects `alg: none` and stops algorithm confusion — without it a
 *      token can nominate its own algorithm and the library will honour it.
 *   3. `exp` must be present and in the future. `jsonwebtoken` enforces expiry
 *      when the claim is present but accepts a token that omits it entirely,
 *      so the presence check is explicit below — otherwise a token minted
 *      without an `exp` would be valid forever. (`requireExp` is a `jose`
 *      option; passing it to `jsonwebtoken` would silently do nothing.)
 *   4. The subject is read from `sub`, the registered claim (RFC 7519 §4.1.2).
 */

/** The identity attached to an authenticated request. */
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

/** The only algorithm this service accepts. */
const ALLOWED_ALGORITHMS: jwt.Algorithm[] = ['HS256'];

/**
 * The signing secret, required.
 *
 * There is deliberately no fallback. A default like `'animaforge-dev-secret'`
 * is a published secret: anyone reading the repository can mint a valid admin
 * token against a deployment that forgot to set the variable, and the
 * deployment gives no sign that anything is wrong. Failing at startup is the
 * only outcome that cannot be mistaken for working.
 */
function readSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim() === '') {
    throw new Error(
      'JWT_SECRET is not set. platform-api verifies every request against it and ' +
        'refuses to start without one — there is no development default, because a ' +
        'default secret is a published secret. Set JWT_SECRET to the same value the ' +
        'auth service signs with (see .env.example and docs/auth.md).',
    );
  }
  return secret;
}

/**
 * Assert the secret is present.
 *
 * Called from the service entrypoint so a misconfigured deployment dies on
 * startup with a named cause, instead of accepting traffic and 401-ing every
 * request — or worse, appearing to work because some other default filled in.
 */
export function assertAuthConfigured(): void {
  readSecret();
}

/** Claims this service reads. Anything else in the token is ignored. */
interface TokenClaims extends jwt.JwtPayload {
  sub?: string;
  email?: string;
  role?: string;
}

/**
 * Verify a token and return the identity it carries, or null.
 *
 * Every rejection path returns null rather than throwing: a malformed token, a
 * bad signature and an expired token are all "not authenticated" as far as a
 * caller is concerned, and the distinction is not something to report back to
 * an unauthenticated client.
 */
export function verifyToken(token: string): AuthUser | null {
  let claims: TokenClaims;
  try {
    claims = jwt.verify(token, readSecret(), {
      algorithms: ALLOWED_ALGORITHMS,
    }) as TokenClaims;
  } catch {
    // Bad signature, wrong algorithm, expired — all "not authenticated".
    //
    // A missing JWT_SECRET lands here too, and that is deliberate: the service
    // fails shut, so no token authenticates while it is misconfigured.
    // `assertAuthConfigured` is what makes that state loud, by refusing to
    // start at all — see the startup check rather than adding a throw here.
    return null;
  }

  // Reject a token that never expires. jwt.verify checks `exp` against the
  // clock when it is present, and accepts the token when it is absent, so the
  // claim has to be required here.
  if (typeof claims.exp !== 'number') return null;

  // A verified signature proves the token came from the signer; it does not
  // prove the payload holds what this service needs.
  if (!claims.sub || !claims.email || !claims.role) return null;

  return { id: claims.sub, email: claims.email, role: claims.role };
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token === '' ? null : token;
}

/**
 * Requires a valid Bearer token. Returns 401 if missing or invalid.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
    return;
  }

  const user = verifyToken(token);
  if (!user) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
    });
    return;
  }

  req.user = user;
  next();
}

/**
 * Attaches user to request if a valid token is present, but does not reject if absent.
 *
 * "Optional" applies to presence only. A token that is present but fails
 * verification is discarded, exactly as in requireAuth — an unverifiable token
 * must never produce an identity.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (token) {
    const user = verifyToken(token);
    if (user) {
      req.user = user;
    }
  }
  next();
}
