// Sentry client-side config
export function initSentry() {
  if (typeof window === 'undefined') return;
  // Placeholder - actual Sentry init would go here
  // In production, use @sentry/nextjs wizard
  console.log('[sentry] Would initialize with DSN:', process.env.NEXT_PUBLIC_SENTRY_DSN);
}

export function captureException(error: Error, context?: Record<string, any>) {
  console.error('[sentry]', error.message, context);
  // In production: Sentry.captureException(error, { extra: context });
}

export function setUser(user: { id: string; email: string }) {
  // In production: Sentry.setUser(user);
}
