import { randomBytes } from 'node:crypto';

/**
 * Test environment for platform-api.
 *
 * Every authenticated route verifies its Bearer token against JWT_SECRET, and
 * the service has no fallback on purpose: a default secret in the source is a
 * published secret, which is half of #82. The suites supply one here, before
 * any module reads it, so a run does not depend on the shell that launched it.
 *
 * Generated per run rather than written as a literal — there is no reason for a
 * signing key, even a disposable one, to live in the source.
 */
process.env.JWT_SECRET ??= randomBytes(32).toString('hex');
