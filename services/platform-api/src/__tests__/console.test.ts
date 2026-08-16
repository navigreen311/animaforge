/**
 * Console resource endpoints (#58).
 *
 * The point of these tests is the read-back: a create is only meaningful if a
 * separate request can see what it wrote. Asserting the 201 body alone would
 * pass against the very fabrication this work removes.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import consoleResourcesRouter from '../routes/console/resources.js';
import consoleAccountRouter from '../routes/console/account.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { isDatabaseReachable } from '../db.js';
import { resetFixtures, seedUser } from './fixtures/factories.js';
import { signTestToken } from './fixtures/tokens.js';

const app = express();
app.use(express.json());
app.use('/api/v1', consoleResourcesRouter);
app.use('/api/v1', consoleAccountRouter);
app.use(errorHandler);

// Tokens are signed now (#82).
function token(sub: string): string {
  return signTestToken({ sub, email: `${sub}@animaforge.test`, role: 'editor' });
}

const USER_A = '11111111-1111-4111-8111-0000000000a1';
const USER_B = '11111111-1111-4111-8111-0000000000b2';
const AUTH_A = { Authorization: `Bearer ${token(USER_A)}` };
const AUTH_B = { Authorization: `Bearer ${token(USER_B)}` };

/**
 * These endpoints have no in-memory fallback by design, so without a database
 * there is nothing to assert beyond the 503. Skip loudly rather than pass
 * vacuously.
 */
const dbReady = await isDatabaseReachable();

describe('Console resources — contract without a database', () => {
  it.runIf(!dbReady)('answers 503 rather than an empty list', async () => {
    const res = await request(app).get('/api/v1/avatars').set(AUTH_A);
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('DATABASE_UNAVAILABLE');
  });

  it('rejects an unauthenticated request', async () => {
    const res = await request(app).get('/api/v1/avatars');
    expect(res.status).toBe(401);
  });
});

