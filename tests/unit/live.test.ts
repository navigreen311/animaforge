import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSession,
  startStream,
  stopStream,
  processInput,
  getSessionMetrics,
  getActiveSessions,
  clearSessions,
  serializeSession,
} from '../../services/live/src/services/liveService';

beforeEach(() => {
  clearSessions();
});

// ---------------------------------------------------------------------------
// 1. Create session
// ---------------------------------------------------------------------------
describe('Live - Create Session', () => {
  it('creates a session in "created" status', () => {
    const s = createSession({ projectId: 'proj-1', avatarId: 'av-1', mode: 'broadcast' });
    expect(s.id).toBeDefined();
    expect(s.status).toBe('created');
    expect(s.mode).toBe('broadcast');
    expect(s.fps).toBe(30);
  });
});

// ---------------------------------------------------------------------------
// 2. Start stream
// ---------------------------------------------------------------------------
describe('Live - Start Stream', () => {
  it('transitions session to streaming', () => {
    const s = createSession({ projectId: 'p', avatarId: 'a', mode: 'interactive' });
    const started = startStream(s.id);
    expect(started.status).toBe('streaming');
    expect(started.startedAt).toBeDefined();
    stopStream(s.id);
  });

  it('throws when starting an already-streaming session', () => {
    const s = createSession({ projectId: 'p', avatarId: 'a', mode: 'broadcast' });
    startStream(s.id);
    expect(() => startStream(s.id)).toThrow('already streaming');
    stopStream(s.id);
  });
});

// ---------------------------------------------------------------------------
// 3. Stop stream
// ---------------------------------------------------------------------------
describe('Live - Stop Stream', () => {
  it('transitions session to stopped and clears viewers', () => {
    const s = createSession({ projectId: 'p', avatarId: 'a', mode: 'broadcast' });
    startStream(s.id);
    const stopped = stopStream(s.id);
    expect(stopped.status).toBe('stopped');
    expect(stopped.stoppedAt).toBeDefined();
    expect(stopped.viewers).toBe(0);
  });

  it('throws when stopping a non-streaming session', () => {
    const s = createSession({ projectId: 'p', avatarId: 'a', mode: 'broadcast' });
    expect(() => stopStream(s.id)).toThrow('not streaming');
  });
});

// ---------------------------------------------------------------------------
// 4. Process input
// ---------------------------------------------------------------------------
describe('Live - Process Input', () => {
  it('processes text input and returns dialogue result', () => {
    const s = createSession({ projectId: 'p', avatarId: 'a', mode: 'interactive' });
    startStream(s.id);
    const result = processInput(s.id, { type: 'text', data: 'Hello world' });
    expect(result.type).toBe('text');
    expect(result.handler).toBe('dialogue');
    expect(result.processed).toBe(true);
    stopStream(s.id);
  });

  it('throws when processing input on a non-streaming session', () => {
    const s = createSession({ projectId: 'p', avatarId: 'a', mode: 'interactive' });
    expect(() => processInput(s.id, { type: 'text', data: 'hi' })).toThrow('not streaming');
  });
});

// ---------------------------------------------------------------------------
// 5. Viewer management
// ---------------------------------------------------------------------------
describe('Live - Viewer Management', () => {
  it('lists active streaming sessions', () => {
    const s1 = createSession({ projectId: 'p1', avatarId: 'a1', mode: 'broadcast' });
    const s2 = createSession({ projectId: 'p2', avatarId: 'a2', mode: 'interactive' });
    startStream(s1.id);
    startStream(s2.id);
    expect(getActiveSessions()).toHaveLength(2);
    stopStream(s1.id);
    stopStream(s2.id);
  });

  it('serializes session without renderInterval', () => {
    const s = createSession({ projectId: 'p', avatarId: 'a', mode: 'broadcast' });
    startStream(s.id);
    const serialized = serializeSession(s);
    expect(serialized).not.toHaveProperty('renderInterval');
    expect(serialized.id).toBe(s.id);
    stopStream(s.id);
  });
});

// ---------------------------------------------------------------------------
// 6. Session metrics
// ---------------------------------------------------------------------------
describe('Live - Session Metrics', () => {
  it('returns initial metrics for a new session', () => {
    const s = createSession({ projectId: 'p', avatarId: 'a', mode: 'broadcast' });
    const metrics = getSessionMetrics(s.id);
    expect(metrics.fps).toBe(30);
    expect(metrics.viewers).toBe(0);
    expect(metrics.duration_ms).toBe(0);
    expect(metrics.frames_rendered).toBe(0);
  });

  it('throws for a non-existent session', () => {
    expect(() => getSessionMetrics('fake-id')).toThrow('not found');
  });
});
