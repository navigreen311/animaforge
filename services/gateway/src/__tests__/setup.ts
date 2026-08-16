import { randomBytes } from 'node:crypto';

/**
 * Test environment for the gateway.
 *
 * `authForward` verifies every Bearer token against JWT_SECRET and has no
 * fallback on purpose — a default secret in the source is a published secret.
 * The suites supply one here, before any module reads it, so a run does not
 * depend on the shell that launched it.
 *
 * Generated per run rather than written as a literal: there is no reason for a
 * signing key, even a disposable one, to live in the source.
 */
process.env.JWT_SECRET ??= randomBytes(32).toString('hex');