if (!dbReady) {
  describe.skip('Console resources [SKIPPED: no database reachable — set DATABASE_URL]', () => {
    it('is skipped', () => expect(true).toBe(true));
  });
} else {
  beforeEach(async () => {
    // One ordered cleanup lives in the fixture layer; duplicating it here is
    // how the api_keys -> users foreign key got violated the first time.
    await resetFixtures();
    await seedUser({ id: USER_A, email: `${USER_A}@animaforge.test` });
    await seedUser({ id: USER_B, email: `${USER_B}@animaforge.test` });
  });

  describe('Console resources — writes survive', () => {
    it('creates a brand kit and reads it back in a separate request', async () => {
      const created = await request(app)
        .post('/api/v1/brand-kits')
        .set(AUTH_A)
        .send({ name: 'Studio Kit', colors: [{ hex: '#7c3aed' }] });

      expect(created.status).toBe(201);
      expect(created.body.data.id).toBeDefined();

      // The read-back is the assertion that matters.
      const read = await request(app).get(`/api/v1/brand-kits/${created.body.data.id}`).set(AUTH_A);

      expect(read.status).toBe(200);
      expect(read.body.data.name).toBe('Studio Kit');
      expect(read.body.data.colors).toEqual([{ hex: '#7c3aed' }]);
    });

    it('lists what was created', async () => {
      await request(app).post('/api/v1/scripts').set(AUTH_A).send({ title: 'Act One' });
      await request(app).post('/api/v1/scripts').set(AUTH_A).send({ title: 'Act Two' });

      const list = await request(app).get('/api/v1/scripts').set(AUTH_A);

      expect(list.status).toBe(200);
      expect(list.body.data.total).toBe(2);
      expect(list.body.data.items.map((s: { title: string }) => s.title).sort()).toEqual([
        'Act One',
        'Act Two',
      ]);
    });

    it('persists an update', async () => {
      const created = await request(app)
        .post('/api/v1/scripts')
        .set(AUTH_A)
        .send({ title: 'Draft' });

      await request(app)
        .patch(`/api/v1/scripts/${created.body.data.id}`)
        .set(AUTH_A)
        .send({ title: 'Final', status: 'final' });

      const read = await request(app).get(`/api/v1/scripts/${created.body.data.id}`).set(AUTH_A);
      expect(read.body.data.title).toBe('Final');
      expect(read.body.data.status).toBe('final');
    });

    it('a delete actually removes the row', async () => {
      const created = await request(app)
        .post('/api/v1/markers')
        .set(AUTH_A)
        .send({ projectId: 'proj-1', label: 'Cut here', timeMs: 4200 });

      const del = await request(app).delete(`/api/v1/markers/${created.body.data.id}`).set(AUTH_A);
      expect(del.status).toBe(200);

      const read = await request(app).get(`/api/v1/markers/${created.body.data.id}`).set(AUTH_A);
      expect(read.status).toBe(404);
    });
  });

  describe('Console resources — ownership', () => {
    it('does not list another user rows', async () => {
      await request(app).post('/api/v1/brand-kits').set(AUTH_A).send({ name: 'A only' });

      const asB = await request(app).get('/api/v1/brand-kits').set(AUTH_B);
      expect(asB.body.data.total).toBe(0);
    });

    it('404s rather than 200s when reading another user row', async () => {
      const created = await request(app)
        .post('/api/v1/brand-kits')
        .set(AUTH_A)
        .send({ name: 'A only' });

      const asB = await request(app).get(`/api/v1/brand-kits/${created.body.data.id}`).set(AUTH_B);
      expect(asB.status).toBe(404);
    });

    it('refuses to update another user row', async () => {
      const created = await request(app)
        .post('/api/v1/brand-kits')
        .set(AUTH_A)
        .send({ name: 'A only' });

      const asB = await request(app)
        .patch(`/api/v1/brand-kits/${created.body.data.id}`)
        .set(AUTH_B)
        .send({ name: 'stolen' });
      expect(asB.status).toBe(404);

      const stillA = await request(app)
        .get(`/api/v1/brand-kits/${created.body.data.id}`)
        .set(AUTH_A);
      expect(stillA.body.data.name).toBe('A only');
    });
  });

  describe('Console resources — validation', () => {
    it('rejects a create that fails the schema', async () => {
      const res = await request(app).post('/api/v1/brand-kits').set(AUTH_A).send({ name: '' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects a malformed custom domain', async () => {
      const res = await request(app)
        .post('/api/v1/custom-domains')
        .set(AUTH_A)
        .send({ domain: 'not a domain' });
      expect(res.status).toBe(400);
    });
  });

  describe('Account — profile and keys', () => {
    it('reads and updates the caller profile', async () => {
      const patched = await request(app)
        .patch('/api/v1/users/me')
        .set(AUTH_A)
        .send({ displayName: 'Renamed' });
      expect(patched.status).toBe(200);

      const read = await request(app).get('/api/v1/users/me').set(AUTH_A);
      expect(read.body.data.displayName).toBe('Renamed');
    });

    it('merges generation memory rather than replacing it', async () => {
      await request(app).patch('/api/v1/users/me/memory').set(AUTH_A).send({ tone: 'noir' });
      await request(app).patch('/api/v1/users/me/memory').set(AUTH_A).send({ pace: 'slow' });

      const read = await request(app).get('/api/v1/users/me/memory').set(AUTH_A);
      expect(read.body.data).toEqual({ tone: 'noir', pace: 'slow' });
    });

    it('returns an API key once and never stores the plaintext', async () => {
      const created = await request(app)
        .post('/api/v1/api-keys')
        .set(AUTH_A)
        .send({ name: 'CI key', scopes: ['read'] });

      expect(created.status).toBe(201);
      expect(created.body.data.key).toMatch(/^af_/);

      const list = await request(app).get('/api/v1/api-keys').set(AUTH_A);
      expect(list.body.data.items).toHaveLength(1);
      // The plaintext is not recoverable, and the hash never leaves the server.
      expect(list.body.data.items[0].key).toBeUndefined();
      expect(list.body.data.items[0].keyHash).toBeUndefined();
    });
  });
}
