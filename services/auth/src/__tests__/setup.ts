/**
 * Test environment for the auth service.
 *
 * The service refuses to sign or verify without JWT_SECRET, on purpose: a
 * default secret in the source is a published secret (#82). Tests supply their
 * own here, before any module reads it.
 */
process.env.JWT_SECRET ??= 'test-secret-for-auth-suites';
