import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';

/**
 * Token helpers for the gateway suites.
 *
 * Deliberately a mirror of `services/platform-api/src/__tests__/fixtures/tokens.ts`.
 * The gateway cannot import that file — every service sets `rootDir: "src"`, so
 * a cross-package source import fails the build with TS6059 (see docs/auth.md).
 *
 * These are the attack vectors every service's verifier must reject. Keeping
 * the same set in each service is what holds the duplicated verifiers in step:
 * if one copy drifts, its own suite fails.
 */

function secret(): string {
  const configured = process.env.JWT_SECRET;
  if (!configured) {
    throw new Error(
      'JWT_SECRET is unset in the test process. src/__tests__/setup.ts sets it; ' +
        'check vitest.config.ts still lists it under setupFiles.',
    );
  }
  return configured;
}

export interface TokenClaims {
  sub: string;
  role?: string;
  tier?: string;
}

/** A correctly signed, unexpired HS256 token. */
export function signTestToken(claims: TokenClaims, expiresIn: string | number = '1h'): string {
  return jwt.sign(
    { sub: claims.sub, role: claims.role ?? 'editor', tier: claims.tier ?? 'free' },
    secret(),
    { algorithm: 'HS256', expiresIn } as jwt.SignOptions,
  );
}

/* ------------------------------------------------------------------ */
/*  Tokens that must be rejected                                       */
/* ------------------------------------------------------------------ */

/**
 * Three base64url segments with a signature that is not a signature — the
 * forgery the gateway used to accept, and which its own test asserted was
 * correct behaviour.
 */
export function forgedUnsignedToken(sub: string, role = 'admin'): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub,
      role,
      tier: 'enterprise',
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  ).toString('base64url');
  return `${header}.${payload}.fakesignature`;
}

/** A real JWT structure declaring itself unsigned, with an empty signature. */
export function algNoneToken(sub: string, role = 'admin'): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({ sub, role, exp: Math.floor(Date.now() / 1000) + 3600 }),
  ).toString('base64url');
  return `${header}.${payload}.`;
}

/** Correctly signed with a key this service has never seen. */
export function wrongSecretToken(sub: string, role = 'admin'): string {
  return jwt.sign({ sub, role }, randomBytes(32).toString('hex'), {
    algorithm: 'HS256',
    expiresIn: '1h',
  });
}

/** Signed with the right key, expired an hour ago. */
export function expiredToken(sub: string): string {
  return jwt.sign(
    {
      sub,
      role: 'editor',
      iat: Math.floor(Date.now() / 1000) - 7200,
      exp: Math.floor(Date.now() / 1000) - 3600,
    },
    secret(),
    { algorithm: 'HS256' },
  );
}

/** Signed with the right key, carrying no `exp` at all. */
export function neverExpiringToken(sub: string): string {
  return jwt.sign({ sub, role: 'editor' }, secret(), { algorithm: 'HS256' });
}
