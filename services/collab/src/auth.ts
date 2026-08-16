import jwt from 'jsonwebtoken';

/**
 * Token verification for the collaboration WebSocket.
 *
 * ## What was wrong
 *
 * This file used to base64-decode the middle segment of the token and trust it:
 *
 *     const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
 *     return { userId: payload.sub || payload.userId, ... };
 *
 * It checked `exp` and nothing else — no signature, no algorithm constraint. Any
 * client could hand-write a token naming any user and join that user's project
 * document, where they could read and write the shared Yjs state, hold shot
 * locks and appear in awareness as that person.
 *
 * It also carried:
 *
 *     const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
 *
 * which was never used to verify anything — but a default secret in a file that
 * looks like it authenticates is worse than none at all, because it reads as if
 * verification is happening. The constant is gone; the secret is now required
 * and actually used.
 *
 * ## Why this logic is duplicated
 *
 * The canonical implementation is
 * `services/platform-api/src/middleware/auth.ts`. This is a deliberate copy —
 * see docs/auth.md for why extraction into `packages/shared` was rejected
 * (every service sets `rootDir: "src"`, so importing a sibling package's source
 * fails the build with TS6059). The copies are held in step by giving each
 * service the same regression suite: forged-unsigned, `alg: none`,
 * wrong-secret and expired.
 */

/** The only algorithm this service accepts. */
const ALLOWED_ALGORITHMS: jwt.Algorithm[] = ['HS256'];

export interface UserPayload {
  userId: string;
  displayName: string;
}

interface TokenClaims extends jwt.JwtPayload {
  sub?: string;
  displayName?: string;
  name?: string;
  email?: string;
}

/**
 * The signing secret, required.
 *
 * There is deliberately no fallback — see the note above about the one this
 * replaced. A default secret is a published secret.
 */
function readSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim() === '') {
    throw new Error(
      'JWT_SECRET is not set. The collab service verifies every WebSocket upgrade ' +
        'against it and refuses to start without one — there is no development ' +
        'default, because a default secret is a published secret. Set JWT_SECRET to ' +
        'the same value the auth service signs with (see .env.example and docs/auth.md).',
    );
  }
  return secret;
}

/**
 * Assert the secret is present.
 *
 * Called from the entrypoint so a misconfigured deployment dies on startup with
 * a named cause, instead of accepting upgrades and rejecting every one of them
 * in a way that looks like a client problem.
 */
export function assertAuthConfigured(): void {
  readSecret();
}

/**
 * Verify a token from the WebSocket upgrade query string.
 *
 * Returns null for every rejection path — absent, malformed, bad signature,
 * wrong algorithm, expired, or missing `sub`. The caller closes the socket with
 * a 401; the distinction is not something to report to an unauthenticated peer.
 */
export function verifyToken(token: string | null): UserPayload | null {
  if (!token) return null;

  let claims: TokenClaims;
  try {
    const decoded = jwt.verify(token, readSecret(), { algorithms: ALLOWED_ALGORITHMS });
    if (typeof decoded === 'string') return null;
    claims = decoded;
  } catch {
    // Bad signature, wrong algorithm, expired — all "not authenticated".
    //
    // A missing JWT_SECRET lands here too, matching platform-api: the service
    // fails shut, so no upgrade is authenticated while it is misconfigured.
    // `assertAuthConfigured` at startup is what makes that state loud.
    return null;
  }

  // `jsonwebtoken` enforces `exp` when present but accepts a token without one,
  // so a token that never expires has to be rejected explicitly.
  if (typeof claims.exp !== 'number') return null;
  if (typeof claims.sub !== 'string' || claims.sub === '') return null;

  return {
    userId: claims.sub,
    displayName: claims.displayName || claims.name || claims.email || 'Anonymous',
  };
}
