/* ------------------------------------------------------------------ */
/*  AnimaForge — WebSocket Client                                      */
/*  Real-time job progress & collaboration events                      */
/* ------------------------------------------------------------------ */

type ProgressCallback = (progress: number, stage: string) => void;
type CompleteCallback = (outputUrl: string) => void;
type FailCallback = (error: string) => void;
type CursorCallback = (data: { userId: string; x: number; y: number; elementId?: string }) => void;
type MessageHandler = (data: Record<string, unknown>) => void;

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000';

/* ------------------------------------------------------------------ */
/*  Connection manager                                                 */
/* ------------------------------------------------------------------ */

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Map<string, Set<MessageHandler>>();

function on(event: string, handler: MessageHandler): void {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event)!.add(handler);
}

function off(event: string, handler: MessageHandler): void {
  listeners.get(event)?.delete(handler);
}

function emit(event: string, payload: Record<string, unknown>): void {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ event, ...payload }));
  }
}

function dispatch(event: string, data: Record<string, unknown>): void {
  listeners.get(event)?.forEach((handler) => handler(data));
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Open a WebSocket connection, authenticating with the given JWT.
 * Automatically reconnects on unexpected close (up to 5 attempts).
 */
export function createWSConnection(token: string): WebSocket {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return socket;
  }

  let attempts = 0;
  const MAX_RECONNECT = 5;

  function connect(): WebSocket {
    const ws = new WebSocket(`${WS_BASE}/ws?token=${encodeURIComponent(token)}`);

    ws.addEventListener('open', () => {
      attempts = 0;
    });

    ws.addEventListener('message', (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as { event?: string; [key: string]: unknown };
        if (msg.event) {
          dispatch(msg.event, msg);
        }
      } catch {
        // Ignore non-JSON frames
      }
    });

    ws.addEventListener('close', (ev) => {
      socket = null;
      // Reconnect on abnormal close
      if (!ev.wasClean && attempts < MAX_RECONNECT) {
        attempts += 1;
        const delay = Math.min(1000 * 2 ** attempts, 16_000);
        reconnectTimer = setTimeout(() => {
          socket = connect();
        }, delay);
      }
    });

    ws.addEventListener('error', () => {
      // Error triggers close, handled above
    });

    socket = ws;
    return ws;
  }

  return connect();
}

/**
 * Subscribe to progress updates for a specific generation job.
 * Returns a cleanup function to unsubscribe.
 */
export function subscribeToJob(
  jobId: string,
  onProgress: ProgressCallback,
  onComplete: CompleteCallback,
  onFail: FailCallback,
): () => void {
  const handleProgress: MessageHandler = (data) => {
    if (data.jobId === jobId) {
      onProgress(data.progress as number, data.stage as string);
    }
  };

  const handleComplete: MessageHandler = (data) => {
    if (data.jobId === jobId) {
      onComplete(data.outputUrl as string);
    }
  };

  const handleFail: MessageHandler = (data) => {
    if (data.jobId === jobId) {
      onFail(data.error as string);
    }
  };

  on('job:progress', handleProgress);
  on('job:complete', handleComplete);
  on('job:failed', handleFail);

  return () => {
    off('job:progress', handleProgress);
    off('job:complete', handleComplete);
    off('job:failed', handleFail);
  };
}

/**
 * Join a project's collaboration room for real-time cursor / edit events.
 */
export function joinProject(projectId: string): void {
  emit('collab:join', { projectId });
}

/**
 * Listen for remote cursor movements from other collaborators.
 * Returns a cleanup function.
 */
export function onCursorMove(callback: CursorCallback): () => void {
  const handler: MessageHandler = (data) => {
    callback(data as unknown as Parameters<CursorCallback>[0]);
  };
  on('collab:cursor', handler);
  return () => off('collab:cursor', handler);
}

/**
 * Close the WebSocket connection and clean up all listeners.
 */
export function disconnect(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  listeners.clear();
  if (socket) {
    socket.close(1000, 'Client disconnect');
    socket = null;
  }
}
