import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { ShotLockManager } from '../../services/collab/src/shotLocking';
import { AwarenessManager } from '../../services/collab/src/awareness';
import { verifyToken } from '../../services/collab/src/auth';

// ---------------------------------------------------------------------------
// 1. Session auth (verifyToken)
// ---------------------------------------------------------------------------
describe('Collab - Auth / Token Verification', () => {
  // These tokens used to be assembled by hand and ended in a literal
  // `.fakesig`, and the first test asserted verification SUCCEEDED — the suite
  // encoded the bypass as correct behaviour. `rejects an expired token` passed
  // for the wrong reason too: the token was refused because its signature was
  // nonsense, not because it had expired, so the assertion proved nothing about
  // expiry. Signing properly is what makes these tests mean what they say.
  // See docs/auth.md section 7.
  const secret = () => process.env.JWT_SECRET!;

  it('verifies a correctly signed token and returns userId + displayName', () => {
    const token = jwt.sign({ sub: 'user-1', displayName: 'Alice' }, secret(), {
      algorithm: 'HS256',
      expiresIn: '1h',
    });

    const result = verifyToken(token);
    expect(result).not.toBeNull();
    expect(result!.userId).toBe('user-1');
    expect(result!.displayName).toBe('Alice');
  });

  it('rejects an expired token whose signature is otherwise valid', () => {
    const token = jwt.sign(
      {
        sub: 'user-2',
        iat: Math.floor(Date.now() / 1000) - 7200,
        exp: Math.floor(Date.now() / 1000) - 100,
      },
      secret(),
      { algorithm: 'HS256' },
    );

    expect(verifyToken(token)).toBeNull();
  });

  it('rejects a hand-assembled token with an invalid signature', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        sub: 'user-1',
        displayName: 'Alice',
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString('base64url');

    expect(verifyToken(`${header}.${payload}.fakesig`)).toBeNull();
  });

  it('rejects null or empty token', () => {
    expect(verifyToken(null)).toBeNull();
    expect(verifyToken('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 2. Shot lock
// ---------------------------------------------------------------------------
describe('Collab - Shot Lock', () => {
  let lm: ShotLockManager;

  beforeEach(() => {
    lm = new ShotLockManager();
  });
  afterEach(() => {
    lm.releaseAllForUser('user-a');
    lm.releaseAllForUser('user-b');
  });

  it('locks a shot and reports the lock holder', () => {
    const info = lm.lockShot('user-a', 'shot-1');
    expect(info.locked).toBe(true);
    expect(info.lockedBy).toBe('user-a');
    expect(info.expiresAt).toBeGreaterThan(Date.now());
  });

  it('prevents a different user from locking an already-locked shot', () => {
    lm.lockShot('user-a', 'shot-1');
    const info = lm.lockShot('user-b', 'shot-1');
    expect(info.lockedBy).toBe('user-a');
  });
});

// ---------------------------------------------------------------------------
// 3. Shot unlock
// ---------------------------------------------------------------------------
describe('Collab - Shot Unlock', () => {
  let lm: ShotLockManager;

  beforeEach(() => {
    lm = new ShotLockManager();
  });
  afterEach(() => {
    lm.releaseAllForUser('user-a');
    lm.releaseAllForUser('user-b');
  });

  it('unlocks a shot when requested by the lock owner', () => {
    lm.lockShot('user-a', 'shot-1');
    expect(lm.unlockShot('user-a', 'shot-1')).toBe(true);
    expect(lm.isLocked('shot-1').locked).toBe(false);
  });

  it('refuses unlock from a non-owner', () => {
    lm.lockShot('user-a', 'shot-1');
    expect(lm.unlockShot('user-b', 'shot-1')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. Lock expiry
// ---------------------------------------------------------------------------
describe('Collab - Lock Expiry', () => {
  it('reports lock as expired after the timeout', () => {
    const lm = new ShotLockManager();
    lm.lockShot('user-a', 'shot-exp');
    // Manually set expiresAt in the past to simulate expiry
    const entry = (lm as any).locks.get('shot-exp');
    clearTimeout(entry.timer);
    entry.expiresAt = Date.now() - 1000;

    const status = lm.isLocked('shot-exp');
    expect(status.locked).toBe(false);
    expect(status.lockedBy).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 5. Awareness update (mock ws)
// ---------------------------------------------------------------------------
describe('Collab - Awareness Update', () => {
  it('adds users and tracks them in a room', () => {
    const am = new AwarenessManager();
    const mockWs = { readyState: 1, OPEN: 1, send: () => {} } as any;

    am.addConnection('proj-1', 'u1', 'Alice', mockWs);
    am.addConnection('proj-1', 'u2', 'Bob', mockWs);

    const room = am.getRoom('proj-1');
    expect(room).toBeDefined();
    expect(room!.size).toBe(2);
    expect(room!.get('u1')!.displayName).toBe('Alice');
    expect(room!.get('u2')!.color).toBeDefined();
  });

  it('updates cursor position for a user', () => {
    const am = new AwarenessManager();
    const mockWs = { readyState: 1, OPEN: 1, send: () => {} } as any;

    am.addConnection('proj-1', 'u1', 'Alice', mockWs);
    am.updateCursor('proj-1', 'u1', { x: 100, y: 200 });

    const state = am.getRoom('proj-1')!.get('u1')!;
    expect(state.cursor).toEqual({ x: 100, y: 200 });
  });
});

// ---------------------------------------------------------------------------
// 6. Release all locks for user (offline/disconnect cleanup)
// ---------------------------------------------------------------------------
describe('Collab - Release All Locks on Disconnect', () => {
  it('releases all locks held by a user', () => {
    const lm = new ShotLockManager();
    lm.lockShot('user-a', 'shot-1');
    lm.lockShot('user-a', 'shot-2');
    lm.lockShot('user-b', 'shot-3');

    const released = lm.releaseAllForUser('user-a');
    expect(released).toEqual(expect.arrayContaining(['shot-1', 'shot-2']));
    expect(released).not.toContain('shot-3');
    expect(lm.isLocked('shot-1').locked).toBe(false);
    expect(lm.isLocked('shot-3').locked).toBe(true);

    // Cleanup
    lm.releaseAllForUser('user-b');
  });
});

// ---------------------------------------------------------------------------
// 7. Awareness - disconnect cleanup
// ---------------------------------------------------------------------------
describe('Collab - Awareness Disconnect Cleanup', () => {
  it('removes user on disconnect and deletes empty rooms', () => {
    const am = new AwarenessManager();
    const mockWs = { readyState: 1, OPEN: 1, send: () => {} } as any;

    am.addConnection('proj-1', 'u1', 'Alice', mockWs);
    expect(am.totalConnections()).toBe(1);

    am.removeConnection('proj-1', 'u1');
    expect(am.totalConnections()).toBe(0);
    expect(am.getRoom('proj-1')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 8. getAllLocks
// ---------------------------------------------------------------------------
describe('Collab - Get All Active Locks', () => {
  it('returns only non-expired locks', () => {
    const lm = new ShotLockManager();
    lm.lockShot('user-a', 'shot-1');
    lm.lockShot('user-b', 'shot-2');

    const all = lm.getAllLocks();
    expect(all.size).toBe(2);
    expect(all.get('shot-1')!.lockedBy).toBe('user-a');

    // Cleanup
    lm.releaseAllForUser('user-a');
    lm.releaseAllForUser('user-b');
  });
});
