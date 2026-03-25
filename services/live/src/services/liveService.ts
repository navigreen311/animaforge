import { v4 as uuidv4 } from 'uuid';

export type SessionMode = 'interactive' | 'broadcast' | 'rehearsal';
export type SessionStatus = 'created' | 'streaming' | 'stopped';
export type InputType = 'text' | 'audio' | 'pose';

export interface LiveSession {
  id: string;
  projectId: string;
  avatarId: string;
  mode: SessionMode;
  status: SessionStatus;
  createdAt: string;
  startedAt: string | null;
  stoppedAt: string | null;
  fps: number;
  latencyMs: number;
  viewers: number;
  durationMs: number;
  framesRendered: number;
  renderInterval: ReturnType<typeof setInterval> | null;
}

export interface SessionInput {
  type: InputType;
  data: unknown;
}

export interface InputResult {
  type: InputType;
  handler: string;
  processed: boolean;
  timestamp: string;
  result: Record<string, unknown>;
}

export interface SessionMetrics {
  fps: number;
  latency_ms: number;
  viewers: number;
  duration_ms: number;
  frames_rendered: number;
}

const sessions = new Map<string, LiveSession>();

export function createSession(params: {
  projectId: string;
  avatarId: string;
  mode: SessionMode;
}): LiveSession {
  const session: LiveSession = {
    id: uuidv4(),
    projectId: params.projectId,
    avatarId: params.avatarId,
    mode: params.mode,
    status: 'created',
    createdAt: new Date().toISOString(),
    startedAt: null,
    stoppedAt: null,
    fps: 30,
    latencyMs: 0,
    viewers: 0,
    durationMs: 0,
    framesRendered: 0,
    renderInterval: null,
  };
  sessions.set(session.id, session);
  return session;
}

export function startStream(sessionId: string): LiveSession {
  const session = sessions.get(sessionId);
  if (!session) throw new Error(`Session ${sessionId} not found`);
  if (session.status === 'streaming') throw new Error('Session already streaming');
  if (session.status === 'stopped') throw new Error('Session already stopped');

  session.status = 'streaming';
  session.startedAt = new Date().toISOString();
  session.viewers = session.mode === 'broadcast' ? 1 : 0;

  // Mock: simulate frame rendering at ~30fps
  session.renderInterval = setInterval(() => {
    session.framesRendered += 1;
    session.durationMs += 33; // ~30fps
    session.latencyMs = Math.floor(Math.random() * 10) + 5; // 5-15ms
    if (session.mode === 'broadcast') {
      session.viewers = Math.max(1, session.viewers + Math.floor(Math.random() * 3) - 1);
    }
  }, 33);

  return session;
}

export function stopStream(sessionId: string): LiveSession {
  const session = sessions.get(sessionId);
  if (!session) throw new Error(`Session ${sessionId} not found`);
  if (session.status !== 'streaming') throw new Error('Session is not streaming');

  if (session.renderInterval) {
    clearInterval(session.renderInterval);
    session.renderInterval = null;
  }

  session.status = 'stopped';
  session.stoppedAt = new Date().toISOString();
  session.viewers = 0;

  return session;
}

export function processInput(sessionId: string, input: SessionInput): InputResult {
  const session = sessions.get(sessionId);
  if (!session) throw new Error(`Session ${sessionId} not found`);
  if (session.status !== 'streaming') throw new Error('Session is not streaming');

  const handlers: Record<InputType, () => InputResult> = {
    text: () => ({
      type: 'text',
      handler: 'dialogue',
      processed: true,
      timestamp: new Date().toISOString(),
      result: { dialogue_generated: true, text: input.data as string, emotion: 'neutral' },
    }),
    audio: () => ({
      type: 'audio',
      handler: 'lip_sync',
      processed: true,
      timestamp: new Date().toISOString(),
      result: { lip_sync_applied: true, duration_ms: 1500, phonemes_detected: 12 },
    }),
    pose: () => ({
      type: 'pose',
      handler: 'animation',
      processed: true,
      timestamp: new Date().toISOString(),
      result: { animation_applied: true, keypoints: 17, confidence: 0.92 },
    }),
  };

  const handler = handlers[input.type];
  if (!handler) throw new Error(`Unknown input type: ${input.type}`);

  return handler();
}

export function getSessionMetrics(sessionId: string): SessionMetrics {
  const session = sessions.get(sessionId);
  if (!session) throw new Error(`Session ${sessionId} not found`);

  return {
    fps: session.fps,
    latency_ms: session.latencyMs,
    viewers: session.viewers,
    duration_ms: session.durationMs,
    frames_rendered: session.framesRendered,
  };
}

export function getSession(sessionId: string): LiveSession | undefined {
  return sessions.get(sessionId);
}

export function getActiveSessions(): LiveSession[] {
  return Array.from(sessions.values()).filter((s) => s.status === 'streaming');
}

export function clearSessions(): void {
  for (const session of sessions.values()) {
    if (session.renderInterval) clearInterval(session.renderInterval);
  }
  sessions.clear();
}

export function serializeSession(session: LiveSession) {
  const { renderInterval, ...rest } = session;
  return rest;
}
