import type { Socket } from 'socket.io';

// ── Authenticated socket ────────────────────────────────────────────
/**
 * The verified claims of a socket handshake token.
 *
 * The subject is `sub`, the registered JWT claim, matching what the auth
 * service now signs and what platform-api verifies. It was `userId` here, a
 * custom name only this service used -- part of the mismatch filed as #82.
 * `exp` is required rather than optional: the handshake rejects a token
 * without one.
 */
export interface AuthPayload {
  sub: string;
  email?: string;
  role?: string;
  iat?: number;
  exp: number;
}

export interface AuthenticatedSocket extends Socket {
  data: {
    user: AuthPayload;
  };
}

// ── Job events ──────────────────────────────────────────────────────
export interface JobProgressEvent {
  jobId: string;
  projectId: string;
  progress: number; // 0-100
  stage?: string;
  message?: string;
}

export interface JobCompleteEvent {
  jobId: string;
  projectId: string;
  outputUrl: string;
  qualityScores?: Record<string, number>;
  result?: Record<string, unknown>;
}

export interface JobFailedEvent {
  jobId: string;
  projectId: string;
  error: string;
  reason?: string;
  code?: string;
}

// ── Shot events ────────────────────────────────────────────────────
export interface ShotUpdatedEvent {
  shotId: string;
  projectId: string;
  status: string;
  approvedBy?: string;
}

export interface ShotStatusChangedEvent {
  shotId: string;
  projectId: string;
  status: string;
}

// ── Notification events ────────────────────────────────────────────
export interface NotificationNewEvent {
  notification: {
    id: string;
    type: string;
    title: string;
    body?: string;
    userId: string;
    metadata?: Record<string, unknown>;
    createdAt: number;
  };
}

// ── Collaboration events ────────────────────────────────────────────
export interface CollabJoinEvent {
  projectId: string;
}

export interface CollabCursorEvent {
  projectId: string;
  userId: string;
  x: number;
  y: number;
  label?: string;
}

export interface CollabEditEvent {
  projectId: string;
  userId: string;
  delta: Record<string, unknown>; // CRDT delta payload
  timestamp: number;
}

// ── Server-to-client / Client-to-server event maps ──────────────────
export interface ServerToClientEvents {
  'job:progress': (data: JobProgressEvent) => void;
  'job:complete': (data: JobCompleteEvent) => void;
  'job:failed': (data: JobFailedEvent) => void;
  'shot:updated': (data: ShotUpdatedEvent) => void;
  'shot:status_changed': (data: ShotStatusChangedEvent) => void;
  'notification:new': (data: NotificationNewEvent) => void;
  'collab:cursor': (data: CollabCursorEvent) => void;
  'collab:edit': (data: CollabEditEvent) => void;
  'collab:joined': (data: { projectId: string; userId: string }) => void;
  error: (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  'job:progress': (data: JobProgressEvent) => void;
  'job:complete': (data: JobCompleteEvent) => void;
  'job:failed': (data: JobFailedEvent) => void;
  'shot:updated': (data: ShotUpdatedEvent) => void;
  'shot:status_changed': (data: ShotStatusChangedEvent) => void;
  'notification:new': (data: NotificationNewEvent) => void;
  'collab:join': (data: CollabJoinEvent) => void;
  'collab:cursor': (data: CollabCursorEvent) => void;
  'collab:edit': (data: CollabEditEvent) => void;
}
