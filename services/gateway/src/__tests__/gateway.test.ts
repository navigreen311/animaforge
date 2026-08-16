import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../index';
import { verifyToken } from '../middleware/authForward';
import type { Express } from 'express';

let app: Express;

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  app = createApp();
});

describe('API Gateway', () => {
  it('GET /health returns status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('gateway');
    expect(res.body.timestamp).toBeDefined();
  });

  it('GET /health returns JSON content-type', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  it('injects x-request-id header into response', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('preserves client-supplied x-request-id', async () => {
    const customId = 'custom-request-id-12345';
    const res = await request(app).get('/health').set('x-request-id', customId);
    expect(res.headers['x-request-id']).toBe(customId);
  });

  /**
   * This test used to be called "forwards x-user-id from decoded JWT" and built
   * exactly this token — three segments with `const signature = 'fakesignature'`
   * — then asserted only that the response was 200. It passed because the
   * gateway decoded the payload without checking the signature, and it recorded
   * that behaviour as intended.
   *
   * It is kept, and inverted: the same forgery must now be refused an identity.
   * What is actually forwarded upstream is asserted in authForward.test.ts,
   * which can see the request headers; here we only confirm the request is
   * still served rather than crashing.
   */
  it('serves a request carrying a forged token without granting it an identity', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({ sub: 'user-42', role: 'admin', tier: 'pro' }),
    ).toString('base64url');
    const token = `${header}.${payload}.fakesignature`;

    const res = await request(app).get('/health').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(verifyToken(token)).toBeNull();
  });

  it('handles requests without Authorization header gracefully', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });

  it('handles malformed JWT without crashing', async () => {
    const res = await request(app).get('/health').set('Authorization', 'Bearer not-a-real-jwt');
    expect(res.status).toBe(200);
  });

  it('includes rate limit headers in response', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['ratelimit-limit']).toBeDefined();
    expect(res.headers['ratelimit-remaining']).toBeDefined();
  });
});
