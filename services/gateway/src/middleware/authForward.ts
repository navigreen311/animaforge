import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

/**
 * Verify the caller's token and forward its identity to upstream services.
 *
 * ## What was wrong
 *
 * This middleware used to base64-decode the middle segment of the Bearer token
 * and trust whatever it found:
 *
 *     const payload = Buffer.from(parts[1], 'base64url').toString('utf-8');
 *     return JSON.parse(payload) as JwtPayload;
 *
 * No signature check, no expiry check. It then set `x-user-id`, `x-user-role`
 * and `x-user-tier` from those claims and proxied the request to platform-api,
 * which is the service that owns every console endpoint and all persisted data.
 * Anyone could write `<anything>.<base64url of {"sub":"<victim>","role":"admin"}>.<anything>`
 * by hand and be forwarded as that user.
 *
 * It was worse than an unchecked token, because the middleware did not remove
 * inbound identity headers either: a request that simply set `x-user-id`
 * directly, with no token at all, had that header proxied through untouched.
 *
 * The gateway's own test asserted the broken behaviour was correct — it built a
 * token with `const signature = 'fakesignature'` and expected `role: admin` to
 * be forwarded. That test now asserts rejection.
 *
 * ## Two independent rules
 *
 *   1. **Strip first, always.** Identity headers are stripped from every
 *      inbound request before anything else runs, whether or not a token is
 *      present and whether or not it verifies. A client-supplied `x-user-id` is
 *      forged by definition; the only ones that may reach an upstream service
 *      are the ones this middleware sets from a verified token.
 *
 *   2. **Verify before deriving.** Headers are set only from claims whose
 *      signature verified against JWT_SECRET, using an HS256 allow-list (which
 *      is what rejects `alg: none` and algorithm confusion), with `exp`
 *      required and `sub` required.
 *
 * A token that fails verification is not an error here — the request is
 * forwarded with no identity headers and the upstream service rejects it. The
 * gateway's job is to avoid *asserting* an identity it cannot prove, not to
 * decide who may do what.
 *
 * ## Why this logic is duplicated
 *
 * The canonical implementation is
 * `services/platform-api/src/middleware/auth.ts`. This is a deliberate copy,
 * not an oversight — see docs/auth.md for why extraction into
 * `packages/shared` was rejected (every service sets `rootDir: "src"`, so
 * importing a sibling package's source fails the build with TS6059, and fixing
 * that means restructuring three services' build output and Dockerfiles).
 *
 * The copies are held in step by giving each service the same regression
 * suite: forged-unsigned, `alg: none`, wrong-secret and expired. If a copy
 * drifts, its own tests fail.
 */

/** The only algorithm this gateway accepts. */
const ALLOWED_ALGORITHMS: jwt.Algorithm[] = ['HS256'];

/**
 * Identity headers the gateway owns.
 *
 * Stripped from every inbound request, then set only from verified claims.
 */
export const IDENTITY_HEADERS = ['x-user-id', 'x-user-role', 'x-user-tier'] as const;

interface TokenClaims extends jwt.JwtPayload {
  sub?: string;
  role?: string;
  tier?: string;
}

/** The identity a verified token carries. */
export interface ForwardedIdentity {
  userId: string;
  role: string;
  tier: string;
}

/**
 * The signing secret, required.
 *
 * There is deliberately no fallback. A default is a published secret: anyone
 * reading the repository could mint a token the gateway would honour against a
 * deployment that forgot to set the variable, and nothing would look wrong.
 */
function readSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim() === '') {
    throw new Error(
      'JWT_SECRET is not set. The gateway verifies every Bearer token against it ' +
        'and refuses to start without one — there is no development default, because ' +
        'a default secret is a published secret. Set JWT_SECRET to the same value the ' +
        'auth service signs with (see .env.example and docs/auth.md).',
    );
  }
  return secret;
}

/**
 * Assert the secret is present.
 *
 * Called from the entrypoint so a misconfigured gateway dies on startup with a
 * named cause, rather than silently forwarding every request unauthenticated
 * and leaving upstream services to 401 in a way that looks like a client bug.
 */
export function assertAuthConfigured(): void {
  readSecret();
}

/**
 * Verify a token and return the identity it carries, or null.
 *
 * Returns null for every rejection path — malformed, bad signature, wrong
 * algorithm, expired, or missing `sub`. The distinction is not something to
 * report to an unauthenticated caller.
 */
export function verifyToken(token: string): ForwardedIdentity | null {
  let claims: TokenClaims;
  try {
    const decoded = jwt.verify(token, readSecret(), { algorithms: ALLOWED_ALGORITHMS });
    if (typeof decoded === 'string') return null;
    claims = decoded;
  } catch {
    // Bad signature, wrong algorithm, expired — all "not authenticated".
    //
    // A missing JWT_SECRET lands here too, matching platform-api: the gateway
    // fails shut and forwards no identity, so upstream services reject the
    // request. `assertAuthConfigured` at startup is what makes that state loud.
    return null;
  }

  // `jsonwebtoken` enforces `exp` when present but accepts a token without one,
  // so a token that never expires has to be rejected explicitly here.
  if (typeof claims.exp !== 'number') return null;
  if (typeof claims.sub !== 'string' || claims.sub === '') return null;

  return {
    userId: claims.sub,
    role: typeof claims.role === 'string' ? claims.role : '',
    tier: typeof claims.tier === 'string' ? claims.tier : '',
  };
}

function extractBearerToken(authorization: string | undefined): string | null {
  if (!authorization || !authorization.startsWith('Bearer ')) return null;
  const token = authorization.slice(7).trim();
  return token === '' ? null : token;
}

/**
 * Strip client-supplied identity headers, then set them from a verified token.
 *
 * Must run before any middleware that reads `x-user-id` — notably the rate
 * limiter, which keys buckets by it. Before this ordering was fixed, the
 * limiter read the raw client header, so a caller could choose their own bucket
 * or poison someone else's.
 */
export function authForward(req: Request, _res: Response, next: NextFunction): void {
  // Rule 1: strip unconditionally, before anything can read them.
  for (const header of IDENTITY_HEADERS) {
    delete req.headers[header];
  }

  // Rule 2: derive only from a verified token.
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    next();
    return;
  }

  const identity = verifyToken(token);
  if (!identity) {
    // Present but unverifiable. Forward with no identity asserted; the upstream
    // service will reject it.
    next();
    return;
  }

  req.headers['x-user-id'] = identity.userId;
  if (identity.role) req.headers['x-user-role'] = identity.role;
  if (identity.tier) req.headers['x-user-tier'] = identity.tier;

  next();
}
