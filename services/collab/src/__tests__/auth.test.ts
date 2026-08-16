import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import { verifyToken, assertAuthConfigured } from '../auth.js';

/**
 * Token verification for the collaboration WebSocket.
 *
 * `verifyToken` used to base64-decode the token and check only `exp`. Every
 * case in the first block below returned a populated user before this change —
 * meaning any client could join any project's Yjs document as any person, read
 * and write the shared state, and hold shot locks under that identity.
 *
 * The vectors mirror the ones in platform-api and the gateway on purpose. The
 * three verifiers are separate copies (see docs/auth.md for why), and running
 * the same attacks against each is what stops them drifting apart.
 */

const VICTIM = 'victim-user-0001';

function secret(): string {
  return process.env.JWT_SECRET!;
}

/** Three base64url segments with a signature that is not a signature. */
function forgedUnsignedToken(sub: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub,
      displayName: 'Attacker',
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  ).toString('base64url');
  return `${header}.${payload}.not-a-signature`;
}

function algNoneToken(sub: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({ sub, exp: Math.floor(Date.now() / 1000) + 3600 }),
  ).toString('base64url');
  return `${header}.${payload}.`;
}

describe('verifyToken — tokens that must be rejected', () => {
  it('rejects the forged unsigned token', () => {
    expect(verifyToken(forgedUnsignedToken(VICTIM))).toBeNull();
  });

  it('rejects an alg: none token', () => {
    expect(verifyToken(algNoneToken(VICTIM))).toBeNull();
  });

  it('rejects a token signed with the wrong secret', () => {
    const token = jwt.sign({ sub: VICTIM }, randomBytes(32).toString('hex'), {
      algorithm: 'HS256',
      expiresIn: '1h',
    });
    expect(verifyToken(token)).toBeNull();
  });

  it('rejects an expired token even though the signature is valid', () => {
    const token = jwt.sign(
      {
        sub: VICTIM,
        iat: Math.floor(Date.now() / 1000) - 7200,
        exp: Math.floor(Date.now() / 1000) - 3600,
      },
      secret(),
      { algorithm: 'HS256' },
    );
    expect(verifyToken(token)).toBeNull();
  });

  it('rejects a correctly signed token that never expires', () => {
    // jsonwebtoken enforces `exp` when present and accepts a token without one,
    // so a token valid forever has to be rejected explicitly.
    const token = jwt.sign({ sub: VICTIM }, secret(), { algorithm: 'HS256' });
    expect(verifyToken(token)).toBeNull();
  });

  it('rejects a signed token carrying no sub', () => {
    const token = jwt.sign({ displayName: 'Nobody' }, secret(), {
      algorithm: 'HS256',
      expiresIn: '1h',
    });
    expect(verifyToken(token)).toBeNull();
  });

  it('rejects a null token', () => {
    expect(verifyToken(null)).toBeNull();
  });

  it('rejects a malformed token', () => {
    expect(verifyToken('not-a-jwt')).toBeNull();
  });
});

describe('verifyToken — valid tokens', () => {
  it('accepts a correctly signed token and reads the subject from sub', () => {
    const token = jwt.sign({ sub: 'user-42', displayName: 'Ada' }, secret(), {
      algorithm: 'HS256',
      expiresIn: '1h',
    });
    expect(verifyToken(token)).toEqual({ userId: 'user-42', displayName: 'Ada' });
  });

  it('falls back through name and email for the display name', () => {
    const withName = jwt.sign({ sub: 'user-43', name: 'Grace' }, secret(), {
      algorithm: 'HS256',
      expiresIn: '1h',
    });
    expect(verifyToken(withName)?.displayName).toBe('Grace');

    const withEmail = jwt.sign({ sub: 'user-44', email: 'ada@animaforge.test' }, secret(), {
      algorithm: 'HS256',
      expiresIn: '1h',
    });
    expect(verifyToken(withEmail)?.displayName).toBe('ada@animaforge.test');

    const bare = jwt.sign({ sub: 'user-45' }, secret(), { algorithm: 'HS256', expiresIn: '1h' });
    expect(verifyToken(bare)?.displayName).toBe('Anonymous');
  });
});

describe('verifyToken — configuration', () => {
  it('assertAuthConfigured throws when JWT_SECRET is absent', () => {
    const saved = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    try {
      expect(() => assertAuthConfigured()).toThrow(/JWT_SECRET is not set/);
    } finally {
      process.env.JWT_SECRET = saved;
    }
  });

  it('refuses to verify anything while the secret is missing', () => {
    // The old code carried `process.env.JWT_SECRET || 'dev-secret-change-in-production'`,
    // so a deployment with no secret verified against a value published in the
    // repository — every forged token naming any user was accepted.
    //
    // Now the service fails shut: not "accepts everything", and not "throws past
    // the caller" either. `assertAuthConfigured` is what makes the misconfigured
    // state loud, by refusing to start. This matches platform-api's convention
    // (see its auth.test.ts, "refuses to verify anything while the secret is
    // missing") — the three verifiers are copies and must behave identically.
    const saved = process.env.JWT_SECRET;
    const token = jwt.sign({ sub: 'user-42' }, saved!, { algorithm: 'HS256', expiresIn: '1h' });
    delete process.env.JWT_SECRET;
    try {
      expect(verifyToken(token)).toBeNull();
    } finally {
      process.env.JWT_SECRET = saved;
    }
  });
});
