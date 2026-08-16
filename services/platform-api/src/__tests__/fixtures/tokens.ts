import jwt from 'jsonwebtoken';

/**
 * Token helpers for the suites.
 *
 * Every suite used to build its own Bearer token by hand:
 *
 *     const signature = Buffer.from('fake-signature').toString('base64url');
 *     return header + '.' + payload + '.' + signature;
 *
 * That worked because the middleware never checked the signature — the tests
 * were passing precisely *because* of the bug they should have caught. Now
 * that signatures are verified, tokens have to be signed, and there is one
 * helper instead of nine copies.
 */

/**
 * The secret the suites sign with.
 *
 * Set here rather than read from the environment so the suites are
 * self-contained, and assigned before any module reads it. It is a test value
 * and never leaves this process.
 */
export const TEST_JWT_SECRET = 'test-secret-for-platform-api-suites';

process.env.JWT_SECRET ??= TEST_JWT_SECRET;

/** The secret in force for this run — whatever the environment settled on. */
function secret(): string {
  return process.env.JWT_SECRET ?? TEST_JWT_SECRET;
}

export interface TokenClaims {
  sub: string;
  email?: string;
  role?: string;
}

/** A correctly signed, unexpired HS256 token. */
export function signTestToken(claims: TokenClaims, expiresIn: string | number = '1h'): string {
  return jwt.sign(
    {
      sub: claims.sub,
      email: claims.email ?? `${claims.sub}@animaforge.test`,
      role: claims.role ?? 'editor',
    },
    secret(),
    { algorithm: 'HS256', expiresIn } as jwt.SignOptions,
  );
}

/** `Authorization` header for a correctly signed token. */
export function authHeader(sub: string, email?: string, role?: string): { Authorization: string } {
  return { Authorization: `Bearer ${signTestToken({ sub, email, role })}` };
}

/* ------------------------------------------------------------------ */
/*  Tokens that must be rejected                                       */
/* ------------------------------------------------------------------ */

/**
 * The exact shape that used to be accepted: three base64url segments with a
 * signature that is not a signature. This is the forgery from #82.
 */
export function forgedUnsignedToken(sub: string, role = 'admin'): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub,
      email: 'attacker@evil.example',
      role,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  ).toString('base64url');
  const signature = Buffer.from('fake-signature').toString('base64url');
  return `${header}.${payload}.${signature}`;
}

/**
 * An `alg: none` token: a real JWT structure declaring that it is unsigned,
 * with an empty signature segment. A verifier that trusts the header's `alg`
 * instead of pinning its own accepts this.
 */
export function algNoneToken(sub: string, role = 'admin'): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub,
      email: 'attacker@evil.example',
      role,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  ).toString('base64url');
  return `${header}.${payload}.`;
}

/** Correctly structured and correctly signed — with the wrong key. */
export function wrongSecretToken(sub: string, role = 'admin'): string {
  return jwt.sign(
    { sub, email: 'attacker@evil.example', role },
    'not-the-secret-this-service-uses',
    { algorithm: 'HS256', expiresIn: '1h' },
  );
}

/** Signed with the right key, but expired an hour ago. */
export function expiredToken(sub: string): string {
  return jwt.sign(
    {
      sub,
      email: `${sub}@animaforge.test`,
      role: 'editor',
      iat: Math.floor(Date.now() / 1000) - 7200,
      exp: Math.floor(Date.now() / 1000) - 3600,
    },
    secret(),
    { algorithm: 'HS256' },
  );
}

/** Signed with the right key, but carrying no `exp` at all. */
export function neverExpiringToken(sub: string): string {
  return jwt.sign({ sub, email: `${sub}@animaforge.test`, role: 'editor' }, secret(), {
    algorithm: 'HS256',
  });
}
