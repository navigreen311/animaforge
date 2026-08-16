import { randomBytes } from 'node:crypto';

/**
 * Test environment for the collab service.
 *
 * `verifyToken` checks every WebSocket upgrade against JWT_SECRET and has no
 * fallback on purpose — the `'dev-secret-change-in-production'` default this
 * replaced is exactly the pattern being removed. The suites supply a secret
 * here, before any module reads it, so a run does not depend on the shell that
 * launched it.
 */
process.env.JWT_SECRET ??= randomBytes(32).toString('hex');
