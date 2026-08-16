import { randomBytes } from 'node:crypto';

/**
 * Environment for the cross-service unit suites.
 *
 * `tests/unit/collab.test.ts` exercises the collab service's `verifyToken`,
 * which checks a real signature against JWT_SECRET and has no fallback on
 * purpose — the `'dev-secret-change-in-production'` default it used to carry is
 * exactly the pattern being removed (see docs/auth.md section 7).
 *
 * Generated per run rather than written as a literal: there is no reason for a
 * signing key, even a disposable one, to live in the source.
 */
process.env.JWT_SECRET ??= randomBytes(32).toString('hex');
