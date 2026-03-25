import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../db';

export type SessionMode = 'interactive' | 'broadcast' | 'rehearsal';
export type SessionStatus = 'created' | 'streaming' | 'stopped' | 'scheduled';
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
  scheduledAt: string | null;
  fps: number;
  latencyMs: number;
  viewers: number;
  durationMs: number;
  framesRendered: number;
  renderInterval: ReturnType<typeof setInterval> | null;
  recordingUrl: string | null;
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

export interface ChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  message: string;
  timestamp: string;
}

export interface SessionAnalytics {
  peakViewers: number;
  avgViewers: number;
  totalMessages: number;
  duration: number;
}

export interface ViewerRecord {
  userId: string;
  joinedAt: string;
}

/* ──────────── In-memory stores ──────────── */

const sessions = new Map<string, LiveSession>();
const sessionViewers = new Map<string, Map<string, ViewerRecord>>();
const sessionChat = new Map<string, ChatMessage[]>();
const sessionPeakViewers = new Map<string, number>();
const sessionViewerSnapshots = new Map<string, number[]>();

/* ──────────── Prisma helper — falls back to in-memory on DB error ──────────── */

let usePrisma = true;

async function tryPrisma<T>(fn: () => Promise<T>): Promise<T | null> {
  if (!usePrisma) return null;
  try {
    return await fn();
  } catch {
    usePrisma = false;
    return null;
  }
}

/* ──────────── Core session lifecycle ──────────── */

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
    scheduledAt: null,
    fps: 30,
    latencyMs: 0,
    viewers: 0,
    durationMs: 0,
    framesRendered: 0,
    renderInterval: null,
    recordingUrl: null,
  };
  sessions.set(session.id, session);
  sessionViewers.set(session.id, new Map());
  sessionChat.set(session.id, []);
  sessionPeakViewers.set(session.id, 0);
  sessionViewerSnapshots.set(session.id, []);

  // Persist asynchronously — fire and forget
  tryPrisma(() =>
    prisma.liveSession.create({
      data: {
        id: session.id,
        projectId: session.projectId,
        avatarId: session.avatarId,
        mode: session.mode,
        status: session.status,
        createdAt: session.createdAt,
      },
    }),
  );

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

    // Track peak viewers and snapshots
    const current = getViewerCount(sessionId);
    const peak = sessionPeakViewers.get(sessionId) ?? 0;
    if (current > peak) sessionPeakViewers.set(sessionId, current);
    sessionViewerSnapshots.get(sessionId)?.push(current);
  }, 33);

  tryPrisma(() =>
    prisma.liveSession.update({
      where: { id: sessionId },
      data: { status: 'streaming', startedAt: session.startedAt },
    }),
  );

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

  tryPrisma(() =>
    prisma.liveSession.update({
      where: { id: sessionId },
      data: { status: 'stopped', stoppedAt: session.stoppedAt },
    }),
  );

  return session;
}

/* ──────────── Input processing (unchanged logic) ──────────── */

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

/* ──────────── Metrics ──────────── */

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

/* ──────────── Recording management ──────────── */

export async function saveRecording(sessionId: string): Promise<{
  sessionId: string;
  recordingUrl: string;
  durationMs: number;
  framesRendered: number;
  savedAt: string;
}> {
  const session = sessions.get(sessionId);
  if (!session) throw new Error(`Session ${sessionId} not found`);

  const recordingUrl = `https://storage.animaforge.io/recordings/${sessionId}.webm`;
  session.recordingUrl = recordingUrl;
  const savedAt = new Date().toISOString();

  await tryPrisma(() =>
    prisma.liveRecording.create({
      data: {
        id: uuidv4(),
        sessionId,
        url: recordingUrl,
        durationMs: session.durationMs,
        framesRendered: session.framesRendered,
        savedAt,
      },
    }),
  );

  return {
    sessionId,
    recordingUrl,
    durationMs: session.durationMs,
    framesRendered: session.framesRendered,
    savedAt,
  };
}

/* ──────────── Viewer management ──────────── */

export function addViewer(sessionId: string, userId: string): { viewerCount: number } {
  const session = sessions.get(sessionId);
  if (!session) throw new Error(`Session ${sessionId} not found`);

  const viewers = sessionViewers.get(sessionId)!;
  if (!viewers.has(userId)) {
    viewers.set(userId, { userId, joinedAt: new Date().toISOString() });
    session.viewers = viewers.size;

    const peak = sessionPeakViewers.get(sessionId) ?? 0;
    if (session.viewers > peak) sessionPeakViewers.set(sessionId, session.viewers);
  }

  return { viewerCount: session.viewers };
}

