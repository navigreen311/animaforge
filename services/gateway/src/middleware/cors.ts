import { CorsOptions } from 'cors';

/**
 * Build a CORS configuration from environment variables.
 *
 * - CORS_ALLOWED_ORIGINS — comma-separated list of allowed origins.
 *   Falls back to "*" when not set (development only).
 * - Credentials are forwarded when an explicit origin list is provided.
 * - Preflight responses are cached for 24 hours (86 400 s).
 */
export function buildCorsOptions(): CorsOptions {
  const raw = process.env.CORS_ALLOWED_ORIGINS;
  const allowedOrigins: string[] | '*' = raw
    ? raw.split(',').map((o) => o.trim()).filter(Boolean)
    : '*';

  const hasExplicitOrigins = Array.isArray(allowedOrigins) && allowedOrigins.length > 0;

  return {
    origin: hasExplicitOrigins
      ? (origin, callback) => {
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error(`Origin "${origin}" is not allowed by CORS policy.`));
          }
        }
      : '*',
    credentials: hasExplicitOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-Id',
      'X-User-Id',
    ],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 86_400, // preflight cache — 24 hours
  };
}
