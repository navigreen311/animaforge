// Utility to add rate limit headers to API responses
export function addRateLimitHeaders(
  headers: Headers,
  info: { limit: number; remaining: number; reset: Date }
) {
  headers.set('X-RateLimit-Limit', info.limit.toString());
  headers.set('X-RateLimit-Remaining', info.remaining.toString());
  headers.set('X-RateLimit-Reset', info.reset.toISOString());
  headers.set('X-RateLimit-Policy', `${info.limit};w=60`);
  headers.set('X-AnimaForge-API-Version', '1.0.0');
}

export function rateLimitExceededResponse(retryAfterSeconds: number): Response {
  const headers = new Headers();
  headers.set('Retry-After', retryAfterSeconds.toString());
  headers.set('X-RateLimit-Remaining', '0');
  return new Response(
    JSON.stringify({ error: 'Rate limit exceeded', retryAfter: retryAfterSeconds }),
    { status: 429, headers }
  );
}

// Standard error response shapes
export function errorResponse(status: number, error: string, details?: any): Response {
  return new Response(JSON.stringify({ error, ...(details && { details }) }), { status });
}
