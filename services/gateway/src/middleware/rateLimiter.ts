import rateLimit from 'express-rate-limit';

export interface RateLimitConfig {
  windowMs: number;
  max: number;
}

export const RATE_LIMITS = {
  global: { windowMs: 60 * 1000, max: 100 },
  auth: { windowMs: 60 * 1000, max: 20 },
  generation: { windowMs: 60 * 1000, max: 10 },
} satisfies Record<string, RateLimitConfig>;

export const globalLimiter = rateLimit({
  windowMs: RATE_LIMITS.global.windowMs,
  max: RATE_LIMITS.global.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

export const authLimiter = rateLimit({
  windowMs: RATE_LIMITS.auth.windowMs,
  max: RATE_LIMITS.auth.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' },
  keyGenerator: (req) => req.ip || 'unknown',
});

export const generationLimiter = rateLimit({
  windowMs: RATE_LIMITS.generation.windowMs,
  max: RATE_LIMITS.generation.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Generation rate limit exceeded, please try again later.' },
  keyGenerator: (req) => {
    return (req.headers['x-user-id'] as string) || req.ip || 'unknown';
  },
});
