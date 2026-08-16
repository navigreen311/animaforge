/**
 * Test environment for platform-api.
 *
 * Every authenticated route verifies its Bearer token against JWT_SECRET, and
 * the service has no fallback on purpose: a default secret in the source is a
 * published secret, which is half of #82. The suites supply their own here,
 * before any module reads it, so a run does not depend on the shell that
 * launched it.
 */
process.env.JWT_SECRET ??= 'test-secret-for-platform-api-suites';
