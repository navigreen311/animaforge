import jwt from 'jsonwebtoken';
import type { Socket } from 'socket.io';
import type { AuthPayload } from '../types';

/** The only algorithm this service accepts. */
const ALLOWED_ALGORITHMS: jwt.Algorithm[] = ['HS256'];

/**
 * The signing secret, required.
 *
 * This used to fall back to `'dev-secret'`, which is both a published secret
 * and a *different* published secret from the auth service's -- so a token
 * signed by auth would fail here, and a token signed with the string
 * 'dev-secret' by anyone at all would pass. Read lazily so importing this
 * module is not fatal; the failure lands on the first handshake.
 */
function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim() === '') {
    throw new Error(
      'JWT_SECRET is not set. The realtime service verifies every socket handshake ' +
        'against it and there is no development default, because a default secret is ' +
        'a published secret. Set JWT_SECRET to the same value the auth service signs ' +
        'with (see .env.example and docs/auth.md).',
    );
  }
  return secret;
}

/** Assert the secret is present, for a startup check. */
export function assertSocketAuthConfigured(): void {
  jwtSecret();
}

/**
 * Socket.IO middleware that verifies a JWT passed as a `token` query parameter
 * during the handshake. On success the decoded payload is attached to
 * `socket.data.user`.
 *
 * The algorithm allow-list is what rejects `alg: none` and algorithm
 * confusion. The explicit `exp` check refuses a token that never expires --
 * jwt.verify enforces expiry only when the claim is present.
 */
export function socketAuth(socket: Socket, next: (err?: Error) => void): void {
  const token = socket.handshake.query.token as string | undefined;

  if (!token) {
    return next(new Error('Authentication error: token missing'));
  }

  try {
    const decoded = jwt.verify(token, jwtSecret(), {
      algorithms: ALLOWED_ALGORITHMS,
    }) as AuthPayload;
    if (typeof decoded.exp !== 'number') {
      return next(new Error('Authentication error: token does not expire'));
    }
    if (!decoded.sub) {
      return next(new Error('Authentication error: token carries no subject'));
    }
    socket.data.user = decoded;
    next();
  } catch {
    next(new Error('Authentication error: invalid token'));
  }
}
