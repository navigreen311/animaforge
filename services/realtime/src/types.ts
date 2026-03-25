import type { Socket } from "socket.io";

// ── Authenticated socket ────────────────────────────────────────────
export interface AuthPayload {
  userId: string;
  email?: string;
  iat?: number;
  exp?: number;
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
  result: Record<string, unknown>;
}

export interface JobFailedEvent {
  jobId: string;
  projectId: string;
  error: string;
  code?: string;
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
  "job:progress": (data: JobProgressEvent) => void;
  "job:complete": (data: JobCompleteEvent) => void;
  "job:failed": (data: JobFailedEvent) => void;
  "collab:cursor": (data: CollabCursorEvent) => void;
  "collab:edit": (data: CollabEditEvent) => void;
  "collab:joined": (data: { projectId: string; userId: string }) => void;
  error: (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  "job:progress": (data: JobProgressEvent) => void;
  "job:complete": (data: JobCompleteEvent) => void;
  "job:failed": (data: JobFailedEvent) => void;
  "collab:join": (data: CollabJoinEvent) => void;
  "collab:cursor": (data: CollabCursorEvent) => void;
  "collab:edit": (data: CollabEditEvent) => void;
}
