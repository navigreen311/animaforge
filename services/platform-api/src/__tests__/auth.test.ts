import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import {
  signTestToken,
  forgedUnsignedToken,
  algNoneToken,
  wrongSecretToken,
  expiredToken,
  neverExpiringToken,
  legacyUserIdToken,
} from './fixtures/tokens.js';
import {
  requireAuth,
  optionalAuth,
  verifyToken,
  assertAuthConfigured,
} from '../middleware/auth.js';

/**
 * The trust boundary (#82).
 *
 * Until this change, `requireAuth` base64-decoded the middle segment of the
 * Bearer token and trusted it. Every assertion in the "must be rejected" block
 * below returned 200 before the fix, with `req.user` set to whatever the caller
 * typed — including `role: 'admin'` and another user's id.
 *
 * These tests are pinned to a tiny app rather than the real router so they
 * assert on the middleware itself, not on whatever a downstream route happens
 * to do with the identity.
 */

const VICTIM = '22222222-2222-4222-8222-222222222222';

const app = express();
app.get('/protected', requireAuth, (req, res) => {
  res.status(200).json({ id: req.user!.id, email: req.user!.email, role: req.user!.role });
});
app.get('/optional', optionalAuth, (req, res) => {
  res.status(200).json({ user: req.user ?? null });
});

describe('requireAuth — tokens that must be rejected', () => {
  it('rejects the forged unsigned token from #82', async () => {
    // <anything>.<base64url claims>.<anything> — the exact shape that used to
    // grant admin access to any account.
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${forgedUnsignedToken(VICTIM, 'admin')}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects an alg: none token', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${algNoneToken(VICTIM, 'admin')}`);

    expect(res.status).toBe(401);
  });

  it('rejects a token signed with the wrong secret', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${wrongSecretToken(VICTIM, 'admin')}`);

    expect(res.status).toBe(401);
  });

  it('rejects an expired token even though the signature is valid', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${expiredToken(VICTIM)}`);

    expect(res.status).toBe(401);
  });

  it('rejects a correctly signed token that carries no exp', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${neverExpiringToken(VICTIM)}`);

    expect(res.status).toBe(401);
  });

  it('rejects a token that verifies but carries no subject', async () => {
    // A valid signature proves provenance, not that the payload is usable.
    const noSub = signTestToken({ sub: '', email: 'x@y.z', role: 'admin' });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${noSub}`);

    expect(res.status).toBe(401);
  });

  it('rejects a missing header', async () => {
    const res = await request(app).get('/protected');
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Authentication required');
  });

  it('rejects a non-Bearer header', async () => {
    const res = await request(app).get('/protected').set('Authorization', 'Basic dXNlcjpwYXNz');
    expect(res.status).toBe(401);
  });

  it('rejects an empty Bearer token', async () => {
    const res = await request(app).get('/protected').set('Authorization', 'Bearer ');
    expect(res.status).toBe(401);
  });

  it('rejects a token whose payload was tampered with after signing', async () => {
    // Take a genuine token and swap the claims for someone else's, keeping the
    // original signature — the classic tamper.
    const genuine = signTestToken({ sub: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', role: 'editor' });
    const [header, , signature] = genuine.split('.');
    const swapped = Buffer.from(
      JSON.stringify({
        sub: VICTIM,
        email: 'attacker@evil.example',
        role: 'admin',
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString('base64url');

    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${header}.${swapped}.${signature}`);

    expect(res.status).toBe(401);
  });
});

describe('requireAuth — the token that must be accepted', () => {
  it('accepts a correctly signed, unexpired token and attaches its subject', async () => {
    const token = signTestToken({
      sub: VICTIM,
      email: 'owner@animaforge.test',
      role: 'editor',
    });

    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    // The identity is read from `sub`, the registered claim — the naming half
    // of #82.
    expect(res.body).toEqual({
      id: VICTIM,
      email: 'owner@animaforge.test',
      role: 'editor',
    });
  });

  it('reads the subject from sub, not from a custom userId claim', async () => {
    // A token in the old shape — subject under `userId`, nothing under `sub` —
    // correctly signed, and still rejected. This is what "standardise on sub"
    // means: one name, and the other one stops working.
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${legacyUserIdToken(VICTIM)}`);

    expect(res.status).toBe(401);
  });
});

describe('optionalAuth', () => {
  it('allows an anonymous request through with no user', async () => {
    const res = await request(app).get('/optional');
    expect(res.status).toBe(200);
    expect(res.body.user).toBeNull();
  });

  it('attaches the user when the token verifies', async () => {
    const res = await request(app)
      .get('/optional')
      .set('Authorization', `Bearer ${signTestToken({ sub: VICTIM })}`);

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(VICTIM);
  });

  it('discards a token that does not verify rather than trusting it', async () => {
    // "Optional" is about presence, not validity. A forged token must never
    // produce an identity, even on a route that tolerates anonymous callers.
    const res = await request(app)
      .get('/optional')
      .set('Authorization', `Bearer ${forgedUnsignedToken(VICTIM, 'admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toBeNull();
  });
});

describe('JWT_SECRET is required', () => {
  const original = process.env.JWT_SECRET;

  beforeAll(() => {
    delete process.env.JWT_SECRET;
  });

  afterAll(() => {
    process.env.JWT_SECRET = original;
  });

  it('throws at the startup check when the secret is missing', () => {
    expect(() => assertAuthConfigured()).toThrowError(/JWT_SECRET is not set/);
  });

  it('names what to do instead of failing silently', () => {
    expect(() => assertAuthConfigured()).toThrowError(/no development default/);
  });

  it('refuses to verify anything while the secret is missing', () => {
    // Not "accepts everything" and not "throws past the caller" — no token
    // authenticates while the service is misconfigured.
    expect(verifyToken('anything.at.all')).toBeNull();
  });
});
