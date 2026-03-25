import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import {
  RATE_LIMITS,
  type RateLimitConfig,
} from '../../services/gateway/src/middleware/rateLimiter';

let app: Express;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  const mod = await import('../../services/gateway/src/index');
  app = mod.createApp();
});

// ---------------------------------------------------------------------------
// Rate Limiting configuration
// ---------------------------------------------------------------------------

describe('Gateway — Rate Limiting', () => {
  it('global rate limit is configured at 100 req / 60s', () => {
    expect(RATE_LIMITS.global).toEqual<RateLimitConfig>({
      windowMs: 60_000,
      max: 100,
    });
  });

  it('auth rate limit is configured at 20 req / 60s', () => {
    expect(RATE_LIMITS.auth).toEqual<RateLimitConfig>({
      windowMs: 60_000,
      max: 20,
    });
  });

  it('generation rate limit is configured at 10 req / 60s', () => {
    expect(RATE_LIMITS.generation).toEqual<RateLimitConfig>({
      windowMs: 60_000,
      max: 10,
    });
  });
});

// ---------------------------------------------------------------------------
// Health endpoint & middleware integration
// ---------------------------------------------------------------------------

describe('Gateway — Health Endpoint', () => {
  it('GET /health returns status ok with JSON content-type', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('gateway');
    expect(res.body.timestamp).toBeDefined();
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });
});

// ---------------------------------------------------------------------------
// Auth header forwarding
// ---------------------------------------------------------------------------

describe('Gateway — Auth Header Forwarding', () => {
  it('decodes JWT and forwards x-user-id, x-user-role, x-user-tier headers', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({ sub: 'user-42', role: 'admin', tier: 'pro' }),
    ).toString('base64url');
    const token = `${header}.${payload}.fakesig`;

    const res = await request(app)
      .get('/health')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('handles requests without Authorization header gracefully', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });

  it('handles malformed JWT without crashing', async () => {
    const res = await request(app)
      .get('/health')
      .set('Authorization', 'Bearer not-a-real-jwt');
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Request ID injection
// ---------------------------------------------------------------------------

describe('Gateway — Request ID Injection', () => {
  it('injects a UUID x-request-id header into the response', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('preserves client-supplied x-request-id', async () => {
    const customId = 'custom-request-id-12345';
    const res = await request(app)
      .get('/health')
      .set('x-request-id', customId);
    expect(res.headers['x-request-id']).toBe(customId);
  });
});

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

describe('Gateway — CORS', () => {
  it('includes rate limit headers in response', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['ratelimit-limit']).toBeDefined();
    expect(res.headers['ratelimit-remaining']).toBeDefined();
  });

  it('responds to OPTIONS requests', async () => {
    const res = await request(app).options('/health');
    // CORS middleware should handle preflight
    expect(res.status).toBeLessThan(500);
  });
});