export function removeViewer(sessionId: string, userId: string): { viewerCount: number } {
  const session = sessions.get(sessionId);
  if (!session) throw new Error(`Session ${sessionId} not found`);

  const viewers = sessionViewers.get(sessionId)!;
  viewers.delete(userId);
  session.viewers = viewers.size;

  return { viewerCount: session.viewers };
}

export function getViewerCount(sessionId: string): number {
  const session = sessions.get(sessionId);
  if (!session) throw new Error(`Session ${sessionId} not found`);

  const viewers = sessionViewers.get(sessionId);
  return viewers ? viewers.size : session.viewers;
}

/* ──────────── Chat / interaction ──────────── */

export function addChatMessage(
  sessionId: string,
  userId: string,
  message: string,
): ChatMessage {
  const session = sessions.get(sessionId);
  if (!session) throw new Error(`Session ${sessionId} not found`);

  const chatMsg: ChatMessage = {
    id: uuidv4(),
    sessionId,
    userId,
    message,
    timestamp: new Date().toISOString(),
  };

  const history = sessionChat.get(sessionId) ?? [];
  history.push(chatMsg);
  sessionChat.set(sessionId, history);

  tryPrisma(() =>
    prisma.liveChatMessage.create({
      data: {
        id: chatMsg.id,
        sessionId: chatMsg.sessionId,
        userId: chatMsg.userId,
        message: chatMsg.message,
        timestamp: chatMsg.timestamp,
      },
    }),
  );

  return chatMsg;
}

export function getChatHistory(sessionId: string): ChatMessage[] {
  const session = sessions.get(sessionId);
  if (!session) throw new Error(`Session ${sessionId} not found`);

  return sessionChat.get(sessionId) ?? [];
}

/* ──────────── Session analytics ──────────── */

export function getSessionAnalytics(sessionId: string): SessionAnalytics {
  const session = sessions.get(sessionId);
  if (!session) throw new Error(`Session ${sessionId} not found`);

  const peak = sessionPeakViewers.get(sessionId) ?? 0;
  const snapshots = sessionViewerSnapshots.get(sessionId) ?? [];
  const avgViewers =
    snapshots.length > 0
      ? parseFloat((snapshots.reduce((a, b) => a + b, 0) / snapshots.length).toFixed(2))
      : 0;
  const messages = sessionChat.get(sessionId)?.length ?? 0;

  return {
    peakViewers: peak,
    avgViewers,
    totalMessages: messages,
    duration: session.durationMs,
  };
}

/* ──────────── Replay ──────────── */

export function getReplay(sessionId: string): {
  sessionId: string;
  recordingUrl: string | null;
  durationMs: number;
  status: SessionStatus;
} {
  const session = sessions.get(sessionId);
  if (!session) throw new Error(`Session ${sessionId} not found`);

  return {
    sessionId,
    recordingUrl: session.recordingUrl,
    durationMs: session.durationMs,
    status: session.status,
  };
}

/* ──────────── Scheduled sessions ──────────── */

export function scheduleSession(
  params: { projectId: string; avatarId: string; mode: SessionMode },
  startAt: string,
): LiveSession {
  const scheduledDate = new Date(startAt);
  if (scheduledDate <= new Date()) {
    throw new Error('Scheduled time must be in the future');
  }

  const session: LiveSession = {
    id: uuidv4(),
    projectId: params.projectId,
    avatarId: params.avatarId,
    mode: params.mode,
    status: 'scheduled',
    createdAt: new Date().toISOString(),
    startedAt: null,
    stoppedAt: null,
    scheduledAt: startAt,
    fps: 30,
    latencyMs: 0,
    viewers: 0,
    durationMs: 0,
    framesRendered: 0,
    renderInterval: null,
    recordingUrl: null,
  };

  sessions.set(session.id, session);
  sessionViewers.set(session.id, new Map());
  sessionChat.set(session.id, []);
  sessionPeakViewers.set(session.id, 0);
  sessionViewerSnapshots.set(session.id, []);

  tryPrisma(() =>
    prisma.liveSession.create({
      data: {
        id: session.id,
        projectId: session.projectId,
        avatarId: session.avatarId,
        mode: session.mode,
        status: session.status,
        scheduledAt: startAt,
        createdAt: session.createdAt,
      },
    }),
  );

  return session;
}

/* ──────────── Existing queries ──────────── */

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
  sessionViewers.clear();
  sessionChat.clear();
  sessionPeakViewers.clear();
  sessionViewerSnapshots.clear();
}

export function serializeSession(session: LiveSession) {
  const { renderInterval, ...rest } = session;
  return rest;
}
