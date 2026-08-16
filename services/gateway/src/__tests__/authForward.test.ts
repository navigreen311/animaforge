import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { authForward, verifyToken, assertAuthConfigured } from '../middleware/authForward';
import {
  signTestToken,
  forgedUnsignedToken,
  algNoneToken,
  wrongSecretToken,
  expiredToken,
  neverExpiringToken,
} from './fixtures/tokens';

/**
 * The gateway's half of the trust boundary.
 *
 * `authForward` used to base64-decode the token and set `x-user-id`,
 * `x-user-role` and `x-user-tier` from whatever it found, then proxy the
 * request to platform-api. Every "must not be forwarded" case below produced a
 * populated `x-user-id` before this change.
 *
 * The middleware is mounted on a bare echo app rather than the real gateway, so
 * these assert on the headers the gateway *would send upstream* — which is the
 * thing that matters and which a status-code assertion cannot see. The previous
 * suite checked only `res.status === 200`, which is why it passed against the
 * broken implementation.
 */

const VICTIM = 'victim-user-0001';

const app = express();
app.use(authForward);
app.get('/echo', (req, res) => {
  res.status(200).json({
    userId: req.headers['x-user-id'] ?? null,
    role: req.headers['x-user-role'] ?? null,
    tier: req.headers['x-user-tier'] ?? null,
  });
});

describe('authForward — identity is never asserted without a verified token', () => {
  it('does not forward x-user-id for the forged unsigned token', async () => {
    const res = await request(app)
      .get('/echo')
      .set('Authorization', `Bearer ${forgedUnsignedToken(VICTIM, 'admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.userId).toBeNull();
    expect(res.body.role).toBeNull();
  });

  it('does not forward x-user-id for an alg: none token', async () => {
    const res = await request(app)
      .get('/echo')
      .set('Authorization', `Bearer ${algNoneToken(VICTIM)}`);

    expect(res.body.userId).toBeNull();
  });

  it('does not forward x-user-id for a token signed with the wrong secret', async () => {
    const res = await request(app)
      .get('/echo')
      .set('Authorization', `Bearer ${wrongSecretToken(VICTIM)}`);

    expect(res.body.userId).toBeNull();
  });

  it('does not forward x-user-id for an expired token', async () => {
    const res = await request(app)
      .get('/echo')
      .set('Authorization', `Bearer ${expiredToken(VICTIM)}`);

    expect(res.body.userId).toBeNull();
  });

  it('does not forward x-user-id for a token with no exp claim', async () => {
    // Correctly signed, but valid forever. jsonwebtoken accepts a token with no
    // `exp`; the verifier has to reject it explicitly.
    const res = await request(app)
      .get('/echo')
      .set('Authorization', `Bearer ${neverExpiringToken(VICTIM)}`);

    expect(res.body.userId).toBeNull();
  });

  it('does not forward x-user-id for a malformed token', async () => {
    const res = await request(app).get('/echo').set('Authorization', 'Bearer not-a-real-jwt');

    expect(res.status).toBe(200);
    expect(res.body.userId).toBeNull();
  });
});

describe('authForward — client-supplied identity headers are stripped', () => {
  it('strips x-user-id sent with no token at all', async () => {
    // This is the shape that reached devportal and created webhooks as the
    // victim: no Authorization header, just an asserted identity.
    const res = await request(app).get('/echo').set('x-user-id', VICTIM);

    expect(res.body.userId).toBeNull();
  });

  it('strips x-user-role and x-user-tier sent with no token', async () => {
    const res = await request(app)
      .get('/echo')
      .set('x-user-role', 'admin')
      .set('x-user-tier', 'enterprise');

    expect(res.body.role).toBeNull();
    expect(res.body.tier).toBeNull();
  });

  it('a client header cannot override the identity in a valid token', async () => {
    const res = await request(app)
      .get('/echo')
      .set('Authorization', `Bearer ${signTestToken({ sub: 'real-user', role: 'editor' })}`)
      .set('x-user-id', VICTIM)
      .set('x-user-role', 'admin');

    expect(res.body.userId).toBe('real-user');
    expect(res.body.role).toBe('editor');
  });

  it('strips a client header even when the accompanying token is invalid', async () => {
    // Belt and braces: an invalid token must not leave the caller's own header
    // in place as a consolation identity.
    const res = await request(app)
      .get('/echo')
      .set('Authorization', `Bearer ${forgedUnsignedToken(VICTIM)}`)
      .set('x-user-id', VICTIM);

    expect(res.body.userId).toBeNull();
  });
});

describe('authForward — valid tokens', () => {
  it('forwards the subject, role and tier from a correctly signed token', async () => {
    const res = await request(app)
      .get('/echo')
      .set(
        'Authorization',
        `Bearer ${signTestToken({ sub: 'user-42', role: 'admin', tier: 'pro' })}`,
      );

    expect(res.body.userId).toBe('user-42');
    expect(res.body.role).toBe('admin');
    expect(res.body.tier).toBe('pro');
  });

  it('verifyToken returns the identity directly', () => {
    const identity = verifyToken(signTestToken({ sub: 'user-7', role: 'viewer' }));
    expect(identity).toEqual({ userId: 'user-7', role: 'viewer', tier: 'free' });
  });

  it('verifyToken returns null for the forgery', () => {
    expect(verifyToken(forgedUnsignedToken(VICTIM))).toBeNull();
  });
});

describe('authForward — configuration', () => {
  it('assertAuthConfigured throws when JWT_SECRET is absent', () => {
    const saved = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    try {
      expect(() => assertAuthConfigured()).toThrow(/JWT_SECRET is not set/);
    } finally {
      process.env.JWT_SECRET = saved;
    }
  });

  it('an empty JWT_SECRET is treated as absent', () => {
    const saved = process.env.JWT_SECRET;
    process.env.JWT_SECRET = '   ';
    try {
      expect(() => assertAuthConfigured()).toThrow(/JWT_SECRET is not set/);
    } finally {
      process.env.JWT_SECRET = saved;
    }
  });

  it('forwards no identity while the secret is missing', async () => {
    // Fails shut rather than open: with no secret nothing verifies, so nothing
    // is forwarded and upstream services reject the request. Matches
    // platform-api's convention — the three verifiers are copies and must
    // behave identically.
    const saved = process.env.JWT_SECRET;
    const token = signTestToken({ sub: 'user-42' });
    delete process.env.JWT_SECRET;
    try {
      const res = await request(app).get('/echo').set('Authorization', `Bearer ${token}`);
      expect(res.body.userId).toBeNull();
    } finally {
      process.env.JWT_SECRET = saved;
    }
  });
});
