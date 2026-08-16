import { randomBytes } from 'node:crypto';

/**
 * Test environment for the auth service.
 *
 * The service refuses to sign or verify without JWT_SECRET, on purpose: a
 * default secret in the source is a published secret (#82). Tests supply one
 * here, before any module reads it, generated per run rather than written as a
 * literal.
 */
process.env.JWT_SECRET ??= randomBytes(32).toString('hex');
